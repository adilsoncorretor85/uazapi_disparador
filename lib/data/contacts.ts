import { createServerClient } from "@/lib/supabase/server"
import { env } from "@/lib/env"
import { mockContacts } from "@/lib/mocks/contacts"
import type { Contact } from "@/types/entities"

export interface ContactFilters {
  search?: string
  city?: string
  opted_in?: string
  is_valid?: string
  tag?: string
}

export async function listContacts(filters: ContactFilters = {}) {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return mockContacts
  }

  const supabase = createServerClient()
  let query = supabase.from("contacts").select("*").order("full_name")

  if (filters.search) {
    query = query.or(
      `full_name.ilike.%${filters.search}%,whatsapp_e164.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    )
  }

  if (filters.city) {
    query = query.eq("city", filters.city)
  }

  if (filters.opted_in) {
    query = query.eq("opted_in", filters.opted_in === "true")
  }

  if (filters.is_valid) {
    query = query.eq("is_valid", filters.is_valid === "true")
  }

  if (filters.tag) {
    query = query.contains("tags", [filters.tag])
  }

  const { data, error } = await query

  if (error || !data) {
    return mockContacts
  }

  return data as Contact[]
}

