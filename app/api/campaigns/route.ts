import { NextResponse } from "next/server"
import { z } from "zod"
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
  try {
    const body = await request.json()
    const parsed = campaignFormSchema.parse(body)
    const data = await createCampaign(parsed)
    return NextResponse.json(data)
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
          : (error as { message?: string } | null)?.message ?? "Erro ao criar campanha"
    console.error("Erro ao criar campanha", error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
