"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { MessageCircle, Instagram, User, Search, Shield } from "lucide-react";
import type { DemoConversation } from "@/components/demo/data";

function formatConversationTimestamp(value: string | null): string {
  if (!value) return "";
  const timestamp = new Date(value);
  const now = new Date();
  const isToday =
    timestamp.getFullYear() === now.getFullYear() &&
    timestamp.getMonth() === now.getMonth() &&
    timestamp.getDate() === now.getDate();

  if (isToday) {
    return timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return timestamp.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function statusLabel(status: DemoConversation["status"]): string {
  if (status === "interested") return "Интерес";
  if (status === "waiting_call") return "Ждет звонка";
  if (status === "scheduled") return "Запись";
  if (status === "closed_won") return "Продажа";
  if (status === "closed_lost") return "Отказ";
  return "Новый";
}

function normalizePreview(content: string): string {
  return content
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function DemoChatSidebar({
  conversations,
  selectedChatId,
  onSelectChat,
  activeMenu = "chats",
  className,
}: {
  conversations: DemoConversation[];
  selectedChatId?: string;
  onSelectChat: (id: string) => void;
  activeMenu?: "chats" | "board" | "settings";
  className?: string;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return conversations.filter((c) => c.customer_name.toLowerCase().includes(search.toLowerCase()));
  }, [conversations, search]);

  return (
    <div className={cn("w-full md:w-80 border-r bg-muted/30 flex flex-col h-full backdrop-blur-xl", className)}>
      <div className="p-4 border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-xl tracking-tight text-foreground">Сообщения</h2>
          <span className="text-xs font-medium px-2.5 py-1 bg-primary/10 text-primary rounded-full">{conversations.length}</span>
        </div>
        <div className="relative group">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Поиск чатов..."
            className="pl-9 bg-background border-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelectChat(conv.id)}
            className={cn(
              "w-full text-left p-3.5 rounded-2xl transition-all duration-200 flex items-start gap-3.5 group relative overflow-hidden",
              selectedChatId === conv.id
                ? "bg-white shadow-md ring-1 ring-black/5 dark:bg-zinc-800 dark:ring-white/10"
                : "hover:bg-background/80 hover:shadow-sm",
            )}
          >
            {selectedChatId === conv.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-primary rounded-r-full" />}

            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-white/10 text-lg font-medium relative",
                conv.integrations.platform === "instagram"
                  ? "bg-gradient-to-tr from-yellow-400 via-orange-500 to-purple-600 text-white"
                  : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white",
              )}
            >
              {conv.customer_name[0]?.toUpperCase()}
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-background flex items-center justify-center ring-2 ring-background">
                {conv.integrations.platform === "instagram" ? (
                  <Instagram className="w-2.5 h-2.5 text-pink-600" />
                ) : (
                  <MessageCircle className="w-2.5 h-2.5 text-blue-600" />
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className={cn("font-semibold text-foreground truncate text-[15px]", selectedChatId === conv.id ? "text-primary" : "")}>
                  {conv.customer_name}
                </span>
                <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap ml-2">
                  {formatConversationTimestamp(conv.last_message_at)}
                </span>
              </div>

              {conv.status !== "new" && (
                <div className="mb-1">
                  <span
                    className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide inline-block",
                      conv.status === "interested" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
                      conv.status === "waiting_call" && "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
                      conv.status === "scheduled" && "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
                      conv.status === "closed_won" && "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
                      conv.status === "closed_lost" && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
                    )}
                  >
                    {statusLabel(conv.status)}
                  </span>
                </div>
              )}

              <div className="text-xs text-muted-foreground truncate leading-relaxed">
                <span className="text-foreground/80">
                  {conv.messages[conv.messages.length - 1]?.content
                    ? normalizePreview(conv.messages[conv.messages.length - 1].content)
                    : "Нет сообщений"}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="p-3 sm:p-4 border-t bg-background/50 backdrop-blur-sm space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/demo/board"
            className={cn(
              "flex items-center justify-center gap-1 sm:gap-2 text-[11px] sm:text-xs font-medium transition-all p-2 rounded-xl border",
              activeMenu === "board"
                ? "text-primary bg-background shadow-sm border-border/50"
                : "text-muted-foreground hover:text-primary hover:bg-background hover:shadow-sm border-transparent hover:border-border/50",
            )}
          >
            <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Search className="w-3.5 h-3.5" />
            </span>
            <span className="hidden sm:inline">Sellio</span>
          </Link>
          <Link
            href="/demo/settings"
            className={cn(
              "flex items-center justify-center gap-1 sm:gap-2 text-[11px] sm:text-xs font-medium transition-all p-2 rounded-xl border",
              activeMenu === "settings"
                ? "text-primary bg-background shadow-sm border-border/50"
                : "text-muted-foreground hover:text-primary hover:bg-background hover:shadow-sm border-transparent hover:border-border/50",
            )}
          >
            <span className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <User className="w-3.5 h-3.5" />
            </span>
            <span className="hidden sm:inline">Настройки</span>
          </Link>
          <Link
            href="/demo"
            className={cn(
              "flex items-center justify-center gap-1 sm:gap-2 text-[11px] sm:text-xs font-medium transition-all p-2 rounded-xl border",
              activeMenu === "chats"
                ? "text-primary bg-background shadow-sm border-border/50"
                : "text-muted-foreground hover:text-primary hover:bg-background hover:shadow-sm border-transparent hover:border-border/50",
            )}
          >
            <span className="w-6 h-6 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5" />
            </span>
            <span className="hidden sm:inline">Demo</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
