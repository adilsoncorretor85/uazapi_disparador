import type { CampaignStatus, MessageStatus } from "@/lib/constants/status"

export interface WhatsAppInstance {
  id: string
  name: string
  provider: string
  base_url: string
  token?: string | null
  instance_name: string
  owner_number: string
  webhook_secret?: string | null
  descricao?: string | null
  cidade?: string | null
  estado?: string | null
  acessores?: string[] | null
  prazo_solicitacoes?: string | null
  conexao_w?: string | null
  campanha_pause?: boolean | null
  campanha_horario_pause?: string | null
  campanha_horario_reinicio?: string | null
  is_active: boolean
  send_readchat: boolean
  send_composing: boolean
  throttle_per_minute: number | null
}

export interface Contact {
  id: string
  first_name?: string | null
  full_name?: string | null
  instance_id?: string | null
  whatsapp_e164: string
  whatsapp_digits?: string | null
  email?: string | null
  city?: string | null
  state?: string | null
  tags?: string[] | null
  custom_fields?: Record<string, string> | null
  opted_in?: boolean | null
  opt_out_at?: string | null
  is_valid?: boolean | null
  notes?: string | null
  last_interaction_at?: string | null
}

export interface Campaign {
  id: string
  instance_id: string
  title: string
  description?: string | null
  status: CampaignStatus
  use_randomizer: boolean
  message_body: string
  media_type?: string | null
  media_url?: string | null
  scheduled_at?: string | null
  started_at?: string | null
  completed_at?: string | null
  timezone?: string | null
  delay_min_seconds?: number | null
  delay_max_seconds?: number | null
  batch_size?: number | null
  max_attempts?: number | null
  readchat?: boolean | null
  use_composing?: boolean | null
  total_numbers?: number | null
  total_sent?: number | null
  total_delivered?: number | null
  total_read?: number | null
  total_failed?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export interface CampaignMessageVariant {
  id: string
  campaign_id: string
  sort_order: number
  message_body: string
  is_active: boolean
  weight?: number | null
  usage_count?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export interface CampaignMessage {
  id: string
  campaign_id: string
  instance_id: string
  contact_id?: string | null
  selected_variant_id?: string | null
  phone_e164: string
  phone_digits?: string | null
  message_body: string
  media_type?: string | null
  media_url?: string | null
  provider_message_id?: string | null
  provider_status?: string | null
  status: MessageStatus
  attempt_count?: number | null
  is_delivered?: boolean | null
  is_read?: boolean | null
  is_played?: boolean | null
  scheduled_for?: string | null
  next_attempt_at?: string | null
  lock_token?: string | null
  locked_at?: string | null
  sent_at?: string | null
  delivered_at?: string | null
  read_at?: string | null
  played_at?: string | null
  failed_at?: string | null
  error_message?: string | null
  provider_response?: Record<string, unknown> | null
  created_at?: string | null
  updated_at?: string | null
}

export interface CampaignMessageWithContact extends CampaignMessage {
  contact?: {
    full_name?: string | null
    first_name?: string | null
  } | null
}

export interface WebhookEvent {
  id: string
  campaign_id?: string | null
  received_at: string
  event_type?: string | null
  provider_message_id?: string | null
  process_status?: string | null
  error_message?: string | null
  payload?: Record<string, unknown> | null
}
