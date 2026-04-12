import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { env } from "@/lib/env"
import { mockVariants } from "@/lib/mocks/variants"
import type { CampaignMessageVariant } from "@/types/entities"

interface VariantUsageRow {
  selected_variant_id: string | null
  count?: number
}

export async function listCampaignVariants(campaignId: string) {
  if (!env.NEXT_PUBLIC_SUPABASE_URL) {
    return mockVariants
  }

  const supabase =
    env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : createServerClient()
  const { data, error } = await supabase
    .from("campaign_message_variants")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true })

  if (error || !data) {
    throw error ?? new Error("Nao foi possivel carregar as variantes da campanha.")
  }

  const { data: usageData, error: usageError } = await supabase
    .from("campaign_messages")
    .select("selected_variant_id, count:count()")
    .eq("campaign_id", campaignId)
    .not("selected_variant_id", "is", null)

  if (usageError) {
    return data as CampaignMessageVariant[]
  }

  const usageMap = new Map<string, number>()
  ;(usageData as VariantUsageRow[] | null)?.forEach((row) => {
    if (row.selected_variant_id) {
      usageMap.set(row.selected_variant_id, Number(row.count ?? 0))
    }
  })

  return (data as CampaignMessageVariant[]).map((variant) => ({
    ...variant,
    usage_count: usageMap.get(variant.id) ?? 0
  }))
}
