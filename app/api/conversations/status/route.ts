import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { waitingCallChannelService } from "@/services/telegram/waiting-call-channel.service"

const ALLOWED_STATUSES = new Set([
  "new",
  "interested",
  "waiting_call",
  "scheduled",
  "closed_won",
  "closed_lost"
])

export async function POST(req: NextRequest) {
  try {
    const { conversation_id, status } = await req.json()

    if (!conversation_id || !status) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("conversations")
      .update({ status })
      .eq("id", conversation_id)
      .select("id")
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    await waitingCallChannelService.sync(conversation_id)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
