"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { CampaignForm } from "@/components/forms/campaign-form"
import { fetchCampaign, fetchCampaignVariants, updateCampaign } from "@/lib/services/campaigns"
import type { CampaignFormValues } from "@/lib/schemas/campaign"

export default function CampaignEdit() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const campaignId = params.id

  const {
    data: campaign,
    isLoading: isCampaignLoading,
    error: campaignError
  } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => fetchCampaign(campaignId),
    enabled: Boolean(campaignId)
  })

  const {
    data: variants,
    isLoading: isVariantsLoading,
    error: variantsError
  } = useQuery({
    queryKey: ["campaign-variants", campaignId],
    queryFn: () => fetchCampaignVariants(campaignId),
    enabled: Boolean(campaignId)
  })

  const mutation = useMutation({
    mutationFn: (values: CampaignFormValues) => updateCampaign(params.id, values),
    onSuccess: (data) => {
      setError(null)
      router.push(`/campaigns/${data.id}`)
    },
    onError: (err: Error) => setError(err.message)
  })

  if (campaignError || variantsError) {
    return <p>Erro ao carregar a campanha. Tente novamente.</p>
  }

  if (isCampaignLoading || isVariantsLoading || !campaign) {
    return <p>Carregando campanha...</p>
  }

  const initialData: CampaignFormValues = {
    title: campaign.title,
    description: campaign.description ?? "",
    instance_id: campaign.instance_id,
    status: campaign.status,
    scheduled_at: campaign.scheduled_at ?? null,
    timezone: campaign.timezone ?? "America/Sao_Paulo",
    media_type: campaign.media_type ?? "none",
    media_url: campaign.media_url ?? "",
    message_body: campaign.message_body,
    delay_min_seconds: campaign.delay_min_seconds ?? 0,
    delay_max_seconds: campaign.delay_max_seconds ?? 0,
    batch_size: campaign.batch_size ?? 0,
    max_attempts: campaign.max_attempts ?? 0,
    readchat: Boolean(campaign.readchat),
    use_composing: Boolean(campaign.use_composing),
    use_randomizer: Boolean(campaign.use_randomizer),
    audience_source: "all",
    audience_contact_ids: [],
    audience_tags: campaign.audience_tags ?? [],
    audience_tags_exclude: campaign.audience_tags_exclude ?? [],
    audience_cities: campaign.audience_cities ?? [],
    audience_bairros: campaign.audience_bairros ?? [],
    audience_ruas: campaign.audience_ruas ?? [],
    variants: (variants ?? []).map((variant) => ({
      id: String(variant.id),
      sort_order: variant.sort_order,
      message_body: variant.message_body,
      is_active: variant.is_active,
      weight: variant.weight ?? 1
    }))
  }

  return (
    <div className="space-y-4">
      <CampaignForm
        mode="edit"
        isSubmitting={mutation.isPending}
        submitError={error}
        initialData={initialData}
        onSubmit={async (values) => {
          await mutation.mutateAsync(values)
        }}
      />
    </div>
  )
}





