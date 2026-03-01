import { supabaseAdmin } from '@/lib/supabase/admin';
import { TelegramUpdate, TelegramMessage } from '@/types/telegram';
import { generateAIResponse } from '@/services/openai.service';
import { waitingCallChannelService } from '@/services/telegram/waiting-call-channel.service';
import { updateLeadProfileFromMessage } from '@/services/crm/lead-profile.service';
import { transcribeAudio } from '@/services/openai.service';

type IntegrationConfig = {
  id: string;
  ai_enabled?: boolean;
  system_prompt?: string | null;
  knowledge_base_url?: string | null;
  session_data?: { business_connection_id?: string } | null;
}

type MessageContextRow = {
  sender: 'customer' | 'assistant' | 'user';
  content: string;
}

type TelegramApiBody = {
  chat_id: string;
  text?: string;
  parse_mode?: 'HTML';
  action?: 'typing';
  business_connection_id?: string;
};

export class TelegramService {
  private botToken: string = process.env.TELEGRAM_BOT_TOKEN || '';
  private integration: IntegrationConfig | null = null;

  async handleWebhook(update: TelegramUpdate, integration?: IntegrationConfig, botToken?: string) {
    if (integration) this.integration = integration;
    if (botToken) this.botToken = botToken;

    if (update.business_connection) {
      await this.handleBusinessConnection(update.business_connection);
      return;
    }

    if (update.business_message) {
      const message = update.business_message;
      const connectionId = message.business_connection_id;
      await this.processIncomingMessage(message, connectionId);
    } else if (update.message) {
      await this.processIncomingMessage(update.message);
    }
  }

  private async handleBusinessConnection(connection: unknown) {
    const integration = this.integration;
    if (!integration) {
      console.warn("Business connection update ignored: no integration context.");
      return;
    }

    const connectionId = this.extractConnectionId(connection);
    if (!connectionId) {
      console.warn("Business connection update ignored: missing connection id.");
      return;
    }

    await this.persistBusinessConnectionId(connectionId);
  }

  private extractConnectionId(connection: unknown): string | null {
    if (!connection || typeof connection !== "object") return null;
    const id = (connection as { id?: unknown }).id;
    return typeof id === "string" && id.length > 0 ? id : null;
  }

  private async persistBusinessConnectionId(connectionId: string): Promise<void> {
    const integration = this.integration;
    if (!integration) return;

    if (integration.session_data?.business_connection_id === connectionId) {
      return;
    }

    const nextSessionData = {
      ...(integration.session_data || {}),
      business_connection_id: connectionId
    };

    const { error } = await supabaseAdmin
      .from("integrations")
      .update({ session_data: nextSessionData })
      .eq("id", integration.id);

    if (error) {
      console.error("Failed to persist business_connection_id:", error.message);
      return;
    }

    integration.session_data = nextSessionData;
    console.log(`business_connection_id updated for integration ${integration.id}`);
  }

  private async processIncomingMessage(message: TelegramMessage, connectionId?: string) {
    // Use the integration passed from webhook route
    const integration = this.integration;
    if (!integration) {
      console.error("No integration provided to webhook handler.");
      return;
    }

    const externalChatId = message.chat.id.toString();
    const bizConnectionId = connectionId; // Only use explicitly provided connectionId

    let text = message.text || "";

    // ── ОБРАБОТКА ГОЛОСОВЫХ СООБЩЕНИЙ ──
    if (!text && (message.voice || message.audio)) {
      const fileId = message.voice?.file_id || message.audio?.file_id;
      if (fileId) {
        console.log(`[Voice] Detected audio message ${fileId}. Transcribing...`);
        // Пока транскрибируем, покажем "печатает" (или "записывает голосовое", но typing тоже норм)
        await this.sendTypingAction(externalChatId, bizConnectionId);

        try {
          const audioBuffer = await this.downloadTelegramFile(fileId, this.botToken);
          if (audioBuffer) {
            const transcription = await transcribeAudio(audioBuffer, 'voice_message.ogg');
            if (transcription && transcription.trim()) {
              text = `[Голосовое сообщение] ${transcription}`;
              console.log(`[Voice] Transcribed text: "${text}"`);
            } else {
              console.log("[Voice] Transcription returned empty text.");
            }
          }
        } catch (err) {
          console.error("[Voice] Error processing voice message:", err);
        }
      }
    }

    // Игнорируем сообщения без текста (картинки без подписи, непрочитанные голосовые и т.д.)
    if (!text) return;

    // ОБРАБОТКА КОМАНД: /reset или /clear
    if (text === '/reset' || text === '/clear') {
      // Получаем ID (повторная логика, можно вынести, но для скорости оставим тут часть)
      const senderName = message.from?.first_name || "Unknown";
      const conversationId = await this.getOrCreateConversation(integration.id, externalChatId, senderName);

      console.log(`Clearing context for conversation ${conversationId}`);

      await supabaseAdmin
        .from('messages')
      await supabaseAdmin
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      await this.sendTelegramMessage(externalChatId, "🧹 История переписки очищена. Я забыл всё, что мы обсуждали.", bizConnectionId);
      return;
    }

    const senderName = message.from?.first_name || "Unknown";

    // 2. Находим или создаем conversation
    const { id: conversationId, status } = await this.getOrCreateConversation(integration.id, externalChatId, senderName);

    // If the conversation already reached its goal, stop responding
    const isCompleted = ['waiting_call', 'scheduled', 'closed_won', 'closed_lost'].includes(status);

    // UX: Показываем "печатает..." в правильном чате (если бот собирается отвечать)
    if (!isCompleted) {
      await this.sendTypingAction(externalChatId, bizConnectionId);
    }

    // DETERMINISTIC RULE: If text contains phone number, set status to 'waiting_call'
    // Regex matches common formats: +7999..., 8999..., +998..., 99890...
    const phoneRegex = /(?:\+|\b)(?:998|7|8)\d{9}\b|\+?\d{10,15}/;
    let statusTouched = false;
    if (!isCompleted && phoneRegex.test(text)) {
      console.log(`[Rule] Phone number detected in "${text}". Force updating status to waiting_call.`);
      await supabaseAdmin
        .from('conversations')
        .update({ status: 'waiting_call' })
        .eq('id', conversationId);
      statusTouched = true;
    }

    // 3. Сохраняем сообщение
    await supabaseAdmin.from('messages').insert({
      conversation_id: conversationId,
      sender: 'customer', // Считаем все входящие от клиента
      content: text,
      metadata: {
        message_id: message.message_id,
        business_connection_id: connectionId || integration.session_data?.business_connection_id,
        telegram_user_id: message.from?.id,
        username: message.from?.username,
        first_name: message.from?.first_name,
        last_name: message.from?.last_name
      }
    });
    await updateLeadProfileFromMessage(conversationId, text, { username: message.from?.username || null });

    if (statusTouched) {
      console.log(`[WaitingCall] Status changed by phone rule for conversation ${conversationId}`);
    }
    // If a profile message already exists for this conversation, keep it up to date.
    await waitingCallChannelService.sync(conversationId);

    // 5. Проверяем, включен ли AI и не закончен ли диалог
    if (!integration.ai_enabled || isCompleted) {
      if (isCompleted) console.log(`Conversation ${conversationId} is completed (status: ${status}). Ignoring message for AI.`);
      else console.log("AI disabled for this integration, skipping reply.");
      return;
    }

    // 6. Генерируем AI ответ
    await this.triggerAIReply(integration, conversationId, externalChatId, message.message_id, connectionId);
  }

  private async getOrCreateConversation(integrationId: string, externalChatId: string, customerName: string) {
    const { data: existing } = await supabaseAdmin
      .from('conversations')
      .select('id, status')
      .eq('integration_id', integrationId)
      .eq('external_chat_id', externalChatId)
      .single();

    if (existing) return existing;

    const { data: newConv, error } = await supabaseAdmin
      .from('conversations')
      .insert({
        integration_id: integrationId,
        external_chat_id: externalChatId,
        customer_name: customerName,
        status: 'new'
      })
      .select('id, status')
      .single();

    if (error) throw error;
    return newConv;
  }

  private async triggerAIReply(integration: IntegrationConfig, conversationId: string, chatId: string, _replyToMessageId: number, connectionId?: string) {
    // 1. Получаем контекст
    const { data: history } = await supabaseAdmin
      .from('messages')
      .select('sender, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    const messages = (history || []).reverse().map((m: MessageContextRow) => ({
      role: m.sender === 'customer' ? 'user' as const : 'assistant' as const,
      content: m.content
    }));

    // 2. Генерируем ответ
    const systemPrompt = integration.system_prompt || "You are a helpful assistant.";
    const aiResponse = await generateAIResponse(systemPrompt, messages, integration.knowledge_base_url ?? undefined);

    // 3.5. Обрабатываем смену статуса
    let finalResponse = aiResponse;
    const statusMatch = aiResponse.match(/\[\[UPDATE_STATUS:\s*([a-z_]+)\s*\]\]/);

    if (statusMatch) {
      const newStatus = statusMatch[1];
      finalResponse = aiResponse.replace(statusMatch[0], "").trim();

      console.log(`AI changing status to: ${newStatus}`);

      await supabaseAdmin
        .from('conversations')
        .update({ status: newStatus })
        .eq('id', conversationId);

      await waitingCallChannelService.sync(conversationId);
    }

    // 3. Отправляем в Telegram
    const bizConnectionId = connectionId; // Only use if explicitly provided

    if (finalResponse) {
      // Sanitize response for Telegram HTML support
      // Telegram does not support <br>, it needs \n
      const sanitizedResponse = finalResponse
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n') // End of paragraph -> newline
        .replace(/<p>/gi, '')     // Start of paragraph -> empty (or maybe newline if needed, but usually redundant with </p>)
        .replace(/&nbsp;/gi, ' ')

      await this.sendTelegramMessage(chatId, sanitizedResponse, bizConnectionId);
    }

    // 4. Сохраняем ответ
    await supabaseAdmin.from('messages').insert({
      conversation_id: conversationId,
      sender: 'assistant',
      content: finalResponse || "(Status Update Only)"
    });
    if (finalResponse) {
      await updateLeadProfileFromMessage(conversationId, finalResponse);
    }

    await waitingCallChannelService.sync(conversationId);
  }

  public async sendTelegramMessage(chatId: string, text: string, businessConnectionId?: string) {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    const body: TelegramApiBody = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
    };

    if (businessConnectionId) {
      body.business_connection_id = businessConnectionId;
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.text();
        console.error("Telegram API Error:", err);
      }
    } catch (error: unknown) {
      console.error("Fetch Error:", error);
    }
  }

  public async sendTypingAction(chatId: string, businessConnectionId?: string) {
    try {
      const body: TelegramApiBody = { chat_id: chatId, action: 'typing' };
      if (businessConnectionId) {
        body.business_connection_id = businessConnectionId;
      }

      await fetch(`https://api.telegram.org/bot${this.botToken}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (error: unknown) {
      console.error("Error sending typing action:", error);
    }
  }

  public async setWebhook(url: string, botToken?: string) {
    const token = botToken || this.botToken;
    const apiUrl = `https://api.telegram.org/bot${token}/setWebhook`;
    const baseUrl = url.replace(/\/$/, "");
    const webhookUrl = `${baseUrl}/api/webhooks/telegram`;

    console.log(`Setting webhook to: ${webhookUrl}`);

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message", "edited_message", "business_connection", "business_message", "edited_business_message"]
        })
      });
      const data: unknown = await res.json();
      console.log("SetWebhook Result:", data);
      return data;
    } catch (error: unknown) {
      console.error("SetWebhook Error:", error);
      throw error;
    }
  }

  private async downloadTelegramFile(fileId: string, botToken: string): Promise<Buffer | null> {
    try {
      // 1. Get file path
      const getFileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
      if (!getFileRes.ok) throw new Error("Failed to get file info");

      const fileData = await getFileRes.json();
      const filePath = fileData.result?.file_path;
      if (!filePath) throw new Error("No file_path in response");

      // 2. Download file
      const downloadRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
      if (!downloadRes.ok) throw new Error("Failed to download file");

      const arrayBuffer = await downloadRes.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error("Error downloading Telegram file:", error);
      return null;
    }
  }
}

export const telegramService = new TelegramService();
