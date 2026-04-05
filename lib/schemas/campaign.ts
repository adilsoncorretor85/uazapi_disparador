import { z } from "zod"

export const campaignVariantSchema = z.object({
  id: z.string().optional(),
  sort_order: z.number().optional(),
  message_body: z.string().min(1, "Informe a mensagem"),
  weight: z.number().min(1).max(100).optional().default(1),
  is_active: z.boolean().default(true)
})

export const campaignFormSchema = z.object({
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
  message_body: z.string().min(1, "Mensagem obrigatória"),
  delay_min_seconds: z.coerce.number().min(0).optional().nullable(),
  delay_max_seconds: z.coerce.number().min(0).optional().nullable(),
  batch_size: z.coerce.number().min(1).optional().nullable(),
  max_attempts: z.coerce.number().min(1).optional().nullable(),
  readchat: z.boolean().default(false),
  use_composing: z.boolean().default(false),
  use_randomizer: z.boolean().default(false),
  variants: z.array(campaignVariantSchema).optional().default([]),
  audience_source: z.enum(["all", "file"]).optional().default("all"),
  audience_contact_ids: z.array(z.string()).optional().default([])
})

export type CampaignFormValues = z.infer<typeof campaignFormSchema>

