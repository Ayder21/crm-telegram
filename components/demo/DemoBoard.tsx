"use client";

import { cn } from "@/lib/utils";
import { Calendar, Instagram, MessageCircle } from "lucide-react";
import type { DemoConversation, DemoStatus } from "@/components/demo/data";

type ColumnStatus = DemoStatus;

const COLUMNS: { id: ColumnStatus; title: string; color: string }[] = [
  { id: "new", title: "Новые", color: "bg-slate-100 dark:bg-slate-800" },
  { id: "interested", title: "Интерес", color: "bg-yellow-50 dark:bg-yellow-900/10" },
  { id: "waiting_call", title: "Ждет Звонка", color: "bg-red-50 dark:bg-red-900/10" },
  { id: "scheduled", title: "Запись", color: "bg-blue-50 dark:bg-blue-900/10" },
  { id: "closed_won", title: "Продажа", color: "bg-green-50 dark:bg-green-900/10" },
  { id: "closed_lost", title: "Отказ", color: "bg-slate-50 dark:bg-slate-900/10" },
];

export function DemoBoard({ conversations }: { conversations: DemoConversation[] }) {
  const columns: Record<ColumnStatus, DemoConversation[]> = {
    new: [],
    interested: [],
    waiting_call: [],
    scheduled: [],
    closed_won: [],
    closed_lost: [],
  };
  for (const item of conversations) columns[item.status].push(item);

  return (
    <div className="h-full overflow-x-auto">
      <div className="flex h-full gap-3 sm:gap-4 p-3 sm:p-4 min-w-[920px] md:min-w-[1200px]">
        {COLUMNS.map((col) => (
          <div key={col.id} className={cn("flex flex-col w-72 sm:w-80 rounded-xl", col.color)}>
            <div className="p-3 font-semibold text-slate-700 flex justify-between items-center">
              {col.title}
              <span className="text-xs bg-white/50 px-2 py-0.5 rounded-full">{columns[col.id]?.length || 0}</span>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto transition-colors rounded-b-xl min-h-[100px]">
              {columns[col.id].map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "bg-white p-3 rounded-lg shadow-sm border border-slate-200 group hover:shadow-md transition-all select-none relative",
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm",
                          item.integrations.platform === "instagram"
                            ? "bg-gradient-to-tr from-yellow-400 via-orange-500 to-purple-600"
                            : "bg-gradient-to-br from-blue-500 to-indigo-600",
                        )}
                      >
                        {item.integrations.platform === "instagram" ? <Instagram size={14} /> : <MessageCircle size={14} />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate text-slate-800">{item.customer_name}</p>
                        <p className="text-[10px] text-slate-400">Кейс: женская одежда</p>
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-red-400" title="Hot Lead" />
                  </div>

                  <p className="text-xs text-slate-600 truncate">{item.lead.interest}</p>

                  <div className="mt-2 pt-2 border-t border-slate-50 flex justify-between items-center text-[10px] text-slate-500">
                    <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded">
                      <Calendar size={10} />
                      {new Date(item.last_message_at).toLocaleDateString()}
                    </span>
                    <span className="font-mono opacity-50">
                      {new Date(item.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
