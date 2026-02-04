import { supabaseAdmin } from '@/lib/supabase/admin';
import { TelegramUpdate, TelegramMessage } from '@/types/telegram';
import { generateAIResponse } from '@/services/openai.service';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

export class TelegramService {
  private botToken: string = process.env.TELEGRAM_BOT_TOKEN || '';
  private integration: any;

  async handleWebhook(update: TelegramUpdate, integration?: any, botToken?: string) {
    // Store integration and token for this webhook request
    if (integration) this.integration = integration;
    if (botToken) this.botToken = botToken;
    // 1. Сохраняем connection_id, если пришел апдейт статуса
    if (update.business_connection) {
      await this.handleBusinessConnection(update.business_connection);
      return;
    }

    // 2. Определяем тип сообщения (бизнес или обычное)
    const message = update.business_message || update.message;

    if (message) {
      // ВАЖНО: business_connection_id находится ВНУТРИ сообщения для business_message
      const connectionId = message.business_connection_id;

      await this.processIncomingMessage(message, connectionId);
    }
  }

  private async handleBusinessConnection(connection: any) {
    console.log("Business Connection Update:", connection);
    // В реальном продакшене тут нужно обновлять session_data у конкретной интеграции
  }

  private async processIncomingMessage(message: TelegramMessage, connectionId?: string) {
    // Use the integration passed from webhook route
    const integration = this.integration;
    if (!integration) {
      console.error("No integration provided to webhook handler.");
      return;
    }

    const externalChatId = message.chat.id.toString();
    const text = message.text || "";
    // Игнорируем сообщения без текста (картинки и т.д. пока не поддерживаем)
    if (!text) return;

    // ОБРАБОТКА КОМАНД: /reset или /clear
    if (text === '/reset' || text === '/clear') {
      // Получаем ID (повторная логика, можно вынести, но для скорости оставим тут часть)
      const senderName = message.from?.first_name || "Unknown";
      let conversationId = await this.getOrCreateConversation(integration.id, externalChatId, senderName);

      console.log(`Clearing context for conversation ${conversationId}`);

      await supabaseAdmin
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      const bizConnectionId = connectionId || integration.session_data?.business_connection_id;
      await this.sendTelegramMessage(externalChatId, "🧹 История переписки очищена. Я забыл всё, что мы обсуждали.", bizConnectionId);
      return;
    }

    const senderName = message.from?.first_name || "Unknown";
    const senderUsername = message.from?.username || "";

    // 2. Находим или создаем conversation
    let conversationId = await this.getOrCreateConversation(integration.id, externalChatId, senderName);

    // UX: Показываем "печатает..." в правильном чате
    const bizConnectionId = connectionId || integration.session_data?.business_connection_id;
    await this.sendTypingAction(externalChatId, bizConnectionId);

    // DETERMINISTIC RULE: If text contains phone number, set status to 'waiting_call'
    // Regex matches common formats: +7999..., 8999..., +998..., 99890...
    const phoneRegex = /(?:\+|\b)(?:998|7|8)\d{9}\b|\+?\d{10,15}/;
    if (phoneRegex.test(text)) {
      console.log(`[Rule] Phone number detected in "${text}". Force updating status to waiting_call.`);
      await supabaseAdmin
        .from('conversations')
        .update({ status: 'waiting_call' })
        .eq('id', conversationId);
    }

    // 3. Сохраняем сообщение
    await supabaseAdmin.from('messages').insert({
      conversation_id: conversationId,
      sender: 'customer', // Считаем все входящие от клиента
      content: text,
      metadata: { message_id: message.message_id }
    });

    // 5. Проверяем, включен ли AI
    if (!integration.ai_enabled) {
      console.log("AI disabled for this integration, skipping reply.");
      return;
    }

    // 6. Генерируем AI ответ
    await this.triggerAIReply(integration, conversationId, externalChatId, message.message_id, connectionId);
  }

  private async getOrCreateConversation(integrationId: string, externalChatId: string, customerName: string) {
    const { data: existing } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('integration_id', integrationId)
      .eq('external_chat_id', externalChatId)
      .single();

    if (existing) return existing.id;

    const { data: newConv, error } = await supabaseAdmin
      .from('conversations')
      .insert({
        integration_id: integrationId,
        external_chat_id: externalChatId,
        customer_name: customerName
      })
      .select('id')
      .single();

    if (error) throw error;
    return newConv.id;
  }

  private async triggerAIReply(integration: any, conversationId: string, chatId: string, replyToMessageId: number, connectionId?: string) {
    // 1. Получаем контекст
    const { data: history } = await supabaseAdmin
      .from('messages')
      .select('sender, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    const messages = (history || []).reverse().map(m => ({
      role: m.sender === 'customer' ? 'user' as const : 'assistant' as const,
      content: m.content
    }));

    // 2. Генерируем ответ
    const systemPrompt = integration.system_prompt || "You are a helpful assistant.";
    const aiResponse = await generateAIResponse(systemPrompt, messages, integration.knowledge_base_url);

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
    }

    // 3. Отправляем в Telegram
    const bizConnectionId = connectionId || integration.session_data?.business_connection_id;

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
  }

  public async sendTelegramMessage(chatId: string, text: string, businessConnectionId?: string) {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    const body: any = {
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
    } catch (e) {
      console.error("Fetch Error:", e);
    }
  }

  public async sendTypingAction(chatId: string, businessConnectionId?: string) {
    try {
      const body: any = { chat_id: chatId, action: 'typing' };
      if (businessConnectionId) {
        body.business_connection_id = businessConnectionId;
      }

      await fetch(`https://api.telegram.org/bot${this.botToken}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (e) {
      console.error("Error sending typing action:", e);
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
      const data = await res.json();
      console.log("SetWebhook Result:", data);
      return data;
    } catch (e) {
      console.error("SetWebhook Error:", e);
      throw e;
    }
  }
}

export const telegramService = new TelegramService();
