import { NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"

const optionalString = z.preprocess((value) => {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed === "" ? undefined : trimmed
}, z.string().optional())

const querySchema = z.object({
  instance_id: z.string().min(1),
  city_search: optionalString,
  city: optionalString,
  bairro: optionalString
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse({
    instance_id: searchParams.get("instance_id"),
    city_search: searchParams.get("city_search"),
    city: searchParams.get("city"),
    bairro: searchParams.get("bairro")
  })

  if (!parsed.success) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc("list_contact_filter_options", {
      p_instance_id: parsed.data.instance_id,
      p_city_search: parsed.data.city_search ?? null,
      p_city: parsed.data.city ?? null,
      p_bairro: parsed.data.bairro ?? null
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const row = Array.isArray(data) ? data[0] : data

    return NextResponse.json({
      data: {
        tags: row?.tags ?? [],
        cities: row?.cities ?? [],
        bairros: row?.bairros ?? [],
        ruas: row?.ruas ?? []
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar filtros"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
