import type { Campaign, CampaignMessageVariant, CampaignMessageWithContact, WebhookEvent } from "@/types/entities"
import type { CampaignFormValues } from "@/lib/schemas/campaign"
import { apiFetch, type ApiResponse } from "@/lib/services/http"

export interface CampaignSummary {
  total: number
  running: number
  paused: number
  completed: number
  total_sent: number
  total_delivered: number
  total_read: number
  total_failed: number
}

export async function fetchCampaigns(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params)
  return apiFetch<ApiResponse<Campaign[], { summary: CampaignSummary }>>(
    `/api/campaigns?${query.toString()}`
  )
}

export async function fetchCampaign(id: string) {
  return apiFetch<ApiResponse<Campaign>>(`/api/campaigns/${id}`)
}

export async function createCampaign(values: CampaignFormValues) {
  return apiFetch<ApiResponse<Campaign>>("/api/campaigns", {
    method: "POST",
    body: JSON.stringify(values)
  })
}

export async function updateCampaign(id: string, values: CampaignFormValues) {
  return apiFetch<ApiResponse<Campaign>>(`/api/campaigns/${id}`, {
    method: "PUT",
    body: JSON.stringify(values)
  })
}

export async function fetchCampaignVariants(id: string) {
  return apiFetch<ApiResponse<CampaignMessageVariant[]>>(`/api/campaigns/${id}/variants`)
}

export async function fetchCampaignMessages(
  id: string,
  params: Record<string, string>
) {
  const query = new URLSearchParams(params)
  return apiFetch<ApiResponse<CampaignMessageWithContact[], { count: number }>>(
    `/api/campaigns/${id}/messages?${query.toString()}`
  )
}

export async function fetchCampaignAudit(id: string) {
  return apiFetch<ApiResponse<WebhookEvent[]>>(`/api/campaigns/${id}/audit`)
}

export async function runCampaignAction(id: string, action: string) {
  return apiFetch<ApiResponse<Campaign>>(`/api/campaigns/${id}/actions`, {
    method: "POST",
    body: JSON.stringify({ action })
  })
}

export async function duplicateCampaign(id: string) {
  return apiFetch<ApiResponse<Campaign>>(`/api/campaigns/${id}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "duplicate" })
  })
}
export async function deleteCampaign(id: string) {
  return apiFetch<ApiResponse<{ id: string }>>(`/api/campaigns/${id}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "delete" })
  })
}
export async function fetchCampaignContacts(id: string) {
  const limit = 1000
  let offset = 0
  const all: Array<{ id: string; whatsapp_e164: string; first_name?: string | null; full_name?: string | null }> = []

  while (true) {
    const response = await apiFetch<
      ApiResponse<
        Array<{ id: string; whatsapp_e164: string; first_name?: string | null; full_name?: string | null }>,
        { nextOffset: number | null }
      >
    >(`/api/campaigns/${id}/contacts?offset=${offset}&limit=${limit}`)

    const chunk = response.data ?? []
    all.push(...chunk)

    const next = response.meta?.nextOffset
    if (next == null || chunk.length === 0) {
      break
    }
    offset = next
  }

  return { data: all }
}


