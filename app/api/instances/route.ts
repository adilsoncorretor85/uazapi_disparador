import { NextResponse } from "next/server"
import { listInstances, createInstance, updateInstance } from "@/lib/data/instances"
import { instanceFormSchema } from "@/lib/schemas/instance"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const data = await listInstances()
    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar instancias"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = instanceFormSchema.parse(body)
    const data = await createInstance(parsed)
    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar instancia"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 })
    }

    const body = await request.json()
    const parsed = instanceFormSchema.parse(body)
    const data = await updateInstance(id, parsed)
    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar instancia"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
