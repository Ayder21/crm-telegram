
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { cn } from "@/lib/utils"
import { MessageCircle, Instagram, Calendar } from "lucide-react"

type ColumnStatus = 'new' | 'interested' | 'waiting_call' | 'scheduled' | 'closed_won' | 'closed_lost'

type Column = {
    id: ColumnStatus
    title: string
    color: string
}

type ConversationCard = {
    id: string
    status: ColumnStatus
    customer_name: string | null
    external_chat_id: string | null
    last_message_at: string
    integrations: { platform: "instagram" | "tg_business" | string } | null
}

const COLUMNS: Column[] = [
    { id: 'new', title: 'Новые', color: 'bg-slate-100 dark:bg-slate-800' },
    { id: 'interested', title: 'Интерес', color: 'bg-yellow-50 dark:bg-yellow-900/10' },
    { id: 'waiting_call', title: 'Ждет Звонка', color: 'bg-red-50 dark:bg-red-900/10' },
    { id: 'scheduled', title: 'Запись', color: 'bg-blue-50 dark:bg-blue-900/10' },
    { id: 'closed_won', title: 'Продажа', color: 'bg-green-50 dark:bg-green-900/10' },
    { id: 'closed_lost', title: 'Отказ', color: 'bg-slate-50 dark:bg-slate-900/10' }
]

export function CRMBoard() {
    const [columns, setColumns] = useState<Record<ColumnStatus, ConversationCard[]>>({
        new: [],
        interested: [],
        waiting_call: [],
        scheduled: [],
        closed_won: [],
        closed_lost: []
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        const fetchItems = async () => {
            const { data } = await supabase
                .from('conversations')
                .select(`
                *,
                integrations (platform)
            `)
                .order('last_message_at', { ascending: false });

            if (!data || cancelled) {
                if (!cancelled) setLoading(false)
                return
            }

            const cols: Record<ColumnStatus, ConversationCard[]> = {
                new: [],
                interested: [],
                waiting_call: [],
                scheduled: [],
                closed_won: [],
                closed_lost: []
            }

            for (const item of data as ConversationCard[]) {
                const status: ColumnStatus = (item.status && cols[item.status]) ? item.status : 'new'
                cols[status].push({ ...item, status })
            }

            setColumns(cols)
            setLoading(false)
        }
        void fetchItems()
        return () => {
            cancelled = true
        }
    }, [])

    const onDragEnd = async (result: DropResult) => {
        const { source, destination, draggableId } = result;

        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        // Optimistic Update
        const sourceColId = source.droppableId as ColumnStatus;
        const destColId = destination.droppableId as ColumnStatus;

        const sourceItems = [...columns[sourceColId]];
        const destItems = sourceColId === destColId ? sourceItems : [...columns[destColId]];

        const [movedItem] = sourceItems.splice(source.index, 1);

        // Update local state
        if (sourceColId === destColId) {
            sourceItems.splice(destination.index, 0, movedItem);
            setColumns({ ...columns, [sourceColId]: sourceItems });
        } else {
            movedItem.status = destColId;
            destItems.splice(destination.index, 0, movedItem);
            setColumns({
                ...columns,
                [sourceColId]: sourceItems,
                [destColId]: destItems
            });
        }

        // Update DB via server route to keep waiting_call channel message in sync
        const response = await fetch('/api/conversations/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conversation_id: draggableId,
                status: destColId
            })
        });

        if (!response.ok) {
            console.error("Failed to update status via API");
            // Revert state if needed (optional, but good for UX)
        } else {
            console.log("Status updated via Drag&Drop:", destColId);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Загрузка доски...</div>

    return (
        <div className="h-full overflow-x-auto">
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex h-full gap-3 sm:gap-4 p-3 sm:p-4 min-w-[920px] md:min-w-[1200px]">
                    {COLUMNS.map(col => (
                        <div key={col.id} className={cn("flex flex-col w-72 sm:w-80 rounded-xl", col.color)}>
                            <div className="p-3 font-semibold text-slate-700 flex justify-between items-center">
                                {col.title}
                                <span className="text-xs bg-white/50 px-2 py-0.5 rounded-full">{columns[col.id]?.length || 0}</span>
                            </div>
                            <Droppable droppableId={col.id}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={cn(
                                            "flex-1 p-2 space-y-2 overflow-y-auto transition-colors rounded-b-xl min-h-[100px]",
                                            snapshot.isDraggingOver ? "bg-black/5" : ""
                                        )}
                                    >
                                        {columns[col.id].map((item, index) => (
                                            <Draggable key={item.id} draggableId={item.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={cn(
                                                            "bg-white p-3 rounded-lg shadow-sm border border-slate-200 group hover:shadow-md transition-all select-none relative",
                                                            snapshot.isDragging ? "rotate-2 shadow-xl ring-2 ring-primary/20 z-50" : ""
                                                        )}
                                                        style={provided.draggableProps.style}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <div className={cn(
                                                                    "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm",
                                                                    item.integrations?.platform === 'instagram'
                                                                        ? "bg-gradient-to-tr from-yellow-400 via-orange-500 to-purple-600"
                                                                        : "bg-gradient-to-br from-blue-500 to-indigo-600"
                                                                )}>
                                                                    {item.integrations?.platform === 'instagram' ? <Instagram size={14} /> : <MessageCircle size={14} />}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-semibold text-sm truncate text-slate-800">{item.customer_name || 'Без имени'}</p>
                                                                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                                                        ID: {item.external_chat_id?.slice(-4)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {/* Mock Priority or Tag */}
                                                            <div className="w-2 h-2 rounded-full bg-red-400" title="Hot Lead" />
                                                        </div>

                                                        <div className="mt-2 pt-2 border-t border-slate-50 flex justify-between items-center text-[10px] text-slate-500">
                                                            <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded">
                                                                <Calendar size={10} />
                                                                {new Date(item.last_message_at).toLocaleDateString()}
                                                            </span>
                                                            <span className="font-mono opacity-50">
                                                                {new Date(item.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>
        </div>
    )
}
