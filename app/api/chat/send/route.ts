import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/admin';
import { telegramService } from '@/services/telegram/telegram.service';
import { InstagramService } from '@/services/instagram/instagram.service';
import { decrypt } from '@/lib/crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversation_id, content } = body;

    if (!conversation_id || !content) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // 1. Получаем чат и интеграцию
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*, integrations(*)')
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const integration = conversation.integrations;
    const platform = integration.platform;

    // 2. Отправляем сообщение
    if (platform === 'tg_business') {
      // Для ТГ нам нужен business_connection_id из сессии
      const connectionId = integration.session_data?.business_connection_id;
      await telegramService.sendTelegramMessage(conversation.external_chat_id, content, connectionId);
    }
    else if (platform === 'instagram') {
      // Для IG инициализируем сервис
      const service = new InstagramService(integration.id, integration.user_id);

      // Восстанавливаем сессию
      let username, password;
      if (integration.credentials_encrypted) {
        const creds = JSON.parse(decrypt(integration.credentials_encrypted));
        username = creds.username;
        password = creds.password;
      }
      // Логин
      await service.initialize(username || "unknown", password, integration.session_data);

      // Отправка
      await service.sendDirectMessage(conversation.external_chat_id, content);
    }

    // 3. Сохраняем в БД (как assistant, но по факту это user/operator)
    // Можно добавить sender: 'user' в типы, если мы хотим различать AI и человека
    // В текущей схеме у нас есть 'user', 'assistant', 'customer'.
    // Пусть оператор будет 'user' (или 'assistant' с пометкой).
    // Используем 'assistant' для простоты UI, так как он справа.

    const { error: saveError } = await supabase.from('messages').insert({
      conversation_id: conversation_id,
      sender: 'assistant',
      content: content,
      metadata: { is_manual: true } // Помечаем, что это ручная отправка
    });

    if (saveError) throw saveError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Send Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

