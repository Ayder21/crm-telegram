"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Bot } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError("Неверный email или пароль")
      setLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
          <Bot className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">UzSales AI</h1>
        <p className="text-slate-500">Единый центр управления чатами</p>
      </div>

      <Card className="w-full max-w-sm border-slate-200 shadow-xl shadow-slate-100">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-center text-xl">Вход в систему</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Email</label>
            <Input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="bg-slate-50 border-slate-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Пароль</label>
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-slate-50 border-slate-200"
            />
          </div>

          {error && <div className="text-sm text-red-500 bg-red-50 p-2 rounded border border-red-100 text-center">{error}</div>}

          <Button onClick={handleLogin} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10 font-medium">
            {loading ? "Вход..." : "Войти"}
          </Button>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-xs text-slate-400">
        &copy; 2024 UzSales AI. All rights reserved.
      </p>
    </div>
  )
}
