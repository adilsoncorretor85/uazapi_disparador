import { NextResponse } from "next/server"
import { listCampaignContactsPage } from "@/lib/data/campaigns"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const offset = Number(searchParams.get("offset") ?? "0")
    const limit = Number(searchParams.get("limit") ?? "1000")

    const { data, nextOffset } = await listCampaignContactsPage(
      params.id,
      Number.isFinite(offset) ? offset : 0,
      Number.isFinite(limit) && limit > 0 ? limit : 1000
    )

    return NextResponse.json({ data, meta: { nextOffset } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar contatos da campanha"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
