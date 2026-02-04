import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { encrypt, decrypt } from '@/lib/encryption';

export async function POST(req: NextRequest) {
    try {
        const { userId, botToken, knowledgeBaseUrl } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // Check if integration exists
        const { data: existing } = await supabaseAdmin
            .from('integrations')
            .select('*')
            .eq('user_id', userId)
            .eq('platform', 'tg_business')
            .single();

        const updates: any = {
            is_active: true,
        };

        if (botToken) {
            updates.bot_token_encrypted = encrypt(botToken);
        }

        if (knowledgeBaseUrl !== undefined) {
            updates.knowledge_base_url = knowledgeBaseUrl;
        }

        let integrationId: string;
        let tokenToUse = botToken;

        if (existing) {
            // Update existing integration
            await supabaseAdmin
                .from('integrations')
                .update(updates)
                .eq('id', existing.id);

            integrationId = existing.id;

            // If no new token provided, use existing one
            if (!botToken && existing.bot_token_encrypted) {
                tokenToUse = decrypt(existing.bot_token_encrypted);
            }
        } else {
            // Create new integration
            const { data: newIntegration, error } = await supabaseAdmin
                .from('integrations')
                .insert({
                    user_id: userId,
                    platform: 'tg_business',
                    ...updates,
                })
                .select()
                .single();

            if (error || !newIntegration) {
                return NextResponse.json({ error: 'Failed to create integration' }, { status: 500 });
            }

            integrationId = newIntegration.id;
        }

        // Auto-register webhook if we have a token
        if (tokenToUse) {
            const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/api/webhooks/telegram/${integrationId}`;

            console.log('🔧 Registering webhook:', webhookUrl);
            console.log('🔑 Using bot token:', tokenToUse.substring(0, 10) + '...');

            const telegramResponse = await fetch(
                `https://api.telegram.org/bot${tokenToUse}/setWebhook`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: webhookUrl }),
                }
            );

            const telegramData = await telegramResponse.json();
            console.log('📡 Telegram response:', telegramData);

            if (!telegramData.ok) {
                console.error('❌ Webhook registration failed:', telegramData);
                return NextResponse.json(
                    { error: `Telegram API Error: ${telegramData.description}` },
                    { status: 400 }
                );
            }

            console.log('✅ Webhook registered successfully!');
            return NextResponse.json({
                success: true,
                integrationId,
                webhookUrl,
                message: 'Webhook установлен автоматически!',
            });
        }

        return NextResponse.json({
            success: true,
            integrationId,
            message: 'Настройки сохранены',
        });
    } catch (error: any) {
        console.error('Save integration error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
