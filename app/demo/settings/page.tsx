"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, Sparkles } from "lucide-react";
import { DemoFloatingWidget } from "@/components/demo/DemoFloatingWidget";
import { demoKnowledgeBase, demoPrompt } from "@/components/demo/data";

export default function DemoSettingsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/demo" className="p-2 rounded-full hover:bg-slate-200 transition-colors text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Настройки</h1>
            <p className="text-slate-500">Демо: поведение ИИ и база знаний</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Системная инструкция</h2>
                <p className="text-sm text-slate-500">Read-only demo</p>
              </div>
            </div>
            <textarea
              readOnly
              value={demoPrompt}
              className="w-full min-h-[320px] rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 resize-none"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">База знаний</h2>
                <p className="text-sm text-slate-500">Read-only demo</p>
              </div>
            </div>
            <textarea
              readOnly
              value={demoKnowledgeBase}
              className="w-full min-h-[320px] rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 resize-none"
            />
          </div>
        </div>
      </div>
      <DemoFloatingWidget />
    </div>
  );
}

