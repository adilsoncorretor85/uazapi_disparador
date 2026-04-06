export async function apiFetch<T>(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, {
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
        if (parsed?.error || parsed?.message) {
          throw new Error(parsed.error ?? parsed.message ?? "Erro de requisição")
        }
      } catch {
        // ignore JSON parsing
      }
    }
    throw new Error(trimmed || "Erro de requisição")
  }

  return (await res.json()) as T
}

