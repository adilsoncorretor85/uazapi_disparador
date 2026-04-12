import { apiFetch, type ApiResponse } from "@/lib/services/http"
import type { WhatsAppInstance } from "@/types/entities"
import type { InstanceFormValues } from "@/lib/schemas/instance"

export async function fetchInstances() {
  return apiFetch<ApiResponse<WhatsAppInstance[]>>("/api/instances")
}

export async function createInstance(values: InstanceFormValues) {
  return apiFetch<ApiResponse<WhatsAppInstance>>("/api/instances", {
    method: "POST",
    body: JSON.stringify(values)
  })
}

export async function updateInstance(id: string, values: InstanceFormValues) {
  return apiFetch<ApiResponse<WhatsAppInstance>>(`/api/instances?id=${id}`, {
    method: "PUT",
    body: JSON.stringify(values)
  })
}

export async function connectInstance(id: string, mode: "qr" | "code" = "qr") {
  return apiFetch<ApiResponse<Record<string, unknown>>>(
    `/api/instances/${id}/connect?mode=${mode}`,
    {
      method: "POST"
    }
  )
}

export async function disconnectInstance(id: string) {
  return apiFetch<ApiResponse<Record<string, unknown>>>(`/api/instances/${id}/disconnect`, {
    method: "POST"
  })
}

export async function fetchInstanceStatus(id: string) {
  return apiFetch<ApiResponse<Record<string, unknown>>>(`/api/instances/${id}/status`, {
    method: "GET"
  })
}
