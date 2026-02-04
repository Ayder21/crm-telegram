import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

  // Получаем интеграции
  const { data: integrations } = await supabaseAdmin
    .from('integrations')
    .select('id, platform, is_active, system_prompt, ai_enabled, knowledge_base_url, updated_at')
    .eq('user_id', userId);

  const ig = integrations?.find(i => i.platform === 'instagram' && i.is_active);
  const tg = integrations?.find(i => i.platform === 'tg_business' && i.is_active);

  // Берем общие настройки из любой интеграции
  const anyIntegration = ig || tg;
  const systemPrompt = anyIntegration?.system_prompt || "You are a helpful assistant.";
  const aiEnabled = anyIntegration?.ai_enabled ?? true; // Default true
  const knowledgeBase = anyIntegration?.knowledge_base_url || "";

  return NextResponse.json({
    instagram: !!ig,
    telegram: !!tg,
    systemPrompt,
    aiEnabled,
    knowledgeBase,
    lastSync: anyIntegration?.updated_at
  });
}

