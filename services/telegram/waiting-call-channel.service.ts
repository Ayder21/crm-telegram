import { supabaseAdmin } from "@/lib/supabase/admin"
import { extractLeadProfilePatch, type LeadProfile } from "@/services/crm/lead-profile.service"

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""
const WAITING_CALL_CHANNEL_ID = process.env.TELEGRAM_WAITING_CALL_CHANNEL_ID || ""

type ConversationRow = {
  id: string
  status: string | null
  customer_name: string | null
  external_chat_id: string
  created_at: string | null
  last_message_at: string | null
  waiting_call_channel_message_id: number | null
  waiting_call_channel_chat_id: string | null
  lead_profile: LeadProfile | null
  integrations: { platform: string | null }[] | null
}

type MessageRow = {
  sender: string
  content: string
  created_at: string
  metadata: Record<string, unknown> | null
}

type TelegramApiResponse = {
  ok: boolean
  result?: {
    message_id?: number
    chat?: { id?: number | string }
  }
  description?: string
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function formatDate(value: string | null): string {
  if (!value) return "не указано"
  return new Date(value).toLocaleString("ru-RU")
}

function normalizeStatus(status: string | null): string {
  if (status === "new") return "Новый"
  if (status === "interested") return "Интерес"
  if (status === "waiting_call") return "Ждет звонка"
  if (status === "scheduled") return "Запись"
  if (status === "closed_won") return "Продажа"
  if (status === "closed_lost") return "Отказ"
  return status || "не указан"
}

function extractUsername(messages: MessageRow[]): string | null {
  for (const message of messages) {
    if (message.sender !== "customer") continue
    const username = message.metadata?.username
    if (typeof username === "string" && username.trim()) {
      return username.startsWith("@") ? username : `@${username}`
    }
  }
  return null
}

function aggregateLeadProfile(messages: MessageRow[]): Partial<LeadProfile> {
  const profile: Partial<LeadProfile> = {}
  for (const message of messages) {
    const patch = extractLeadProfilePatch(message.content)
    Object.assign(profile, patch)
    if (message.sender === "customer") {
      const username = message.metadata?.username
      if (typeof username === "string" && username.trim()) {
        profile.username = username.startsWith("@") ? username : `@${username}`
      }
    }
  }
  return profile
}

function clientTypeLabel(value?: LeadProfile["client_type"]): string | null {
  if (value === "legal") return "Юрлицо"
  if (value === "individual") return "Физлицо"
  return null
}

function surfaceLabel(value?: LeadProfile["installation_surface"]): string | null {
  if (value === "roof") return "Крыша"
  if (value === "ground") return "Земля"
  return null
}

function buildProfileText(conversation: ConversationRow, messages: MessageRow[]): string {
  const inferred = aggregateLeadProfile(messages)
  const profile = { ...(conversation.lead_profile ?? {}), ...inferred }
  const phone = profile.phone || "не найден"
  const username = profile.username || extractUsername(messages) || "не указан"
  const customerMessages = messages.filter((item) => item.sender === "customer")
  const latestCustomerMessage = customerMessages[0]?.content || "нет сообщений"
  const platform = conversation.integrations?.[0]?.platform === "instagram" ? "Instagram" : "Telegram"
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ""
  const conversationUrl = appUrl ? `${appUrl.replace(/\/$/, "")}/dashboard` : ""

  const clientType = clientTypeLabel(profile.client_type)
  const surface = surfaceLabel(profile.installation_surface)
  const detailLines = [
    clientType ? `<b>Клиент:</b> ${escapeHtml(clientType)}` : "",
    profile.power ? `<b>Мощность:</b> ${escapeHtml(profile.power)}` : "",
    profile.location ? `<b>Локация:</b> ${escapeHtml(profile.location)}` : "",
    profile.station_type ? `<b>Тип станции:</b> ${escapeHtml(profile.station_type)}` : "",
    surface ? `<b>Поверхность:</b> ${escapeHtml(surface)}` : ""
  ].filter(Boolean)

  return [
    "📞 <b>Анкета клиента</b>",
    "",
    `<b>Имя:</b> ${escapeHtml(conversation.customer_name || "Без имени")}`,
    `<b>Платформа:</b> ${escapeHtml(platform)}`,
    `<b>Username:</b> ${escapeHtml(username)}`,
    `<b>Телефон:</b> <code>${escapeHtml(phone)}</code>`,
    ...detailLines,
    `<b>Статус:</b> ${escapeHtml(normalizeStatus(conversation.status))}`,
    `<b>Создан:</b> ${escapeHtml(formatDate(conversation.created_at))}`,
    `<b>Последняя активность:</b> ${escapeHtml(formatDate(conversation.last_message_at))}`,
    "",
    `<b>Последнее сообщение клиента:</b>\n${escapeHtml(latestCustomerMessage).slice(0, 1200)}`,
    conversationUrl ? `\n<a href="${escapeHtml(conversationUrl)}">Открыть CRM</a>` : "",
    `\nОбновлено: ${escapeHtml(new Date().toLocaleString("ru-RU"))}`
  ].join("\n")
}

export class WaitingCallChannelService {
  private async callTelegram(method: "sendMessage" | "editMessageText", body: Record<string, unknown>) {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...body
      })
    })

    const data = (await res.json()) as TelegramApiResponse
    return { ok: res.ok && data.ok, data }
  }

  private async loadConversation(conversationId: string): Promise<ConversationRow | null> {
    const { data, error } = await supabaseAdmin
      .from("conversations")
      .select(`
        id,
        status,
        customer_name,
        external_chat_id,
        created_at,
        last_message_at,
        waiting_call_channel_message_id,
        waiting_call_channel_chat_id,
        lead_profile,
        integrations (platform)
      `)
      .eq("id", conversationId)
      .single()

    if (error || !data) {
      console.error("[WaitingCall] Conversation load failed:", error?.message || "not_found")
      return null
    }

    return data as ConversationRow
  }

  private async loadMessages(conversationId: string): Promise<MessageRow[]> {
    const { data } = await supabaseAdmin
      .from("messages")
      .select("sender,content,created_at,metadata")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(30)

    return (data || []) as MessageRow[]
  }

  private async saveChannelMessageRef(conversationId: string, chatId: string, messageId: number) {
    await supabaseAdmin
      .from("conversations")
      .update({
        waiting_call_channel_chat_id: chatId,
        waiting_call_channel_message_id: messageId
      })
      .eq("id", conversationId)
  }

  async sync(conversationId: string): Promise<void> {
    try {
      if (!TELEGRAM_BOT_TOKEN) {
        console.warn("[WaitingCall] TELEGRAM_BOT_TOKEN is missing.")
        return
      }

      const conversation = await this.loadConversation(conversationId)
      if (!conversation) return

      const hasMessageRef = Boolean(conversation.waiting_call_channel_message_id)
      const isWaitingCall = conversation.status === "waiting_call"

      if (!isWaitingCall && !hasMessageRef) {
        return
      }

      const channelId = conversation.waiting_call_channel_chat_id || WAITING_CALL_CHANNEL_ID
      if (!channelId) {
        console.warn("[WaitingCall] TELEGRAM_WAITING_CALL_CHANNEL_ID is missing.")
        return
      }

      const messages = await this.loadMessages(conversationId)
      const text = buildProfileText(conversation, messages)

      if (conversation.waiting_call_channel_message_id) {
        const editResult = await this.callTelegram("editMessageText", {
          chat_id: channelId,
          message_id: conversation.waiting_call_channel_message_id,
          text
        })

        if (editResult.ok) return

        const reason = editResult.data.description || "unknown_error"
        if (/message is not modified/i.test(reason)) {
          return
        }
        console.warn("[WaitingCall] edit failed, trying send:", reason)
      }

      if (!isWaitingCall) {
        return
      }

      const sendResult = await this.callTelegram("sendMessage", {
        chat_id: channelId,
        text
      })

      if (!sendResult.ok || !sendResult.data.result?.message_id) {
        console.error("[WaitingCall] send failed:", sendResult.data.description || "unknown_error")
        return
      }

      const sentChatId = String(sendResult.data.result.chat?.id || channelId)
      await this.saveChannelMessageRef(conversationId, sentChatId, sendResult.data.result.message_id)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "unknown_error"
      console.error("[WaitingCall] sync failed:", message)
    }
  }
}

export const waitingCallChannelService = new WaitingCallChannelService()
