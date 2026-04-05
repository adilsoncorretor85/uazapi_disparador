import { NextResponse } from "next/server"
import { listCampaignAuditEvents } from "@/lib/data/audit"

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const data = await listCampaignAuditEvents(params.id)
  return NextResponse.json(data)
}

