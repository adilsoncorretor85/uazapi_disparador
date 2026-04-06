import { z } from "zod"

export const campaignVariantSchema = z.object({
  id: z
    .preprocess(
      (value) =>
        value === null || value === undefined || value === "" ? undefined : String(value),
      z.string()
    )
    .optional(),
  sort_order: z.coerce.number().optional(),
  message_body: z.string().min(1, "Informe a mensagem"),
  weight: z
    .preprocess(
      (value) => (value === "" || value === null || value === undefined ? undefined : value),
      z.coerce.number().min(1).max(100)
    )
    .optional()
    .default(1),
  is_active: z.boolean().default(true)
})

export const campaignFormSchema = z
  .object({
  title: z.string().min(3, "Título obrigatório"),
  description: z.string().optional(),
  instance_id: z.string().min(1, "Selecione uma instância"),
  status: z
    .enum([
      "draft",
      "scheduled",
      "processing",
      "paused",
      "completed",
      "cancelled",
      "error"
    ])
    .default("draft"),
  scheduled_at: z.string().optional().nullable(),
  timezone: z.string().optional(),
  media_type: z.string().optional().nullable(),
  media_url: z
    .string()
    .url("URL inválida")
    .optional()
    .nullable()
    .or(z.literal("")),
  message_body: z.string().optional().default(""),
  delay_min_seconds: z.coerce.number().min(0).optional().nullable(),
  delay_max_seconds: z.coerce.number().min(0).optional().nullable(),
  batch_size: z.coerce.number().min(1).optional().nullable(),
  max_attempts: z.coerce.number().min(1).optional().nullable(),
  readchat: z.boolean().default(false),
  use_composing: z.boolean().default(false),
  typing_delay_seconds: z.coerce.number().min(0).max(30).optional().nullable(),
  link_preview: z.boolean().default(false),
  use_randomizer: z.boolean().default(false),
  variants: z.array(campaignVariantSchema).optional().default([]),
  audience_tags: z.array(z.string()).optional().default([]),
  audience_tags_exclude: z.array(z.string()).optional().default([]),
  audience_cities: z.array(z.string()).optional().default([]),
  audience_bairros: z.array(z.string()).optional().default([]),
  audience_ruas: z.array(z.string()).optional().default([]),
  audience_source: z.enum(["all", "file"]).optional().default("all"),
  audience_contact_ids: z.array(z.string()).optional().default([])
  })
  .superRefine((data, ctx) => {
    const mediaType = (data.media_type ?? "none") as string
    const requiresMessage =
      mediaType === "none" || mediaType === "text" || mediaType === "link"
    const requiresMedia =
      mediaType !== "none" && mediaType !== "link" && mediaType !== "text"
    if (requiresMedia && !data.media_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Envie um arquivo de mídia para continuar",
        path: ["media_url"]
      })
    }

    if (mediaType === "audio" && data.use_randomizer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Randomizador não disponível para áudio",
        path: ["use_randomizer"]
      })
    }

    if (data.audience_source === "file" && (data.audience_contact_ids ?? []).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Importe a planilha para selecionar os contatos",
        path: ["audience_contact_ids"]
      })
    }

    const delayMin = data.delay_min_seconds ?? 0
    const delayMax = data.delay_max_seconds ?? delayMin
    if (delayMax < delayMin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Delay máximo deve ser maior ou igual ao mínimo",
        path: ["delay_max_seconds"]
      })
    }

    if (data.use_randomizer) {
      const activeVariants = (data.variants ?? []).filter(
        (variant) => variant.is_active !== false && variant.message_body?.trim()
      )
      if (activeVariants.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Adicione pelo menos uma variante ativa com mensagem",
          path: ["variants"]
        })
      }
    } else {
      if (requiresMessage && !data.message_body?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mensagem obrigatória",
          path: ["message_body"]
        })
      }
    }
  })

export type CampaignFormValues = z.infer<typeof campaignFormSchema>

