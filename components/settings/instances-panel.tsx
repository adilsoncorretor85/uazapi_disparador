"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, AlertCircle } from "lucide-react"
import type { WhatsAppInstance } from "@/types/entities"
import {
  fetchInstances,
  createInstance,
  updateInstance,
  connectInstance,
  disconnectInstance
} from "@/lib/services/instances"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { InstanceForm } from "@/components/forms/instance-form"
import type { InstanceFormValues } from "@/lib/schemas/instance"

function maskToken(token?: string | null) {
  if (!token) return "-"
  return token.slice(0, 4) + "••••" + token.slice(-4)
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

  const createMutation = useMutation({
    mutationFn: (values: InstanceFormValues) => createInstance(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instances"] })
      setOpen(false)
      setError(null)
    },
    onError: (err: Error) => {
      setError(err.message)
    }
  })

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
    mutationFn: (id: string) => connectInstance(id),
    onSuccess: (data) => {
      setConnectionPayload(data as Record<string, unknown>)
      setConnectionOpen(true)
      queryClient.invalidateQueries({ queryKey: ["instances"] })
    },
    onError: (err: Error) => {
      setError(err.message)
    }
  })

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => disconnectInstance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instances"] })
    },
    onError: (err: Error) => {
      setError(err.message)
    }
  })

  const instances = data ?? []

  const extractQr = (payload: Record<string, unknown> | null) => {
    if (!payload) return null
    const qr = payload["qr"] ?? payload["qrCode"] ?? payload["qrcode"] ?? payload["qr_code"]
    if (typeof qr === "string" && qr.trim()) {
      if (qr.startsWith("data:image")) return qr
      return `data:image/png;base64,${qr}`
    }
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova instância
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Base URL</TableHead>
              <TableHead>Instância</TableHead>
              <TableHead>Dono</TableHead>
              <TableHead>Conexão</TableHead>
              <TableHead>Ativa</TableHead>
              <TableHead>Readchat</TableHead>
              <TableHead>Composing</TableHead>
              <TableHead>Throttle</TableHead>
              <TableHead>Token</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={12}>Carregando instâncias...</TableCell>
              </TableRow>
            ) : instances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12}>Nenhuma instância cadastrada.</TableCell>
              </TableRow>
            ) : (
              instances.map((instance) => (
                <TableRow key={instance.id}>
                  <TableCell>{instance.name}</TableCell>
                  <TableCell>{instance.provider}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{instance.base_url}</TableCell>
                  <TableCell>{instance.instance_name}</TableCell>
                  <TableCell>{instance.owner_number}</TableCell>
                  <TableCell>
                    <Badge variant={instance.conexao_w === "Conectado" ? "default" : "secondary"}>
                      {instance.conexao_w ?? "Desconectado"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={instance.is_active ? "default" : "secondary"}>
                      {instance.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell>{instance.send_readchat ? "Sim" : "Não"}</TableCell>
                  <TableCell>{instance.send_composing ? "Sim" : "Não"}</TableCell>
                  <TableCell>{instance.throttle_per_minute ?? "-"}</TableCell>
                  <TableCell>{maskToken(instance.token)}</TableCell>
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => connectMutation.mutate(instance.id)}
                      >
                        Conectar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => disconnectMutation.mutate(instance.id)}
                      >
                        Desconectar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar instância" : "Nova instância"}</DialogTitle>
          </DialogHeader>

          {error ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : null}

          <InstanceForm
            defaultValues={
              editing
                ? {
                    name: editing.name,
                    provider: editing.provider,
                    base_url: editing.base_url,
                    instance_name: editing.instance_name,
                    owner_number: editing.owner_number,
                    is_active: editing.is_active,
                    send_readchat: editing.send_readchat,
                    send_composing: editing.send_composing,
                    descricao: editing.descricao ?? "",
                    cidade: editing.cidade ?? "",
                    estado: editing.estado ?? "",
                    campanha_pause: editing.campanha_pause ?? false,
                    campanha_horario_pause: editing.campanha_horario_pause ?? "20:00",
                    campanha_horario_reinicio: editing.campanha_horario_reinicio ?? "07:00",
                    throttle_per_minute: editing.throttle_per_minute ?? 60,
                    token: ""
                  }
                : undefined
            }
            onSubmit={async (values) => {
              setError(null)
              try {
                if (editing) {
                  await updateMutation.mutateAsync({ id: editing.id, values })
                } else {
                  await createMutation.mutateAsync(values)
                }
              } catch (err) {
                const message = err instanceof Error ? err.message : "Erro ao salvar instância"
                setError(message)
              }
            }}
            submitLabel={editing ? "Salvar alterações" : "Criar instância"}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={connectionOpen} onOpenChange={setConnectionOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
          </DialogHeader>
          {connectionPayload ? (
            <div className="space-y-3">
              {extractQr(connectionPayload) ? (
                <img
                  src={extractQr(connectionPayload) ?? ""}
                  alt="QR Code"
                  className="mx-auto h-56 w-56 rounded-lg border bg-white p-2"
                />
              ) : (
                <pre className="max-h-64 overflow-auto rounded-lg bg-muted/50 p-3 text-xs">
                  {JSON.stringify(connectionPayload, null, 2)}
                </pre>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
