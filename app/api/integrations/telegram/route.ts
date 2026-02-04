import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
    try {
        const { user_id } = await req.json();

        if (!user_id) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        console.log("Activating TG bot for user:", user_id);

        // Проверяем, есть ли уже интеграция (через админа)
        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('integrations')
            .select('id')
            .eq('user_id', user_id)
            .eq('platform', 'tg_business')
            .maybeSingle(); // Используем maybeSingle, чтобы не кидать ошибку если нет записей

        if (fetchError) {
            console.error("Fetch Error:", fetchError);
            throw fetchError;
        }

        if (existing) {
            // Если есть - обновляем
            const { error: updateError } = await supabaseAdmin
                .from('integrations')
                .update({ is_active: true })
                .eq('id', existing.id);

            if (updateError) throw updateError;

            return NextResponse.json({ success: true, message: 'Integration reactivated' });
        }

        // Создаем новую
        const { error: insertError } = await supabaseAdmin.from('integrations').insert({
            user_id: user_id,
            platform: 'tg_business',
            is_active: true,
            system_prompt: 'You are a helpful assistant.',
            credentials_encrypted: '{}',
            session_data: {}
        });

        if (insertError) {
            console.error("Insert Error:", insertError);
            throw insertError;
        }

        // 4. Устанавливаем Webhook
        // Пытаемся взять URL из заголовков или переменной окружения
        const host = req.headers.get('host');
        const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

        // ВАЖНО: Telegram не работает с localhost, нужен ngrok или deploy
        // Но мы всё равно пытаемся, чтобы логика была

        // Импортируем сервис тут, т.к. он уже инициализирован
        const { telegramService } = await import('@/services/telegram/telegram.service');
        await telegramService.setWebhook(baseUrl);

        return NextResponse.json({ success: true, message: 'Integration active and webhook set' });

    } catch (error: any) {
        console.error("TG Connect Error:", error);
        return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
    }
}
