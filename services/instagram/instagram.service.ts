import { IgApiClient } from 'instagram-private-api';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateAIResponse } from '@/services/openai.service';
import { updateLeadProfileFromMessage } from '@/services/crm/lead-profile.service';

type InstagramSessionData = Record<string, unknown> | null | undefined;

type ContextMessage = {
  sender: 'customer' | 'assistant' | 'user';
  content: string;
};

export class InstagramService {
  private ig: IgApiClient;
  private integrationId: string;
  private userId: string;
  private myUserId: number | null = null;

  constructor(integrationId: string, userId: string) {
    this.ig = new IgApiClient();
    this.integrationId = integrationId;
    this.userId = userId;
  }

  // Инициализация клиента
  async initialize(username: string, passwordOrSessionId?: string, sessionData?: InstagramSessionData) {
    this.ig.state.generateDevice(username);

    if (sessionData) {
      await this.ig.state.deserialize(sessionData);
      if (this.ig.state.cookieUserId) {
        this.myUserId = parseInt(this.ig.state.cookieUserId);
      }
    }

    if (passwordOrSessionId && (!sessionData || Object.keys(sessionData).length === 0)) {
      console.log("Initializing Instagram via Session ID or Cookies...");

      try {
        let extractedPk: string | undefined;

        // Check if it's a full cookie string (contains 'sessionid=') or just the sessionid value
        if (passwordOrSessionId.includes('sessionid=')) {
          console.log("Full Cookie string detected. Parsing and injecting...");
          const cookies = passwordOrSessionId.split(';').map(c => c.trim()).filter(c => c);
          for (const cookie of cookies) {
            if (cookie.startsWith('sessionid=')) {
              let val = cookie.split('=')[1];
              if (val.includes('%3A')) val = decodeURIComponent(val);
              extractedPk = val.split(':')[0];
            }
            if (cookie.startsWith('ds_user_id=')) {
              extractedPk = cookie.split('=')[1];
            }
            // Inject each cookie exactly as provided
            await this.ig.state.cookieJar.setCookie(`${cookie}; Domain=.instagram.com; Path=/; Secure; HttpOnly`, 'https://instagram.com');
          }
        } else {
          console.log("Single Session ID detected. Injecting stealth cookies...");
          let decodedSessionId = passwordOrSessionId;
          if (decodedSessionId.includes('%3A')) {
            decodedSessionId = decodeURIComponent(decodedSessionId);
          }
          extractedPk = decodedSessionId.split(':')[0];

          const cookieString = `sessionid=${passwordOrSessionId}; Domain=.instagram.com; Path=/; Secure; HttpOnly`;
          await this.ig.state.cookieJar.setCookie(cookieString, 'https://instagram.com');

          if (extractedPk && !isNaN(parseInt(extractedPk))) {
            const dsUserIdCookie = `ds_user_id=${extractedPk}; Domain=.instagram.com; Path=/; Secure; HttpOnly`;
            await this.ig.state.cookieJar.setCookie(dsUserIdCookie, 'https://instagram.com');
          }

          const csrfCookie = `csrftoken=missing; Domain=.instagram.com; Path=/; Secure; HttpOnly`;
          await this.ig.state.cookieJar.setCookie(csrfCookie, 'https://instagram.com');

          const igDidCookie = `ig_did=${this.ig.state.deviceString}; Domain=.instagram.com; Path=/; Secure; HttpOnly`;
          await this.ig.state.cookieJar.setCookie(igDidCookie, 'https://instagram.com');

          const midCookie = `mid=xyz; Domain=.instagram.com; Path=/; Secure; HttpOnly`;
          await this.ig.state.cookieJar.setCookie(midCookie, 'https://instagram.com');
        }

        if (extractedPk && !isNaN(parseInt(extractedPk))) {
          this.myUserId = parseInt(extractedPk);
          console.log(`Stealth Login via Cookie! User ID: ${this.myUserId}`);
          await this.saveSession();
        } else {
          throw new Error("Could not extract User ID from sessionid");
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "unknown_error";
        console.error("Cookie Login Failed:", message);
        throw new Error("Invalid Session ID format");
      }
    }
  }

  private async saveSession() {
    const serialized = await this.ig.state.serialize();
    delete serialized.constants;

    await supabaseAdmin
      .from('integrations')
      .update({ session_data: serialized, updated_at: new Date().toISOString() })
      .eq('id', this.integrationId);
  }

  async checkNewMessages(systemPrompt: string, aiEnabled: boolean = true, knowledgeBaseUrl?: string) {
    if (!this.myUserId) {
      try {
        const currentUser = await this.ig.account.currentUser();
        this.myUserId = currentUser.pk;
      } catch (e) {
        console.error("Failed to get current user PK, skipping check.");
        return;
      }
    }

    console.log(`[IG] Checking messages for ${this.integrationId}...`);

    try {
      const inboxFeed = this.ig.feed.directInbox();
      const threads = await inboxFeed.items();

      for (const thread of threads) {
        const lastItem = thread.items[0];
        if (!lastItem || lastItem.item_type !== 'text') continue;

        if (lastItem.user_id === this.myUserId) continue;

        const externalChatId = thread.thread_id;
        const messageId = lastItem.item_id;
        const senderName = thread.users.find(u => u.pk === lastItem.user_id)?.username || "Unknown";
        const content = lastItem.text;
        if (!content) continue;

        const conversationId = await this.getOrCreateConversation(externalChatId, senderName);

        const { data: lastMsg } = await supabaseAdmin
          .from('messages')
          .select('metadata')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const lastSavedId = lastMsg?.metadata?.message_id;

        if (lastSavedId === messageId) continue;

        console.log(`[IG] New message from ${senderName}: ${content}`);

        await supabaseAdmin.from('messages').insert({
          conversation_id: conversationId,
          sender: 'customer',
          content: content,
          metadata: { message_id: messageId }
        });
        await updateLeadProfileFromMessage(conversationId, content, { username: senderName });

        // AI Logic
        if (aiEnabled) {
          const { data: history } = await supabaseAdmin
            .from('messages')
            .select('sender, content')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(10);

          const contextMessages = (history || []).reverse().map((m: ContextMessage) => ({
            role: m.sender === 'customer' ? 'user' as const : 'assistant' as const,
            content: m.content
          }));

          console.log(`[IG] Generating AI response for ${senderName}...`);
          const aiResponse = await generateAIResponse(systemPrompt, contextMessages, knowledgeBaseUrl);

          console.log(`[IG] Sending reply: "${aiResponse}"`);
          await this.ig.entity.directThread(thread.thread_id).broadcastText(aiResponse);

          await supabaseAdmin.from('messages').insert({
            conversation_id: conversationId,
            sender: 'assistant',
            content: aiResponse
          });
          await updateLeadProfileFromMessage(conversationId, aiResponse);
        } else {
          console.log("[IG] AI Disabled, skipping reply.");
        }
      }
    } catch (error: unknown) {
      console.error("[IG] Error checking messages:", error);
      throw error;
    }
  }

  async sendDirectMessage(threadId: string, content: string) {
    await this.ig.entity.directThread(threadId).broadcastText(content);
  }

  private async getOrCreateConversation(externalChatId: string, customerName: string) {
    const { data: existing } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('integration_id', this.integrationId)
      .eq('external_chat_id', externalChatId)
      .single();

    if (existing) return existing.id;

    const { data: newConv, error } = await supabaseAdmin
      .from('conversations')
      .insert({
        integration_id: this.integrationId,
        external_chat_id: externalChatId,
        customer_name: customerName
      })
      .select('id')
      .single();

    if (error) throw error;
    return newConv.id;
  }
}
