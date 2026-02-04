"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { CheckCircle, Instagram } from "lucide-react"

export function InstagramSettings({ userId, isConnected, onUpdate }: { userId: string, isConnected: boolean, onUpdate: () => void }) {
  const [username, setUsername] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    setStatus(null)

    try {
       const res = await fetch('/api/integrations/instagram', {
           method: 'POST',
           body: JSON.stringify({ username, password: sessionId, user_id: userId })
       })
       
       if (res.ok) {
           setStatus("Сохранено! Ожидание синхронизации...")
           setUsername("")
           setSessionId("")
           onUpdate();
           setIsEditing(false);
       } else {
           setStatus("Ошибка сохранения.")
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
                    Настроить заново / Обновить Cookie
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
            <p className="text-sm text-slate-500">Вход через Session ID (Cookie)</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="p-4 bg-slate-50 border border-slate-100 text-slate-600 text-xs rounded-lg leading-relaxed">
            <strong>Как получить Session ID:</strong>
            <ol className="list-decimal ml-4 mt-2 space-y-1 text-slate-500">
                <li>Откройте instagram.com в Chrome (с ПК) и войдите.</li>
                <li>Нажмите F12 (Dev Tools) -&gt; вкладка <b>Приложение</b> (Application).</li>
                <li>Слева: Файлы cookie -&gt; https://www.instagram.com.</li>
                <li>Найдите <code>sessionid</code> и скопируйте значение.</li>
            </ol>
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
            <label className="text-sm font-medium text-slate-700">Session ID (Cookie)</label>
            <Input 
                type="password" 
                value={sessionId} 
                onChange={e => setSessionId(e.target.value)} 
                placeholder="Вставьте sessionid здесь..."
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
            <Button onClick={handleConnect} disabled={loading} className="flex-1 bg-pink-600 hover:bg-pink-700 text-white">
                {loading ? "Сохранение..." : "Сохранить конфигурацию"}
            </Button>
        </div>
      </CardContent>
    </Card>
  )
}
