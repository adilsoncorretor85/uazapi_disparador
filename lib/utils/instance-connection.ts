export function deriveConnectionLabel(
  payload: Record<string, unknown>,
  fallback: string = "Desconectado"
) {
  const statusObj = payload.status as Record<string, unknown> | undefined
  const payloadJid = payload.jid
  const statusJid = statusObj?.jid
  const payloadConnected =
    payload.connected === true ||
    payload.loggedIn === true ||
    payload.connected === "true" ||
    payload.loggedIn === "true"
  const statusConnected =
    statusObj?.connected === true ||
    statusObj?.loggedIn === true ||
    statusObj?.connected === "true" ||
    statusObj?.loggedIn === "true"
  const hasJid =
    (typeof payloadJid === "string" && payloadJid.trim().length > 0) ||
    (typeof statusJid === "string" && statusJid.trim().length > 0)

  if (payloadConnected || statusConnected || hasJid) return "Conectado"

  const instance = payload.instance as Record<string, unknown> | undefined
  const candidates = [
    payload.status,
    payload.state,
    payload.connection,
    payload.response,
    instance?.status,
    instance?.state,
    instance?.connection
  ]

  const status = candidates.find((value) => typeof value === "string" && value.trim()) as
    | string
    | undefined

  if (!status) return fallback

  const normalized = status.toLowerCase()
  if (normalized.includes("connecting") || normalized.includes("pair") || normalized.includes("qr")) {
    return "Conectando"
  }
  if (
    normalized.includes("disconnected") ||
    normalized.includes("offline") ||
    normalized.includes("closed") ||
    normalized.includes("error")
  ) {
    return "Desconectado"
  }
  if (normalized.includes("connected") || normalized.includes("online") || normalized === "open") {
    return "Conectado"
  }

  return fallback
}
