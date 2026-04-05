import { NextResponse } from "next/server"
import { listCampaignVariants } from "@/lib/data/variants"

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const data = await listCampaignVariants(params.id)
  return NextResponse.json(data)
}

