import type { CampaignMessageWithContact } from "@/types/entities"

export const mockMessages: CampaignMessageWithContact[] = Array.from({ length: 18 }).map(
  (_, idx) => ({
    id: `msg_${idx + 1}`,
    campaign_id: "camp_001",
    instance_id: "inst_01",
    contact_id: `contact_${idx + 1}`,
    selected_variant_id: idx % 2 === 0 ? "var_1" : "var_2",
    phone_e164: "+55119999" + String(1000 + idx),
    phone_digits: "119999" + String(1000 + idx),
    message_body: "Olá! Essa é uma mensagem de teste.",
    media_type: "image",
    media_url: "https://picsum.photos/seed/msg/400/240",
    provider_message_id: `wamid_${idx}`,
    provider_status: idx % 3 === 0 ? "delivered" : "sent",
    status: idx % 5 === 0 ? "failed" : idx % 2 === 0 ? "delivered" : "sent",
    attempt_count: idx % 2 === 0 ? 1 : 2,
    is_delivered: idx % 2 === 0,
    is_read: idx % 4 === 0,
    is_played: false,
    scheduled_for: new Date().toISOString(),
    sent_at: new Date().toISOString(),
    delivered_at: idx % 2 === 0 ? new Date().toISOString() : null,
    read_at: idx % 4 === 0 ? new Date().toISOString() : null,
    failed_at: idx % 5 === 0 ? new Date().toISOString() : null,
    error_message: idx % 5 === 0 ? "Falha de entrega" : null,
    provider_response: { status: "ok", id: `wamid_${idx}` },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact: {
      full_name: `Contato ${idx + 1}`,
      first_name: `Contato ${idx + 1}`
    }
  })
)

