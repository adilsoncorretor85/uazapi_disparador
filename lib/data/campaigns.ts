import { createAdminClient } from "@/lib/supabase/admin"
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
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return { data: mockCampaigns, summary: buildCampaignSummary(mockCampaigns) }
  }

  try {
    const supabase = createAdminClient()
    let query = supabase
      .from("campaigns_with_metrics")
      .select("*")
      .order("updated_at", { ascending: false })

    if (filters.search) {
      query = query.ilike("title", `%${filters.search}%`)
    }

    if (filters.status) {
      query = query.eq("derived_status", filters.status)
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
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return mockCampaigns.find((campaign) => campaign.id === id) ?? mockCampaigns[0]
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("campaigns_with_metrics")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    return mockCampaigns.find((campaign) => campaign.id === id) ?? mockCampaigns[0]
  }

  return data as Campaign
}

export async function createCampaign(values: CampaignFormValues) {
  const supabase = createAdminClient()
  const { variants, audience_contact_ids, audience_source, ...payload } =
    normalizeCampaignPayload(values)
  const audienceContactIds =
    audience_source === "file" ? uniqueStrings(audience_contact_ids) : []

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

  let insertedVariants: VariantSeed[] = []
  if (values.use_randomizer && variants?.length) {
    const variantPayload = variants.map((variant, index) => ({
      campaign_id: data.id,
      sort_order: index + 1,
      message_body: variant.message_body,
      is_active: variant.is_active,
      weight: variant.weight ?? 1
    }))

    const { data: variantRows, error: variantError } = await supabase
      .from("campaign_message_variants")
      .insert(variantPayload)
      .select("id, message_body, weight, is_active")

    if (variantError) {
      throw variantError
    }

    insertedVariants = (variantRows ?? []) as VariantSeed[]
  }

  if (audience_source === "file" && audienceContactIds.length) {
    for (const chunk of chunkArray(audienceContactIds, 500)) {
      const audiencePayload = chunk.map((contactId) => ({
        campaign_id: data.id,
        contact_id: contactId
      }))
      const { error: audienceError } = await supabase
        .from("campaign_contacts")
        .upsert(audiencePayload, {
          onConflict: "campaign_id,contact_id",
          ignoreDuplicates: true
        })
      if (audienceError) {
        throw audienceError
      }
    }
  }

  await seedCampaignMessages({
    supabase,
    campaign: data as Campaign,
    values:
      audience_source === "file"
        ? { ...values, audience_contact_ids: audienceContactIds }
        : values,
    variants: insertedVariants
  })

  return data as Campaign
}

export async function updateCampaign(id: string, values: CampaignFormValues) {
  const supabase = createAdminClient()
  const { variants, audience_contact_ids, audience_source, ...payload } =
    normalizeCampaignPayload(values)
  const audienceContactIds =
    audience_source === "file" ? uniqueStrings(audience_contact_ids) : []

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

  let insertedVariants: VariantSeed[] = []
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

      const { data: variantRows, error: variantError } = await supabase
        .from("campaign_message_variants")
        .insert(variantPayload)
        .select("id, message_body, weight, is_active")

      if (variantError) {
        throw variantError
      }

      insertedVariants = (variantRows ?? []) as VariantSeed[]
    }
  }

  if (audience_source === "file" && audienceContactIds.length) {
    await supabase.from("campaign_contacts").delete().eq("campaign_id", id)
    for (const chunk of chunkArray(audienceContactIds, 500)) {
      const audiencePayload = chunk.map((contactId) => ({
        campaign_id: id,
        contact_id: contactId
      }))
      const { error: audienceError } = await supabase
        .from("campaign_contacts")
        .upsert(audiencePayload, {
          onConflict: "campaign_id,contact_id",
          ignoreDuplicates: true
        })
      if (audienceError) {
        throw audienceError
      }
    }
  } else if (audience_source === "all") {
    await supabase.from("campaign_contacts").delete().eq("campaign_id", id)
  }

  await seedCampaignMessages({
    supabase,
    campaign: data as Campaign,
    values:
      audience_source === "file"
        ? { ...values, audience_contact_ids: audienceContactIds }
        : values,
    variants: insertedVariants
  })

  return data as Campaign
}

export async function updateCampaignStatus(id: string, status: CampaignStatus) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    const base = mockCampaigns.find((campaign) => campaign.id === id) ?? mockCampaigns[0]
    return { ...base, status }
  }

  const supabase = createAdminClient()
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
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
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

  const supabase = createAdminClient()
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
  const delayMin = values.delay_min_seconds ?? 0
  const delayMaxRaw = values.delay_max_seconds ?? delayMin
  const delayMax = delayMaxRaw < delayMin ? delayMin : delayMaxRaw
  const isBaseAudience = values.audience_source !== "file"
  const audienceTags = normalizeStringArray(values.audience_tags)
  const audienceTagsExclude = normalizeStringArray(values.audience_tags_exclude)
  const audienceCities = normalizeStringArray(values.audience_cities)
  const audienceBairros = normalizeStringArray(values.audience_bairros)
  const audienceRuas = normalizeStringArray(values.audience_ruas)

  return {
    ...values,
    scheduled_at: values.scheduled_at ? values.scheduled_at : null,
    timezone: values.timezone || "America/Sao_Paulo",
    media_url: values.media_url ? values.media_url : null,
    media_type:
      values.media_type === "none" || values.media_type === "link" || !values.media_type
        ? "text"
        : values.media_type,
    link_preview: values.media_type === "link" ? true : values.link_preview ?? false,
    typing_delay_seconds: values.use_composing ? values.typing_delay_seconds ?? 6 : 0,
    delay_min_seconds: delayMin,
    delay_max_seconds: delayMax,
    batch_size: values.batch_size ?? 50,
    max_attempts: values.max_attempts ?? 3,
    variants: values.use_randomizer ? values.variants : [],
    audience_tags: isBaseAudience ? audienceTags : [],
    audience_tags_exclude: isBaseAudience ? audienceTagsExclude : [],
    audience_cities: isBaseAudience ? audienceCities : [],
    audience_bairros: isBaseAudience ? audienceBairros : [],
    audience_ruas: isBaseAudience ? audienceRuas : []
  }
}
function buildCampaignSummary(campaigns: Campaign[]) {
  const statusOf = (item: Campaign) => (item.derived_status ?? item.status) as CampaignStatus
  return {
    total: campaigns.length,
    running: campaigns.filter((item) => statusOf(item) === "processing").length,
    paused: campaigns.filter((item) => statusOf(item) === "paused").length,
    completed: campaigns.filter((item) => statusOf(item) === "completed").length,
    total_sent: campaigns.reduce((sum, item) => sum + (item.total_sent ?? 0), 0),
    total_delivered: campaigns.reduce(
      (sum, item) => sum + (item.total_delivered ?? 0),
      0
    ),
    total_read: campaigns.reduce((sum, item) => sum + (item.total_read ?? 0), 0),
    total_failed: campaigns.reduce((sum, item) => sum + (item.total_failed ?? 0), 0)
  }
}

interface VariantSeed {
  id: string
  message_body: string
  weight?: number | null
  is_active?: boolean | null
}

interface ContactSeed {
  id: string
  whatsapp_e164: string
  whatsapp_digits: string
}

async function seedCampaignMessages({
  supabase,
  campaign,
  values,
  variants
}: {
  supabase: ReturnType<typeof createAdminClient>
  campaign: Campaign
  values: CampaignFormValues
  variants: VariantSeed[]
}) {
  if (!campaign?.id) {
    return
  }

  const { count: existingCount, error: countError } = await supabase
    .from("campaign_messages")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaign.id)

  if (countError) {
    throw countError
  }

  if ((existingCount ?? 0) > 0) {
    return
  }

  const scheduledFor = campaign.scheduled_at ?? new Date().toISOString()
  const mediaType = campaign.media_type ?? "text"
  const mediaUrl = campaign.media_url ?? null
  const linkPreview = campaign.link_preview ?? false
  const typingDelay = campaign.typing_delay_seconds ?? 0

  const activeVariants = values.use_randomizer
    ? (variants ?? []).filter(
        (variant) => variant.is_active !== false && variant.message_body?.trim()
      )
    : []

  if (values.use_randomizer && activeVariants.length === 0) {
    throw new Error("Nenhuma variante ativa para gerar envios")
  }

  const rawMediaType = values.media_type ?? "none"
  const requiresMessage =
    rawMediaType === "none" || rawMediaType === "text" || rawMediaType === "link"

  const baseMessage =
    !values.use_randomizer && values.message_body?.trim()
      ? values.message_body
      : ""

  if (!values.use_randomizer && requiresMessage && !baseMessage) {
    throw new Error("Mensagem obrigatória para gerar envios")
  }

  const pickVariant = () => {
    if (!activeVariants.length) return null
    const totalWeight = activeVariants.reduce(
      (sum, variant) => sum + Math.max(1, Number(variant.weight ?? 1)),
      0
    )
    const roll = Math.random() * totalWeight
    let accumulator = 0
    for (const variant of activeVariants) {
      accumulator += Math.max(1, Number(variant.weight ?? 1))
      if (roll <= accumulator) {
        return variant
      }
    }
    return activeVariants[activeVariants.length - 1] ?? null
  }

  const insertBatch = async (contacts: ContactSeed[]) => {
    if (!contacts.length) return 0
    const payload = contacts.map((contact) => {
      const variant = values.use_randomizer ? pickVariant() : null
      return {
        campaign_id: campaign.id,
        instance_id: campaign.instance_id,
        contact_id: contact.id,
        phone_e164: contact.whatsapp_e164,
        phone_digits: contact.whatsapp_digits,
        message_body: variant?.message_body ?? baseMessage,
        selected_variant_id: variant?.id ?? null,
        media_type: mediaType,
        media_url: mediaUrl,
        link_preview: linkPreview,
        typing_delay_seconds: typingDelay,
        scheduled_for: scheduledFor,
        next_attempt_at: scheduledFor
      }
    })

    const { error } = await supabase.from("campaign_messages").insert(payload)
    if (error) {
      throw error
    }
    return payload.length
  }

  let totalInserted = 0

  if (values.audience_source === "file") {
    let contactIds = values.audience_contact_ids ?? []
    if (contactIds.length === 0) {
      const { data: campaignContacts, error: contactError } = await supabase
        .from("campaign_contacts")
        .select("contact_id")
        .eq("campaign_id", campaign.id)

      if (contactError) {
        throw contactError
      }

      contactIds = (campaignContacts ?? []).map((row) => row.contact_id as string)
    }

    if (contactIds.length === 0) {
      throw new Error("Nenhum contato importado. Envie a planilha para gerar envios.")
    }

    const contactChunkSize = 100
    for (const chunk of chunkArray(contactIds, contactChunkSize)) {
      if (!chunk.length) continue
      const { data: contacts, error } = await supabase
        .from("contacts")
        .select("id, whatsapp_e164, whatsapp_digits")
        .in("id", chunk)
        .eq("opted_in", true)
        .eq("is_valid", true)
        .not("whatsapp_e164", "is", null)
        .not("whatsapp_digits", "is", null)

      if (error) {
        throw error
      }

      totalInserted += await insertBatch((contacts ?? []) as ContactSeed[])
    }
  } else {
    const includeTags = normalizeStringArray(values.audience_tags)
    const excludeTags = normalizeStringArray(values.audience_tags_exclude)
    const cities = normalizeStringArray(values.audience_cities)
    const bairros = normalizeStringArray(values.audience_bairros)
    const ruas = normalizeStringArray(values.audience_ruas)

    let from = 0
    const pageSize = 500
    while (true) {
      let query = supabase
        .from("contacts")
        .select("id, whatsapp_e164, whatsapp_digits")
        .eq("instance_id", campaign.instance_id)
        .eq("opted_in", true)
        .eq("is_valid", true)
        .not("whatsapp_e164", "is", null)
        .not("whatsapp_digits", "is", null)
        .order("created_at", { ascending: true })
        .range(from, from + pageSize - 1)

      if (cities.length) {
        query = query.in("city", cities)
      }
      if (bairros.length) {
        query = query.in("bairro", bairros)
      }
      if (ruas.length) {
        query = query.in("rua", ruas)
      }
      if (includeTags.length) {
        query = query.overlaps("tags", includeTags)
      }
      if (excludeTags.length) {
        query = query.not("tags", "ov", excludeTags)
      }

      const { data: contacts, error } = await query

      if (error) {
        throw error
      }

      if (!contacts || contacts.length === 0) {
        break
      }

      totalInserted += await insertBatch(contacts as ContactSeed[])
      from += pageSize
    }
  }

  if (totalInserted === 0) {
    throw new Error(
      "Nenhum contato elegível para gerar envios. Verifique se há contatos válidos na instância."
    )
  }

  await supabase
    .from("campaigns")
    .update({
      total_numbers: totalInserted,
      updated_at: new Date().toISOString()
    })
    .eq("id", campaign.id)
}

function chunkArray<T>(items: T[], size: number) {
  if (!items.length || size <= 0) return []
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

function normalizeStringArray(values?: Array<string | null | undefined>) {
  return (values ?? []).map((value) => (value ?? "").trim()).filter(Boolean)
}

function uniqueStrings(values?: Array<string | null | undefined>) {
  const normalized = normalizeStringArray(values)
  return Array.from(new Set(normalized))
}





