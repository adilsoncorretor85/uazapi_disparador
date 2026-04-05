import { z } from "zod"

export const instanceFormSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  provider: z.string().min(1, "Fornecedor obrigatório"),
  base_url: z.string().url("URL inválida"),
  instance_name: z.string().min(1, "Nome da instância obrigatório"),
  owner_number: z.string().min(8, "Número inválido"),
  is_active: z.boolean().default(true),
  send_readchat: z.boolean().default(false),
  send_composing: z.boolean().default(false),
  throttle_per_minute: z.coerce.number().min(1).optional().nullable(),
  token: z.string().optional().nullable()
})

export type InstanceFormValues = z.infer<typeof instanceFormSchema>

