"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Calendar,
  CirclePause,
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  PlayCircle,
  StopCircle
} from "lucide-react"
import { duplicateCampaign, fetchCampaigns, runCampaignAction } from "@/lib/services/campaigns"
import { formatDateTime, formatNumber } from "@/lib/format"
import { CAMPAIGN_STATUS_LABELS } from "@/lib/constants/status"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { KpiCard } from "@/components/common/kpi-card"
import { StatusBadge } from "@/components/common/status-badge"

export default function CampaignsList() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const queryKey = useMemo(() => ["campaigns", search, status, from, to], [search, status, from, to])

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      fetchCampaigns({
        search,
        status: status ?? "",
        from,
        to
      })
  })

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      if (action === "duplicate") {
        return duplicateCampaign(id)
      }
      return runCampaignAction(id, action)
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      if (variables.action === "duplicate") {
        router.push(`/campaigns/${result.campaign.id}`)
      }
    }
  })

  const campaigns = data?.data ?? []
  const summary = data?.summary

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total de campanhas" value={formatNumber(summary?.total ?? 0)} />
        <KpiCard label="Em execução" value={formatNumber(summary?.running ?? 0)} />
        <KpiCard label="Concluídas" value={formatNumber(summary?.completed ?? 0)} />
        <KpiCard label="Pausadas" value={formatNumber(summary?.paused ?? 0)} />
        <KpiCard label="Total enviado" value={formatNumber(summary?.total_sent ?? 0)} />
        <KpiCard label="Total entregue" value={formatNumber(summary?.total_delivered ?? 0)} />
        <KpiCard label="Total lido" value={formatNumber(summary?.total_read ?? 0)} />
        <KpiCard label="Total falhou" value={formatNumber(summary?.total_failed ?? 0)} tone="danger" />
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Buscar por título"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-xs"
          />

          <Select value={status} onValueChange={(value) => setStatus(value === "all" ? undefined : value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(CAMPAIGN_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            <span className="text-xs text-muted-foreground">até</span>
            <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>

          <div className="ml-auto">
            <Button asChild>
              <Link href="/campaigns/new">Nova campanha</Link>
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Instância</TableHead>
              <TableHead>Tipo de mídia</TableHead>
              <TableHead>Agendamento</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Enviados</TableHead>
              <TableHead>Entregues</TableHead>
              <TableHead>Lidos</TableHead>
              <TableHead>Falhas</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={12}>Carregando campanhas...</TableCell>
              </TableRow>
            ) : campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12}>Nenhuma campanha encontrada.</TableCell>
              </TableRow>
            ) : (
              campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{campaign.title}</p>
                      <p className="text-xs text-muted-foreground">{campaign.description ?? "Sem descrição"}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={campaign.status}
                      label={CAMPAIGN_STATUS_LABELS[campaign.status]}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{campaign.instance_id}</Badge>
                  </TableCell>
                  <TableCell>{campaign.media_type ?? "Texto"}</TableCell>
                  <TableCell>{formatDateTime(campaign.scheduled_at)}</TableCell>
                  <TableCell>{formatNumber(campaign.total_numbers ?? 0)}</TableCell>
                  <TableCell>{formatNumber(campaign.total_sent ?? 0)}</TableCell>
                  <TableCell>{formatNumber(campaign.total_delivered ?? 0)}</TableCell>
                  <TableCell>{formatNumber(campaign.total_read ?? 0)}</TableCell>
                  <TableCell>{formatNumber(campaign.total_failed ?? 0)}</TableCell>
                  <TableCell>{formatDateTime(campaign.updated_at)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <span className="sr-only">Ações</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/campaigns/${campaign.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalhes
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/campaigns/${campaign.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => actionMutation.mutate({ id: campaign.id, action: "duplicate" })}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => actionMutation.mutate({ id: campaign.id, action: "pause" })}
                        >
                          <CirclePause className="mr-2 h-4 w-4" />
                          Pausar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => actionMutation.mutate({ id: campaign.id, action: "resume" })}
                        >
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Continuar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => actionMutation.mutate({ id: campaign.id, action: "cancel" })}
                        >
                          <StopCircle className="mr-2 h-4 w-4" />
                          Cancelar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
