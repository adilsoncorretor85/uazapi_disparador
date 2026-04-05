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
  tags: z.array(z.string()).optional(),
  custom_fields: z.record(z.any()).optional()
})

const importPayloadSchema = z.object({
  rows: z.array(importRowSchema).min(1),
  default_ddd: z.string().min(2).max(2).optional()
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = importPayloadSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 })
  }

  const { rows, default_ddd } = parsed.data
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
      whatsapp_digits: digits,
      whatsapp_e164: normalized.e164,
      first_name: firstName,
      full_name: fullName,
      email: row.email ?? null,
      city: row.city ?? null,
      state: row.state ?? null,
      tags: row.tags ?? null,
      custom_fields: row.custom_fields ?? null,
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
  const { data, error } = await supabase
    .from("contacts")
    .upsert(payload, { onConflict: "whatsapp_digits" })
    .select("id, whatsapp_e164, full_name, first_name")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    inserted: data?.length ?? 0,
    updated: 0,
    ignored: invalidRows.length,
    contacts: data ?? []
  })
}
