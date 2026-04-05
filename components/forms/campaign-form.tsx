"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"

import {
  campaignFormSchema,
  type CampaignFormValues
} from "@/lib/schemas/campaign"
import { fetchInstances } from "@/lib/services/instances"
import { uploadMedia } from "@/lib/services/storage"
import { formatNumber } from "@/lib/format"
import { CAMPAIGN_STATUS_LABELS } from "@/lib/constants/status"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { WhatsAppMessageEditor } from "@/components/common/whatsapp-message-editor"
import { WhatsAppPreview } from "@/components/common/whatsapp-preview"

interface CampaignFormProps {
  initialData?: CampaignFormValues
  onSubmit: (values: CampaignFormValues) => Promise<void>
  submitLabel?: string
}

const defaultValues: CampaignFormValues = {
  title: "",
  description: "",
  instance_id: "",
  status: "draft",
  scheduled_at: null,
  timezone: "America/Sao_Paulo",
  media_type: "none",
  media_url: "",
  message_body: "",
  delay_min_seconds: 5,
  delay_max_seconds: 20,
  batch_size: 50,
  max_attempts: 3,
  readchat: false,
  use_composing: false,
  use_randomizer: false,
  variants: []
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (num: number) => String(num).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

export function CampaignForm({ initialData, onSubmit, submitLabel }: CampaignFormProps) {
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: initialData ?? defaultValues
  })

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "variants"
  })

  const { data: instances } = useQuery({
    queryKey: ["instances"],
    queryFn: () => fetchInstances()
  })

  const watchValues = form.watch()
  const watchRandomizer = watchValues.use_randomizer
  const messageBody = watchValues.message_body
  const mediaUrl = watchValues.media_url
  const mediaType = watchValues.media_type
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const acceptTypes = useMemo(() => {
    switch (mediaType) {
      case "image":
        return "image/*"
      case "video":
        return "video/*"
      case "audio":
        return "audio/*"
      case "document":
        return "*/*"
      default:
        return ""
    }
  }, [mediaType])

  useEffect(() => {
    if (mediaType === "none" && mediaUrl) {
      form.setValue("media_url", "", { shouldDirty: true, shouldValidate: true })
      setUploadError(null)
    }
  }, [mediaType, mediaUrl, form])

  const summary = {
    title: watchValues.title,
    instance: instances?.find((inst) => inst.id === watchValues.instance_id)?.name ?? "-",
    scheduled: watchValues.scheduled_at ? toDateTimeLocal(watchValues.scheduled_at) : "Sem agendamento",
    delay: `${watchValues.delay_min_seconds ?? 0}s - ${watchValues.delay_max_seconds ?? 0}s`,
    batch: watchValues.batch_size ?? 0,
    maxAttempts: watchValues.max_attempts ?? 0,
    useRandomizer: watchValues.use_randomizer
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-6 lg:grid-cols-[2fr_1fr]"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="space-y-6">
          <Card>
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Dados da campanha</h2>
                <p className="text-sm text-muted-foreground">
                  Informações gerais da campanha e agendamento.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Campanha de reativação" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="instance_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instância</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {instances?.map((instance) => (
                            <SelectItem key={instance.id} value={instance.id}>
                              {instance.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Contexto e objetivo da campanha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status inicial</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(CAMPAIGN_STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scheduled_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agendamento</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={toDateTimeLocal(field.value)}
                          onChange={(event) => field.onChange(event.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuso horário</FormLabel>
                      <FormControl>
                        <Input placeholder="America/Sao_Paulo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Conteúdo da mensagem</h2>
                <p className="text-sm text-muted-foreground">
                  Configure texto principal e mídia.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="media_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de mídia</FormLabel>
                      <Select value={field.value ?? "none"} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sem mídia</SelectItem>
                          <SelectItem value="image">Imagem</SelectItem>
                          <SelectItem value="video">Vídeo</SelectItem>
                          <SelectItem value="audio">Áudio</SelectItem>
                          <SelectItem value="document">Documento</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>Arquivo da mídia (Supabase)</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept={acceptTypes}
                      disabled={mediaType === "none" || isUploading}
                      onChange={async (event) => {
                        const file = event.target.files?.[0]
                        if (!file) return
                        setIsUploading(true)
                        setUploadError(null)
                        try {
                          const result = await uploadMedia(file, "campaigns")
                          form.setValue("media_url", result.url, {
                            shouldDirty: true,
                            shouldValidate: true
                          })
                        } catch (error) {
                          const message =
                            error instanceof Error ? error.message : "Erro ao enviar mídia"
                          setUploadError(message)
                        } finally {
                          setIsUploading(false)
                        }
                      }}
                    />
                  </FormControl>
                  {isUploading ? (
                    <p className="text-xs text-muted-foreground">Enviando arquivo...</p>
                  ) : null}
                  {uploadError ? (
                    <p className="text-xs text-destructive">{uploadError}</p>
                  ) : null}
                </FormItem>
                <FormField
                  control={form.control}
                  name="media_url"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>URL da mídia</FormLabel>
                      <FormControl>
                        <Input placeholder="URL gerada automaticamente" readOnly {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="message_body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensagem principal</FormLabel>
                    <FormControl>
                      <WhatsAppMessageEditor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Digite a mensagem"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Configuração de envio</h2>
                <p className="text-sm text-muted-foreground">
                  Ajuste delays, batches e comportamento.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <FormField
                  control={form.control}
                  name="delay_min_seconds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delay mínimo (s)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="delay_max_seconds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delay máximo (s)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="batch_size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batch size</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="max_attempts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máx. tentativas</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <FormField
                  control={form.control}
                  name="readchat"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel>Marcar como lido</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="use_composing"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel>Enviar "digitando"</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold">Randomizador</h2>
                  <p className="text-sm text-muted-foreground">
                    Crie variantes de texto e distribua por peso.
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="use_randomizer"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel>Ativar</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              {watchRandomizer ? (
                <div className="space-y-4">
                  {fields.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Adicione variantes para ativar o randomizador.
                    </p>
                  ) : null}

                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div key={field.id} className="rounded-xl border bg-muted/30 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="secondary">Variante {index + 1}</Badge>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => move(index, index - 1)}
                              disabled={index === 0}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => move(index, index + 1)}
                              disabled={index === fields.length - 1}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                          <FormField
                            control={form.control}
                            name={`variants.${index}.message_body`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>Mensagem</FormLabel>
                                <FormControl>
                                  <WhatsAppMessageEditor
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Mensagem da variante"
                                    rows={5}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <div className="space-y-3">
                            <FormField
                              control={form.control}
                              name={`variants.${index}.weight`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Peso</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`variants.${index}.is_active`}
                              render={({ field }) => (
                                <FormItem className="flex items-center gap-2">
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                  <FormLabel>Ativa</FormLabel>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      append({ message_body: "", weight: 1, is_active: true, sort_order: fields.length + 1 })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar variante
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  O randomizador está desativado. A mensagem principal será usada em todos os envios.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Resumo final</h2>
                <p className="text-sm text-muted-foreground">
                  Revise antes de salvar a campanha.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Campanha</p>
                  <p className="font-medium">{summary.title || "-"}</p>
                  <p className="text-xs text-muted-foreground">Instância: {summary.instance}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Agendamento</p>
                  <p className="font-medium">{summary.scheduled}</p>
                  <p className="text-xs text-muted-foreground">Fuso: {watchValues.timezone}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Envio</p>
                  <p className="font-medium">Delay {summary.delay}</p>
                  <p className="text-xs text-muted-foreground">
                    Batch {formatNumber(summary.batch)} | Máx. tentativas {formatNumber(summary.maxAttempts)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Randomizador</p>
                  <p className="font-medium">{summary.useRandomizer ? "Ativo" : "Desativado"}</p>
                  <p className="text-xs text-muted-foreground">
                    Variantes: {formatNumber(fields.length)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <WhatsAppPreview
            message={messageBody}
            mediaType={mediaType}
            mediaUrl={mediaUrl}
            useRandomizer={watchRandomizer}
            variants={watchValues.variants}
          />

          <Card>
            <div className="space-y-3">
              <h3 className="font-display text-lg font-semibold">Ações</h3>
              <p className="text-sm text-muted-foreground">
                Salve sua campanha ou volte depois.
              </p>
              <Button type="submit" className="w-full">
                {submitLabel ?? "Salvar campanha"}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => form.reset()}>
                Limpar formulário
              </Button>
            </div>
          </Card>
        </div>
      </form>
    </Form>
  )
}


