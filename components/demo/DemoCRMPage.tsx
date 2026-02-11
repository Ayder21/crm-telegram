"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  BadgeCheck,
  Clock3,
  Filter,
  Instagram,
  MessageCircle,
  Phone,
  Settings,
  ShoppingBag,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DemoStatus =
  | "new"
  | "interested"
  | "waiting_call"
  | "scheduled"
  | "closed_won"
  | "closed_lost";
type DemoChannel = "telegram" | "instagram";

type DemoMessage = {
  sender: "client" | "manager" | "bot";
  text: string;
  at: string;
};

type DemoChat = {
  id: string;
  customer: string;
  channel: DemoChannel;
  status: DemoStatus;
  city: string;
  segment: "Новый клиент" | "Постоянный клиент" | "Оптовый запрос";
  size: string;
  budget: string;
  orderType: "Доставка" | "Самовывоз";
  interest: string;
  lastAt: string;
  messages: DemoMessage[];
};

const STATUS_META: Record<DemoStatus, { title: string; chip: string; col: string }> = {
  new: {
    title: "Новые",
    chip: "bg-zinc-200 text-zinc-700",
    col: "bg-zinc-50",
  },
  interested: {
    title: "Подбор",
    chip: "bg-amber-100 text-amber-700",
    col: "bg-amber-50",
  },
  waiting_call: {
    title: "Ждет звонка",
    chip: "bg-rose-100 text-rose-700",
    col: "bg-rose-50",
  },
  scheduled: {
    title: "Согласование",
    chip: "bg-sky-100 text-sky-700",
    col: "bg-sky-50",
  },
  closed_won: {
    title: "Успешно",
    chip: "bg-emerald-100 text-emerald-700",
    col: "bg-emerald-50",
  },
  closed_lost: {
    title: "Не купил",
    chip: "bg-zinc-300 text-zinc-700",
    col: "bg-zinc-100",
  },
};

const DEMO_CHATS: DemoChat[] = [
  {
    id: "c-01",
    customer: "Алина Т.",
    channel: "instagram",
    status: "closed_won",
    city: "Ташкент",
    segment: "Постоянный клиент",
    size: "M",
    budget: "900 000 сум",
    orderType: "Доставка",
    interest: "Платье + жакет",
    lastAt: "2026-02-11T18:12:00+05:00",
    messages: [
      { sender: "client", text: "Есть это платье в M?", at: "18:02" },
      { sender: "bot", text: "Да, в M есть. Показать фото вживую?", at: "18:03" },
      { sender: "client", text: "Да, и цена с доставкой.", at: "18:05" },
      { sender: "manager", text: "Итого 890 000 сум, доставка по Ташкенту сегодня.", at: "18:07" },
      { sender: "client", text: "Оплатила, отправляйте.", at: "18:12" },
    ],
  },
  {
    id: "c-02",
    customer: "Мадина R.",
    channel: "telegram",
    status: "interested",
    city: "Самарканд",
    segment: "Новый клиент",
    size: "L",
    budget: "700 000 сум",
    orderType: "Доставка",
    interest: "Базовый костюм",
    lastAt: "2026-02-11T17:53:00+05:00",
    messages: [
      { sender: "client", text: "Нужен костюм на каждый день, L", at: "17:47" },
      { sender: "bot", text: "Подберу 3 варианта под ваш бюджет до 700 000 сум.", at: "17:48" },
      { sender: "manager", text: "Отправила варианты, какой нравится больше?", at: "17:53" },
    ],
  },
  {
    id: "c-03",
    customer: "Шахноза U.",
    channel: "instagram",
    status: "waiting_call",
    city: "Бухара",
    segment: "Новый клиент",
    size: "S",
    budget: "1 200 000 сум",
    orderType: "Доставка",
    interest: "Вечернее платье",
    lastAt: "2026-02-11T17:41:00+05:00",
    messages: [
      { sender: "client", text: "Мне нужно платье на мероприятие, срочно.", at: "17:31" },
      { sender: "bot", text: "Поняла, подберем сегодня. Удобно созвониться?", at: "17:33" },
      { sender: "client", text: "Да, +998901112233", at: "17:41" },
    ],
  },
  {
    id: "c-04",
    customer: "Dilfuza Boutique",
    channel: "telegram",
    status: "scheduled",
    city: "Андижан",
    segment: "Оптовый запрос",
    size: "XS-L",
    budget: "от 8 000 000 сум",
    orderType: "Доставка",
    interest: "Опт: новые коллекции",
    lastAt: "2026-02-11T16:58:00+05:00",
    messages: [
      { sender: "client", text: "Интересует оптовый прайс по новой коллекции.", at: "16:41" },
      { sender: "manager", text: "Сделаем созвон завтра в 11:00, покажу ассортимент.", at: "16:52" },
      { sender: "client", text: "Подходит, жду звонка.", at: "16:58" },
    ],
  },
  {
    id: "c-05",
    customer: "Ситора M.",
    channel: "instagram",
    status: "closed_lost",
    city: "Ташкент",
    segment: "Новый клиент",
    size: "M",
    budget: "500 000 сум",
    orderType: "Самовывоз",
    interest: "Кардиган",
    lastAt: "2026-02-11T16:13:00+05:00",
    messages: [
      { sender: "client", text: "Скидка есть?", at: "16:07" },
      { sender: "manager", text: "На эту модель нет, есть бесплатная доставка.", at: "16:10" },
      { sender: "client", text: "Поняла, пока не беру.", at: "16:13" },
    ],
  },
  {
    id: "c-06",
    customer: "Замира A.",
    channel: "telegram",
    status: "new",
    city: "Фергана",
    segment: "Новый клиент",
    size: "M",
    budget: "600 000 сум",
    orderType: "Доставка",
    interest: "Повседневный лук",
    lastAt: "2026-02-11T15:58:00+05:00",
    messages: [
      { sender: "client", text: "Здравствуйте, есть что-то на каждый день?", at: "15:58" },
    ],
  },
  {
    id: "c-07",
    customer: "Нафиса J.",
    channel: "instagram",
    status: "closed_won",
    city: "Наманган",
    segment: "Постоянный клиент",
    size: "M",
    budget: "1 500 000 сум",
    orderType: "Доставка",
    interest: "Капсула на неделю",
    lastAt: "2026-02-11T15:20:00+05:00",
    messages: [
      { sender: "bot", text: "Собрала капсулу из 5 вещей под ваш стиль.", at: "15:02" },
      { sender: "client", text: "Беру весь комплект.", at: "15:07" },
      { sender: "manager", text: "Оплата получена, отправляем сегодня.", at: "15:20" },
    ],
  },
  {
    id: "c-08",
    customer: "Лола K.",
    channel: "telegram",
    status: "interested",
    city: "Ташкент",
    segment: "Постоянный клиент",
    size: "S",
    budget: "750 000 сум",
    orderType: "Самовывоз",
    interest: "Джинсы + рубашка",
    lastAt: "2026-02-11T14:43:00+05:00",
    messages: [
      { sender: "client", text: "Мне как в прошлый раз, только в светлом цвете", at: "14:37" },
      { sender: "manager", text: "Есть 2 модели, отправила фото.", at: "14:43" },
    ],
  },
  {
    id: "c-09",
    customer: "Мунира S.",
    channel: "instagram",
    status: "scheduled",
    city: "Карши",
    segment: "Новый клиент",
    size: "L",
    budget: "1 000 000 сум",
    orderType: "Доставка",
    interest: "Образы на никах",
    lastAt: "2026-02-11T13:39:00+05:00",
    messages: [
      { sender: "client", text: "Хочу подобрать 2 образа, можно голосом объяснить?", at: "13:30" },
      { sender: "bot", text: "Да, передаю менеджеру. Назначим удобное время звонка.", at: "13:31" },
      { sender: "manager", text: "Созвон сегодня в 19:30, удобно?", at: "13:39" },
    ],
  },
  {
    id: "c-10",
    customer: "Гульнар P.",
    channel: "telegram",
    status: "waiting_call",
    city: "Ургенч",
    segment: "Новый клиент",
    size: "XL",
    budget: "850 000 сум",
    orderType: "Доставка",
    interest: "Пиджак oversize",
    lastAt: "2026-02-11T12:54:00+05:00",
    messages: [
      { sender: "client", text: "Можно поговорить по телефону? +998935557799", at: "12:54" },
    ],
  },
  {
    id: "c-11",
    customer: "Рано B.",
    channel: "instagram",
    status: "new",
    city: "Ташкент",
    segment: "Новый клиент",
    size: "S",
    budget: "400 000 сум",
    orderType: "Самовывоз",
    interest: "Блузка",
    lastAt: "2026-02-11T12:12:00+05:00",
    messages: [{ sender: "client", text: "Где вы находитесь?", at: "12:12" }],
  },
  {
    id: "c-12",
    customer: "Севара H.",
    channel: "telegram",
    status: "closed_lost",
    city: "Самарканд",
    segment: "Новый клиент",
    size: "M",
    budget: "600 000 сум",
    orderType: "Доставка",
    interest: "Легкое платье",
    lastAt: "2026-02-11T11:40:00+05:00",
    messages: [
      { sender: "manager", text: "Есть похожая модель в вашем размере.", at: "11:35" },
      { sender: "client", text: "Спасибо, уже купила в другом месте.", at: "11:40" },
    ],
  },
];

const DEMO_PROMPT = `Ты ассистент магазина женской одежды Sellio Demo.
Твоя цель: быстро и вежливо довести клиента до заказа.

Правила:
1) Пиши просто и коротко, без сложных терминов.
2) Уточняй размер, город, бюджет и что именно ищет клиент.
3) Если клиент просит звонок или оставил телефон -> статус "waiting_call".
4) Если клиент выбирает и задает вопросы по товару -> статус "interested".
5) Если назначили звонок/время -> статус "scheduled".
6) Если клиент подтвердил оплату/заказ -> статус "closed_won".
7) Если отказался -> статус "closed_lost".
8) Не выдумывай факты о наличии: предлагай проверку и альтернативы.
9) В конце каждого ответа давай один понятный следующий шаг.`;

const DEMO_KNOWLEDGE = `База знаний Demo (магазин женской одежды, Узбекистан):
- Ассортимент: платья, костюмы, жакеты, рубашки, джинсы, кардиганы.
- Размеры: XS, S, M, L, XL (для некоторых моделей размеры могут отличаться).
- Оплата: перевод на карту, наличные при самовывозе.
- Доставка: по Ташкенту в день заказа, по регионам 1-3 дня.
- Возврат/обмен: в течение 7 дней при сохранении товарного вида.
- Время работы: 10:00-21:00, без выходных.
- Приоритет в диалоге: скорость ответа, понятные варианты, закрытие на заказ.
- Для опта: отдельный менеджер и прайс по запросу.`;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function channelLabel(channel: DemoChannel): string {
  return channel === "instagram" ? "Instagram" : "Telegram";
}

export function DemoCRMPage() {
  const [tab, setTab] = useState<"chats" | "board" | "settings">("chats");
  const sortedChats = useMemo(
    () => [...DEMO_CHATS].sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt)),
    [],
  );
  const [activeId, setActiveId] = useState(sortedChats[0]?.id ?? "");
  const activeChat = sortedChats.find((c) => c.id === activeId) ?? sortedChats[0];

  const boardColumns = useMemo(() => {
    const map: Record<DemoStatus, DemoChat[]> = {
      new: [],
      interested: [],
      waiting_call: [],
      scheduled: [],
      closed_won: [],
      closed_lost: [],
    };
    for (const chat of sortedChats) map[chat.status].push(chat);
    return map;
  }, [sortedChats]);

  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
        <div className="mb-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Sellio Demo</p>
              <h1 className="mt-1 text-2xl font-semibold text-zinc-900 sm:text-3xl">
                Демо CRM: магазин женской одежды
              </h1>
              <p className="mt-2 text-sm text-zinc-600">
                Публичный режим, данные фейковые. Можно смотреть интерфейс, этапы воронки и логику работы.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
              <BadgeCheck className="h-4 w-4" />
              Read-only demo
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-medium transition",
              tab === "chats" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-700",
            )}
            onClick={() => setTab("chats")}
          >
            Чаты
          </button>
          <button
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-medium transition",
              tab === "board" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-700",
            )}
            onClick={() => setTab("board")}
          >
            Воронка
          </button>
          <button
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-medium transition",
              tab === "settings" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-700",
            )}
            onClick={() => setTab("settings")}
          >
            Настройки
          </button>
        </div>

        {tab === "chats" && activeChat && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr_320px]">
            <div className="rounded-2xl border border-zinc-200 bg-white p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-900">Список диалогов</p>
                <div className="flex items-center gap-1 text-xs text-zinc-500">
                  <Filter className="h-3.5 w-3.5" /> 12 чатов
                </div>
              </div>
              <div className="space-y-2">
                {sortedChats.map((chat) => {
                  const isActive = chat.id === activeChat.id;
                  return (
                    <button
                      key={chat.id}
                      onClick={() => setActiveId(chat.id)}
                      className={cn(
                        "w-full rounded-xl border p-3 text-left transition",
                        isActive ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-full",
                              isActive ? "bg-white/15" : "bg-white",
                            )}
                          >
                            {chat.channel === "instagram" ? (
                              <Instagram className="h-4 w-4" />
                            ) : (
                              <MessageCircle className="h-4 w-4" />
                            )}
                          </span>
                          <p className="max-w-[165px] truncate text-sm font-medium">{chat.customer}</p>
                        </div>
                        <p className={cn("text-[11px]", isActive ? "text-zinc-300" : "text-zinc-500")}>
                          {formatTime(chat.lastAt)}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-[10px] font-medium",
                            isActive ? "bg-white/15 text-zinc-100" : STATUS_META[chat.status].chip,
                          )}
                        >
                          {STATUS_META[chat.status].title}
                        </span>
                        <span className={cn("text-[11px]", isActive ? "text-zinc-300" : "text-zinc-500")}>
                          {channelLabel(chat.channel)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between border-b border-zinc-100 pb-3">
                <div>
                  <p className="text-lg font-semibold text-zinc-900">{activeChat.customer}</p>
                  <p className="text-xs text-zinc-500">{channelLabel(activeChat.channel)} • {activeChat.city}</p>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_META[activeChat.status].chip)}>
                  {STATUS_META[activeChat.status].title}
                </span>
              </div>
              <div className="space-y-2">
                {activeChat.messages.map((m, i) => (
                  <div
                    key={`${activeChat.id}-${i}`}
                    className={cn(
                      "max-w-[88%] rounded-2xl px-3 py-2 text-sm",
                      m.sender === "client" && "bg-zinc-100 text-zinc-900",
                      m.sender === "bot" && "ml-auto bg-zinc-900 text-white",
                      m.sender === "manager" && "ml-auto bg-zinc-800 text-zinc-100",
                    )}
                  >
                    <p>{m.text}</p>
                    <p className={cn("mt-1 text-[10px]", m.sender === "client" ? "text-zinc-500" : "text-zinc-300")}>{m.at}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4">
              <p className="mb-3 text-sm font-semibold text-zinc-900">Карточка клиента</p>
              <div className="space-y-2 text-sm">
                <Row icon={<User className="h-4 w-4" />} label="Клиент" value={activeChat.customer} />
                <Row icon={<ShoppingBag className="h-4 w-4" />} label="Интерес" value={activeChat.interest} />
                <Row icon={<Clock3 className="h-4 w-4" />} label="Сегмент" value={activeChat.segment} />
                <Row icon={<Phone className="h-4 w-4" />} label="Формат" value={activeChat.orderType} />
                <Row label="Размер" value={activeChat.size} />
                <Row label="Бюджет" value={activeChat.budget} />
                <Row label="Город" value={activeChat.city} />
              </div>
            </div>
          </div>
        )}

        {tab === "board" && (
          <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4">
            <div className="flex min-w-[1240px] gap-3">
              {(Object.keys(STATUS_META) as DemoStatus[]).map((status) => (
                <div key={status} className={cn("w-[230px] rounded-xl p-2", STATUS_META[status].col)}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-zinc-900">{STATUS_META[status].title}</p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs text-zinc-600">
                      {boardColumns[status].length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {boardColumns[status].map((chat) => (
                      <div key={chat.id} className="rounded-lg border border-zinc-200 bg-white p-2.5">
                        <p className="truncate text-sm font-medium text-zinc-900">{chat.customer}</p>
                        <p className="mt-1 text-xs text-zinc-500">{chat.interest}</p>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
                          <span>{channelLabel(chat.channel)}</span>
                          <span>{chat.city}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4 text-zinc-700" />
                <p className="text-sm font-semibold text-zinc-900">System Prompt (demo)</p>
              </div>
              <pre className="whitespace-pre-wrap rounded-xl bg-zinc-50 p-3 text-sm leading-6 text-zinc-700">
                {DEMO_PROMPT}
              </pre>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4 text-zinc-700" />
                <p className="text-sm font-semibold text-zinc-900">Knowledge Base (demo)</p>
              </div>
              <pre className="whitespace-pre-wrap rounded-xl bg-zinc-50 p-3 text-sm leading-6 text-zinc-700">
                {DEMO_KNOWLEDGE}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row(props: { icon?: ReactNode; label: string; value: string }) {
  const { icon, label, value } = props;
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-zinc-50 p-2.5">
      <div className="flex items-center gap-2 text-zinc-500">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-right font-medium text-zinc-900">{value}</span>
    </div>
  );
}
