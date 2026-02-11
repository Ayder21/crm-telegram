"use client";

import { useState } from "react";
import { MessageCircle, ArrowLeft, X } from "lucide-react";

export function DemoFloatingWidget() {
  const [closed, setClosed] = useState(false);

  if (closed) return null;

  return (
    <div className="fixed bottom-3 right-3 left-3 sm:left-auto z-50 sm:w-[420px] rounded-2xl border-2 border-slate-300 bg-white p-3 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
      <button
        type="button"
        aria-label="Закрыть попап"
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        onClick={() => setClosed(true)}
      >
        <X className="h-4 w-4" />
      </button>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Demo Mode</p>
      <h3 className="mt-1 text-sm sm:text-base font-semibold text-slate-900">Это демо-версия CRM</h3>
      <p className="mt-2 pr-6 text-[11px] sm:text-sm leading-relaxed text-slate-700">
        Хотите пообщаться с демо-ботом менеджера женской одежды? Бот отвечает сразу в Telegram.
      </p>
      <div className="mt-3 sm:mt-4 grid gap-2">
        <a
          href="https://t.me/djarvisuz"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs sm:text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <MessageCircle className="h-4 w-4" />
          Написать демо-боту
        </a>
        <a
          href="https://sellio.uz"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Вернуться на лендинг
        </a>
      </div>
    </div>
  );
}
