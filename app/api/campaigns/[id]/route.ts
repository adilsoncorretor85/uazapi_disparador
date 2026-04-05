import { NextResponse } from "next/server"
import { getCampaign, updateCampaign } from "@/lib/data/campaigns"
import { campaignFormSchema } from "@/lib/schemas/campaign"

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const data = await getCampaign(params.id)
  return NextResponse.json(data)
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json()
  const parsed = campaignFormSchema.parse(body)
  const data = await updateCampaign(params.id, parsed)
  return NextResponse.json(data)
}

