import { apiFetch } from "@/lib/services/http"
import type { Contact } from "@/types/entities"

export async function fetchContacts(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params)
  return apiFetch<Contact[]>(`/api/contacts?${query.toString()}`)
}

