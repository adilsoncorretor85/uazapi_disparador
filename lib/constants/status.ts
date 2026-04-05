export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "processing"
  | "paused"
  | "completed"
  | "cancelled"
  | "error"

export type MessageStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed"

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
  sent: "Enviado",
  delivered: "Entregue",
  read: "Lido",
  failed: "Falhou"
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
  sent: "default",
  delivered: "secondary",
  read: "default",
  failed: "destructive"
}

