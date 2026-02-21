import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { encrypt } from '@/lib/crypto';

const RELAY_URL = process.env.IG_RELAY_URL || 'http://84.247.137.21:3005';
const RELAY_API_KEY = process.env.IG_RELAY_API_KEY || 'sellio-secret-relay-key-2026';

export async function POST(req: NextRequest) {
  try {
    const { username, password, user_id } = await req.json();

    if (!username || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    // Step 1: Login via VPS relay to get a VPS-IP-trusted session
    console.log(`[IG Connect] Logging in as ${username} via VPS relay...`);
    const loginRes = await fetch(`${RELAY_URL}/api/ig/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': RELAY_API_KEY,
      },
      body: JSON.stringify({ username, password }),
    });

    const loginData = await loginRes.json();

    if (!loginData.success) {
      console.error('[IG Connect] VPS login failed:', loginData.error);
      return NextResponse.json(
        { error: `Instagram login failed: ${loginData.error || 'Unknown error'}` },
        { status: 400 }
      );
    }

    console.log(`[IG Connect] VPS login success for ${username}`);

    // Step 2: Save encrypted credentials + session data to Supabase
    const credentials = JSON.stringify({ username, password });
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
        session_data: loginData.sessionData, // VPS-bound session
        is_active: true,
        updated_at: new Date().toISOString()
      }).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from('integrations').insert({
        user_id: user_id,
        platform: 'instagram',
        credentials_encrypted: encrypted,
        session_data: loginData.sessionData, // VPS-bound session
        is_active: true,
        system_prompt: 'You are a helpful assistant.'
      });
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("IG Connect Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
