"use client"

import { useEffect, useState } from "react"
import { getUsers, updateUserSubscription, toggleAdminRole } from "@/app/actions/admin-actions"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield } from "lucide-react"

export default function AdminPage() {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    return (
        <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
            <h1 className="text-3xl font-bold">Admin Dashboard (UI Test)</h1>

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
                                <tr>
                                    <td className="px-4 py-3 text-slate-500" colSpan={4}>
                                        Data fetching is temporarily disabled for debugging.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
