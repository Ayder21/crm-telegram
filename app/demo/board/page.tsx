"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DemoBoard } from "@/components/demo/DemoBoard";
import { DemoFloatingWidget } from "@/components/demo/DemoFloatingWidget";
import { demoConversations } from "@/components/demo/data";

export default function DemoBoardPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="h-16 border-b bg-white flex items-center px-6 justify-between">
        <div className="flex items-center gap-4">
          <Link href="/demo" className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Канбан Доска (CRM Demo)</h1>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <DemoBoard conversations={demoConversations} />
      </div>
      <DemoFloatingWidget />
    </div>
  );
}

