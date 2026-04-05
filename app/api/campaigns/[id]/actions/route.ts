import { NextResponse } from "next/server"
import { duplicateCampaign, updateCampaignStatus } from "@/lib/data/campaigns"
import type { CampaignStatus } from "@/lib/constants/status"

const STATUS_ACTIONS: Record<string, CampaignStatus> = {
  pause: "paused",
  resume: "processing",
  cancel: "cancelled",
  complete: "completed"
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json()
  const action = body?.action as string

  if (!action) {
    return NextResponse.json({ error: "Ação obrigatória" }, { status: 400 })
  }

  if (action === "duplicate") {
    const campaign = await duplicateCampaign(params.id)
    return NextResponse.json({ campaign })
  }

  const status = STATUS_ACTIONS[action]
  if (!status) {
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
  }

  const campaign = await updateCampaignStatus(params.id, status)
  return NextResponse.json({ campaign })
}
