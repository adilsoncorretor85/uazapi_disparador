import { createAdminClient } from "@/lib/supabase/admin"
import { env } from "@/lib/env"
import { mockInstances } from "@/lib/mocks/instances"
import type { WhatsAppInstance } from "@/types/entities"
import type { InstanceFormValues } from "@/lib/schemas/instance"

export async function listInstances() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return mockInstances
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc("list_whatsapp_instances")

    if (error || !data) {
      return mockInstances
    }

    return (data as WhatsAppInstance[]).map((row) => ({ ...row, token: null }))
  } catch (error) {
    return mockInstances
  }
}

export async function createInstance(values: InstanceFormValues) {
  const supabase = createAdminClient()
  const payload = normalizeInstance(values)

  const { data, error } = await supabase.rpc("save_whatsapp_instance", {
    p_id: null,
    p_name: payload.name,
    p_base_url: null,
    p_instance_name: payload.instance_name,
    p_owner_number: payload.owner_number,
    p_descricao: payload.descricao ?? null,
    p_cep: payload.cep ?? null,
    p_rua: payload.rua ?? null,
    p_bairro: payload.bairro ?? null,
    p_numero_residencia: payload.numero_residencia ?? null,
    p_complemento: payload.complemento ?? null,
    p_telefone: null,
    p_cidade: payload.cidade ?? null,
    p_estado: payload.estado ?? null,
    p_acessores: null,
    p_prazo_solicitacoes: null,
    p_conexao_w: null,
    p_campanha_pause: payload.campanha_pause ?? false,
    p_campanha_horario_pause: payload.campanha_pause
      ? payload.campanha_horario_pause ?? "20:00:00"
      : null,
    p_campanha_horario_reinicio: payload.campanha_pause
      ? payload.campanha_horario_reinicio ?? "07:00:00"
      : null,
    p_token: null,
    p_is_active: payload.is_active,
    p_send_readchat: null,
    p_send_composing: null,
    p_throttle_per_minute: payload.throttle_per_minute
  })

  if (error) {
    throw error
  }

  const createdId = data as string | null
  if (!createdId) {
    throw new Error("Nao foi possivel criar a instancia.")
  }

  const instances = await listInstances()
  return (
    instances.find((instance) => instance.id === createdId) ?? {
      ...payload,
      id: createdId,
      token: null
    }
  ) as WhatsAppInstance
}

export async function updateInstance(id: string, values: InstanceFormValues) {
  const supabase = createAdminClient()
  const payload = normalizeInstance(values)

  const { data, error } = await supabase.rpc("save_whatsapp_instance", {
    p_id: id,
    p_name: payload.name,
    p_base_url: null,
    p_instance_name: payload.instance_name,
    p_owner_number: payload.owner_number,
    p_descricao: payload.descricao ?? null,
    p_cep: payload.cep ?? null,
    p_rua: payload.rua ?? null,
    p_bairro: payload.bairro ?? null,
    p_numero_residencia: payload.numero_residencia ?? null,
    p_complemento: payload.complemento ?? null,
    p_telefone: null,
    p_cidade: payload.cidade ?? null,
    p_estado: payload.estado ?? null,
    p_acessores: null,
    p_prazo_solicitacoes: null,
    p_conexao_w: null,
    p_campanha_pause: payload.campanha_pause ?? false,
    p_campanha_horario_pause: payload.campanha_pause
      ? payload.campanha_horario_pause ?? "20:00:00"
      : null,
    p_campanha_horario_reinicio: payload.campanha_pause
      ? payload.campanha_horario_reinicio ?? "07:00:00"
      : null,
    p_token: null,
    p_is_active: payload.is_active,
    p_send_readchat: null,
    p_send_composing: null,
    p_throttle_per_minute: payload.throttle_per_minute
  })

  if (error) {
    throw error
  }

  const updatedId = data as string | null
  const instances = await listInstances()
  return (
    instances.find((instance) => instance.id === updatedId) ?? {
      ...payload,
      id: updatedId ?? id,
      token: null
    }
  ) as WhatsAppInstance
}

function normalizeInstance(values: InstanceFormValues) {
  return {
    ...values,
    cep: values.cep ? values.cep.replace(/\D/g, "").slice(0, 8) : null,
    throttle_per_minute: values.throttle_per_minute ?? null
  }
}
