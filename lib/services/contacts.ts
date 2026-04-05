import { apiFetch } from "@/lib/services/http"
import type { Contact } from "@/types/entities"

export async function fetchContacts(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params)
  return apiFetch<Contact[]>(`/api/contacts?${query.toString()}`)
}

export interface ImportContactRow {
  whatsapp: string
  first_name?: string
  full_name?: string
  email?: string
  city?: string
  state?: string
  tags?: string[]
  custom_fields?: Record<string, unknown>
}

export interface ImportContactsResponse {
  inserted: number
  updated: number
  ignored: number
  contacts: Array<Pick<Contact, "id" | "whatsapp_e164" | "first_name" | "full_name">>
}

export async function importContacts(rows: ImportContactRow[], defaultDdd?: string) {
  return apiFetch<ImportContactsResponse>("/api/contacts/import", {
    method: "POST",
    body: JSON.stringify({
      rows,
      default_ddd: defaultDdd
    })
  })
}