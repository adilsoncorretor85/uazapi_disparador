import type { ApiResponse } from "@/lib/services/http"

export interface LinkPreviewData {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
}

export function extractFirstLink(text: string) {
  const match = text.match(/https?:\/\/\S+/i)
  return match?.[0] ?? null
}

export async function fetchLinkPreview(url: string, signal?: AbortSignal) {
  const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, {
    signal
  })
  if (!response.ok) {
    throw new Error("Falha ao carregar prévia")
  }
  const payload = (await response.json()) as ApiResponse<{
    title?: string
    description?: string
    image?: string
    siteName?: string
  }>
  return payload.data ?? {}
}
