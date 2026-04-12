import { Card } from "@/components/ui/card"
import { formatNumber } from "@/lib/format"

interface CampaignSummarySectionProps {
  title: string
  instanceName: string
  scheduledLabel: string
  timezone: string
  delayLabel: string
  useRandomizer: boolean
  variantCount: number
}

export function CampaignSummarySection({
  title,
  instanceName,
  scheduledLabel,
  timezone,
  delayLabel,
  useRandomizer,
  variantCount
}: CampaignSummarySectionProps) {
  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Resumo final</h2>
          <p className="text-sm text-muted-foreground">Revise antes de salvar a campanha.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Campanha</p>
            <p className="font-medium">{title || "-"}</p>
            <p className="text-xs text-muted-foreground">Instância: {instanceName}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Agendamento</p>
            <p className="font-medium">{scheduledLabel}</p>
            <p className="text-xs text-muted-foreground">Fuso: {timezone}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Envio</p>
            <p className="font-medium">Delay {delayLabel}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Randomizador</p>
            <p className="font-medium">{useRandomizer ? "Ativo" : "Desativado"}</p>
            <p className="text-xs text-muted-foreground">Variantes: {formatNumber(variantCount)}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
