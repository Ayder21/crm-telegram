"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { MessageCircle, Instagram, User, Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"

export function ChatSidebar({
  onSelectChat,
  selectedChatId
}: {
  onSelectChat: (id: string) => void,
  selectedChatId?: string
}) {
  const [conversations, setConversations] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchConversations = async () => {
      const { data } = await supabase
        .from('conversations')
        .select(`
            *,
            integrations (platform),
            messages (
                content,
                created_at
            )
        `)
        .order('last_message_at', { ascending: false })

      if (data) {
        // Post-process to get the actual last message since Supabase might return all messages
        // or we can rely on order if we could limit in nested query (complex in client)
        // Simple way: client side sort for the preview
        const processed = data.map(conv => {
          const msgs = conv.messages || [];
          const lastMsg = msgs.sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];
          return { ...conv, lastMessage: lastMsg }
        })
        setConversations(processed)
      }
      setLoading(false)
    }

    fetchConversations()

    const channel = supabase
      .channel('conversations_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchConversations()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchConversations()
      })
      .subscribe()

    // Instagram Polling
    const syncInstagram = async () => {
      try { await fetch('/api/cron/instagram'); } catch (e) { }
    };
    syncInstagram();
    const interval = setInterval(syncInstagram, 15000);

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

  const filtered = conversations.filter(c =>
    (c.customer_name || "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="w-80 border-r bg-muted/30 flex flex-col h-full backdrop-blur-xl">
      {/* Header */}
      <div className="p-4 border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-xl tracking-tight text-foreground flex items-center gap-2">
            Сообщения
          </h2>
          <span className="text-xs font-medium px-2.5 py-1 bg-primary/10 text-primary rounded-full">
            {conversations.length}
          </span>
        </div>
        <div className="relative group">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Поиск чатов..."
            className="pl-9 bg-background border-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all shadow-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelectChat(conv.id)}
            className={cn(
              "w-full text-left p-3.5 rounded-2xl transition-all duration-200 flex items-start gap-3.5 group relative overflow-hidden",
              selectedChatId === conv.id
                ? "bg-white shadow-md ring-1 ring-black/5 dark:bg-zinc-800 dark:ring-white/10"
                : "hover:bg-background/80 hover:shadow-sm"
            )}
          >
            {/* Active Indicator */}
            {selectedChatId === conv.id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-primary rounded-r-full" />
            )}

            {/* Avatar Placeholder */}
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-white/10 text-lg font-medium relative",
              conv.integrations?.platform === 'instagram'
                ? "bg-gradient-to-tr from-yellow-400 via-orange-500 to-purple-600 text-white"
                : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
            )}>
              {conv.customer_name?.[0]?.toUpperCase()}
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-background flex items-center justify-center ring-2 ring-background">
                {conv.integrations?.platform === 'instagram' ? (
                  <Instagram className="w-2.5 h-2.5 text-pink-600" />
                ) : (
                  <MessageCircle className="w-2.5 h-2.5 text-blue-600" />
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className={cn(
                  "font-semibold text-foreground truncate text-[15px]",
                  selectedChatId === conv.id ? "text-primary" : ""
                )}>
                  {conv.customer_name || "Неизвестный"}
                </span>
                <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap ml-2">
                  {conv.last_message_at
                    ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : ""}
                </span>
              </div>

              {/* Status Badge (Below Name) */}
              {conv.status && conv.status !== 'new' && (
                <div className="mb-1">
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide inline-block",
                    conv.status === 'interested' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
                    conv.status === 'waiting_call' && "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
                    conv.status === 'scheduled' && "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
                    conv.status === 'closed_won' && "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
                    conv.status === 'closed_lost' && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
                  )}>
                    {conv.status === 'interested' ? 'Интерес' :
                      conv.status === 'waiting_call' ? 'Ждет звонка' :
                        conv.status === 'scheduled' ? 'Запись' :
                          conv.status === 'closed_won' ? 'Продажа' :
                            conv.status === 'closed_lost' ? 'Отказ' : conv.status}
                  </span>
                </div>
              )}

              <div className="text-xs text-muted-foreground truncate leading-relaxed">
                {conv.lastMessage?.content ? (
                  <span className="text-foreground/80">{conv.lastMessage.content}</span>
                ) : (
                  <span className="italic opacity-70">Нет сообщений</span>
                )}
              </div>
            </div>
          </button>
        ))}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
            <MessageCircle className="w-10 h-10 mb-3 opacity-20" />
            <p>Диалоги не найдены</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-background/50 backdrop-blur-sm grid grid-cols-2 gap-2">
        <a href="/dashboard/board" className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary transition-all p-2.5 rounded-xl hover:bg-background hover:shadow-sm border border-transparent hover:border-border/50">
          <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <Search className="w-3.5 h-3.5" />
          </span>
          CRM Доска
        </a>
        <a href="/dashboard/settings" className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary transition-all p-2.5 rounded-xl hover:bg-background hover:shadow-sm border border-transparent hover:border-border/50">
          <span className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
            <User className="w-3.5 h-3.5" />
          </span>
          Настройки
        </a>
      </div>
    </div>
  )
}
