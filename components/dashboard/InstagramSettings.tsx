"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { CheckCircle, Instagram } from "lucide-react"

export function InstagramSettings({ userId, isConnected, onUpdate }: { userId: string, isConnected: boolean, onUpdate: () => void }) {
    const [accessToken, setAccessToken] = useState("")
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
                body: JSON.stringify({ access_token: accessToken, user_id: userId })
            })
            const data = await res.json()
            if (res.ok) {
                setStatus("✅ Сохранено! Webhook готов к получению сообщений.")
                setAccessToken("")
                onUpdate()
                setIsEditing(false)
            } else {
                setStatus(`❌ Ошибка: ${data.error || 'Попробуйте ещё раз.'}`)
            }
        } catch (e) {
            console.error(e)
            setStatus("❌ Произошла ошибка.")
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
                        <p className="text-sm text-green-600">Бот получает сообщения через Meta Webhook</p>
                    </div>
                </CardHeader>
                <CardContent className="pt-4">
                    <Button variant="outline" onClick={() => setIsEditing(true)} className="w-full bg-white border-green-200 text-green-700 hover:bg-green-50">
                        Обновить Access Token
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
                    <p className="text-sm text-slate-500">Meta Graph API (официальный)</p>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                <div className="p-4 bg-blue-50 border border-blue-100 text-slate-600 text-xs rounded-lg leading-relaxed space-y-1">
                    <p><strong>Webhook URL:</strong> <code className="bg-white px-1 rounded">https://crm.sellio.uz/api/webhooks/instagram</code></p>
                    <p><strong>Verify Token:</strong> <code className="bg-white px-1 rounded">sellio</code></p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Meta Access Token</label>
                    <Input
                        type="password"
                        value={accessToken}
                        onChange={e => setAccessToken(e.target.value)}
                        placeholder="Вставьте Access Token из Meta Developer..."
                        className="bg-slate-50 border-slate-200"
                    />
                </div>

                {status && (
                    <p className={`text-sm ${status.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{status}</p>
                )}

                <div className="flex gap-2 pt-2">
                    {isEditing && (
                        <Button variant="outline" onClick={() => setIsEditing(false)} className="w-1/3">
                            Отмена
                        </Button>
                    )}
                    <Button onClick={handleConnect} disabled={loading || !accessToken} className="flex-1 bg-pink-600 hover:bg-pink-700 text-white">
                        {loading ? "Сохранение..." : "Сохранить токен"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
