import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { InstagramService } from '@/services/instagram/instagram.service';
import { decrypt } from '@/lib/crypto';

export async function GET() {
  try {
    console.log("Starting IG Cron Job...");

    // 1. Получаем все активные инстаграм интеграции
    const { data: integrations, error } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('platform', 'instagram')
      .eq('is_active', true);

    if (error) {
        console.error("DB Error:", error);
        return NextResponse.json({ error: error.message });
    }

    if (!integrations || integrations.length === 0) {
        console.log("No active IG integrations found.");
        return NextResponse.json({ message: 'No active integrations' });
    }

    console.log(`Found ${integrations.length} integrations to process.`);

    // 2. Обрабатываем каждую интеграцию
    const results = await Promise.allSettled(integrations.map(async (integration) => {
        console.log(`Processing integration ${integration.id}...`);
        try {
            const service = new InstagramService(integration.id, integration.user_id);
            
            let username, password;
            if (integration.credentials_encrypted) {
                try {
                    const decrypted = decrypt(integration.credentials_encrypted);
                    const creds = JSON.parse(decrypted);
                    username = creds.username;
                    password = creds.password; // Здесь теперь лежит Session ID, если мы сохранили его через UI
                } catch (e) {
                    console.error(`Failed to decrypt credentials for ${integration.id}:`, e);
                    throw new Error("Credentials decryption failed");
                }
            }

            if (!username) throw new Error("No username found in credentials");

            console.log(`Initializing service for user: ${username}`);
            
            // Инициализируем
            await service.initialize(username, password, integration.session_data);

            // Проверяем сообщения
            await service.checkNewMessages(
                integration.system_prompt || "You are a helpful assistant.",
                integration.ai_enabled ?? true,
                integration.knowledge_base_url
            );
            
            return { id: integration.id, status: 'success' };
        } catch (err: any) {
            console.error(`CRITICAL Error processing IG integration ${integration.id}:`, err);
            return { id: integration.id, status: 'error', error: err.message, stack: err.stack };
        }
    }));
    
    const errors = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status === 'error'));
    if (errors.length > 0) {
        console.log("IG Processing Errors Summary:", JSON.stringify(errors, null, 2));
    }

    return NextResponse.json({ 
        success: true, 
        results 
    });

  } catch (error) {
    console.error('Global Cron Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
