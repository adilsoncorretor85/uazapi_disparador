"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import * as XLSX from "xlsx"
import {
  ArrowDown,
  ArrowUp,
  Plus,
  Trash2,
  MessageSquare,
  Image as ImageIcon,
  Mic,
  Video,
  FileText,
  Users,
  Upload
} from "lucide-react"

import {
  campaignFormSchema,
  type CampaignFormValues
} from "@/lib/schemas/campaign"
import { fetchInstances } from "@/lib/services/instances"
import { importContacts } from "@/lib/services/contacts"
import { uploadMedia } from "@/lib/services/storage"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
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
  mode?: "create" | "edit"
  isSubmitting?: boolean
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
  variants: [],
  audience_source: "all",
  audience_contact_ids: []
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

function splitDateTime(value?: string | null) {
  if (!value) return { date: "", time: "" }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { date: "", time: "" }
  const pad = (num: number) => String(num).padStart(2, "0")
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`
  }
}

const TEMPLATE_HEADERS = [
  "nome",
  "telefone",
  "email",
  "data_nascimento",
  "genero",
  "tags",
  "bairro",
  "cep",
  "rua",
  "cidade",
  "estado",
  "numero_residencia",
  "complemento",
  "ponto_referencia"
]

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
}

const TEMPLATE_HEADERS_NORMALIZED = TEMPLATE_HEADERS.map(normalizeHeader)

function validateTemplateHeaders(headerRow: unknown[]) {
  const normalized = headerRow
    .map((value) => normalizeHeader(String(value ?? "")))
    .filter(Boolean)
  if (normalized.length !== TEMPLATE_HEADERS_NORMALIZED.length) return false
  return normalized.every((value, index) => value === TEMPLATE_HEADERS_NORMALIZED[index])
}

function normalizeRowKeys(row: Record<string, unknown>) {
  const normalized: Record<string, unknown> = {}
  Object.entries(row).forEach(([key, value]) => {
    normalized[normalizeHeader(key)] = value
  })
  return normalized
}

function parseTags(value?: string) {
  if (!value) return undefined
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function mapImportRows(rows: Record<string, unknown>[]) {
  return rows
    .map((row) => normalizeRowKeys(row))
    .map((row) => {
      const whatsapp = String(row.telefone ?? "").trim()
      if (!whatsapp) return null

      const full_name = String(row.nome ?? "").trim()
      const first_name = full_name ? full_name.split(" ")[0] : undefined
      const email = String(row.email ?? "").trim() || undefined
      const city = String(row.cidade ?? "").trim() || undefined
      const state = String(row.estado ?? "").trim() || undefined
      const tags = parseTags(String(row.tags ?? "").trim())

      const custom_fields: Record<string, unknown> = {}
      const customKeys = [
        "data_nascimento",
        "genero",
        "bairro",
        "cep",
        "rua",
        "numero_residencia",
        "complemento",
        "ponto_referencia"
      ]

      customKeys.forEach((key) => {
        const value = row[key]
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          custom_fields[key] = value
        }
      })

      return {
        whatsapp,
        first_name,
        full_name,
        email,
        city,
        state,
        tags,
        custom_fields: Object.keys(custom_fields).length ? custom_fields : undefined
      }
    })
    .filter(Boolean)
}

export function CampaignForm({
  initialData,
  onSubmit,
  mode = "create",
  isSubmitting
}: CampaignFormProps) {
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: initialData ?? defaultValues
  })

  const submitActionRef = useRef<"publish" | "draft">("publish")
  const mediaInputRef = useRef<HTMLInputElement | null>(null)
  const initialSchedule = splitDateTime(initialData?.scheduled_at ?? null)
  const [scheduleMode, setScheduleMode] = useState<"now" | "schedule">(
    initialData?.scheduled_at ? "schedule" : "now"
  )
  const [scheduleDate, setScheduleDate] = useState(initialSchedule.date)
  const [scheduleTime, setScheduleTime] = useState(initialSchedule.time)
  const [audienceMode, setAudienceMode] = useState<"all" | "file">(
    initialData?.audience_source ?? "all"
  )
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSummary, setImportSummary] = useState<{
    total: number
    inserted: number
    ignored: number
  } | null>(null)
  const [importedContacts, setImportedContacts] = useState<
    Array<{ id: string; whatsapp_e164: string; first_name?: string | null; full_name?: string | null }>
  >([])
  const [defaultDdd, setDefaultDdd] = useState("47")

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
  const busy = isSubmitting ?? form.formState.isSubmitting
  const scheduleEnabled = scheduleMode === "schedule"

  useEffect(() => {
    if (!scheduleEnabled) {
      form.setValue("scheduled_at", null, { shouldDirty: true, shouldValidate: true })
      return
    }

    if (scheduleDate && scheduleTime) {
      form.setValue("scheduled_at", `${scheduleDate}T${scheduleTime}`, {
        shouldDirty: true,
        shouldValidate: true
      })
    }
  }, [scheduleEnabled, scheduleDate, scheduleTime, form])

  useEffect(() => {
    form.setValue("audience_source", audienceMode, { shouldDirty: true })
    if (audienceMode === "all") {
      form.setValue("audience_contact_ids", [], { shouldDirty: true })
      setImportedContacts([])
      setImportSummary(null)
      setImportError(null)
    }
  }, [audienceMode, form])

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

  const handleImportFile = async (file: File) => {
    setImporting(true)
    setImportError(null)
    try {
      const instanceId = form.getValues("instance_id")
      if (!instanceId) {
        throw new Error("Selecione uma instância antes de importar.")
      }

      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array" })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const headerRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, range: 0 })
      const headerRow = headerRows[0] as unknown[] | undefined
      if (!headerRow || !validateTemplateHeaders(headerRow)) {
        throw new Error(
          "Arquivo inválido. Use exatamente o template padrão disponibilizado."
        )
      }
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: ""
      })
      const mappedRows = mapImportRows(rawRows)
      const totalRows = rawRows.length
      if (mappedRows.length === 0) {
        throw new Error("Nenhum número válido encontrado no arquivo.")
      }

      const result = await importContacts(mappedRows, instanceId, defaultDdd)
      setImportSummary({
        total: totalRows,
        inserted: result.inserted,
        ignored: result.ignored + Math.max(0, totalRows - mappedRows.length)
      })
      setImportedContacts(result.contacts)
      setAudienceMode("file")
      form.setValue(
        "audience_contact_ids",
        result.contacts.map((contact) => contact.id),
        { shouldDirty: true, shouldValidate: false }
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao importar contatos"
      setImportError(message)
    } finally {
      setImporting(false)
    }
  }

  const summary = {
    title: watchValues.title,
    instance: instances?.find((inst) => inst.id === watchValues.instance_id)?.name ?? "-",
    scheduled: watchValues.scheduled_at
      ? toDateTimeLocal(watchValues.scheduled_at)
      : "Sem agendamento",
    delay: `${watchValues.delay_min_seconds ?? 0}s - ${watchValues.delay_max_seconds ?? 0}s`,
    batch: watchValues.batch_size ?? 0,
    maxAttempts: watchValues.max_attempts ?? 0,
    useRandomizer: watchValues.use_randomizer
  }

  const contentOptions = [
    { value: "none", label: "Texto", icon: MessageSquare },
    { value: "image", label: "Imagem", icon: ImageIcon },
    { value: "audio", label: "Áudio", icon: Mic },
    { value: "video", label: "Vídeo", icon: Video },
    { value: "document", label: "Documento", icon: FileText }
  ]

  return (
    <Form {...form}>
      <form
        className="grid gap-6 lg:grid-cols-[2fr_1fr]"
        onSubmit={form.handleSubmit(async (values) => {
          const payload: CampaignFormValues = { ...values }
          const shouldSchedule = scheduleEnabled && Boolean(payload.scheduled_at)

          if (mode === "create") {
            if (submitActionRef.current === "draft") {
              payload.status = "draft"
              payload.scheduled_at = null
            } else {
              payload.status = shouldSchedule ? "scheduled" : "processing"
              if (!shouldSchedule) {
                payload.scheduled_at = null
              }
            }
          }

          if (mode === "edit" && submitActionRef.current === "draft") {
            payload.status = "draft"
          }

          await onSubmit(payload)
        })}
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

              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    className={cn(
                      "rounded-xl border p-4 text-left transition",
                      scheduleMode === "now"
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/20 hover:border-muted-foreground/40"
                    )}
                    onClick={() => setScheduleMode("now")}
                  >
                    <p className="text-sm font-semibold">Enviar agora</p>
                    <p className="text-xs text-muted-foreground">
                      Disparo imediato após salvar.
                    </p>
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded-xl border p-4 text-left transition",
                      scheduleMode === "schedule"
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/20 hover:border-muted-foreground/40"
                    )}
                    onClick={() => setScheduleMode("schedule")}
                  >
                    <p className="text-sm font-semibold">Agendar</p>
                    <p className="text-xs text-muted-foreground">Defina data e hora.</p>
                  </button>
                </div>

                {scheduleEnabled ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    <FormItem>
                      <FormLabel>Dia</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={scheduleDate}
                          onChange={(event) => setScheduleDate(event.target.value)}
                        />
                      </FormControl>
                    </FormItem>
                    <FormItem>
                      <FormLabel>Horário</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          value={scheduleTime}
                          onChange={(event) => setScheduleTime(event.target.value)}
                        />
                      </FormControl>
                    </FormItem>
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
                ) : null}
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Público alvo</h2>
                <p className="text-sm text-muted-foreground">
                  Selecione todos os contatos ou importe uma planilha e use apenas quem foi
                  carregado.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  className={cn(
                    "rounded-xl border p-4 text-left transition",
                    audienceMode === "all"
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/20 hover:border-muted-foreground/40"
                  )}
                  onClick={() => setAudienceMode("all")}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <p className="text-sm font-semibold">Todos os contatos</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Disparar para toda a base.
                  </p>
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-xl border p-4 text-left transition",
                    audienceMode === "file"
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/20 hover:border-muted-foreground/40"
                  )}
                  onClick={() => setAudienceMode("file")}
                >
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    <p className="text-sm font-semibold">Importar planilha</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    XLSX ou CSV com coluna de WhatsApp.
                  </p>
                </button>
              </div>

              {audienceMode === "file" ? (
                <div className="space-y-3">
                  <div className="grid gap-4 md:grid-cols-3">
                    <FormItem>
                      <FormLabel>DDD padrão</FormLabel>
                      <FormControl>
                        <Input
                          value={defaultDdd}
                          onChange={(event) => setDefaultDdd(event.target.value)}
                          placeholder="47"
                        />
                      </FormControl>
                    </FormItem>
                    <FormItem className="md:col-span-2">
                      <FormLabel>Arquivo de contatos</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          disabled={importing}
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (!file) return
                            handleImportFile(file)
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                    <span>
                      Use somente o template padrão. Tags devem ser separadas por vírgula.
                    </span>
                    <Button asChild variant="link" size="sm">
                      <a href="/templates/cidadaos_import_template.xlsx" download>
                        Baixar template
                      </a>
                    </Button>
                  </div>

                  {importing ? (
                    <p className="text-sm text-muted-foreground">Importando contatos...</p>
                  ) : null}

                  {importError ? (
                    <p className="text-sm text-destructive">{importError}</p>
                  ) : null}

                  {importSummary ? (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                      <p>
                        Contatos processados: {importSummary.total} | Importados:{" "}
                        {importSummary.inserted} | Ignorados: {importSummary.ignored}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Selecionados automaticamente: {importedContacts.length}
                      </p>
                    </div>
                  ) : null}

                  {importedContacts.length > 0 ? (
                    <div className="rounded-lg border bg-background p-3 text-sm">
                      <p className="mb-2 text-xs text-muted-foreground">
                        Primeiros contatos importados
                      </p>
                      <div className="space-y-1">
                        {importedContacts.slice(0, 5).map((contact) => (
                          <div key={contact.id} className="flex justify-between text-xs">
                            <span>
                              {contact.full_name ?? contact.first_name ?? "Contato"}
                            </span>
                            <span className="text-muted-foreground">
                              {contact.whatsapp_e164}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
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

              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-5">
                  {contentOptions.map((option) => {
                    const Icon = option.icon
                    const active = mediaType === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-sm transition",
                          active
                            ? "border-primary bg-primary/5"
                            : "border-muted-foreground/20 hover:border-muted-foreground/40"
                        )}
                        onClick={() => {
                          form.setValue("media_type", option.value, {
                            shouldDirty: true,
                            shouldValidate: true
                          })
                          if (option.value !== "none") {
                            setTimeout(() => mediaInputRef.current?.click(), 0)
                          }
                        }}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{option.label}</span>
                      </button>
                    )
                  })}
                </div>

                <FormItem>
                  <FormLabel>Arquivo da mídia (Supabase)</FormLabel>
                  <FormControl>
                    <Input
                      ref={mediaInputRef}
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
                    <FormItem>
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
              {mode === "create" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={busy}
                  onClick={() => {
                    submitActionRef.current = "draft"
                    form.handleSubmit(async (values) => {
                      const payload: CampaignFormValues = {
                        ...values,
                        status: "draft",
                        scheduled_at: null
                      }
                      await onSubmit(payload)
                    })()
                  }}
                >
                  Salvar rascunho
                </Button>
              ) : null}
              <Button
                type="submit"
                className="w-full"
                disabled={busy}
                onClick={() => {
                  submitActionRef.current = "publish"
                }}
              >
                {busy
                  ? "Salvando..."
                  : mode === "edit"
                    ? "Salvar alterações"
                    : scheduleEnabled
                      ? "Agendar campanha"
                      : "Publicar campanha"}
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


