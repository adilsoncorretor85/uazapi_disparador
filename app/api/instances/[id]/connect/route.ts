import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { deriveConnectionLabel } from "@/lib/utils/instance-connection"

async function getInstanceSecret(id: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc("get_whatsapp_instance_secret", {
    p_id: id
  })

  if (error || !data || data.length === 0) {
    throw new Error(error?.message ?? "Instancia nao encontrada.")
  }

  return data[0] as {
    id: string
    base_url: string | null
    token: string | null
    instance_name: string | null
    owner_number: string | null
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const instance = await getInstanceSecret(params.id)
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get("mode") ?? "qr"

    if (!instance.base_url || !instance.token) {
      return NextResponse.json(
        { error: "Base URL ou token ausente na instancia." },
        { status: 400 }
      )
    }

    const baseUrl = instance.base_url.replace(/\/$/, "")
    const statusUrl = new URL(`${baseUrl}/instance/status`)
    if (instance.instance_name) {
      statusUrl.searchParams.set("instanceName", instance.instance_name)
      statusUrl.searchParams.set("instance_name", instance.instance_name)
    }
    if (instance.owner_number) {
      const phone = instance.owner_number.replace(/\D/g, "")
      if (phone) {
        statusUrl.searchParams.set("phone", phone)
        statusUrl.searchParams.set("number", phone)
      }
    }

    const statusResponse = await fetch(statusUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${instance.token}`,
        token: instance.token,
        apikey: instance.token,
        "x-api-key": instance.token
      }
    })

    if (statusResponse.ok) {
      const statusText = await statusResponse.text()
      const statusPayload = statusText ? safeJson(statusText) : {}
      const currentStatus = deriveConnectionLabel(statusPayload, "Conectando")
      await updateConnectionStatus(params.id, statusPayload, "Conectando")
      if (currentStatus === "Conectado") {
        return NextResponse.json(
          { error: "Instancia ja conectada.", status: statusPayload },
          { status: 409 }
        )
      }
    }

    const url = `${baseUrl}/instance/connect`
    const phone = instance.owner_number ? instance.owner_number.replace(/\D/g, "") : ""
    const body: Record<string, string> = {}
    if (mode === "code") {
      if (phone) {
        body.phone = phone
      }
    } else if (instance.instance_name) {
      body.instanceName = instance.instance_name
      body.instance_name = instance.instance_name
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${instance.token}`,
        token: instance.token,
        apikey: instance.token,
        "x-api-key": instance.token
      },
      body: JSON.stringify(body)
    })

    const text = await response.text()
    const payload = text ? safeJson(text) : {}

    if (response.ok) {
      await updateConnectionStatus(params.id, payload, "Conectando")
      return NextResponse.json(payload, { status: 200 })
    }

    return NextResponse.json(payload, { status: 500 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao conectar instancia"
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

async function updateConnectionStatus(id: string, payload: Record<string, unknown>, fallback: string) {
  const supabase = createAdminClient()
  const status = deriveConnectionLabel(payload, fallback)
  const { error } = await supabase.rpc("update_whatsapp_instance_connection", {
    p_id: id,
    p_conexao_w: status
  })

  if (error) {
    throw new Error(error.message)
  }
}

