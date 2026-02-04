"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Sparkles, BookOpen, Power } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"

interface Props {
    userId: string;
    initialPrompt: string;
    initialAiEnabled: boolean;
    initialKnowledgeBase: string;
}

export function SystemPromptSettings({ userId, initialPrompt, initialAiEnabled, initialKnowledgeBase }: Props) {
  const [prompt, setPrompt] = useState(initialPrompt)
  const [aiEnabled, setAiEnabled] = useState(initialAiEnabled)
  const [knowledgeBase, setKnowledgeBase] = useState(initialKnowledgeBase)
  
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const handleSave = async () => {
    setLoading(true)
    setStatus(null)

    try {
       const res = await fetch('/api/integrations/prompt', {
           method: 'POST',
           body: JSON.stringify({ 
               userId, 
               prompt,
               aiEnabled,
               knowledgeBase
           })
       })
       
       if (res.ok) {
           setStatus("Настройки ИИ обновлены!")
           setTimeout(() => setStatus(null), 3000);
       } else {
           setStatus("Ошибка сохранения.")
       }
    } catch (e) {
        setStatus("Произошла ошибка.")
    } finally {
        setLoading(false)
    }
  }

  return (
    <Card className="w-full border-slate-200 shadow-sm h-full flex flex-col">
      <CardHeader className="flex flex-row items-center gap-4 pb-2 border-b border-slate-100">
        <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500">
            <Sparkles className="w-6 h-6" />
        </div>
        <div className="flex-1">
            <CardTitle className="text-lg font-bold text-slate-900">Мозги ИИ</CardTitle>
            <p className="text-sm text-slate-500">Настройка поведения и знаний</p>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Включить ИИ</span>
            <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6 flex-1 flex flex-col">
        
        {/* Knowledge Base */}
        <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                База Знаний (Google Doc)
            </label>
            <Input 
                placeholder="https://docs.google.com/document/d/..." 
                value={knowledgeBase}
                onChange={e => setKnowledgeBase(e.target.value)}
                className="bg-slate-50 border-slate-200"
            />
            <p className="text-xs text-slate-400">
                Вставьте ссылку на открытый Google Doc с прайс-листом или FAQ. ИИ прочитает его перед ответом.
            </p>
        </div>

        {/* System Prompt */}
        <div className="space-y-2 flex-1 flex flex-col">
            <label className="text-sm font-medium text-slate-700">Системная Инструкция</label>
            <textarea 
                className="flex-1 w-full min-h-[200px] rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-100 focus-visible:border-purple-500 transition-all resize-none"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ты - дружелюбный менеджер..."
            />
        </div>
        
        {status && <p className="text-sm text-green-600 font-medium text-center">{status}</p>}
        
        <Button onClick={handleSave} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
            {loading ? "Сохранение..." : "Сохранить настройки"}
        </Button>
      </CardContent>
    </Card>
  )
}
