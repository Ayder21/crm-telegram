import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateAIResponse } from '@/services/openai.service';
import { updateLeadProfileFromMessage } from '@/services/crm/lead-profile.service';

type InstagramSessionData = Record<string, unknown> | null | undefined;

type ContextMessage = {
  sender: 'customer' | 'assistant' | 'user';
  content: string;
};

const RELAY_URL = process.env.IG_RELAY_URL || 'http://84.247.137.21:3005';
const RELAY_API_KEY = process.env.IG_RELAY_API_KEY || 'sellio-secret-relay-key-2026';

async function relayPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${RELAY_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': RELAY_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Relay ${path} failed (${res.status}): ${errText}`);
  }

  return res.json();
}

export class InstagramService {
  private integrationId: string;
  private userId: string;

  // Auth data passed to relay
  private username: string = '';
  private sessionid: string | null = null;
  private cookiesJson: unknown[] | null = null;

  constructor(integrationId: string, userId: string) {
    this.integrationId = integrationId;
    this.userId = userId;
  }

  async initialize(username: string, passwordOrSessionId?: string, sessionData?: InstagramSessionData) {
    this.username = username;

    // sessionData now stores the cookiesJson or raw sessionid (not a library session)
    if (sessionData && typeof sessionData === 'object') {
      const sd = sessionData as Record<string, unknown>;
      if (Array.isArray(sd.cookiesJson)) {
        this.cookiesJson = sd.cookiesJson as unknown[];
        console.log(`[IG] Loaded cookiesJson from sessionData for ${username}`);
        return;
      }
      if (sd.sessionid) {
        this.sessionid = sd.sessionid as string;
        console.log(`[IG] Loaded sessionid from sessionData for ${username}`);
        return;
      }
    }

    if (passwordOrSessionId) {
      // Detect JSON cookie array
      try {
        const parsed = JSON.parse(passwordOrSessionId);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name !== undefined) {
          this.cookiesJson = parsed;
          console.log(`[IG] JSON cookies detected for ${username}`);
          return;
        }
      } catch {
        // not JSON
      }
      // Fallback: treat as raw sessionid
      this.sessionid = passwordOrSessionId;
      console.log(`[IG] Session ID detected for ${username}`);
    }
  }

  private getAuthPayload() {
    return {
      cookiesJson: this.cookiesJson || undefined,
      sessionid: this.sessionid || undefined,
    };
  }

  private async saveSession() {
    // Store cookies back into session_data so they persist in Supabase
    const sessionObj = this.cookiesJson
      ? { cookiesJson: this.cookiesJson }
      : { sessionid: this.sessionid };

    await supabaseAdmin
      .from('integrations')
      .update({ session_data: sessionObj, updated_at: new Date().toISOString() })
      .eq('id', this.integrationId);
  }

  async checkNewMessages(systemPrompt: string, aiEnabled: boolean = true, knowledgeBaseUrl?: string) {
    console.log(`[IG] Checking messages via VPS relay for ${this.integrationId}...`);

    const result = await relayPost('/api/ig/check_messages', this.getAuthPayload());


    const threads: unknown[] = result.threads || [];
    const myUserIdStr: string | undefined = result.myUserId;

    for (const thread of threads as Record<string, unknown>[]) {
      const items = (thread.items as Record<string, unknown>[]) || [];
      const lastItem = items[0];
      if (!lastItem || lastItem.item_type !== 'text') continue;

      // Skip messages sent by ourselves
      if (myUserIdStr && String(lastItem.user_id) === String(myUserIdStr)) continue;

      const externalChatId = thread.thread_id as string;
      const messageId = lastItem.item_id as string;
      const users = (thread.users as Record<string, unknown>[]) || [];
      const senderUser = users.find(u => String(u.pk) === String(lastItem.user_id));
      const senderName = (senderUser?.username as string) || 'Unknown';
      const content = lastItem.text as string;
      if (!content) continue;

      const conversationId = await this.getOrCreateConversation(externalChatId, senderName);

      const { data: lastMsg } = await supabaseAdmin
        .from('messages')
        .select('metadata')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const lastSavedId = (lastMsg?.metadata as Record<string, unknown>)?.message_id;
      if (lastSavedId === messageId) continue;

      console.log(`[IG] New message from ${senderName}: ${content}`);

      await supabaseAdmin.from('messages').insert({
        conversation_id: conversationId,
        sender: 'customer',
        content: content,
        metadata: { message_id: messageId }
      });
      await updateLeadProfileFromMessage(conversationId, content, { username: senderName });

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
        await this.sendDirectMessage(externalChatId, aiResponse);

        await supabaseAdmin.from('messages').insert({
          conversation_id: conversationId,
          sender: 'assistant',
          content: aiResponse
        });
        await updateLeadProfileFromMessage(conversationId, aiResponse);
      } else {
        console.log('[IG] AI Disabled, skipping reply.');
      }
    }
  }

  async sendDirectMessage(threadId: string, content: string) {
    const result = await relayPost('/api/ig/send_message', {
      ...this.getAuthPayload(),
      threadId,
      text: content,
    });

    // Persist updated session after sending
    if (result.updatedSessionData) {
      await this.saveSession();
    }
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
