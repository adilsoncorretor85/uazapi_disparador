import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function getInstanceSecret(id: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc("get_whatsapp_instance_secret", {
    p_id: id
  })

  if (error || !data || data.length === 0) {
    throw new Error(error?.message ?? "Instância não encontrada.")
  }

  return data[0] as {
    id: string
    base_url: string | null
    token: string | null
    instance_name: string | null
  }
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const instance = await getInstanceSecret(params.id)

    if (!instance.base_url || !instance.token) {
      return NextResponse.json(
        { error: "Base URL ou token ausente na instância." },
        { status: 400 }
      )
    }

    const baseUrl = instance.base_url.replace(/\/$/, "")
    const url = `${baseUrl}/instance/disconnect`
    const body = instance.instance_name
      ? {
          instanceName: instance.instance_name,
          instance_name: instance.instance_name
        }
      : {}

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${instance.token}`,
        apikey: instance.token,
        "x-api-key": instance.token
      },
      body: JSON.stringify(body)
    })

    const text = await response.text()
    const payload = text ? safeJson(text) : {}

    return NextResponse.json(payload, { status: response.ok ? 200 : 500 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao desconectar instância"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function safeJson(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}
