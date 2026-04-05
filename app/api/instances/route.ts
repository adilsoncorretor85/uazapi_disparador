import { NextResponse } from "next/server"
import { listInstances, createInstance, updateInstance } from "@/lib/data/instances"
import { instanceFormSchema } from "@/lib/schemas/instance"

export async function GET() {
  const data = await listInstances()
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = instanceFormSchema.parse(body)
  const data = await createInstance(parsed)
  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })
  }

  const body = await request.json()
  const parsed = instanceFormSchema.parse(body)
  const data = await updateInstance(id, parsed)
  return NextResponse.json(data)
}

