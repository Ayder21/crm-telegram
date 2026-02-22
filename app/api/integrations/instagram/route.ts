import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { encrypt } from '@/lib/crypto';

export async function POST(req: NextRequest) {
  try {
    const { username, password: sessionIdOrCookies, user_id } = await req.json();

    if (!username || !sessionIdOrCookies) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const credentials = JSON.stringify({ username, password: sessionIdOrCookies });
    const encrypted = encrypt(credentials);

    // Parse cookies into a structured form for session_data
    let sessionObj: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(sessionIdOrCookies);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name !== undefined) {
        sessionObj = { cookiesJson: parsed };
      }
    } catch {
      // Not JSON — treat as raw sessionid
      sessionObj = { sessionid: sessionIdOrCookies };
    }

    const { data: existing } = await supabaseAdmin
      .from('integrations')
      .select('id')
      .eq('user_id', user_id)
      .eq('platform', 'instagram')
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin.from('integrations').update({
        credentials_encrypted: encrypted,
        session_data: sessionObj,
        is_active: true,
        updated_at: new Date().toISOString()
      }).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from('integrations').insert({
        user_id,
        platform: 'instagram',
        credentials_encrypted: encrypted,
        session_data: sessionObj,
        is_active: true,
        system_prompt: 'You are a helpful assistant.'
      });
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('IG Connect Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
