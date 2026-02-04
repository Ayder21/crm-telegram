
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or Service Key')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function resetPassword() {
    const email = process.argv[2]
    const newPassword = process.argv[3] || '12345678'

    if (!email) {
        console.log('Usage: npx tsx scripts/reset-password.ts <email> [new_password]')
        process.exit(1)
    }

    console.log(`Resetting password for ${email} to ${newPassword}...`)

    const { data, error } = await supabase.auth.admin.updateUserById(
        // We need UID, but usually we can search by email or list users.
        // updateAuthUser by email is not directly available in all versions, 
        // but updateUserById is. Let's find user first.
        '',
        { password: newPassword }
    ).catch(() => ({ data: null, error: null }))

    // Actually, wait, admin.updateUserById requires ID. 
    // admin.listUsers() is better to find the ID.

    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
        console.error('Error listing users:', listError)
        return
    }

    const user = users.find(u => u.email === email)

    if (!user) {
        console.error(`User with email ${email} not found.`)
        console.log('Available users:', users.map(u => u.email).join(', '))
        return
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
    )

    if (updateError) {
        console.error('Error updating password:', updateError)
    } else {
        console.log('Success! Password updated.')
    }
}

resetPassword()
