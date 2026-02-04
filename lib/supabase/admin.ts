import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("Supabase Admin keys missing! Check env vars.")
}

export const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  : new Proxy({} as any, {
    get: (target, prop) => {
      // Prevent crashes when React/Next.js probes for internal properties during SSR
      if (prop === '$$typeof' || prop === 'then' || typeof prop === 'symbol') {
        return undefined
      }
      throw new Error("Supabase Admin not initialized. Check SUPABASE_SERVICE_ROLE_KEY.")
    }
  })

