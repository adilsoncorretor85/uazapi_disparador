import { z } from "zod"

const PAUSE_OPTIONS = ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00"] as const
const RESUME_OPTIONS = ["07:00", "08:00", "09:00", "12:00", "13:00"] as const

export const instanceFormSchema = z.object({
  name: z.string().min(2, "Nome obrigatorio"),
  instance_name: z.string().min(1, "Nome da instancia obrigatorio"),
  owner_number: z.string().min(8, "Numero invalido"),
  descricao: z.string().optional().nullable(),
  cep: z
    .string()
    .optional()
    .nullable()
    .refine((value) => !value || /^\d{8}$/.test(value), "CEP invalido"),
  rua: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  numero_residencia: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  campanha_pause: z.boolean().optional().default(false),
  campanha_horario_pause: z.enum(PAUSE_OPTIONS).optional().nullable(),
  campanha_horario_reinicio: z.enum(RESUME_OPTIONS).optional().nullable(),
  is_active: z.boolean().default(true),
  throttle_per_minute: z.coerce.number().min(1).optional().nullable()
}).superRefine((data, ctx) => {
  if (!data.campanha_pause) return
  if (!data.campanha_horario_pause) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Horario de pausa obrigatorio",
      path: ["campanha_horario_pause"]
    })
  }
  if (!data.campanha_horario_reinicio) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Horario de reinicio obrigatorio",
      path: ["campanha_horario_reinicio"]
    })
  }
})

export type InstanceFormValues = z.infer<typeof instanceFormSchema>
