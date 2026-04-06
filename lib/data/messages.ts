import { createServerClient } from "@/lib/supabase/server"
import { env } from "@/lib/env"
import { mockMessages } from "@/lib/mocks/messages"
import type { CampaignMessageWithContact } from "@/types/entities"

export interface MessageFilters {
  search?: string
  status?: string
  delivered?: string
  read?: string
  failed?: string
  processed?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export async function listCampaignMessages(
  campaignId: string,
  filters: MessageFilters = {}
) {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { data: mockMessages, count: mockMessages.length }
  }

  const supabase = createServerClient()
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 20
  const rangeFrom = (page - 1) * pageSize
  const rangeTo = rangeFrom + pageSize - 1

  const buildQuery = (withJoin: boolean) => {
    const selectClause = withJoin
      ? "*, contact:contacts(full_name, first_name)"
      : "*"

    let query = supabase
      .from("campaign_messages")
      .select(selectClause, { count: "exact" })
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .range(rangeFrom, rangeTo)

    if (filters.search) {
      const base = `phone_e164.ilike.%${filters.search}%,phone_digits.ilike.%${filters.search}%,message_body.ilike.%${filters.search}%,contact_id.ilike.%${filters.search}%`
      const joined = `${base},contacts.full_name.ilike.%${filters.search}%,contacts.first_name.ilike.%${filters.search}%`
      query = query.or(withJoin ? joined : base)
    }

    if (filters.status) {
      query = query.eq("status", filters.status)
    }

    if (filters.delivered) {
      query = query.eq("is_delivered", filters.delivered === "true")
    }

    if (filters.read) {
      query = query.eq("is_read", filters.read === "true")
    }

    if (filters.failed === "true") {
      query = query.eq("status", "failed")
    }

    if (filters.processed) {
      query = query.eq("processed", filters.processed === "true")
    }

    if (filters.from) {
      query = query.gte("created_at", filters.from)
    }

    if (filters.to) {
      query = query.lte("created_at", filters.to)
    }

    return query
  }

  const { data, error, count } = await buildQuery(true)

  if (error || !data) {
    const { data: fallbackData, error: fallbackError, count: fallbackCount } =
      await buildQuery(false)

    if (fallbackError || !fallbackData) {
      return { data: mockMessages, count: mockMessages.length }
    }

    return {
      data: fallbackData as CampaignMessageWithContact[],
      count: fallbackCount ?? fallbackData.length
    }
  }

  return { data: data as CampaignMessageWithContact[], count: count ?? data.length }
}
