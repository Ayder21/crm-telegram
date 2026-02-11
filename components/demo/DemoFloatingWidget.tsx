import { MessageCircle, ArrowLeft } from "lucide-react";

export function DemoFloatingWidget() {
  return (
    <div className="fixed bottom-4 right-4 z-50 w-[420px] max-w-[calc(100vw-1rem)] rounded-2xl border-2 border-slate-300 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Demo Mode</p>
      <h3 className="mt-1 text-base font-semibold text-slate-900">Это демо-версия CRM</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">
        Хотите пообщаться с демо-ботом менеджера женской одежды? Бот отвечает сразу в Telegram.
      </p>
      <div className="mt-4 grid gap-2.5">
        <a
          href="https://t.me/djarvisuz"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <MessageCircle className="h-4 w-4" />
          Написать демо-боту
        </a>
        <a
          href="https://sellio.uz"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Вернуться на лендинг
        </a>
      </div>
    </div>
  );
}
