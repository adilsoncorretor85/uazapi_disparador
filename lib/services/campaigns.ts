import type { Campaign, CampaignMessageVariant, CampaignMessageWithContact, WebhookEvent } from "@/types/entities"
import type { CampaignFormValues } from "@/lib/schemas/campaign"
import { apiFetch } from "@/lib/services/http"

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
  return apiFetch<{ data: Campaign[]; summary: CampaignSummary }>(
    `/api/campaigns?${query.toString()}`
  )
}

export async function fetchCampaign(id: string) {
  return apiFetch<Campaign>(`/api/campaigns/${id}`)
}

export async function createCampaign(values: CampaignFormValues) {
  return apiFetch<Campaign>("/api/campaigns", {
    method: "POST",
    body: JSON.stringify(values)
  })
}

export async function updateCampaign(id: string, values: CampaignFormValues) {
  return apiFetch<Campaign>(`/api/campaigns/${id}`, {
    method: "PUT",
    body: JSON.stringify(values)
  })
}

export async function fetchCampaignVariants(id: string) {
  return apiFetch<CampaignMessageVariant[]>(`/api/campaigns/${id}/variants`)
}

export async function fetchCampaignMessages(
  id: string,
  params: Record<string, string>
) {
  const query = new URLSearchParams(params)
  return apiFetch<{ data: CampaignMessageWithContact[]; count: number }>(
    `/api/campaigns/${id}/messages?${query.toString()}`
  )
}

export async function fetchCampaignAudit(id: string) {
  return apiFetch<WebhookEvent[]>(`/api/campaigns/${id}/audit`)
}

export async function runCampaignAction(id: string, action: string) {
  return apiFetch<{ campaign: Campaign }>(`/api/campaigns/${id}/actions`, {
    method: "POST",
    body: JSON.stringify({ action })
  })
}

export async function duplicateCampaign(id: string) {
  return apiFetch<{ campaign: Campaign }>(`/api/campaigns/${id}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "duplicate" })
  })
}
