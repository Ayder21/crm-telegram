"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { CheckCircle, Instagram } from "lucide-react"

export function InstagramSettings({ userId, isConnected, onUpdate }: { userId: string, isConnected: boolean, onUpdate: () => void }) {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<string | null>(null)
    const [isEditing, setIsEditing] = useState(false)

    const handleConnect = async () => {
        setLoading(true)
        setStatus(null)

        try {
            const res = await fetch('/api/integrations/instagram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, user_id: userId })
            })

            const data = await res.json()

            if (res.ok) {
                setStatus("✅ Подключено! Бот начнёт отвечать на сообщения.")
                setUsername("")
                setPassword("")
                onUpdate();
                setIsEditing(false);
            } else {
                setStatus(`❌ Ошибка: ${data.error || 'Проверьте логин и пароль.'}`)
            }
        } catch (e) {
            console.error(e)
            setStatus("Произошла ошибка.")
        } finally {
            setLoading(false)
        }
    }

    if (isConnected && !isEditing) {
        return (
            <Card className="w-full border-green-200 bg-green-50/30 shadow-sm">
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-bold text-green-800">Instagram Подключен</CardTitle>
                        <p className="text-sm text-green-600">Бот проверяет сообщения автоматически</p>
                    </div>
                </CardHeader>
                <CardContent className="pt-4">
                    <Button variant="outline" onClick={() => setIsEditing(true)} className="w-full bg-white border-green-200 text-green-700 hover:bg-green-50">
                        Настроить заново / Сменить аккаунт
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center text-pink-500">
                    <Instagram className="w-6 h-6" />
                </div>
                <div>
                    <CardTitle className="text-lg font-bold text-slate-900">{isEditing ? "Обновить Instagram" : "Подключить Instagram"}</CardTitle>
                    <p className="text-sm text-slate-500">Вход через логин и пароль Instagram</p>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                <div className="p-4 bg-blue-50 border border-blue-100 text-slate-600 text-xs rounded-lg leading-relaxed">
                    <strong>Обычный вход в Instagram:</strong>
                    <p className="mt-2 text-slate-500">Введите логин и пароль от вашего Instagram аккаунта. Бот войдёт со своего IP-сервера и создаст стабильную сессию. Куки не нужны!</p>
                    <p className="mt-1 text-slate-500">⚠️ Если у вас включена двухфакторная аутентификация — напишите нам, поможем настроить.</p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Username (Логин)</label>
                    <Input
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="my_shop_official"
                        className="bg-slate-50 border-slate-200"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Пароль Instagram</label>
                    <Input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Ваш пароль от Instagram"
                        className="bg-slate-50 border-slate-200"
                    />
                </div>

                {status && <p className="text-sm text-blue-600">{status}</p>}

                <div className="flex gap-2 pt-2">
                    {isEditing && (
                        <Button variant="outline" onClick={() => setIsEditing(false)} className="w-1/3">
                            Отмена
                        </Button>
                    )}
                    <Button onClick={handleConnect} disabled={loading || !username || !password} className="flex-1 bg-pink-600 hover:bg-pink-700 text-white">
                        {loading ? "Подключение..." : "Подключить Instagram"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
