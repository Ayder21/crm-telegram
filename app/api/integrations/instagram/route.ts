import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { encrypt } from '@/lib/crypto';

export async function POST(req: NextRequest) {
  try {
    const { username, access_token, user_id } = await req.json();

    if (!access_token) {
      return NextResponse.json({ error: 'Missing access_token' }, { status: 400 });
    }

    // Store the access token in session_data
    const sessionObj = { access_token };

    // Also encrypt credentials for legacy compatibility
    const credentials = JSON.stringify({ username: username || 'instagram', password: access_token });
    const encrypted = encrypt(credentials);

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
