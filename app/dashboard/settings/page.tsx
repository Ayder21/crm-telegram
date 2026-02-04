"use client"

import { useEffect, useState } from "react"
import { InstagramSettings } from "@/components/dashboard/InstagramSettings"
import { TelegramSettings } from "@/components/dashboard/TelegramSettings"
import { SystemPromptSettings } from "@/components/dashboard/SystemPromptSettings"
import { supabase } from "@/lib/supabase/client"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface IntegrationStatus {
    instagram: boolean;
    telegram: boolean;
    systemPrompt: string;
    aiEnabled: boolean;
    knowledgeBase: string;
}

export default function SettingsPage() {
    const [userId, setUserId] = useState<string | null>(null)
    const [status, setStatus] = useState<IntegrationStatus | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchStatus = async (uid: string) => {
        try {
            const res = await fetch(`/api/integrations/status?userId=${uid}`);
            if (res.ok) {
                const data = await res.json();
                setStatus(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUserId(user.id)
                fetchStatus(user.id)
            } else {
                window.location.href = '/login'
            }
        }
        getUser()
    }, [])

    if (!userId) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 text-sm font-medium">Загрузка настроек...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-5xl mx-auto space-y-8">

                <div className="flex items-center gap-4 mb-8">
                    <Link href="/dashboard" className="p-2 rounded-full hover:bg-slate-200 transition-colors text-slate-600">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Настройки</h1>
                        <p className="text-slate-500">Управление интеграциями и поведением ИИ</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Left Column: Integrations */}
                    <div className="space-y-6">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Каналы связи</h2>

                        <TelegramSettings userId={userId} />

                        {status && (
                            <InstagramSettings
                                userId={userId}
                                isConnected={status.instagram}
                                onUpdate={() => fetchStatus(userId)}
                            />
                        )}
                    </div>

                    {/* Right Column: AI Config */}
                    <div className="space-y-6 h-full">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Мозги (AI)</h2>
                        {status && (
                            <SystemPromptSettings
                                userId={userId}
                                initialPrompt={status.systemPrompt}
                                initialAiEnabled={status.aiEnabled}
                                initialKnowledgeBase={status.knowledgeBase}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
