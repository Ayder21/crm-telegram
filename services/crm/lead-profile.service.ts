import { supabaseAdmin } from "@/lib/supabase/admin"

export type LeadClientType = "individual" | "legal"
export type LeadSurface = "roof" | "ground"

export type LeadProfile = {
  client_type?: LeadClientType
  power?: string
  location?: string
  station_type?: string
  installation_surface?: LeadSurface
  phone?: string
  username?: string
}

const PHONE_REGEX = /(?:\+|\b)(?:998|7|8)\d{9}\b|\+?\d{10,15}/

function compactSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

function firstMatch(text: string, regexes: RegExp[]): string | undefined {
  for (const regex of regexes) {
    const match = text.match(regex)
    if (!match) continue
    const value = match[1] || match[0]
    if (value?.trim()) return compactSpaces(value)
  }
  return undefined
}

function detectClientType(text: string): LeadClientType | undefined {
  if (/(юрлицо|юридическ|ооо|ип|компан|организац|бизнес)/i.test(text)) return "legal"
  if (/(физлицо|физическ|частн(ый|ая)|для дома|дом\b)/i.test(text)) return "individual"
  return undefined
}

function detectSurface(text: string): LeadSurface | undefined {
  if (/(крыша|кровл)/i.test(text)) return "roof"
  if (/(земля|на участке|грунт|поле)/i.test(text)) return "ground"
  return undefined
}

export function extractLeadProfilePatch(text: string): Partial<LeadProfile> {
  const normalized = compactSpaces(text)
  if (!normalized) return {}

  const patch: Partial<LeadProfile> = {}
  const phone = normalized.match(PHONE_REGEX)?.[0]
  if (phone) patch.phone = phone

  const clientType = detectClientType(normalized)
  if (clientType) patch.client_type = clientType

  const surface = detectSurface(normalized)
  if (surface) patch.installation_surface = surface

  const power = firstMatch(normalized, [
    /(?:мощност[ьи]\s*[:\-]?\s*)(\d+(?:[.,]\d+)?\s*(?:квт|kw|киловатт\w*))/i,
    /(\d+(?:[.,]\d+)?\s*(?:квт|kw|киловатт\w*))/i
  ])
  if (power) patch.power = power

  const location = firstMatch(normalized, [
    /(?:локаци[яи]\s*[:\-]?\s*)([^\n,.]{2,80})/i,
    /(?:город|г\.|область|район|адрес)\s*[:\-]?\s*([^\n,.]{2,80})/i,
    /(?:нахожусь|находимся|установк[аи]\s+в)\s+([^\n,.]{2,80})/i
  ])
  if (location) patch.location = location

  const stationType = firstMatch(normalized, [
    /(?:тип(?:\s+станции)?\s*[:\-]?\s*)([^\n,.]{2,80})/i,
    /((?:сетев\w+|гибрид\w+|автоном\w+)\s*(?:станц\w+|сэс)?)/i
  ])
  if (stationType) patch.station_type = stationType

  return patch
}

export async function updateLeadProfileFromMessage(
  conversationId: string,
  text: string,
  options?: { username?: string | null }
): Promise<void> {
  const patch = extractLeadProfilePatch(text)
  if (options?.username) {
    patch.username = options.username.startsWith("@") ? options.username : `@${options.username}`
  }

  if (Object.keys(patch).length === 0) return

  const { data: current, error: loadError } = await supabaseAdmin
    .from("conversations")
    .select("lead_profile")
    .eq("id", conversationId)
    .single()

  if (loadError) {
    console.error("[LeadProfile] load failed:", loadError.message)
    return
  }

  const existing = (current?.lead_profile ?? {}) as LeadProfile
  const merged: LeadProfile = { ...existing, ...patch }

  const { error: updateError } = await supabaseAdmin
    .from("conversations")
    .update({
      lead_profile: merged,
      lead_profile_updated_at: new Date().toISOString()
    })
    .eq("id", conversationId)

  if (updateError) {
    console.error("[LeadProfile] update failed:", updateError.message)
  }
}
