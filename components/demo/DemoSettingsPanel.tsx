"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { TelegramSettings } from "@/components/dashboard/TelegramSettings";
import { InstagramSettings } from "@/components/dashboard/InstagramSettings";
import { SystemPromptSettings } from "@/components/dashboard/SystemPromptSettings";
import { Button } from "@/components/ui/button";

const DEMO_KB_URL =
  "https://docs.google.com/document/d/1XFtkBuFAzyp7sNpxrIeppHFstSJTCIEfszWwunpvbxk/edit?usp=sharing";

const DEMO_SYSTEM_PROMPT = `Ты — Малика, менеджер по продажам женской одежды в Ташкенте.
Ты представляешь онлайн-магазин Sellio Fashion и общаешься с клиентами в Telegram и Instagram.

Стиль:
- живой и человеческий
- спокойно, уверенно
- без давления и без длинных монологов

Важно:
- Не выдумывай факты (наличие, цены, условия). Если данных нет — уточни.
- Используй базу знаний (Google Doc) как источник правил, цен, условий доставки/возврата и ассортимента.
- Отвечай коротко и по делу. В конце дай 1 понятный следующий шаг.`;

type IntegrationStatus = {
  instagram: boolean;
  telegram: boolean;
  systemPrompt: string;
  aiEnabled: boolean;
  knowledgeBase: string;
};

export function DemoSettingsPanel() {
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [applying, setApplying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const effectiveKnowledgeBase = useMemo(() => {
    if (!status) return DEMO_KB_URL;
    return status.knowledgeBase || DEMO_KB_URL;
  }, [status]);

  const fetchStatus = async (uid: string) => {
    try {
      const res = await fetch(`/api/integrations/status?userId=${uid}`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchStatus(user.id);
      } else {
        window.location.href = "/login";
      }
    };
    getUser();
  }, []);

  const applyDemoPreset = async () => {
    if (!userId) return;
    setApplying(true);
    setNotice(null);
    try {
      const res = await fetch("/api/integrations/prompt", {
        method: "POST",
        body: JSON.stringify({
          userId,
          prompt: DEMO_SYSTEM_PROMPT,
          aiEnabled: true,
          knowledgeBase: DEMO_KB_URL,
        }),
      });

      if (!res.ok) {
        setNotice("Не получилось применить демо-настройки.");
        return;
      }

      setNotice("Демо-настройки применены. Можно подключать Telegram и Instagram.");
      await fetchStatus(userId);
      setTimeout(() => setNotice(null), 4000);
    } catch (e) {
      console.error(e);
      setNotice("Ошибка сети при применении демо-настроек.");
    } finally {
      setApplying(false);
    }
  };

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Загрузка настроек...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <Link href="/demo" className="p-2 rounded-full hover:bg-slate-200 transition-colors text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Настройки (Demo)</h1>
            <p className="text-sm sm:text-base text-slate-500">
              Полный доступ как в CRM. Доступно только администраторам.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Демо-база знаний и системный промпт</p>
                <p className="text-sm text-slate-500">
                  Google Doc будет использоваться как knowledge base для AI. Можно применить пресет в 1 клик.
                </p>
              </div>
            </div>
            <Button onClick={applyDemoPreset} disabled={applying} className="bg-black text-white hover:bg-black/85">
              {applying ? "Применяем..." : "Применить демо-пресет"}
            </Button>
          </div>

          <div className="mt-4 text-sm text-slate-600">
            Текущая база знаний:{" "}
            <a className="underline" href={effectiveKnowledgeBase} target="_blank" rel="noreferrer">
              открыть документ
            </a>
          </div>

          {notice && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {notice}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Каналы связи</h2>
            <TelegramSettings userId={userId} />
            {status && (
              <InstagramSettings userId={userId} isConnected={status.instagram} onUpdate={() => fetchStatus(userId)} />
            )}
          </div>

          <div className="space-y-6 h-full">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Мозги (AI)</h2>
            {status && (
              <SystemPromptSettings
                userId={userId}
                initialPrompt={status.systemPrompt}
                initialAiEnabled={status.aiEnabled}
                initialKnowledgeBase={effectiveKnowledgeBase}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

