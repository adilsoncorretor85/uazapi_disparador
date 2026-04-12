import type { CampaignFormValues } from "@/lib/schemas/campaign"

export function normalizeCampaignFormValues(values: CampaignFormValues): CampaignFormValues {
  return {
    ...values,
    title: values.title.trim(),
    description: values.description?.trim() ?? "",
    message_body: values.message_body ?? "",
    media_url: values.media_url ?? "",
    audience_tags: (values.audience_tags ?? []).map((value) => value.trim()).filter(Boolean),
    audience_tags_exclude: (values.audience_tags_exclude ?? [])
      .map((value) => value.trim())
      .filter(Boolean),
    audience_cities: (values.audience_cities ?? []).map((value) => value.trim()).filter(Boolean),
    audience_bairros: (values.audience_bairros ?? []).map((value) => value.trim()).filter(Boolean),
    audience_ruas: (values.audience_ruas ?? []).map((value) => value.trim()).filter(Boolean)
  }
}
