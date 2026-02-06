"use client"

import { useState } from "react"
import { ChatSidebar } from "@/components/dashboard/ChatSidebar"
import { ChatWindow } from "@/components/dashboard/ChatWindow"

export default function DashboardPage() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)

  return (
    <div className="flex h-screen w-full bg-background">
      <ChatSidebar 
        onSelectChat={setSelectedChatId} 
        selectedChatId={selectedChatId || undefined} 
      />
      
      <main className="flex-1 flex flex-col h-full">
        {selectedChatId ? (
          <ChatWindow conversationId={selectedChatId} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to start chatting
          </div>
        )}
      </main>
    </div>
  )
}

