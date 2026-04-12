import type { CampaignFormValues } from "@/lib/schemas/campaign"
import { DEFAULT_TIMEZONE } from "./date-time"

export type SubmitIntent = "publish" | "draft" | "keep"

interface SubmitOptions {
  intent: SubmitIntent
  mode: "create" | "edit"
  scheduleEnabled: boolean
  scheduledIso: string | null
}

export function applySubmitIntent(
  values: CampaignFormValues,
  { intent, mode, scheduleEnabled, scheduledIso }: SubmitOptions
) {
  const payload: CampaignFormValues = {
    ...values,
    timezone: DEFAULT_TIMEZONE,
    scheduled_at: scheduleEnabled ? scheduledIso : null
  }

  const shouldSchedule = scheduleEnabled && Boolean(scheduledIso)

  if (intent === "draft") {
    payload.status = "draft"
    payload.scheduled_at = null
    return payload
  }

  if (intent === "publish") {
    payload.status = shouldSchedule ? "scheduled" : "processing"
    if (!shouldSchedule) {
      payload.scheduled_at = null
    }
    return payload
  }

  if (mode === "create") {
    payload.status = shouldSchedule ? "scheduled" : "processing"
    if (!shouldSchedule) {
      payload.scheduled_at = null
    }
  }

  return payload
}
