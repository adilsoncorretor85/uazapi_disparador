import { z } from "zod"

const PAUSE_OPTIONS = ["17:00", "18:00", "20:00", "21:00", "22:00"] as const
const RESUME_OPTIONS = ["07:00", "08:00", "09:00", "12:00", "13:00"] as const

export const instanceFormSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  provider: z.string().min(1, "Fornecedor obrigatório"),
  base_url: z.string().url("URL inválida"),
  instance_name: z.string().min(1, "Nome da instância obrigatório"),
  owner_number: z.string().min(8, "Número inválido"),
  descricao: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  campanha_pause: z.boolean().optional().default(false),
  campanha_horario_pause: z.enum(PAUSE_OPTIONS).optional().default("20:00"),
  campanha_horario_reinicio: z.enum(RESUME_OPTIONS).optional().default("07:00"),
  is_active: z.boolean().default(true),
  send_readchat: z.boolean().default(false),
  send_composing: z.boolean().default(false),
  throttle_per_minute: z.coerce.number().min(1).optional().nullable(),
  token: z.string().optional().nullable()
})

export type InstanceFormValues = z.infer<typeof instanceFormSchema>