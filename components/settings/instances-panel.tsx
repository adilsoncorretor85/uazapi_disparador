"use client"

import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil, AlertCircle, Copy, ChevronDown } from "lucide-react"
import type { WhatsAppInstance } from "@/types/entities"
import { deriveConnectionLabel } from "@/lib/utils/instance-connection"
import {
  fetchInstances,
  updateInstance,
  connectInstance,
  disconnectInstance,
  fetchInstanceStatus
} from "@/lib/services/instances"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { InstanceForm } from "@/components/forms/instance-form"
import type { InstanceFormValues } from "@/lib/schemas/instance"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

function formatHour(time?: string | null) {
  if (!time) return "-"
  const [hour] = time.split(":")
  return `${hour}h`
}

function normalizeTime(value?: string | null) {
  if (!value) return undefined
  const match = value.match(/^(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : value
}

function formatConnectionLabel(value?: string | null) {
  if (!value) return "Desconectado"
  const normalized = value.toLowerCase()
  if (normalized === "connecting") return "Conectando"
  if (normalized === "connected") return "Conectado"
  if (normalized === "disconnected") return "Desconectado"
  return value
}

export default function InstancesPanel() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["instances"],
    queryFn: () => fetchInstances()
  })

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<WhatsAppInstance | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connectionOpen, setConnectionOpen] = useState(false)
  const [connectionPayload, setConnectionPayload] = useState<Record<string, unknown> | null>(null)
  const [connectionMode, setConnectionMode] = useState<"qr" | "code">("qr")
  const [connectionInstanceId, setConnectionInstanceId] = useState<string | null>(null)
  const [pollingActive, setPollingActive] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [pairCode, setPairCode] = useState<string | null>(null)
  const [lastStatusAt, setLastStatusAt] = useState<string | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const refreshRef = useRef<NodeJS.Timeout | null>(null)
  const backgroundPollRef = useRef<NodeJS.Timeout | null>(null)

  const closeConnectionModal = () => {
    setConnectionOpen(false)
    setPollingActive(false)
    setConnectionPayload(null)
    setConnectionInstanceId(null)
    setQrCode(null)
    setPairCode(null)
    setLastStatusAt(null)
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    if (refreshRef.current) {
      clearInterval(refreshRef.current)
      refreshRef.current = null
    }
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: InstanceFormValues }) =>
      updateInstance(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instances"] })
      setOpen(false)
      setEditing(null)
      setError(null)
    },
    onError: (err: Error) => {
      setError(err.message)
    }
  })

  const connectMutation = useMutation({
    mutationFn: ({
      id,
      mode
    }: {
      id: string
      mode: "qr" | "code"
      refresh?: boolean
    }) => connectInstance(id, mode),
    onMutate: ({ id, mode, refresh }) => {
      setConnectionInstanceId(id)
      setConnectionMode(mode)
      if (!refresh) {
        setQrCode(null)
        setPairCode(null)
      }
    },
    onSuccess: (data) => {
      setConnectionPayload(data as Record<string, unknown>)
      const nextQr = extractQr(data as Record<string, unknown>)
      const nextPair = extractPairCode(data as Record<string, unknown>)
      if (nextQr) setQrCode(nextQr)
      if (nextPair) setPairCode(nextPair)
      setLastStatusAt(new Date().toLocaleTimeString())
      setConnectionOpen(true)
      setPollingActive(true)
      setError(null)
      queryClient.invalidateQueries({ queryKey: ["instances"] })
    },
    onError: (err: Error) => {
      const message = err.message.toLowerCase()
      if (message.includes("ja conectada")) {
        setError(null)
      } else {
        setError(err.message)
      }
      setConnectionInstanceId(null)
      setPollingActive(false)
      queryClient.invalidateQueries({ queryKey: ["instances"] })
    }
  })

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => disconnectInstance(id),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ["instances"] })
    },
    onError: (err: Error) => {
      setError(err.message)
    }
  })

  const instances = data ?? []

  const isConnectedPayload = (payload: Record<string, unknown> | null) => {
    if (!payload) return false
    const derived = payload.derivedStatus ?? payload.derived_status
    if (typeof derived === "string") {
      const normalized = derived.toLowerCase()
      if (
        (normalized.includes("conectado") || normalized.includes("connected")) &&
        !normalized.includes("desconectado") &&
        !normalized.includes("disconnected")
      ) {
        return true
      }
    }

    const statusObj = payload.status as Record<string, unknown> | undefined
    if (payload.connected === true || payload.loggedIn === true) return true
    if (statusObj?.connected === true || statusObj?.loggedIn === true) return true
    if (statusObj?.connected === "true" || statusObj?.loggedIn === "true") return true

    const derivedLabel = deriveConnectionLabel(payload, "Desconectado")
    return derivedLabel === "Conectado"
  }

  useEffect(() => {
    if (!pollingActive || !connectionInstanceId) return
    const tick = () => {
      statusMutation.mutate(connectionInstanceId)
    }

    tick()
    pollRef.current = setInterval(tick, 5000)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [pollingActive, connectionInstanceId])

  useEffect(() => {
    const connectingIds = instances
      .filter((inst) => formatConnectionLabel(inst.conexao_w) === "Conectando")
      .map((inst) => inst.id)

    if (connectingIds.length === 0) {
      if (backgroundPollRef.current) {
        clearInterval(backgroundPollRef.current)
        backgroundPollRef.current = null
      }
      return
    }

    if (backgroundPollRef.current) {
      clearInterval(backgroundPollRef.current)
      backgroundPollRef.current = null
    }

    backgroundPollRef.current = setInterval(async () => {
      await Promise.all(
        connectingIds.map((id) =>
          fetchInstanceStatus(id).catch(() => null)
        )
      )
      queryClient.invalidateQueries({ queryKey: ["instances"] })
    }, 10000)

    return () => {
      if (backgroundPollRef.current) {
        clearInterval(backgroundPollRef.current)
        backgroundPollRef.current = null
      }
    }
  }, [instances, queryClient])

  useEffect(() => {
    if (!connectionOpen || !connectionInstanceId) return
    const hasCode = connectionMode === "code" ? Boolean(pairCode) : Boolean(qrCode)
    const intervalMs = hasCode
      ? connectionMode === "qr"
        ? 2 * 60 * 1000
        : 5 * 60 * 1000
      : 20 * 1000

    if (refreshRef.current) {
      clearInterval(refreshRef.current)
      refreshRef.current = null
    }

    refreshRef.current = setInterval(() => {
      if (!connectionInstanceId) return
      if (connectMutation.isPending) return
      if (isConnectedPayload(connectionPayload)) return
      connectMutation.mutate({ id: connectionInstanceId, mode: connectionMode, refresh: true })
    }, intervalMs)

    return () => {
      if (refreshRef.current) {
        clearInterval(refreshRef.current)
        refreshRef.current = null
      }
    }
  }, [connectionOpen, connectionInstanceId, connectionMode, connectionPayload, pairCode, qrCode])

  const statusMutation = useMutation({
    mutationFn: (id: string) => fetchInstanceStatus(id),
    onSuccess: (data) => {
      setConnectionPayload(data as Record<string, unknown>)
      const nextQr = extractQr(data as Record<string, unknown>)
      const nextPair = extractPairCode(data as Record<string, unknown>)
      if (nextQr) setQrCode(nextQr)
      if (nextPair) setPairCode(nextPair)
      setLastStatusAt(new Date().toLocaleTimeString())
      queryClient.invalidateQueries({ queryKey: ["instances"] })
      if (isConnectedPayload(data as Record<string, unknown>)) {
        closeConnectionModal()
      }
    },
    onError: (err: Error) => {
      setError(err.message)
    }
  })

  const handleCloseConnection = async () => {
    if (connectionInstanceId) {
      try {
        await statusMutation.mutateAsync(connectionInstanceId)
      } catch {
        // ignore status errors on close
      }
    }
    closeConnectionModal()
    queryClient.invalidateQueries({ queryKey: ["instances"] })
  }

  useEffect(() => {
    if (!connectionPayload) return
    if (!isConnectedPayload(connectionPayload)) return
    closeConnectionModal()
  }, [connectionPayload])

  useEffect(() => {
    if (!connectionOpen || !connectionInstanceId) return
    const current = instances.find((item) => item.id === connectionInstanceId)
    if (!current) return
    if (formatConnectionLabel(current.conexao_w) === "Conectado") {
      closeConnectionModal()
    }
  }, [instances, connectionOpen, connectionInstanceId])

  const extractQr = (payload: Record<string, unknown> | null) => {
    if (!payload) return null
    const instance = payload["instance"] as Record<string, unknown> | undefined
    const candidates = [
      payload["qr"],
      payload["qrCode"],
      payload["qrcode"],
      payload["qr_code"],
      instance?.["qr"],
      instance?.["qrCode"],
      instance?.["qrcode"],
      instance?.["qr_code"]
    ]
    for (const qr of candidates) {
      if (typeof qr === "string" && qr.trim()) {
        if (qr.startsWith("data:image")) return qr
        return `data:image/png;base64,${qr}`
      }
    }
    return null
  }

  const extractPairCode = (payload: Record<string, unknown> | null) => {
    if (!payload) return null
    const instance = payload["instance"] as Record<string, unknown> | undefined
    const candidates = [
      payload["paircode"],
      payload["pair_code"],
      instance?.["paircode"],
      instance?.["pair_code"]
    ]
    for (const code of candidates) {
      if (typeof code === "string" && code.trim()) {
        return code.trim()
      }
    }
    return null
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        As instancias sao criadas automaticamente pelo backend. Aqui voce pode apenas editar os dados
        operacionais e conectar/desconectar o WhatsApp.
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Instancia</TableHead>
              <TableHead>Dono</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Conexao</TableHead>
              <TableHead>Pausa</TableHead>
              <TableHead>Ativa</TableHead>
              <TableHead>Throttle</TableHead>
              <TableHead>Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9}>Carregando instancias...</TableCell>
              </TableRow>
            ) : instances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>Nenhuma instancia cadastrada.</TableCell>
              </TableRow>
            ) : (
              instances.map((instance) => {
                const connectionLabel = formatConnectionLabel(instance.conexao_w)
                const isConnected = connectionLabel === "Conectado"

                return (
                  <TableRow key={instance.id}>
                    <TableCell>{instance.name}</TableCell>
                    <TableCell>{instance.instance_name}</TableCell>
                    <TableCell>{instance.owner_number}</TableCell>
                    <TableCell>
                      {(instance.cidade ?? "-") + " / " + (instance.estado ?? "-")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isConnected ? "default" : "secondary"}>
                        {connectionLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {instance.campanha_pause
                        ? `${formatHour(instance.campanha_horario_pause)} - ${formatHour(
                            instance.campanha_horario_reinicio
                          )}`
                        : "Nao"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={instance.is_active ? "default" : "secondary"}>
                        {instance.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>{instance.throttle_per_minute ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(instance)
                            setOpen(true)
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        {isConnected ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={disconnectMutation.isPending}
                            onClick={() => disconnectMutation.mutate(instance.id)}
                          >
                            {disconnectMutation.isPending ? "Desconectando..." : "Desconectar"}
                          </Button>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={connectMutation.isPending}
                              >
                                {connectMutation.isPending ? "Conectando..." : "Conectar"}
                                <ChevronDown className="ml-2 h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  connectMutation.mutate({ id: instance.id, mode: "qr" })
                                }
                              >
                                Ler QR Code
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  connectMutation.mutate({ id: instance.id, mode: "code" })
                                }
                              >
                                Usar codigo
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) {
            setEditing(null)
            setError(null)
          }
          setOpen(value)
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar instancia</DialogTitle>
          </DialogHeader>

          {error ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : null}

          {editing ? (
            <InstanceForm
              defaultValues={{
                name: editing.name,
                instance_name: editing.instance_name,
                owner_number: editing.owner_number,
                descricao: editing.descricao ?? "",
                cep: editing.cep ?? "",
                rua: editing.rua ?? "",
                bairro: editing.bairro ?? "",
                numero_residencia: editing.numero_residencia ?? "",
                complemento: editing.complemento ?? "",
                cidade: editing.cidade ?? "",
                estado: editing.estado ?? "",
                campanha_pause: editing.campanha_pause ?? false,
                campanha_horario_pause:
                  editing.campanha_pause
                    ? normalizeTime(editing.campanha_horario_pause) ?? "20:00"
                    : null,
                campanha_horario_reinicio:
                  editing.campanha_pause
                    ? normalizeTime(editing.campanha_horario_reinicio) ?? "07:00"
                    : null,
                is_active: editing.is_active,
                throttle_per_minute: editing.throttle_per_minute ?? 60
              }}
              onSubmit={async (values) => {
                setError(null)
                try {
                  await updateMutation.mutateAsync({ id: editing.id, values })
                } catch (err) {
                  const message = err instanceof Error ? err.message : "Erro ao salvar instancia"
                  setError(message)
                }
              }}
              submitLabel="Salvar alteracoes"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={connectionOpen}
        onOpenChange={(value) => {
          if (!value) {
            void handleCloseConnection()
            return
          }
          setConnectionOpen(value)
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
          </DialogHeader>
          {connectionPayload ? (
            <div className="space-y-3">
              {connectionMode === "code" && pairCode ? (
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/40 p-4 text-center">
                    <p className="text-xs text-muted-foreground">Codigo de pareamento</p>
                    <p className="mt-1 font-mono text-2xl tracking-[0.25em]">
                      {pairCode}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      if (pairCode && navigator?.clipboard) {
                        navigator.clipboard.writeText(pairCode)
                      }
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar codigo
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Abra o WhatsApp no celular, va em Aparelhos conectados e use o codigo acima.
                  </p>
                </div>
              ) : connectionMode === "code" && qrCode ? (
                <div className="space-y-3">
                  <img
                    src={qrCode}
                    alt="QR Code"
                    className="mx-auto h-56 w-56 rounded-lg border bg-white p-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    A API nao retornou codigo de pareamento. Exibindo QR como alternativa.
                  </p>
                </div>
              ) : connectionMode === "code" ? (
                <div className="rounded-lg border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
                  Aguardando codigo...
                </div>
              ) : qrCode ? (
                <img
                  src={qrCode}
                  alt="QR Code"
                  className="mx-auto h-56 w-56 rounded-lg border bg-white p-2"
                />
              ) : pairCode ? (
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/40 p-4 text-center">
                    <p className="text-xs text-muted-foreground">Codigo de pareamento</p>
                    <p className="mt-1 font-mono text-2xl tracking-[0.25em]">
                      {pairCode}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      if (pairCode && navigator?.clipboard) {
                        navigator.clipboard.writeText(pairCode)
                      }
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar codigo
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Abra o WhatsApp no celular, va em Aparelhos conectados e use o codigo acima.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
                  Aguardando QR Code...
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (connectionInstanceId) {
                    statusMutation.mutate(connectionInstanceId)
                  }
                }}
              >
                Atualizar status
              </Button>
              <p className="text-xs text-muted-foreground">
                {lastStatusAt
                  ? `Consultando /instance/status a cada 5s. Ultima resposta: ${lastStatusAt}.`
                  : "Consultando /instance/status a cada 5s."}
              </p>
              <p className="text-xs text-muted-foreground">
                {connectionMode === "qr"
                  ? "QR expira em 2 min. Atualizamos automaticamente. Para usar codigo, feche e clique em Conectar > Usar codigo."
                  : "Codigo expira em 5 min. Atualizamos automaticamente. Para ler QR, feche e clique em Conectar > Ler QR Code."}
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
