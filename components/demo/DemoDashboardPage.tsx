"use client";

import { useMemo, useState } from "react";
import { DemoChatSidebar } from "@/components/demo/DemoChatSidebar";
import { DemoChatWindow } from "@/components/demo/DemoChatWindow";
import { DemoFloatingWidget } from "@/components/demo/DemoFloatingWidget";
import { demoConversations } from "@/components/demo/data";

export function DemoDashboardPage() {
  const conversations = useMemo(
    () => [...demoConversations].sort((a, b) => +new Date(b.last_message_at) - +new Date(a.last_message_at)),
    [],
  );
  const [selectedChatId, setSelectedChatId] = useState<string | null>(conversations[0]?.id ?? null);
  const selected = conversations.find((c) => c.id === selectedChatId) ?? null;

  return (
    <div className="flex h-screen w-full bg-background">
      <DemoChatSidebar conversations={conversations} onSelectChat={setSelectedChatId} selectedChatId={selectedChatId || undefined} activeMenu="chats" />
      <main className="flex-1 flex flex-col h-full">
        <DemoChatWindow conversation={selected} />
      </main>
      <DemoFloatingWidget />
    </div>
  );
}

