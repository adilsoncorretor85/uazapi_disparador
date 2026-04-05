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

interface CampaignAuditProps {
  campaignId: string
}

export default function CampaignAudit({ campaignId }: CampaignAuditProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["campaign-audit", campaignId],
    queryFn: () => fetchCampaignAudit(campaignId)
  })

  const events = (data as WebhookEvent[]) ?? []
  const [selected, setSelected] = useState<WebhookEvent | null>(null)

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Recebido em</TableHead>
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
              <TableCell colSpan={6}>Carregando auditoria...</TableCell>
            </TableRow>
          ) : events.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>Nenhum evento encontrado.</TableCell>
            </TableRow>
          ) : (
            events.map((event) => (
              <TableRow key={event.id}>
                <TableCell>{formatDateTime(event.received_at)}</TableCell>
                <TableCell>{event.event_type ?? "-"}</TableCell>
                <TableCell>{event.provider_message_id ?? "-"}</TableCell>
                <TableCell>{event.process_status ?? "-"}</TableCell>
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
            <pre className="rounded-lg bg-muted/60 p-4 text-xs">
              {JSON.stringify(selected?.payload ?? {}, null, 2)}
            </pre>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  )
}

