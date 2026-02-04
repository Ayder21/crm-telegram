"use server"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

async function checkAdmin(): Promise<{ error?: string, userId?: string }> {
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
    } catch (e: any) {
        console.error("[AdminCheck] Global Crisis:", e)
        return { error: "admin_check_internal_error_" + e.message }
    }
}

export async function getUsers() {
    const auth = await checkAdmin()
    if (auth.error) {
        // We throw a specific string that we can catch and parse on the client
        throw new Error(auth.error)
    }

    const { data: users, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error("[getUsers] Fetch Error:", error)
        throw new Error("fetch_failed_" + error.message)
    }

    return users
}

export async function updateUserSubscription(userId: string, status: 'active' | 'inactive' | 'trial', days = 30) {
    const auth = await checkAdmin()
    if (auth.error) throw new Error(auth.error)

    const endDate = new Date()
    endDate.setDate(endDate.getDate() + days)

    const { error } = await supabaseAdmin
        .from('profiles')
        .update({
            subscription_status: status,
            subscription_ends_at: status === 'inactive' ? null : endDate.toISOString()
        })
        .eq('id', userId)

    if (error) throw new Error("update_subscription_failed_" + error.message)
    revalidatePath('/dashboard/admin')
    return { success: true }
}

export async function toggleAdminRole(userId: string, isAdmin: boolean) {
    const auth = await checkAdmin()
    if (auth.error) throw new Error(auth.error)

    const { error } = await supabaseAdmin
        .from('profiles')
        .update({ role: isAdmin ? 'admin' : 'user' })
        .eq('id', userId)

    if (error) throw new Error("update_role_failed_" + error.message)
    revalidatePath('/dashboard/admin')
    return { success: true }
}
