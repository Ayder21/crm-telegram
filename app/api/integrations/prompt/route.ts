import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { userId, prompt, aiEnabled, knowledgeBase } = await req.json();

    if (!userId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    // Собираем объект обновления динамически
    const updates: Record<string, string | boolean> = { updated_at: new Date().toISOString() };
    if (prompt !== undefined) updates.system_prompt = prompt;
    if (aiEnabled !== undefined) updates.ai_enabled = aiEnabled;
    if (knowledgeBase !== undefined) updates.knowledge_base_url = knowledgeBase;

    console.log(`Updating settings for user ${userId}:`, updates);

    // Обновляем во всех интеграциях пользователя
    const { error } = await supabaseAdmin
        .from('integrations')
        .update(updates)
        .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Settings Update Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
