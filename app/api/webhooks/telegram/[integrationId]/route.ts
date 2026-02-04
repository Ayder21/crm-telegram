import { NextRequest, NextResponse } from 'next/server';
import { telegramService } from '@/services/telegram/telegram.service';
import { TelegramUpdate } from '@/types/telegram';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/encryption';

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ integrationId: string }> }
) {
    try {
        const { integrationId } = await context.params;
        const update: TelegramUpdate = await req.json();

        console.log('📨 Webhook received for integration:', integrationId);
        console.log('📨 Update type:', update.message ? 'message' : update.business_message ? 'business_message' : 'other');

        // Check env variables
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        console.log('🔧 Supabase URL:', supabaseUrl ? 'set' : 'MISSING');
        console.log('🔧 Service Key:', serviceKey ? 'set (length: ' + serviceKey.length + ')' : 'MISSING');

        // Fetch the integration to get the bot token
        console.log('🔍 Looking for integration with ID:', integrationId);

        const { data: integration, error } = await supabaseAdmin
            .from('integrations')
            .select('*')
            .eq('id', integrationId)
            .eq('platform', 'tg_business')
            .eq('is_active', true)
            .single();

        console.log('🔍 Query result - error:', JSON.stringify(error));
        console.log('🔍 Query result - data:', integration ? `found (id: ${integration.id})` : 'null');

        if (error || !integration) {
            console.error('❌ Integration not found:', integrationId);
            console.error('❌ Error details:', JSON.stringify(error, null, 2));
            return NextResponse.json({
                error: 'Integration not found',
                details: error?.message || 'No integration with this ID',
                integrationId
            }, { status: 404 });
        }

        console.log('✅ Integration found:', integration.id);

        // Decrypt the bot token
        const botToken = decrypt(integration.bot_token_encrypted || '');
        if (!botToken) {
            console.error('❌ Bot token not configured for integration:', integrationId);
            return NextResponse.json({ error: 'Bot token not configured' }, { status: 400 });
        }

        console.log('🔑 Bot token decrypted successfully');

        // Pass the integration context to the service
        await telegramService.handleWebhook(update, integration, botToken);

        console.log('✅ Webhook processed successfully');
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('❌ Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ status: 'Webhook endpoint is active' });
}
