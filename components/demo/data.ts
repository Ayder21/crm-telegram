export type DemoStatus =
  | "new"
  | "interested"
  | "waiting_call"
  | "scheduled"
  | "closed_won"
  | "closed_lost";

export type DemoPlatform = "tg_business" | "instagram";

export type DemoMessage = {
  id: string;
  sender: "assistant" | "customer" | "user";
  content: string;
  created_at: string;
};

export type DemoConversation = {
  id: string;
  customer_name: string;
  status: DemoStatus;
  last_message_at: string;
  integrations: { platform: DemoPlatform };
  messages: DemoMessage[];
  lead: {
    city: string;
    size: string;
    budget: string;
    interest: string;
    orderType: "Доставка" | "Самовывоз";
    segment: "Новый клиент" | "Постоянный клиент" | "Опт";
  };
};

export const demoPrompt = `Ты ассистент магазина женской одежды Sellio.
Твоя задача: быстро и вежливо довести клиента до покупки.

Правила:
1) Пиши простым языком, коротко и по делу.
2) Уточняй размер, город, бюджет и что именно ищет клиент.
3) Если клиент оставляет телефон или просит созвон -> статус waiting_call.
4) Если клиент выбирает товар -> статус interested.
5) Если назначен звонок/время -> статус scheduled.
6) Если клиент подтвердил оплату/заказ -> статус closed_won.
7) Если клиент отказался -> статус closed_lost.
8) Всегда предлагай понятный следующий шаг.`;

export const demoKnowledgeBase = `Sellio Demo • магазин женской одежды (Узбекистан)
- Категории: платья, костюмы, жакеты, рубашки, джинсы, базовые капсулы.
- Размеры: XS, S, M, L, XL.
- Оплата: перевод на карту / наличные при самовывозе.
- Доставка: Ташкент день-в-день, регионы 1-3 дня.
- Возврат/обмен: 7 дней при сохранении товарного вида.
- Режим: 10:00-21:00, без выходных.
- Для опта: отдельный менеджер и прайс по запросу.`;

function msg(id: string, sender: DemoMessage["sender"], content: string, created_at: string): DemoMessage {
  return { id, sender, content, created_at };
}

export const demoConversations: DemoConversation[] = [
  {
    id: "d-001",
    customer_name: "Алина Турсунова",
    status: "closed_won",
    last_message_at: "2026-02-11T18:14:00+05:00",
    integrations: { platform: "instagram" },
    lead: { city: "Ташкент", size: "M", budget: "900 000 сум", interest: "Платье + жакет", orderType: "Доставка", segment: "Постоянный клиент" },
    messages: [
      msg("d001-1", "customer", "Есть это платье в размере M?", "2026-02-11T18:02:00+05:00"),
      msg("d001-2", "assistant", "Да, M есть. Могу отправить фото на модели.", "2026-02-11T18:03:00+05:00"),
      msg("d001-3", "customer", "Да, и цену с доставкой.", "2026-02-11T18:05:00+05:00"),
      msg("d001-4", "user", "Итого 890 000 сум, доставка сегодня.", "2026-02-11T18:08:00+05:00"),
      msg("d001-5", "customer", "Оплатила, отправляйте.", "2026-02-11T18:14:00+05:00"),
    ],
  },
  {
    id: "d-002",
    customer_name: "Мадина Рахимова",
    status: "interested",
    last_message_at: "2026-02-11T17:53:00+05:00",
    integrations: { platform: "tg_business" },
    lead: { city: "Самарканд", size: "L", budget: "700 000 сум", interest: "Базовый костюм", orderType: "Доставка", segment: "Новый клиент" },
    messages: [
      msg("d002-1", "customer", "Нужен костюм на каждый день, размер L", "2026-02-11T17:47:00+05:00"),
      msg("d002-2", "assistant", "Подберу 3 варианта до 700 000 сум.", "2026-02-11T17:48:00+05:00"),
      msg("d002-3", "user", "Отправила варианты. Какой нравится больше?", "2026-02-11T17:53:00+05:00"),
    ],
  },
  {
    id: "d-003",
    customer_name: "Шахноза Умарова",
    status: "waiting_call",
    last_message_at: "2026-02-11T17:41:00+05:00",
    integrations: { platform: "instagram" },
    lead: { city: "Бухара", size: "S", budget: "1 200 000 сум", interest: "Вечернее платье", orderType: "Доставка", segment: "Новый клиент" },
    messages: [
      msg("d003-1", "customer", "Нужно платье на мероприятие, срочно.", "2026-02-11T17:31:00+05:00"),
      msg("d003-2", "assistant", "Сделаем подбор сегодня. Удобно созвониться?", "2026-02-11T17:33:00+05:00"),
      msg("d003-3", "customer", "Да, +998901112233", "2026-02-11T17:41:00+05:00"),
    ],
  },
  {
    id: "d-004",
    customer_name: "Dilfuza Boutique",
    status: "scheduled",
    last_message_at: "2026-02-11T16:58:00+05:00",
    integrations: { platform: "tg_business" },
    lead: { city: "Андижан", size: "XS-L", budget: "от 8 000 000 сум", interest: "Опт по новой коллекции", orderType: "Доставка", segment: "Опт" },
    messages: [
      msg("d004-1", "customer", "Интересует оптовый прайс по новой коллекции", "2026-02-11T16:41:00+05:00"),
      msg("d004-2", "user", "Согласуем созвон завтра в 11:00 и покажем ассортимент.", "2026-02-11T16:52:00+05:00"),
      msg("d004-3", "customer", "Подходит, жду звонка.", "2026-02-11T16:58:00+05:00"),
    ],
  },
  {
    id: "d-005",
    customer_name: "Ситора Мирзаева",
    status: "closed_lost",
    last_message_at: "2026-02-11T16:13:00+05:00",
    integrations: { platform: "instagram" },
    lead: { city: "Ташкент", size: "M", budget: "500 000 сум", interest: "Кардиган", orderType: "Самовывоз", segment: "Новый клиент" },
    messages: [
      msg("d005-1", "customer", "Скидка есть?", "2026-02-11T16:07:00+05:00"),
      msg("d005-2", "user", "На эту модель нет, но есть бесплатная доставка.", "2026-02-11T16:10:00+05:00"),
      msg("d005-3", "customer", "Пока не беру, спасибо.", "2026-02-11T16:13:00+05:00"),
    ],
  },
  {
    id: "d-006",
    customer_name: "Замира Абдуллаева",
    status: "new",
    last_message_at: "2026-02-11T15:58:00+05:00",
    integrations: { platform: "tg_business" },
    lead: { city: "Фергана", size: "M", budget: "600 000 сум", interest: "Повседневный образ", orderType: "Доставка", segment: "Новый клиент" },
    messages: [msg("d006-1", "customer", "Здравствуйте, есть что-то на каждый день?", "2026-02-11T15:58:00+05:00")],
  },
  {
    id: "d-007",
    customer_name: "Нафиса Жумаева",
    status: "closed_won",
    last_message_at: "2026-02-11T15:20:00+05:00",
    integrations: { platform: "instagram" },
    lead: { city: "Наманган", size: "M", budget: "1 500 000 сум", interest: "Капсула на неделю", orderType: "Доставка", segment: "Постоянный клиент" },
    messages: [
      msg("d007-1", "assistant", "Собрала капсулу из 5 вещей под ваш стиль.", "2026-02-11T15:02:00+05:00"),
      msg("d007-2", "customer", "Беру весь комплект.", "2026-02-11T15:07:00+05:00"),
      msg("d007-3", "user", "Оплата получена, отправляем сегодня.", "2026-02-11T15:20:00+05:00"),
    ],
  },
  {
    id: "d-008",
    customer_name: "Лола Камилова",
    status: "interested",
    last_message_at: "2026-02-11T14:43:00+05:00",
    integrations: { platform: "tg_business" },
    lead: { city: "Ташкент", size: "S", budget: "750 000 сум", interest: "Джинсы + рубашка", orderType: "Самовывоз", segment: "Постоянный клиент" },
    messages: [
      msg("d008-1", "customer", "Как в прошлый раз, только в светлом цвете", "2026-02-11T14:37:00+05:00"),
      msg("d008-2", "user", "Есть 2 модели, отправила фото.", "2026-02-11T14:43:00+05:00"),
    ],
  },
  {
    id: "d-009",
    customer_name: "Мунира Саттарова",
    status: "scheduled",
    last_message_at: "2026-02-11T13:39:00+05:00",
    integrations: { platform: "instagram" },
    lead: { city: "Карши", size: "L", budget: "1 000 000 сум", interest: "2 образа на мероприятие", orderType: "Доставка", segment: "Новый клиент" },
    messages: [
      msg("d009-1", "customer", "Хочу подобрать 2 образа, можно созвон?", "2026-02-11T13:30:00+05:00"),
      msg("d009-2", "assistant", "Да, передаю менеджеру для звонка.", "2026-02-11T13:31:00+05:00"),
      msg("d009-3", "user", "Созвон сегодня в 19:30, удобно?", "2026-02-11T13:39:00+05:00"),
    ],
  },
  {
    id: "d-010",
    customer_name: "Гульнар Пулатова",
    status: "waiting_call",
    last_message_at: "2026-02-11T12:54:00+05:00",
    integrations: { platform: "tg_business" },
    lead: { city: "Ургенч", size: "XL", budget: "850 000 сум", interest: "Пиджак oversize", orderType: "Доставка", segment: "Новый клиент" },
    messages: [msg("d010-1", "customer", "Можно поговорить по телефону? +998935557799", "2026-02-11T12:54:00+05:00")],
  },
  {
    id: "d-011",
    customer_name: "Рано Бобоева",
    status: "new",
    last_message_at: "2026-02-11T12:12:00+05:00",
    integrations: { platform: "instagram" },
    lead: { city: "Ташкент", size: "S", budget: "400 000 сум", interest: "Блузка", orderType: "Самовывоз", segment: "Новый клиент" },
    messages: [msg("d011-1", "customer", "Где вы находитесь?", "2026-02-11T12:12:00+05:00")],
  },
  {
    id: "d-012",
    customer_name: "Севара Хасановa",
    status: "closed_lost",
    last_message_at: "2026-02-11T11:40:00+05:00",
    integrations: { platform: "tg_business" },
    lead: { city: "Самарканд", size: "M", budget: "600 000 сум", interest: "Легкое платье", orderType: "Доставка", segment: "Новый клиент" },
    messages: [
      msg("d012-1", "user", "Есть похожая модель в вашем размере.", "2026-02-11T11:35:00+05:00"),
      msg("d012-2", "customer", "Спасибо, уже купила в другом месте.", "2026-02-11T11:40:00+05:00"),
    ],
  },
];

