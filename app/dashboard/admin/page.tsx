"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, AlertCircle, RefreshCw, LogOut, Shield, UserPlus } from "lucide-react"
import { getUsers, updateUserSubscription, toggleAdminRole, createAdminUser, type ProfileRow } from "@/app/actions/admin-actions"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Notice = { type: "success" | "error"; message: string } | null

export default function AdminPage() {
    const [users, setUsers] = useState<ProfileRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [createLoading, setCreateLoading] = useState(false)
    const [notice, setNotice] = useState<Notice>(null)

    const refresh = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const result = await getUsers()
            if (result.error) {
                setError(result.error)
                return
            }

            setUsers(result.users ?? [])
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unexpected client error"
            setError(message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.href = "/login"
    }

    const handleSub = async (id: string, type: "active" | "trial" | "inactive") => {
        const days = type === "active" ? 30 : type === "trial" ? 14 : 0
        const res = await updateUserSubscription(id, type, days)
        if (res.error) {
            setNotice({ type: "error", message: res.error })
            return
        }
        setNotice({ type: "success", message: "Статус подписки обновлен." })
        await refresh()
    }

    const handleRole = async (id: string, isAdmin: boolean) => {
        const res = await toggleAdminRole(id, isAdmin)
        if (res.error) {
            setNotice({ type: "error", message: res.error })
            return
        }
        setNotice({ type: "success", message: "Роль пользователя обновлена." })
        await refresh()
    }

    const userCountLabel = useMemo(() => `${users.length} пользователей`, [users.length])

    if (loading && users.length === 0) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
                    <p className="text-sm font-medium text-slate-500">Загрузка админки...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 p-8">
                <div className="mx-auto max-w-3xl space-y-6">
                    <Card className="border-red-200 bg-red-50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-red-700">
                                <AlertCircle className="h-5 w-5" />
                                Ограничение доступа
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="rounded-md border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-700">
                                Код ошибки: {error}
                            </p>
                            <p className="text-sm text-red-700">
                                У вашей учетной записи нет роли администратора. Назначьте роль <code>admin</code> в таблице <code>profiles</code>.
                            </p>
                            <div className="flex gap-3">
                                <Button onClick={refresh} className="gap-2">
                                    <RefreshCw className="h-4 w-4" />
                                    Повторить
                                </Button>
                                <Button onClick={handleLogout} variant="outline" className="gap-2">
                                    <LogOut className="h-4 w-4" />
                                    Выйти
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-200">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">Админка</h1>
                            <p className="text-slate-500">Управление пользователями и доступами</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={refresh} variant="outline" size="sm" className="gap-2 bg-white" disabled={loading}>
                            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                            Обновить
                        </Button>
                        <Button onClick={handleLogout} variant="outline" size="sm" className="gap-2">
                            <LogOut className="h-4 w-4" />
                            Выйти
                        </Button>
                    </div>
                </div>

                {notice && (
                    <div
                        className={`rounded-lg border px-4 py-3 text-sm font-medium ${notice.type === "success"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-red-200 bg-red-50 text-red-700"
                            }`}
                    >
                        {notice.message}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <UserPlus className="h-5 w-5 text-blue-600" />
                            Создать пользователя
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            className="grid grid-cols-1 gap-3 md:grid-cols-4"
                            onSubmit={async (e) => {
                                e.preventDefault()
                                const formData = new FormData(e.currentTarget)
                                const email = String(formData.get("email") ?? "").trim()
                                const password = String(formData.get("password") ?? "").trim()
                                const name = String(formData.get("name") ?? "").trim()

                                setCreateLoading(true)
                                const res = await createAdminUser(email, password, name)
                                setCreateLoading(false)

                                if (res.error) {
                                    setNotice({ type: "error", message: res.error })
                                    return
                                }

                                setNotice({ type: "success", message: "Пользователь создан." })
                                e.currentTarget.reset()
                                await refresh()
                            }}
                        >
                            <Input name="name" required placeholder="Имя пользователя" />
                            <Input name="email" type="email" required placeholder="email@example.com" />
                            <Input name="password" type="password" required minLength={6} placeholder="Пароль (минимум 6 символов)" />
                            <Button type="submit" disabled={createLoading} className="gap-2 md:h-10">
                                {createLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                                Создать
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Shield className="h-5 w-5 text-blue-600" />
                            Пользователи: {userCountLabel}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-6 py-3">Пользователь</th>
                                        <th className="px-6 py-3">Роль</th>
                                        <th className="px-6 py-3">Подписка</th>
                                        <th className="px-6 py-3 text-right">Действия</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                                Пользователи не найдены.
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map((user) => (
                                            <tr key={user.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-slate-900">{user.full_name || "Без имени"}</span>
                                                        <span className="text-xs text-slate-500">{user.email || "Нет email"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Button
                                                        size="sm"
                                                        variant={user.role === "admin" ? "default" : "outline"}
                                                        onClick={() => handleRole(user.id, user.role !== "admin")}
                                                    >
                                                        {user.role === "admin" ? "admin" : "user"}
                                                    </Button>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-sm font-medium text-slate-700">{user.subscription_status || "inactive"}</span>
                                                        {user.subscription_ends_at && (
                                                            <span className="text-xs text-slate-500">
                                                                До: {new Date(user.subscription_ends_at).toLocaleDateString("ru-RU")}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="sm" variant="outline" onClick={() => handleSub(user.id, "trial")}>
                                                            Trial 14д
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => handleSub(user.id, "active")}>
                                                            Active 30д
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => handleSub(user.id, "inactive")}>
                                                            Отключить
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
