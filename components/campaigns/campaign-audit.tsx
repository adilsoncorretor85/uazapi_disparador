"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchCampaignAudit } from "@/lib/services/campaigns"
import type { WebhookEvent } from "@/types/entities"
import { formatDateTime } from "@/lib/format"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface CampaignAuditProps {
  campaignId: string
}

const PROCESS_STATUS_LABELS: Record<string, string> = {
  processed: "Processado",
  ignored: "Ignorado",
  error: "Erro",
  pending: "Pendente"
}

const PROCESS_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  processed: "default",
  ignored: "secondary",
  error: "destructive",
  pending: "outline"
}

export default function CampaignAudit({ campaignId }: CampaignAuditProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["campaign-audit", campaignId],
    queryFn: () => fetchCampaignAudit(campaignId)
  })

  const events = data?.data ?? []
  const [selected, setSelected] = useState<WebhookEvent | null>(null)

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Recebido em</TableHead>
            <TableHead>Processado em</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Provider ID</TableHead>
            <TableHead>Status processamento</TableHead>
            <TableHead>Erro</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7}>Carregando auditoria...</TableCell>
            </TableRow>
          ) : events.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>Nenhum evento encontrado.</TableCell>
            </TableRow>
          ) : (
            events.map((event) => (
              <TableRow key={event.id}>
                <TableCell>{formatDateTime(event.received_at)}</TableCell>
                <TableCell>{formatDateTime(event.processed_at)}</TableCell>
                <TableCell>{event.event_type ?? "-"}</TableCell>
                <TableCell>{event.provider_message_id ?? "-"}</TableCell>
                <TableCell>
                  {event.process_status ? (
                    <Badge variant={PROCESS_STATUS_VARIANT[event.process_status] ?? "secondary"}>
                      {PROCESS_STATUS_LABELS[event.process_status] ?? event.process_status}
                    </Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {event.error_message ?? "-"}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => setSelected(event)}>
                    Ver payload
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => (!open ? setSelected(null) : null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Payload do evento</SheetTitle>
          </SheetHeader>
          <ScrollArea className="mt-6 h-[80vh] pr-4">
            {selected ? (
              <div className="space-y-4 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Recebido em</p>
                    <p>{formatDateTime(selected.received_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Processado em</p>
                    <p>{formatDateTime(selected.processed_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <p>{selected.event_type ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Provider ID</p>
                    <p>{selected.provider_message_id ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p>{selected.process_status ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Erro</p>
                    <p>{selected.error_message ?? "-"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payload</p>
                  <pre className="mt-2 rounded-lg bg-muted/60 p-4 text-xs">
                    {JSON.stringify(selected.payload ?? {}, null, 2)}
                  </pre>
                </div>
              </div>
            ) : null}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  )
}

