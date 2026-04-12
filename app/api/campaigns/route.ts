import { NextResponse } from "next/server"
import { z } from "zod"
import { listCampaigns, createCampaign } from "@/lib/data/campaigns"
import { listInstances } from "@/lib/data/instances"
import { campaignFormSchema } from "@/lib/schemas/campaign"
import { isInstanceConnected } from "@/lib/utils/instance-connection"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const result = await listCampaigns({
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined
    })

    return NextResponse.json({
      data: result.data,
      meta: { summary: result.summary }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao listar campanhas"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = campaignFormSchema.parse(body)

    const instances = await listInstances()
    const instance = instances.find((item) => item.id === parsed.instance_id)

    if (!instance) {
      return NextResponse.json({ error: "Instância não encontrada." }, { status: 400 })
    }

    if (!isInstanceConnected(instance.conexao_w)) {
      return NextResponse.json(
        { error: "A instância precisa estar conectada para criar campanha." },
        { status: 400 }
      )
    }

    const data = await createCampaign(parsed)
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
          : (error as { message?: string } | null)?.message ?? "Erro ao criar campanha"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
