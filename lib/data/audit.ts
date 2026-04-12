import { createAdminClient } from "@/lib/supabase/admin"
import { env } from "@/lib/env"
import { mockAuditEvents } from "@/lib/mocks/audit"
import type { WebhookEvent } from "@/types/entities"

export async function listCampaignAuditEvents(campaignId: string) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return mockAuditEvents
  }

  try {
    const supabase = createAdminClient()
    const idParam = Number.isNaN(Number(campaignId)) ? campaignId : Number(campaignId)
    const { data, error } = await supabase.rpc("list_webhook_events", {
      p_campaign_id: idParam,
      p_limit: 200,
      p_offset: 0
    })

    if (error || !data) {
      return mockAuditEvents
    }

    return data as WebhookEvent[]
  } catch {
    return mockAuditEvents
  }
}
