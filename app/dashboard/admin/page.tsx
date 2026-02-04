"use client"

import { useEffect, useState } from "react"
import { getUsers, updateUserSubscription, toggleAdminRole } from "@/app/actions/admin-actions"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, RefreshCw, AlertCircle } from "lucide-react"

export default function AdminPage() {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

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

    const handleSub = async (id: string, type: 'active' | 'trial' | 'inactive') => {
        try {
            const days = type === 'active' ? 30 : type === 'trial' ? 14 : 0
            await updateUserSubscription(id, type, days)
            await refresh()
        } catch (e: any) {
            alert("Error: " + e.message)
        }
    }

    const handleRole = async (id: string, isAdmin: boolean) => {
        try {
            await toggleAdminRole(id, isAdmin)
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
                <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 text-red-800 text-sm font-medium mb-6 leading-relaxed">
                    {error}
                </div>
                <div className="space-y-4">
                    <p className="text-slate-500 text-sm">
                        If this is an authorization error, make sure your email is listed as an <b>admin</b> in the Supabase <code>profiles</code> table.
                    </p>
                    <div className="flex gap-3">
                        <Button onClick={refresh} variant="default" className="bg-red-600 hover:bg-red-700">
                            Try Again
                        </Button>
                        <Button onClick={() => window.location.href = '/dashboard'} variant="outline">
                            Back to Dashboard
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
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
                    <p className="text-slate-500 mt-1">Manage users and subscription tiers</p>
                </div>
                <Button onClick={refresh} variant="outline" size="sm" className="gap-2" disabled={loading}>
                    <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
                    Refresh
                </Button>
            </div>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100 p-6">
                    <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                        <Shield className="text-primary w-5 h-5" />
                        Users Management ({users.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">User Details</th>
                                    <th className="px-6 py-4 text-center">System Role</th>
                                    <th className="px-6 py-4">Subscription</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                                                <p className="italic text-[15px]">No users found in database.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900">{user.full_name || 'No Name'}</span>
                                                <span className="text-slate-500 text-xs">{user.email}</span>
                                                <span className="text-slate-300 text-[9px] font-mono mt-0.5">{user.id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleRole(user.id, user.role !== 'admin')}
                                                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-all ${user.role === 'admin'
                                                    ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 shadow-sm'
                                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                            >
                                                {user.role}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border
                                                    ${user.subscription_status === 'active' ? 'bg-green-50 text-green-700 border-green-200 shadow-sm' :
                                                        user.subscription_status === 'trial' ? 'bg-orange-50 text-orange-700 border-orange-200 shadow-sm' :
                                                            'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                                    {user.subscription_status || 'inactive'}
                                                </span>
                                                {user.subscription_ends_at && (
                                                    <span className="text-[11px] text-slate-400 font-medium">
                                                        {new Date(user.subscription_ends_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1.5">
                                                <Button size="sm" variant="outline" onClick={() => handleSub(user.id, 'trial')} className="h-7 text-[10px] px-2 font-semibold">TRIAL</Button>
                                                <Button size="sm" variant="outline" onClick={() => handleSub(user.id, 'active')} className="h-7 text-[10px] px-2 font-semibold bg-green-50/50 hover:bg-green-50 text-green-700 border-green-100">MONTH</Button>
                                                <Button size="sm" variant="outline" onClick={() => handleSub(user.id, 'inactive')} className="h-7 text-[10px] px-2 font-semibold text-red-500 hover:text-red-600 border-red-100">OFF</Button>
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
