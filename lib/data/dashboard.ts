import { createAdminClient } from "@/lib/supabase/admin"

export interface DashboardStats {
  activeCampaigns: number
  queuedMessages: number
  sentMessages: number
  deliveryRate: number
  activeContacts: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createAdminClient()

  const activeStatuses = ["processing", "scheduled"]
  const queueStatuses = ["pending", "locked"]
  const sentStatuses = ["sending", "sent", "delivered", "read", "played"]

  const [
    activeCampaigns,
    queuedMessages,
    sentMessages,
    deliveredMessages,
    activeContacts
  ] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .in("status", activeStatuses),
    supabase
      .from("campaign_messages")
      .select("id", { count: "exact", head: true })
      .in("status", queueStatuses),
    supabase
      .from("campaign_messages")
      .select("id", { count: "exact", head: true })
      .in("status", sentStatuses),
    supabase
      .from("campaign_messages")
      .select("id", { count: "exact", head: true })
      .eq("is_delivered", true),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("opted_in", true)
      .eq("is_valid", true)
  ])

  const sentCount = sentMessages.count ?? 0
  const deliveredCount = deliveredMessages.count ?? 0
  const deliveryRate = sentCount ? (deliveredCount / sentCount) * 100 : 0

  return {
    activeCampaigns: activeCampaigns.count ?? 0,
    queuedMessages: queuedMessages.count ?? 0,
    sentMessages: sentCount,
    deliveryRate,
    activeContacts: activeContacts.count ?? 0
  }
}
