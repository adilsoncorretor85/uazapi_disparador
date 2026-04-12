export const DEFAULT_TIMEZONE = "America/Sao_Paulo"

const pad2 = (num: number) => String(num).padStart(2, "0")

export function getTimeZoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  })
  const parts = formatter.formatToParts(date)
  const map: Record<string, string> = {}
  parts.forEach((part) => {
    if (part.type !== "literal") {
      map[part.type] = part.value
    }
  })
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute)
  }
}

export function formatDateTimeInTimeZone(
  value?: string | null,
  timeZone = DEFAULT_TIMEZONE
) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const parts = getTimeZoneParts(date, timeZone)
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(
    parts.hour
  )}:${pad2(parts.minute)}`
}

export function splitDateTimeInTimeZone(
  value?: string | null,
  timeZone = DEFAULT_TIMEZONE
) {
  if (!value) return { date: "", time: "" }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { date: "", time: "" }
  const parts = getTimeZoneParts(date, timeZone)
  return {
    date: `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`,
    time: `${pad2(parts.hour)}:${pad2(parts.minute)}`
  }
}

export function dateTimeInTimeZoneToUtcIso(
  dateValue: string,
  timeValue: string,
  timeZone = DEFAULT_TIMEZONE
) {
  if (!dateValue || !timeValue) return null
  const [year, month, day] = dateValue.split("-").map(Number)
  const [hour, minute] = timeValue.split(":").map(Number)
  if ([year, month, day, hour, minute].some((value) => Number.isNaN(value))) {
    return null
  }

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
  const actual = getTimeZoneParts(utcGuess, timeZone)
  const actualUtc = Date.UTC(
    actual.year,
    actual.month - 1,
    actual.day,
    actual.hour,
    actual.minute,
    0
  )
  const intendedUtc = Date.UTC(year, month - 1, day, hour, minute, 0)
  const diffMs = intendedUtc - actualUtc
  return new Date(utcGuess.getTime() + diffMs).toISOString()
}
