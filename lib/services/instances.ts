import { apiFetch } from "@/lib/services/http"
import type { WhatsAppInstance } from "@/types/entities"
import type { InstanceFormValues } from "@/lib/schemas/instance"

export async function fetchInstances() {
  return apiFetch<WhatsAppInstance[]>("/api/instances")
}

export async function createInstance(values: InstanceFormValues) {
  return apiFetch<WhatsAppInstance>("/api/instances", {
    method: "POST",
    body: JSON.stringify(values)
  })
}

export async function updateInstance(id: string, values: InstanceFormValues) {
  return apiFetch<WhatsAppInstance>(`/api/instances?id=${id}`, {
    method: "PUT",
    body: JSON.stringify(values)
  })
}

