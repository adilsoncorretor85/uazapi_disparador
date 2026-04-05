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
    p_provider: payload.provider,
    p_base_url: payload.base_url,
    p_instance_name: payload.instance_name,
    p_owner_number: payload.owner_number,
    p_token: payload.token ?? null,
    p_is_active: payload.is_active,
    p_send_readchat: payload.send_readchat,
    p_send_composing: payload.send_composing,
    p_throttle_per_minute: payload.throttle_per_minute
  })

  if (error) {
    throw error
  }

  const createdId = data as string | null
  if (!createdId) {
    throw new Error("Não foi possível criar a instância.")
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
    p_provider: payload.provider,
    p_base_url: payload.base_url,
    p_instance_name: payload.instance_name,
    p_owner_number: payload.owner_number,
    p_token: payload.token ?? null,
    p_is_active: payload.is_active,
    p_send_readchat: payload.send_readchat,
    p_send_composing: payload.send_composing,
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
    token: values.token ? values.token : null,
    throttle_per_minute: values.throttle_per_minute ?? null
  }
}