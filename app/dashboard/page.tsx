"use client"

import { useState } from "react"
import { ChatSidebar } from "@/components/dashboard/ChatSidebar"
import { ChatWindow } from "@/components/dashboard/ChatWindow"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)

  return (
    <div className="flex h-dvh w-full bg-background">
      <ChatSidebar
        onSelectChat={setSelectedChatId} 
        selectedChatId={selectedChatId || undefined} 
        className={cn(selectedChatId ? "hidden md:flex" : "flex")}
      />
      
      <main className={cn("flex-1 flex flex-col h-full", !selectedChatId ? "hidden md:flex" : "flex")}>
        {selectedChatId ? (
          <ChatWindow conversationId={selectedChatId} onBack={() => setSelectedChatId(null)} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to start chatting
          </div>
        )}
      </main>
    </div>
  )
}
