import { NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeWhatsappNumber } from "@/lib/utils/phone"

const importRowSchema = z.object({
  whatsapp: z.string().min(1),
  first_name: z.string().optional(),
  full_name: z.string().optional(),
  email: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  bairro: z.string().optional(),
  cep: z.string().optional(),
  rua: z.string().optional(),
  numero_residencia: z.string().optional(),
  complemento: z.string().optional(),
  ponto_referencia: z.string().optional(),
  genero: z.string().optional(),
  data_nascimento: z.string().optional(),
  tags: z.array(z.string()).optional(),
  custom_fields: z.record(z.any()).optional()
})

const importPayloadSchema = z.object({
  rows: z.array(importRowSchema).min(1),
  default_ddd: z.string().min(2).max(2).optional(),
  instance_id: z.string().min(1)
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = importPayloadSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 })
  }

  const { rows, default_ddd, instance_id } = parsed.data
  const dedup = new Map<string, (typeof rows)[number]>()
  const invalidRows: typeof rows = []

  rows.forEach((row) => {
    const normalized = normalizeWhatsappNumber(row.whatsapp, default_ddd ?? "47")
    if (!normalized) {
      invalidRows.push(row)
      return
    }
    dedup.set(normalized.digits, row)
  })

  const formattedRows = Array.from(dedup.entries()).map(([digits, row]) => {
    const normalized = normalizeWhatsappNumber(row.whatsapp, default_ddd ?? "47")
    if (!normalized) return null
    const fullName =
      row.full_name?.trim() ||
      row.first_name?.trim() ||
      row.custom_fields?.nome?.toString().trim() ||
      null
    const firstName =
      row.first_name?.trim() ||
      (fullName ? fullName.split(" ")[0] : null)

    return {
      instance_id,
      whatsapp_digits: digits,
      whatsapp_e164: normalized.e164,
      first_name: firstName,
      full_name: fullName,
      email: row.email ?? null,
      city: row.city ?? null,
      state: row.state ?? null,
      bairro: row.bairro ?? row.custom_fields?.bairro ?? null,
      cep: row.cep ?? row.custom_fields?.cep ?? null,
      rua: row.rua ?? row.custom_fields?.rua ?? null,
      numero_residencia:
        row.numero_residencia ?? row.custom_fields?.numero_residencia ?? null,
      complemento: row.complemento ?? row.custom_fields?.complemento ?? null,
      ponto_referencia:
        row.ponto_referencia ?? row.custom_fields?.ponto_referencia ?? null,
      genero: row.genero ?? row.custom_fields?.genero ?? null,
      data_nascimento: row.data_nascimento ?? row.custom_fields?.data_nascimento ?? null,
      tags: row.tags ?? [],
      custom_fields: row.custom_fields ?? {},
      opted_in: true,
      is_valid: true
    }
  })

  const payload = formattedRows.filter(Boolean) as Array<Record<string, unknown>>
  if (payload.length === 0) {
    return NextResponse.json({
      inserted: 0,
      updated: 0,
      ignored: rows.length
    })
  }

  const supabase = createAdminClient()
  const digitsList = payload
    .map((row) => row.whatsapp_digits as string | undefined)
    .filter(Boolean) as string[]

  const existingRows: Array<{
    id: string
    whatsapp_e164: string
    full_name: string | null
    first_name: string | null
    whatsapp_digits: string
  }> = []

  for (let i = 0; i < digitsList.length; i += 500) {
    const chunk = digitsList.slice(i, i + 500)
    const { data, error } = await supabase
      .from("contacts")
      .select("id, whatsapp_e164, full_name, first_name, whatsapp_digits")
      .eq("instance_id", instance_id)
      .in("whatsapp_digits", chunk)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (data?.length) {
      existingRows.push(...data)
    }
  }

  const existingMap = new Map(
    existingRows.map((row) => [row.whatsapp_digits, row])
  )

  const toInsert = payload.filter((row) => {
    const digits = row.whatsapp_digits as string | undefined
    return digits ? !existingMap.has(digits) : false
  })

  let insertedRows: Array<{
    id: string
    whatsapp_e164: string
    full_name: string | null
    first_name: string | null
    whatsapp_digits: string
  }> = []

  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from("contacts")
      .insert(toInsert)
      .select("id, whatsapp_e164, full_name, first_name, whatsapp_digits")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    insertedRows = data ?? []
  }

  const contacts = [...existingRows, ...insertedRows].map((row) => ({
    id: row.id,
    whatsapp_e164: row.whatsapp_e164,
    full_name: row.full_name,
    first_name: row.first_name
  }))

  return NextResponse.json({
    inserted: insertedRows.length,
    updated: 0,
    ignored: invalidRows.length + existingRows.length,
    contacts
  })
}
