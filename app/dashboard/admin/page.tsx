"use client"

import { useEffect, useState } from "react"
import { getUsers, updateUserSubscription, toggleAdminRole } from "@/app/actions/admin-actions"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "lucide-react" // Importing icon as badge placeholder or just use span

export default function AdminPage() {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const refresh = async () => {
        setLoading(true)
        const data = await getUsers()
        setUsers(data || [])
        setLoading(false)
    }

    useEffect(() => {
        refresh()
    }, [])

    const handleSub = async (id: string, type: 'active' | 'trial' | 'inactive') => {
        // Optimistic UI could be added here
        const days = type === 'active' ? 30 : type === 'trial' ? 14 : 0
        await updateUserSubscription(id, type, days)
        refresh()
    }

    const handleRole = async (id: string, isAdmin: boolean) => {
        await toggleAdminRole(id, isAdmin)
        refresh()
    }

    if (loading) return <div className="p-8">Loading admin panel...</div>

    return (
        <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Users Management ({users.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3">User</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Subscription</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-900">{user.full_name || 'No Name'}</div>
                                            <div className="text-slate-500 text-xs">{user.email}</div>
                                            <div className="text-slate-400 text-[10px] font-mono">{user.id}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleRole(user.id, user.role !== 'admin')}
                                                className={`px-2 py-1 rounded text-xs font-bold border ${user.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}
                                            >
                                                {user.role}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                                    ${user.subscription_status === 'active' ? 'bg-green-100 text-green-700' :
                                                        user.subscription_status === 'trial' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-50 text-red-500'}`}>
                                                    {user.subscription_status || 'inactive'}
                                                </span>
                                                {user.subscription_ends_at && (
                                                    <span className="text-xs text-slate-400">
                                                        till {new Date(user.subscription_ends_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right space-x-2">
                                            <Button size="sm" variant="outline" onClick={() => handleSub(user.id, 'trial')} className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200">
                                                Trial 14d
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleSub(user.id, 'active')} className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
                                                Month
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleSub(user.id, 'inactive')} className="hover:bg-red-50 text-red-600 border-red-200">
                                                Stop
                                            </Button>
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
