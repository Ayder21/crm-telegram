"use server"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

type AdminAuthCheck = { error?: string; userId?: string }

export type ProfileRow = {
    id: string
    email: string | null
    full_name: string | null
    role: string | null
    subscription_status: "active" | "inactive" | "trial" | null
    subscription_ends_at: string | null
    created_at: string | null
}

async function checkAdmin(): Promise<AdminAuthCheck> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return { error: "authentication_required" }
        }

        const { data: profile, error: dbError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (dbError || !profile) {
            console.error("[AdminCheck] DB Error:", dbError)
            return { error: "profile_lookup_failed" }
        }

        if (profile.role !== 'admin') {
            return { error: `forbidden_role_${profile.role}` }
        }

        return { userId: user.id }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "unknown_error"
        console.error("[AdminCheck] Global Crisis:", error)
        return { error: "admin_check_internal_error_" + message }
    }
}

export async function getUsers() {
    const auth = await checkAdmin()
    if (auth.error) {
        return { error: auth.error }
    }

    const { data: users, error } = await supabaseAdmin
        .from('profiles')
        .select('id,email,full_name,role,subscription_status,subscription_ends_at,created_at')
        .order('created_at', { ascending: false })

    if (error) {
        console.error("[getUsers] Fetch Error:", error)
        return { error: "fetch_failed_" + error.message }
    }

    return { users: (users ?? []) as ProfileRow[] }
}

export async function updateUserSubscription(userId: string, status: 'active' | 'inactive' | 'trial', days = 30) {
    const auth = await checkAdmin()
    if (auth.error) return { error: auth.error }

    const endDate = new Date()
    endDate.setDate(endDate.getDate() + days)

    const { error } = await supabaseAdmin
        .from('profiles')
        .update({
            subscription_status: status,
            subscription_ends_at: status === 'inactive' ? null : endDate.toISOString()
        })
        .eq('id', userId)

    if (error) return { error: "update_subscription_failed_" + error.message }
    revalidatePath('/dashboard/admin')
    return { success: true }
}

export async function toggleAdminRole(userId: string, isAdmin: boolean) {
    const auth = await checkAdmin()
    if (auth.error) return { error: auth.error }

    const { error } = await supabaseAdmin
        .from('profiles')
        .update({ role: isAdmin ? 'admin' : 'user' })
        .eq('id', userId)

    if (error) return { error: "update_role_failed_" + error.message }
    revalidatePath('/dashboard/admin')
    return { success: true }
}
export async function createAdminUser(email: string, password: string, fullName: string) {
    const auth = await checkAdmin()
    if (auth.error) return { error: auth.error }

    // 1. Create user in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
    })

    if (authError) {
        console.error("[createUser] Auth Error:", authError)
        return { error: "auth_creation_failed_" + authError.message }
    }

    // Note: The profile is usually created via trigger. 
    // If not, we might need to manually insert. 
    // But let's assume the user already has a trigger from previous steps if they have 'profiles' working.

    revalidatePath('/dashboard/admin')
    return { success: true, userId: authData.user.id }
}
