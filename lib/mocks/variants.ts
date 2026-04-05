import type { CampaignMessageVariant } from "@/types/entities"

export const mockVariants: CampaignMessageVariant[] = [
  {
    id: "var_1",
    campaign_id: "camp_001",
    sort_order: 1,
    message_body: "Olá, {{nome}}! Temos uma novidade especial para você.",
    is_active: true,
    weight: 60,
    usage_count: 320,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "var_2",
    campaign_id: "camp_001",
    sort_order: 2,
    message_body: "Oi, {{nome}}! Seu benefício exclusivo está aqui.",
    is_active: true,
    weight: 40,
    usage_count: 190,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]
