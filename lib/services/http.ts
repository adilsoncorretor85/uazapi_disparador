export interface ApiResponse<T, Meta = undefined> {
  data: T
  meta?: Meta
  error?: string
}

export async function apiFetch<T>(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  })

  if (!res.ok) {
    const text = await res.text()
    const trimmed = text.trim()
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed) as { error?: string; message?: string }
        const message = parsed?.error ?? parsed?.message
        if (message) {
          throw new Error(message)
        }
      } catch (error) {
        if (!(error instanceof SyntaxError)) {
          throw error
        }
      }
    }
    throw new Error(trimmed || "Erro de requisição")
  }

  return (await res.json()) as T
}


