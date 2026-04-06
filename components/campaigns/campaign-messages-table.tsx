"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Calendar, Search } from "lucide-react"

import { fetchCampaignMessages } from "@/lib/services/campaigns"
import { formatDateTime } from "@/lib/format"
import { MESSAGE_STATUS_LABELS } from "@/lib/constants/status"
import type { CampaignMessageWithContact } from "@/types/entities"
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
import { StatusBadge } from "@/components/common/status-badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"

interface CampaignMessagesTableProps {
  campaignId: string
}

export default function CampaignMessagesTable({ campaignId }: CampaignMessagesTableProps) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [delivered, setDelivered] = useState<string | undefined>(undefined)
  const [read, setRead] = useState<string | undefined>(undefined)
  const [failed, setFailed] = useState<string | undefined>(undefined)
  const [processed, setProcessed] = useState<string | undefined>(undefined)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<CampaignMessageWithContact | null>(null)

  const queryKey = useMemo(
    () => [
      "campaign-messages",
      campaignId,
      search,
      status,
      delivered,
      read,
      failed,
      processed,
      from,
      to,
      page
    ],
    [campaignId, search, status, delivered, read, failed, processed, from, to, page]
  )

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      fetchCampaignMessages(campaignId, {
        search,
        status: status ?? "",
        delivered: delivered ?? "",
        read: read ?? "",
        failed: failed ?? "",
        processed: processed ?? "",
        from,
        to,
        page: String(page),
        pageSize: "20"
      })
  })

  const messages = (data as { data: CampaignMessageWithContact[]; count: number })?.data ?? []
  const total = (data as { data: CampaignMessageWithContact[]; count: number })?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 20))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border bg-background/70 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, contato ou texto"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            className="h-7 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
          />
        </div>

        <Select value={status} onValueChange={(value) => setStatus(value === "all" ? undefined : value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(MESSAGE_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={delivered}
          onValueChange={(value) => setDelivered(value === "all" ? undefined : value)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Entregue" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Sim</SelectItem>
            <SelectItem value="false">Não</SelectItem>
          </SelectContent>
        </Select>

        <Select value={read} onValueChange={(value) => setRead(value === "all" ? undefined : value)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Lido" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Sim</SelectItem>
            <SelectItem value="false">Não</SelectItem>
          </SelectContent>
        </Select>

        <Select value={failed} onValueChange={(value) => setFailed(value === "all" ? undefined : value)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Falhas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Somente falhas</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={processed}
          onValueChange={(value) => setProcessed(value === "all" ? undefined : value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Processado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Sim</SelectItem>
            <SelectItem value="false">Não</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <span className="text-xs text-muted-foreground">até</span>
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Número</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Variante</TableHead>
            <TableHead>Mensagem</TableHead>
            <TableHead>Mídia</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Provider ID</TableHead>
            <TableHead>Tentativas</TableHead>
            <TableHead>Entregue</TableHead>
            <TableHead>Lido</TableHead>
            <TableHead>Processado</TableHead>
            <TableHead>Enviado</TableHead>
            <TableHead>Falha</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={15}>Carregando envios...</TableCell>
            </TableRow>
          ) : messages.length === 0 ? (
            <TableRow>
              <TableCell colSpan={15}>Nenhum envio encontrado.</TableCell>
            </TableRow>
          ) : (
            messages.map((message) => (
              <TableRow key={message.id}>
                <TableCell className="text-xs">{message.id}</TableCell>
                <TableCell>{message.phone_e164}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">
                      {message.contact?.full_name ?? message.contact?.first_name ?? "Sem nome"}
                    </p>
                    <p className="text-xs text-muted-foreground">{message.contact_id ?? "-"}</p>
                  </div>
                </TableCell>
                <TableCell>{message.selected_variant_id ?? "-"}</TableCell>
                <TableCell className="max-w-[220px] truncate">
                  {message.message_body}
                </TableCell>
                <TableCell>{message.media_type ?? "Texto"}</TableCell>
                <TableCell>
                  <StatusBadge status={message.status} label={MESSAGE_STATUS_LABELS[message.status]} />
                </TableCell>
                <TableCell>{message.provider_message_id ?? "-"}</TableCell>
                <TableCell>{message.attempt_count ?? 0}</TableCell>
                <TableCell>{message.is_delivered ? "Sim" : "Não"}</TableCell>
                <TableCell>{message.is_read ? "Sim" : "Não"}</TableCell>
                <TableCell>{message.processed ? "Sim" : "Não"}</TableCell>
                <TableCell>{formatDateTime(message.sent_at)}</TableCell>
                <TableCell>{message.failed_at ? formatDateTime(message.failed_at) : "-"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(message)}>
                    Ver detalhes
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Página {page} de {totalPages} • {total} envios
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
            Próxima
          </Button>
        </div>
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => (!open ? setSelected(null) : null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Detalhe do envio</SheetTitle>
            <SheetDescription>ID {selected?.id}</SheetDescription>
          </SheetHeader>
          <ScrollArea className="mt-6 h-[80vh] pr-4">
            {selected ? (
              <div className="space-y-6">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Mensagem final</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{selected.message_body}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Variante</p>
                    <p className="text-sm">{selected.selected_variant_id ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Contato</p>
                    <p className="text-sm">
                      {selected.contact?.full_name ?? selected.contact?.first_name ?? selected.contact_id ?? "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status provider</p>
                    <p className="text-sm">{selected.provider_status ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Processado pelo N8N</p>
                    <p className="text-sm">{selected.processed ? "Sim" : "Não"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Processado em</p>
                    <p className="text-sm">{formatDateTime(selected.processed_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Enviado em</p>
                    <p className="text-sm">{formatDateTime(selected.sent_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Entregue em</p>
                    <p className="text-sm">{formatDateTime(selected.delivered_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lido em</p>
                    <p className="text-sm">{formatDateTime(selected.read_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Falha em</p>
                    <p className="text-sm">{formatDateTime(selected.failed_at)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase text-muted-foreground">Erro</p>
                  <p className="mt-2 text-sm">{selected.error_message ?? "Nenhum"}</p>
                </div>

                <div>
                  <p className="text-xs uppercase text-muted-foreground">Resposta provider</p>
                  <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-muted/60 p-3 text-xs">
                    {JSON.stringify(selected.provider_response ?? {}, null, 2)}
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



