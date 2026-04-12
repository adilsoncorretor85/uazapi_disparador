import { NextResponse } from "next/server"
import { listCampaignVariants } from "@/lib/data/variants"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await listCampaignVariants(params.id)
    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar variantes"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
