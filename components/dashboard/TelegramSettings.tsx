"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"

export function TelegramSettings({ userId }: { userId: string }) {
  const [botToken, setBotToken] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [showReconfigure, setShowReconfigure] = useState(false)

  useEffect(() => {
    fetchIntegration()
  }, [userId])

  const fetchIntegration = async () => {
    const { data } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'tg_business')
      .single()

    if (data && data.bot_token_encrypted) {
      setIsConnected(true)
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      setWebhookUrl(`${baseUrl}/api/webhooks/telegram/${data.id}`)
    }
  }

  const handleSave = async () => {
    if (!botToken) {
      setMessage("Введите Bot Token")
      return
    }

    setSaving(true)
    setMessage("")

    try {
      const response = await fetch('/api/integrations/telegram/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          botToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(`❌ ${data.error || 'Ошибка сохранения'}`)
        return
      }

      // Update local state
      setWebhookUrl(data.webhookUrl)
      setIsConnected(true)
      setMessage(`✅ ${data.message}`)
      setBotToken("") // Clear for security
      setShowReconfigure(false)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      console.error(error)
      setMessage(`❌ Ошибка: ${message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleReconfigure = () => {
    setShowReconfigure(true)
    setIsConnected(false)
    setMessage("")
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Telegram Business</h3>
          <p className="text-xs text-slate-500">Подключите бота для автоответов</p>
        </div>
      </div>

      <div className="space-y-4">
        {isConnected && !showReconfigure ? (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium text-green-900">Telegram подключен</span>
              </div>
              <p className="text-sm text-green-700">Бот активен и готов к работе</p>
            </div>

            {webhookUrl && (
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-slate-700 mb-1">Webhook URL:</p>
                <code className="text-xs text-blue-600 break-all">{webhookUrl}</code>
              </div>
            )}

            <button
              onClick={handleReconfigure}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Настроить заново
            </button>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Bot Token
              </label>
              <input
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">Получите у @BotFather командой /newbot</p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {saving ? "Подключение..." : "Подключить"}
            </button>

            {showReconfigure && (
              <button
                onClick={() => {
                  setShowReconfigure(false)
                  setIsConnected(true)
                  setBotToken("")
                }}
                className="w-full text-sm text-slate-600 hover:text-slate-900"
              >
                Отмена
              </button>
            )}
          </>
        )}

        {message && (
          <p className={`text-sm ${message.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
