import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin'; // <-- ИСПОЛЬЗУЕМ ADMIN
import { encrypt } from '@/lib/crypto';

export async function POST(req: NextRequest) {
  try {
    const { username, password, user_id } = await req.json();

    if (!username || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const credentials = JSON.stringify({ username, password });
    const encrypted = encrypt(credentials);

    // Проверяем существование
    const { data: existing } = await supabaseAdmin
      .from('integrations')
      .select('id')
      .eq('user_id', user_id)
      .eq('platform', 'instagram')
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin.from('integrations').update({
        credentials_encrypted: encrypted,
        session_data: null, // Clear old session data so it uses the new sessionid
        is_active: true, // <-- УБЕЖДАЕМСЯ ЧТО АКТИВНА
        updated_at: new Date().toISOString()
      }).eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from('integrations').insert({
        user_id: user_id,
        platform: 'instagram',
        credentials_encrypted: encrypted,
        is_active: true,
        system_prompt: 'You are a helpful assistant.'
      });

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("IG Connect Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
