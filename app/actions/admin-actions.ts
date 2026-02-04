"use server"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

async function checkAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        throw new Error("Forbidden: Admins only")
    }
}

export async function getUsers() {
    await checkAdmin()

    const { data: users, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching users:", error)
        return []
    }

    return users
}

export async function updateUserSubscription(userId: string, status: 'active' | 'inactive' | 'trial', days = 30) {
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + days)

    const { error } = await supabaseAdmin
        .from('profiles')
        .update({
            subscription_status: status,
            subscription_ends_at: status === 'inactive' ? null : endDate.toISOString()
        })
        .eq('id', userId)

    if (error) throw error
    revalidatePath('/dashboard/admin')
}

export async function toggleAdminRole(userId: string, isAdmin: boolean) {
    const { error } = await supabaseAdmin
        .from('profiles')
        .update({ role: isAdmin ? 'admin' : 'user' })
        .eq('id', userId)

    if (error) throw error
    revalidatePath('/dashboard/admin')
}
