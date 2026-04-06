import { NextResponse } from "next/server"
import { z } from "zod"
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
  try {
    const body = await request.json()
    const parsed = campaignFormSchema.parse(body)
    const data = await updateCampaign(params.id, parsed)
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const first = error.issues?.[0]
      const message = first?.message ?? "Dados inválidos"
      return NextResponse.json({ error: message }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Erro ao atualizar campanha"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}