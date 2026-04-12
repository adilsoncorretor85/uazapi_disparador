import { NextResponse } from "next/server"
import { z } from "zod"
import { getCampaign, updateCampaign } from "@/lib/data/campaigns"
import { campaignFormSchema } from "@/lib/schemas/campaign"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await getCampaign(params.id)
    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar campanha"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const parsed = campaignFormSchema.parse(body)
    const data = await updateCampaign(params.id, parsed)
    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const first = error.issues?.[0]
      const message = first?.message ?? "Dados inválidos"
      return NextResponse.json({ error: message }, { status: 400 })
    }
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : (error as { message?: string } | null)?.message ?? "Erro ao atualizar campanha"
    console.error("Erro ao atualizar campanha", error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
