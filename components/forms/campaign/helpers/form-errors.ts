export function findFirstErrorMessage(errors: Record<string, unknown>): string | null {
  for (const value of Object.values(errors)) {
    if (!value) continue
    if (typeof value === "object" && "message" in (value as Record<string, unknown>)) {
      const message = (value as { message?: string }).message
      if (typeof message === "string" && message) return message
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object" && "message" in item) {
          const msg = (item as { message?: string }).message
          if (typeof msg === "string" && msg) return msg
        }
        if (item && typeof item === "object") {
          const nested = findFirstErrorMessage(item as Record<string, unknown>)
          if (nested) return nested
        }
      }
    } else if (typeof value === "object") {
      const nested = findFirstErrorMessage(value as Record<string, unknown>)
      if (nested) return nested
    }
  }
  return null
}
