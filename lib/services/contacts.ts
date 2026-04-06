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

export interface ContactFilterOptions {
  tags: string[]
  cities: string[]
  bairros: string[]
  ruas: string[]
}

export async function importContacts(
  rows: ImportContactRow[],
  instanceId: string,
  defaultDdd?: string
) {
  return apiFetch<ImportContactsResponse>("/api/contacts/import", {
    method: "POST",
    body: JSON.stringify({
      rows,
      instance_id: instanceId,
      default_ddd: defaultDdd
    })
  })
}

export interface ContactFilterParams {
  citySearch?: string
  city?: string
  bairro?: string
}

export async function fetchContactFilterOptions(
  instanceId: string,
  params: ContactFilterParams = {}
) {
  const query = new URLSearchParams({ instance_id: instanceId })
  if (params.citySearch) query.set("city_search", params.citySearch)
  if (params.city) query.set("city", params.city)
  if (params.bairro) query.set("bairro", params.bairro)
  return apiFetch<ContactFilterOptions>(`/api/contacts/options?${query.toString()}`)
}
