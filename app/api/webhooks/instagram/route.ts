import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateAIResponse } from '@/services/openai.service';
import { updateLeadProfileFromMessage } from '@/services/crm/lead-profile.service';

const VERIFY_TOKEN = process.env.IG_VERIFY_TOKEN || 'sellio';
const GRAPH_API = 'https://graph.facebook.com/v19.0';

// ── Webhook Verification (GET) ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('[IG Webhook] Verification OK');
        return new NextResponse(challenge, { status: 200 });
    }

    console.error('[IG Webhook] Verification FAILED', { mode, token });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ── Message Receiver (POST) ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // RAW DEBUG LOG — prints everything Meta sends
        console.log('[IG Webhook] RAW BODY:', JSON.stringify(body, null, 2));

        // Meta sends a top-level 'object' field
        if (body.object !== 'instagram') {
            console.log('[IG Webhook] Ignored — object is:', body.object);
            return NextResponse.json({ status: 'ignored' });
        }

        for (const entry of body.entry || []) {
            for (const event of entry.messaging || []) {
                // Only handle incoming customer messages (not echoes of our own sends)
                if (!event.message || event.message.is_echo) continue;

                const senderId = event.sender.id as string;  // customer IGSID
                const recipientId = event.recipient.id as string; // our page IGSID
                const text: string = event.message.text;
                if (!text) continue;

                console.log(`[IG Webhook] Message from ${senderId}: ${text}`);

                // Find the integration by the page IGSID stored in credentials
                const { data: integrations } = await supabaseAdmin
                    .from('integrations')
                    .select('id, user_id, credentials_encrypted, session_data, system_prompt, ai_enabled, knowledge_base_url')
                    .eq('platform', 'instagram')
                    .eq('is_active', true);

                if (!integrations || integrations.length === 0) {
                    console.error('[IG Webhook] No active Instagram integrations found');
                    continue;
                }

                // Find the integration matching this recipient page id
                let integration = integrations.find((i) => {
                    const sd = i.session_data as Record<string, unknown> | null;
                    return sd?.page_id === recipientId || sd?.igsid === recipientId;
                });

                // If only one integration exists, use it as fallback
                if (!integration && integrations.length === 1) {
                    integration = integrations[0];
                }

                if (!integration) {
                    console.error('[IG Webhook] No matching integration for recipient', recipientId);
                    continue;
                }

                const accessToken = (integration.session_data as Record<string, unknown>)?.access_token as string;
                if (!accessToken) {
                    console.error('[IG Webhook] No access_token in session_data');
                    continue;
                }

                // Get or create conversation
                const { id: conversationId, status } = await getOrCreateConversation(integration.id, senderId, senderId);

                // If the conversation already reached its goal, stop responding
                const isCompleted = ['waiting_call', 'scheduled', 'closed_won', 'closed_lost'].includes(status);

                // Check for duplicate message
                const { data: lastMsg } = await supabaseAdmin
                    .from('messages')
                    .select('metadata')
                    .eq('conversation_id', conversationId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                const lastMsgId = (lastMsg?.metadata as Record<string, unknown>)?.message_id;
                if (lastMsgId === event.message.mid) continue;

                // Save customer message
                await supabaseAdmin.from('messages').insert({
                    conversation_id: conversationId,
                    sender: 'customer',
                    content: text,
                    metadata: { message_id: event.message.mid }
                });
                await updateLeadProfileFromMessage(conversationId, text, { username: senderId });

                // Generate & send AI reply
                const aiEnabled = integration.ai_enabled !== false;
                if (aiEnabled && !isCompleted) {
                    const { data: history } = await supabaseAdmin
                        .from('messages')
                        .select('sender, content')
                        .eq('conversation_id', conversationId)
                        .order('created_at', { ascending: false })
                        .limit(10);

                    const contextMessages = (history || []).reverse().map((m) => ({
                        role: m.sender === 'customer' ? 'user' as const : 'assistant' as const,
                        content: m.content as string,
                    }));

                    const systemPrompt = integration.system_prompt || 'You are a helpful assistant.';
                    const aiReply = await generateAIResponse(systemPrompt, contextMessages, integration.knowledge_base_url);

                    // Handle status updates within the AI reply
                    let finalResponse = aiReply;
                    const statusMatch = aiReply.match(/\[\[UPDATE_STATUS:\s*([a-z_]+)\s*\]\]/);
                    if (statusMatch) {
                        const newStatus = statusMatch[1];
                        finalResponse = aiReply.replace(statusMatch[0], "").trim();
                        console.log(`[IG Webhook] AI changing status to: ${newStatus}`);
                        await supabaseAdmin
                            .from('conversations')
                            .update({ status: newStatus })
                            .eq('id', conversationId);
                    }

                    if (finalResponse) {
                        console.log(`[IG Webhook] Sending reply to ${senderId}: "${finalResponse}"`);
                        await sendIgMessage(accessToken, senderId, finalResponse);
                    }

                    await supabaseAdmin.from('messages').insert({
                        conversation_id: conversationId,
                        sender: 'assistant',
                        content: finalResponse || "(Status Update Only)",
                    });
                    if (finalResponse) {
                        await updateLeadProfileFromMessage(conversationId, finalResponse);
                    }
                } else if (isCompleted) {
                    console.log(`[IG Webhook] Conversation ${conversationId} is completed (status: ${status}). Ignoring message for AI.`);
                }
            }
        }

        return NextResponse.json({ status: 'ok' });
    } catch (err) {
        console.error('[IG Webhook] Error:', err);
        // Always return 200 to Meta so it doesn't retry
        return NextResponse.json({ status: 'error' }, { status: 200 });
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
async function sendIgMessage(accessToken: string, recipientIgsid: string, text: string) {
    const res = await fetch(`${GRAPH_API}/me/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            recipient: { id: recipientIgsid },
            message: { text },
            access_token: accessToken,
        }),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Graph API send failed: ${err}`);
    }
}

async function getOrCreateConversation(integrationId: string, externalChatId: string, customerName: string) {
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
