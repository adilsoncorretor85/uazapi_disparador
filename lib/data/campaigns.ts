import { createServerClient } from "@/lib/supabase/server"
import { env } from "@/lib/env"
import { mockCampaigns } from "@/lib/mocks/campaigns"
import { listCampaignVariants } from "@/lib/data/variants"
import type { Campaign } from "@/types/entities"
import type { CampaignFormValues } from "@/lib/schemas/campaign"
import type { CampaignStatus } from "@/lib/constants/status"

export interface CampaignFilters {
  search?: string
  status?: string
  from?: string
  to?: string
}

export async function listCampaigns(filters: CampaignFilters = {}) {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { data: mockCampaigns, summary: buildCampaignSummary(mockCampaigns) }
  }

  try {
    const supabase = createServerClient()
    let query = supabase
      .from("campaigns")
      .select("*")
      .order("updated_at", { ascending: false })

    if (filters.search) {
      query = query.ilike("title", `%${filters.search}%`)
    }

    if (filters.status) {
      query = query.eq("status", filters.status)
    }

    if (filters.from) {
      query = query.gte("created_at", filters.from)
    }

    if (filters.to) {
      query = query.lte("created_at", filters.to)
    }

    const { data, error } = await query

    if (error || !data) {
      throw error
    }

    return { data: data as Campaign[], summary: buildCampaignSummary(data as Campaign[]) }
  } catch (error) {
    return { data: mockCampaigns, summary: buildCampaignSummary(mockCampaigns) }
  }
}

export async function getCampaign(id: string) {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return mockCampaigns.find((campaign) => campaign.id === id) ?? mockCampaigns[0]
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    return mockCampaigns.find((campaign) => campaign.id === id) ?? mockCampaigns[0]
  }

  return data as Campaign
}

export async function createCampaign(values: CampaignFormValues) {
  const supabase = createServerClient()
  const { variants, ...payload } = normalizeCampaignPayload(values)

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      ...payload,
      use_randomizer: values.use_randomizer,
      message_body: values.message_body
    })
    .select("*")
    .single()

  if (error) {
    throw error
  }

  if (values.use_randomizer && variants?.length) {
    const variantPayload = variants.map((variant, index) => ({
      campaign_id: data.id,
      sort_order: index + 1,
      message_body: variant.message_body,
      is_active: variant.is_active,
      weight: variant.weight ?? 1
    }))

    await supabase.from("campaign_message_variants").insert(variantPayload)
  }

  return data as Campaign
}

export async function updateCampaign(id: string, values: CampaignFormValues) {
  const supabase = createServerClient()
  const { variants, ...payload } = normalizeCampaignPayload(values)

  const { data, error } = await supabase
    .from("campaigns")
    .update({
      ...payload,
      use_randomizer: values.use_randomizer,
      message_body: values.message_body,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  if (values.use_randomizer) {
    await supabase.from("campaign_message_variants").delete().eq("campaign_id", id)

    if (variants?.length) {
      const variantPayload = variants.map((variant, index) => ({
        campaign_id: id,
        sort_order: index + 1,
        message_body: variant.message_body,
        is_active: variant.is_active,
        weight: variant.weight ?? 1
      }))

      await supabase.from("campaign_message_variants").insert(variantPayload)
    }
  }

  return data as Campaign
}

export async function updateCampaignStatus(id: string, status: CampaignStatus) {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const base = mockCampaigns.find((campaign) => campaign.id === id) ?? mockCampaigns[0]
    return { ...base, status }
  }

  const supabase = createServerClient()
  const payload: Partial<Campaign> = {
    status,
    updated_at: new Date().toISOString()
  }

  if (status === "completed") {
    payload.completed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from("campaigns")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data as Campaign
}

export async function duplicateCampaign(id: string) {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const base = mockCampaigns.find((campaign) => campaign.id === id) ?? mockCampaigns[0]
    return {
      ...base,
      id: `mock_${Date.now()}`,
      title: `${base.title} (cópia)`,
      status: "draft",
      total_numbers: 0,
      total_sent: 0,
      total_delivered: 0,
      total_read: 0,
      total_failed: 0
    }
  }

  const supabase = createServerClient()
  const original = await getCampaign(id)
  const variants = await listCampaignVariants(id)

  const {
    id: _id,
    created_at,
    updated_at,
    started_at,
    completed_at,
    total_numbers,
    total_sent,
    total_delivered,
    total_read,
    total_failed,
    ...rest
  } = original

  const { data: newCampaign, error } = await supabase
    .from("campaigns")
    .insert({
      ...rest,
      title: `${original.title} (cópia)`,
      status: "draft",
      scheduled_at: null,
      started_at: null,
      completed_at: null,
      total_numbers: 0,
      total_sent: 0,
      total_delivered: 0,
      total_read: 0,
      total_failed: 0
    })
    .select("*")
    .single()

  if (error) {
    throw error
  }

  if (original.use_randomizer && variants.length) {
    const variantPayload = variants.map((variant, index) => ({
      campaign_id: newCampaign.id,
      sort_order: index + 1,
      message_body: variant.message_body,
      is_active: variant.is_active,
      weight: variant.weight ?? 1
    }))

    await supabase.from("campaign_message_variants").insert(variantPayload)
  }

  return newCampaign as Campaign
}

function normalizeCampaignPayload(values: CampaignFormValues) {
  return {
    ...values,
    scheduled_at: values.scheduled_at ? values.scheduled_at : null,
    media_url: values.media_url ? values.media_url : null,
    media_type: values.media_type === "none" ? null : values.media_type,
    variants: values.use_randomizer ? values.variants : []
  }
}

function buildCampaignSummary(campaigns: Campaign[]) {
  return {
    total: campaigns.length,
    running: campaigns.filter((item) => item.status === "processing").length,
    paused: campaigns.filter((item) => item.status === "paused").length,
    completed: campaigns.filter((item) => item.status === "completed").length,
    total_sent: campaigns.reduce((sum, item) => sum + (item.total_sent ?? 0), 0),
    total_delivered: campaigns.reduce(
      (sum, item) => sum + (item.total_delivered ?? 0),
      0
    ),
    total_read: campaigns.reduce((sum, item) => sum + (item.total_read ?? 0), 0),
    total_failed: campaigns.reduce((sum, item) => sum + (item.total_failed ?? 0), 0)
  }
}

