"use client"

import { useEffect, useState } from "react"
import { getUsers, updateUserSubscription, toggleAdminRole, createAdminUser } from "@/app/actions/admin-actions"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, RefreshCw, AlertCircle, LogOut, UserPlus, Key } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

export default function AdminPage() {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [createLoading, setCreateLoading] = useState(false)

    const refresh = async () => {
        setLoading(true)
        setError(null)
        try {
            const result = await getUsers()
            if (result.error) {
                setError(result.error)
            } else {
                setUsers(result.users || [])
            }
        } catch (e: any) {
            console.error("Critical component error:", e)
            setError("Unexpected client error")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        refresh()
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    const handleSub = async (id: string, type: 'active' | 'trial' | 'inactive') => {
        try {
            const days = type === 'active' ? 30 : type === 'trial' ? 14 : 0
            const res = await updateUserSubscription(id, type, days)
            if (res.error) alert("Error: " + res.error)
            await refresh()
        } catch (e: any) {
            alert("Error: " + e.message)
        }
    }

    const handleRole = async (id: string, isAdmin: boolean) => {
        try {
            const res = await toggleAdminRole(id, isAdmin)
            if (res.error) alert("Error: " + res.error)
            await refresh()
        } catch (e: any) {
            alert("Error: " + e.message)
        }
    }

    if (loading && users.length === 0) return (
        <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <RefreshCw className="w-8 h-8 animate-spin text-primary/40" />
            <p className="font-medium text-slate-400">Loading admin panel...</p>
        </div>
    )

    if (error) return (
        <div className="p-8 max-w-2xl mx-auto mt-10">
            <div className="bg-white border-2 border-red-100 rounded-2xl p-8 shadow-xl">
                <div className="flex items-center gap-3 text-red-600 mb-4">
                    <AlertCircle size={32} />
                    <h2 className="text-2xl font-bold tracking-tight">Access Restricted</h2>
                </div>
                <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 text-red-800 text-sm font-mono mb-6 leading-relaxed">
                    ERROR_CODE: {error}
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <Key size={16} className="text-blue-500" />
                            How to resolve this:
                        </h3>
                        <p className="text-slate-600 text-sm mb-3">
                            Your account exists but lacks the <b>admin</b> role.
                            Note that <i>Trial</i> status is strictly for content access and doesn't grant admin permissions.
                        </p>
                        <div className="bg-slate-900 text-slate-300 p-3 rounded text-[11px] font-mono whitespace-pre overflow-x-auto">
                            {`UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-logged-in-email@example.com';`}
                        </div>
                        <p className="mt-3 text-[10px] text-slate-400">
                            Run this in your Supabase SQL Editor.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Button onClick={refresh} variant="default" className="bg-blue-600 hover:bg-blue-700 h-10 px-6">
                            Try Again
                        </Button>
                        <Button onClick={handleLogout} variant="outline" className="gap-2 h-10 px-6">
                            <LogOut size={16} />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )

    return (
        <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600">Admin Dashboard</h1>
                    <p className="text-slate-500 mt-1">Unified User & System Management</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={refresh} variant="outline" size="sm" className="gap-2 bg-white" disabled={loading}>
                        <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
                        Refresh
                    </Button>
                    <Button onClick={handleLogout} variant="ghost" size="sm" className="gap-2 text-slate-500 hover:text-red-600 hover:bg-red-50">
                        <LogOut size={16} />
                        Logout
                    </Button>
                </div>
            </div>

            {/* Create User Section - Only visible if authorized */}
            <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
                <CardHeader className="border-b border-slate-50 bg-slate-50/30">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-blue-500" />
                        Create New User
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <form className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end" onSubmit={async (e) => {
                        e.preventDefault()
                        const formData = new FormData(e.currentTarget)
                        const email = formData.get('email') as string
                        const password = formData.get('password') as string
                        const name = formData.get('name') as string

                        setCreateLoading(true)
                        const res = await createAdminUser(email, password, name)
                        setCreateLoading(false)

                        if (res.error) {
                            alert("Error: " + res.error)
                        } else {
                            alert("User created successfully!")
                            refresh()
                            e.currentTarget.reset()
                        }
                    }}>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                            <input name="name" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-300" placeholder="John Doe" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                            <input name="email" type="email" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-300" placeholder="user@example.com" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
                            <input name="password" type="password" required minLength={6} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-300" placeholder="••••••••" />
                        </div>
                        <Button type="submit" disabled={createLoading} className="bg-blue-600 hover:bg-blue-700 h-[38px] font-bold tracking-tight">
                            {createLoading ? <RefreshCw className="animate-spin w-4 h-4" /> : "ADD ACCOUNT"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-50 p-6">
                    <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Shield className="text-blue-600 w-5 h-5" />
                        Registered Users ({users.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/50 text-slate-500 uppercase text-[9px] font-black tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Participant</th>
                                    <th className="px-6 py-4 text-center">System Role</th>
                                    <th className="px-6 py-4">Contract Status</th>
                                    <th className="px-6 py-4 text-right">Operations</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-16 text-center text-slate-300 italic text-lg">
                                            Empty Database. No users detected.
                                        </td>
                                    </tr>
                                ) : users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{user.full_name || 'Anonymous User'}</span>
                                                <span className="text-slate-400 text-xs">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleRole(user.id, user.role !== 'admin')}
                                                className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter border transition-all shadow-sm ${user.role === 'admin'
                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 px-4'
                                                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
                                                    }`}
                                            >
                                                {user.role}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border
                                                    ${user.subscription_status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                        user.subscription_status === 'trial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                            'bg-slate-50 text-slate-300 border-slate-200'}`}>
                                                    {user.subscription_status || 'NOT ASSIGNED'}
                                                </span>
                                                {user.subscription_ends_at && (
                                                    <span className="text-[10px] text-slate-400 font-mono font-medium">
                                                        EXP: {new Date(user.subscription_ends_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <Button size="sm" variant="outline" onClick={() => handleSub(user.id, 'trial')} className="h-7 text-[9px] px-2 font-black tracking-widest hover:bg-amber-50 hover:text-amber-700 border-slate-100">TRIAL</Button>
                                                <Button size="sm" variant="outline" onClick={() => handleSub(user.id, 'active')} className="h-7 text-[9px] px-2 font-black tracking-widest bg-slate-50/50 hover:bg-emerald-50 hover:text-emerald-700 border-slate-100">FULL</Button>
                                                <Button size="sm" variant="outline" onClick={() => handleSub(user.id, 'inactive')} className="h-7 text-[9px] px-2 font-black tracking-widest text-slate-300 hover:text-rose-600 hover:bg-rose-50 border-transparent">KILL</Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
