import { format, parseISO } from "date-fns"

export function formatDateTime(value?: string | null) {
  if (!value) return "-"
  const date = typeof value === "string" ? parseISO(value) : value
  if (Number.isNaN(date.getTime())) return "-"
  return format(date, "dd/MM/yyyy HH:mm")
}

export function formatDate(value?: string | null) {
  if (!value) return "-"
  const date = typeof value === "string" ? parseISO(value) : value
  if (Number.isNaN(date.getTime())) return "-"
  return format(date, "dd/MM/yyyy")
}

export function formatNumber(value?: number | null) {
  if (value === null || value === undefined) return "0"
  return new Intl.NumberFormat("pt-BR").format(value)
}

export function formatPercent(value?: number | null) {
  if (!value || Number.isNaN(value)) return "0%"
  return `${value.toFixed(1)}%`
}

export function formatBoolean(value?: boolean | null) {
  return value ? "Sim" : "Não"
}
