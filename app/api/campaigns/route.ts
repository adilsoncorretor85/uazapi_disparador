import { NextResponse } from "next/server"
import { listCampaigns, createCampaign } from "@/lib/data/campaigns"
import { campaignFormSchema } from "@/lib/schemas/campaign"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const data = await listCampaigns({
    search: searchParams.get("search") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined
  })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = campaignFormSchema.parse(body)
  const data = await createCampaign(parsed)
  return NextResponse.json(data)
}

