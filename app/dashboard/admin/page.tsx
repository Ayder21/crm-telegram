"use client"

import { useEffect, useState } from "react"
import { getUsers, updateUserSubscription, toggleAdminRole } from "@/app/actions/admin-actions"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield } from "lucide-react"

export default function AdminPage() {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const refresh = async () => {
        /*
        setLoading(true)
        setError(null)
        try {
            const data = await getUsers()
            setUsers(data || [])
        } catch (e: any) {
            console.error("Failed to load users:", e)
            setError(e.message || "Failed to load users")
        } finally {
            setLoading(false)
        }
        */
    }

    useEffect(() => {
        refresh()
    }, [])

    const handleSub = async (id: string, type: 'active' | 'trial' | 'inactive') => {
        const days = type === 'active' ? 30 : type === 'trial' ? 14 : 0
        await updateUserSubscription(id, type, days)
        refresh()
    }

    const handleRole = async (id: string, isAdmin: boolean) => {
        await toggleAdminRole(id, isAdmin)
        refresh()
    }

    if (loading) return <div className="p-8 font-medium animate-pulse text-slate-500">Loading admin panel...</div>

    if (error) return (
        <div className="p-8 text-red-500 max-w-2xl">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                <Shield size={20} />
                Error Accessing Admin Panel
            </h2>
            <p className="bg-red-50 p-4 rounded border border-red-100">{error}</p>
            <Button onClick={refresh} className="mt-4">Try Again</Button>
        </div>
    )

    return (
        <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-white border-b border-slate-100 mb-6">
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
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4 text-center">Role</th>
                                    <th className="px-6 py-4">Subscription Status</th>
                                    <th className="px-6 py-4 text-right">Settings</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                                                <p className="italic text-[15px]">No users to display yet.</p>
                                                <p className="text-xs">Data fetching is currently disabled for isolation testing.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900">{user.full_name || 'No Name'}</span>
                                                <span className="text-slate-500 text-xs">{user.email}</span>
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
                                                <Button size="sm" variant="outline" onClick={() => handleSub(user.id, 'active')} className="h-7 text-[10px] px-2 font-semibold">MONTH</Button>
                                                <Button size="sm" variant="outline" onClick={() => handleSub(user.id, 'inactive')} className="h-7 text-[10px] px-2 font-semibold text-red-500 hover:text-red-600">OFF</Button>
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
