"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, MoreVertical, Phone, Video, Paperclip, Smile, ArrowLeft } from "lucide-react"

type MessageRow = {
  id: string
  sender: "assistant" | "customer" | "user"
  content: string
  created_at: string
}

type ChatInfo = {
  customer_name: string | null
  integrations: { platform: "tg_business" | "instagram" | string } | null
}

export function ChatWindow({ conversationId, onBack }: { conversationId: string, onBack?: () => void }) {
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [inputText, setInputText] = useState("")
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: "smooth" })
      }
    }, 100)
  }, [])

  useEffect(() => {
    if (!conversationId) return

    // Загрузка инфо о чате
    const fetchChatInfo = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('*, integrations(*)')
        .eq('id', conversationId)
        .single()
      setChatInfo(data)
    }
    fetchChatInfo()

    // Загрузка сообщений
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (data) setMessages(data as MessageRow[])
      scrollToBottom()
    }

    fetchMessages()

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as MessageRow])
        scrollToBottom()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, scrollToBottom])

  const sendMessage = async () => {
    if (!inputText.trim()) return

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          content: inputText
        })
      });

      if (!response.ok) {
        alert("Ошибка отправки");
        return;
      }
      setInputText("")
    } catch (error: unknown) {
      console.error(error)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background/50 backdrop-blur-3xl">
      {/* Header */}
      <div className="h-16 border-b flex items-center justify-between px-3 sm:px-6 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-full"
              onClick={onBack}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            {chatInfo?.customer_name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-foreground text-sm sm:text-base tracking-tight truncate">{chatInfo?.customer_name || "Загрузка..."}</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[11px] sm:text-xs text-muted-foreground font-medium capitalize truncate">
                {chatInfo?.integrations?.platform === 'tg_business' ? 'Telegram Business' : 'Instagram Direct'}
              </p>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-muted-foreground">
          <Button variant="ghost" size="icon" className="hover:text-primary hover:bg-primary/10 rounded-full transition-colors"><Phone className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" className="hover:text-primary hover:bg-primary/10 rounded-full transition-colors"><Video className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" className="hover:text-foreground rounded-full transition-colors"><MoreVertical className="w-5 h-5" /></Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 bg-slate-50/50 dark:bg-zinc-950/30">
        {messages.map((msg) => {
          const isMe = msg.sender === 'assistant' || msg.sender === 'user'; // Мы или бот
          return (
            <div
              key={msg.id}
              className={cn(
                "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                isMe ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "max-w-[88%] sm:max-w-[75%] rounded-2xl px-3.5 sm:px-5 py-2.5 sm:py-3.5 text-sm sm:text-[15px] leading-relaxed shadow-sm relative group transition-all",
                isMe
                  ? "bg-primary text-primary-foreground rounded-br-sm hover:brightness-110"
                  : "bg-white dark:bg-zinc-800 text-foreground border border-border/50 rounded-bl-sm"
              )}>
                {msg.content}
                <span className={cn(
                  "text-[10px] absolute bottom-1 opacity-0 group-hover:opacity-70 transition-opacity whitespace-nowrap",
                  isMe ? "right-full mr-3 text-muted-foreground" : "left-full ml-3 text-muted-foreground"
                )}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-5 bg-background border-t">
        <div className="flex gap-2 sm:gap-3 items-end bg-muted/40 p-2 rounded-2xl border border-border/50 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all shadow-sm">
          <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-primary hover:bg-background h-9 w-9 sm:h-10 sm:w-10 shrink-0">
            <Paperclip className="w-5 h-5" />
          </Button>
          <Input
            className="border-none bg-transparent shadow-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground/70 min-h-[40px] py-2"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Напишите сообщение..."
          />
          <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-primary hover:bg-background h-9 w-9 sm:h-10 sm:w-10 shrink-0">
            <Smile className="w-5 h-5" />
          </Button>
          <Button
            onClick={sendMessage}
            size="icon"
            className={cn(
              "rounded-xl h-9 w-9 sm:h-10 sm:w-10 shrink-0 transition-all shadow-sm",
              inputText.trim() ? "bg-primary hover:bg-primary/90" : "bg-muted text-muted-foreground hover:bg-muted"
            )}
            disabled={!inputText.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-center mt-2">
          <span className="text-[10px] text-muted-foreground/60">Press Enter to send</span>
        </div>
      </div>
    </div>
  )
}
