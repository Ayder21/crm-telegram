import { MessageCircle, ArrowLeft } from "lucide-react";

export function DemoFloatingWidget() {
  return (
    <div className="fixed bottom-4 right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Demo Mode</p>
      <h3 className="mt-1 text-sm font-semibold text-slate-900">Это демо-версия CRM</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">
        Хотите пообщаться с демо-ботом менеджера женской одежды? Бот отвечает сразу в Telegram.
      </p>
      <div className="mt-3 grid gap-2">
        <a
          href="https://t.me/djarvisuz"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <MessageCircle className="h-4 w-4" />
          Написать демо-боту
        </a>
        <a
          href="https://sellio.uz"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Вернуться на лендинг
        </a>
      </div>
    </div>
  );
}

