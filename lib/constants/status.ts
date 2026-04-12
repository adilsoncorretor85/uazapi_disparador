export const CAMPAIGN_STATUSES = [
  "draft",
  "scheduled",
  "processing",
  "paused",
  "completed",
  "cancelled",
  "error"
] as const

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]

export const MESSAGE_STATUSES = [
  "pending",
  "locked",
  "sending",
  "sent",
  "delivered",
  "read",
  "played",
  "failed",
  "cancelled"
] as const

export type MessageStatus = (typeof MESSAGE_STATUSES)[number]

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  processing: "Processando",
  paused: "Pausada",
  completed: "Concluída",
  cancelled: "Cancelada",
  error: "Erro"
}

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  pending: "Pendente",
  locked: "Bloqueado",
  sending: "Enviando",
  sent: "Enviado",
  delivered: "Entregue",
  read: "Lido",
  played: "Reproduzido",
  failed: "Falhou",
  cancelled: "Cancelado"
}

export const STATUS_BADGE_VARIANT: Record<
  CampaignStatus | MessageStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "secondary",
  scheduled: "outline",
  processing: "default",
  paused: "secondary",
  completed: "default",
  cancelled: "destructive",
  error: "destructive",
  pending: "outline",
  locked: "secondary",
  sending: "default",
  sent: "default",
  delivered: "secondary",
  read: "default",
  played: "secondary",
  failed: "destructive"
}

export function getCampaignDisplayStatus(campaign: {
  status: CampaignStatus
  derived_status?: CampaignStatus | null
}) {
  return (campaign.derived_status ?? campaign.status) as CampaignStatus
}

export const CAMPAIGN_ACTIONS = ["edit", "pause", "resume", "cancel", "duplicate", "publish", "delete"] as const
export type CampaignAction = (typeof CAMPAIGN_ACTIONS)[number]

export function canEditCampaign(status: CampaignStatus) {
  return status === "draft" || status === "scheduled" || status === "paused"
}

export function canPublishCampaign(status: CampaignStatus) {
  return status === "draft"
}

export function canPauseCampaign(status: CampaignStatus) {
  return status === "processing"
}

export function canResumeCampaign(status: CampaignStatus) {
  return status === "paused"
}

export function canCancelCampaign(status: CampaignStatus) {
  return status === "draft" || status === "scheduled" || status === "processing" || status === "paused"
}

export function canDeleteCampaign(status: CampaignStatus) {
  return status !== "processing"
}

export const CAMPAIGN_ACTIONS_BY_STATUS: Record<CampaignStatus, CampaignAction[]> = {
  draft: ["edit", "publish", "cancel", "duplicate", "delete"],
  scheduled: ["edit", "cancel", "duplicate", "delete"],
  processing: ["pause", "cancel", "duplicate"],
  paused: ["resume", "cancel", "duplicate", "edit", "delete"],
  completed: ["duplicate", "delete"],
  cancelled: ["duplicate", "delete"],
  error: ["duplicate", "delete"]
}


