import type { WebhookEvent } from "@/types/entities"

export const mockAuditEvents: WebhookEvent[] = [
  {
    id: "evt_1",
    campaign_id: "camp_001",
    received_at: new Date().toISOString(),
    event_type: "message.delivered",
    provider_message_id: "wamid_1",
    process_status: "processed",
    error_message: null,
    payload: { status: "delivered", id: "wamid_1" }
  }
]

