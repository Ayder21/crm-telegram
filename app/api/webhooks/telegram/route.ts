import { NextRequest, NextResponse } from 'next/server';
import { telegramService } from '@/services/telegram/telegram.service';
import { TelegramUpdate } from '@/types/telegram';

export async function POST(req: NextRequest) {
  try {
    const update: TelegramUpdate = await req.json();
    
    // Для business_message, connection_id часто лежит внутри самого апдейта,
    // но для надежности в сервисе мы будем искать его в свойствах апдейта или эмулировать.
    // В официальном API business_message приходит как поле в Update.
    
    // Прокидываем business_connection_id если он пришел отдельно (в некоторых случаях)
    // Но стандартно он не лежит в корне Update object для business_message (там просто объект business_message).
    // business_message содержит чат, и мы отвечаем в него. 
    // Для отправки НАМ НУЖЕН ID соединения.
    // Обычно он сохраняется при событии `business_connection`.
    
    await telegramService.handleWebhook(update);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
    return NextResponse.json({ status: "Webhook endpoint is active" });
}

