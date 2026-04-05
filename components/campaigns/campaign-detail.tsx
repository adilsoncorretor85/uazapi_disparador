"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Copy,
  PauseCircle,
  PlayCircle,
  RefreshCcw,
  StopCircle
} from "lucide-react"

import { duplicateCampaign, fetchCampaign, runCampaignAction } from "@/lib/services/campaigns"
import { formatDateTime, formatNumber, formatPercent } from "@/lib/format"
import { CAMPAIGN_STATUS_LABELS } from "@/lib/constants/status"
import { PageHeader } from "@/components/common/page-header"
import { StatusBadge } from "@/components/common/status-badge"
import { KpiCard } from "@/components/common/kpi-card"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CampaignVariants from "@/components/campaigns/campaign-variants"
import CampaignMessagesTable from "@/components/campaigns/campaign-messages-table"
import CampaignAudit from "@/components/campaigns/campaign-audit"

export default function CampaignDetail() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["campaign", params.id],
    queryFn: () => fetchCampaign(params.id)
  })

  const actionMutation = useMutation({
    mutationFn: async ({ action }: { action: string }) => {
      if (action === "duplicate") {
        return duplicateCampaign(params.id)
      }
      return runCampaignAction(params.id, action)
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["campaign", params.id] })
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      if (variables.action === "duplicate") {
        router.push(`/campaigns/${result.campaign.id}`)
      }
    }
  })

  const metrics = useMemo(() => {
    if (!campaign) {
      return {
        deliveryRate: 0,
        readRate: 0,
        progress: 0
      }
    }

    const sent = campaign.total_sent ?? 0
    const delivered = campaign.total_delivered ?? 0
    const read = campaign.total_read ?? 0
    const total = campaign.total_numbers ?? 0

    return {
      deliveryRate: sent ? (delivered / sent) * 100 : 0,
      readRate: delivered ? (read / delivered) * 100 : 0,
      progress: total ? (sent / total) * 100 : 0
    }
  }, [campaign])

  if (isLoading || !campaign) {
    return <p>Carregando detalhes...</p>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={campaign.title}
        description={campaign.description ?? "Sem descrição"}
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href={`/campaigns/${campaign.id}/edit`}>Editar</Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => actionMutation.mutate({ action: "duplicate" })}
            >
              <Copy className="mr-2 h-4 w-4" />
              Duplicar
            </Button>
            <Button
              variant="outline"
              onClick={() => actionMutation.mutate({ action: "pause" })}
            >
              <PauseCircle className="mr-2 h-4 w-4" />
              Pausar
            </Button>
            <Button
              variant="outline"
              onClick={() => actionMutation.mutate({ action: "resume" })}
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              Continuar
            </Button>
            <Button
              variant="destructive"
              onClick={() => actionMutation.mutate({ action: "cancel" })}
            >
              <StopCircle className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button
              variant="ghost"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["campaign", params.id] })}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={campaign.status} label={CAMPAIGN_STATUS_LABELS[campaign.status]} />
        <span className="text-sm text-muted-foreground">Instância {campaign.instance_id}</span>
        <span className="text-sm text-muted-foreground">Agendada: {formatDateTime(campaign.scheduled_at)}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total números" value={formatNumber(campaign.total_numbers ?? 0)} />
        <KpiCard label="Enviados" value={formatNumber(campaign.total_sent ?? 0)} />
        <KpiCard label="Entregues" value={formatNumber(campaign.total_delivered ?? 0)} />
        <KpiCard label="Lidos" value={formatNumber(campaign.total_read ?? 0)} />
        <KpiCard label="Falhas" value={formatNumber(campaign.total_failed ?? 0)} tone="danger" />
        <KpiCard label="Taxa de entrega" value={formatPercent(metrics.deliveryRate)} tone="success" />
        <KpiCard label="Taxa de leitura" value={formatPercent(metrics.readRate)} tone="success" />
        <KpiCard label="Progresso" value={formatPercent(metrics.progress)} />
      </div>

      <Card>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Progresso geral</p>
          <Progress value={metrics.progress} />
        </div>
      </Card>

      <Card>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Criada em</p>
            <p className="text-sm">{formatDateTime(campaign.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Agendada</p>
            <p className="text-sm">{formatDateTime(campaign.scheduled_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Iniciada</p>
            <p className="text-sm">{formatDateTime(campaign.started_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Concluída</p>
            <p className="text-sm">{formatDateTime(campaign.completed_at)}</p>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Resumo</TabsTrigger>
          <TabsTrigger value="variants">Variantes</TabsTrigger>
          <TabsTrigger value="messages">Envios</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <div className="space-y-2">
                <p className="text-xs uppercase text-muted-foreground">Mensagem principal</p>
                <p className="text-sm whitespace-pre-wrap">{campaign.message_body}</p>
              </div>
            </Card>
            <Card>
              <div className="space-y-2">
                <p className="text-xs uppercase text-muted-foreground">Randomizador</p>
                <p className="text-sm">
                  {campaign.use_randomizer ? "Ativo" : "Desativado"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Delay {campaign.delay_min_seconds ?? 0}s - {campaign.delay_max_seconds ?? 0}s
                </p>
                <p className="text-xs text-muted-foreground">
                  Batch {campaign.batch_size ?? 0} • Máx tentativas {campaign.max_attempts ?? 0}
                </p>
              </div>
            </Card>
            <Card>
              <div className="space-y-2">
                <p className="text-xs uppercase text-muted-foreground">Mídia</p>
                <p className="text-sm">{campaign.media_type ?? "Texto"}</p>
                <p className="text-xs text-muted-foreground">{campaign.media_url ?? "Sem mídia"}</p>
              </div>
            </Card>
            <Card>
              <div className="space-y-2">
                <p className="text-xs uppercase text-muted-foreground">Instância</p>
                <p className="text-sm">{campaign.instance_id}</p>
                <p className="text-xs text-muted-foreground">
                  Readchat: {campaign.readchat ? "Sim" : "Não"} • Composing: {campaign.use_composing ? "Sim" : "Não"}
                </p>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="variants">
          <CampaignVariants campaignId={campaign.id} />
        </TabsContent>

        <TabsContent value="messages">
          <CampaignMessagesTable campaignId={campaign.id} />
        </TabsContent>

        <TabsContent value="audit">
          <CampaignAudit campaignId={campaign.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
