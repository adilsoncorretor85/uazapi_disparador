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
  Link2,
  Users,
  Upload,
  AlertCircle
} from "lucide-react"

import {
  campaignFormSchema,
  type CampaignFormValues
} from "@/lib/schemas/campaign"
import { fetchInstances } from "@/lib/services/instances"
import { fetchContactFilterOptions, importContacts } from "@/lib/services/contacts"
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
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { WhatsAppMessageEditor } from "@/components/common/whatsapp-message-editor"
import { WhatsAppPreview } from "@/components/common/whatsapp-preview"

interface CampaignFormProps {
  initialData?: CampaignFormValues
  onSubmit: (values: CampaignFormValues) => Promise<void>
  mode?: "create" | "edit"
  isSubmitting?: boolean
  submitError?: string | null
}

const DEFAULT_TIMEZONE = "America/Sao_Paulo"

const defaultValues: CampaignFormValues = {
  title: "",
  description: "",
  instance_id: "",
  status: "draft",
  scheduled_at: null,
  timezone: DEFAULT_TIMEZONE,
  media_type: "none",
  media_url: "",
  message_body: "",
  link_preview: false,
  typing_delay_seconds: 6,
  delay_min_seconds: 5,
  delay_max_seconds: 20,
  batch_size: 50,
  max_attempts: 3,
  readchat: false,
  use_composing: false,
  use_randomizer: false,
  variants: [],
  audience_tags: [],
  audience_tags_exclude: [],
  audience_cities: [],
  audience_bairros: [],
  audience_ruas: [],
  audience_source: "all",
  audience_contact_ids: []
}

const pad2 = (num: number) => String(num).padStart(2, "0")

function getTimeZoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  })
  const parts = formatter.formatToParts(date)
  const map: Record<string, string> = {}
  parts.forEach((part) => {
    if (part.type !== "literal") {
      map[part.type] = part.value
    }
  })
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute)
  }
}

function formatDateTimeInTimeZone(value?: string | null, timeZone = DEFAULT_TIMEZONE) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const parts = getTimeZoneParts(date, timeZone)
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(
    parts.hour
  )}:${pad2(parts.minute)}`
}

function splitDateTimeInTimeZone(value?: string | null, timeZone = DEFAULT_TIMEZONE) {
  if (!value) return { date: "", time: "" }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { date: "", time: "" }
  const parts = getTimeZoneParts(date, timeZone)
  return {
    date: `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`,
    time: `${pad2(parts.hour)}:${pad2(parts.minute)}`
  }
}

function dateTimeInTimeZoneToUtcIso(
  dateValue: string,
  timeValue: string,
  timeZone = DEFAULT_TIMEZONE
) {
  if (!dateValue || !timeValue) return null
  const [year, month, day] = dateValue.split("-").map(Number)
  const [hour, minute] = timeValue.split(":").map(Number)
  if (
    [year, month, day, hour, minute].some((value) => Number.isNaN(value))
  ) {
    return null
  }

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
  const actual = getTimeZoneParts(utcGuess, timeZone)
  const actualUtc = Date.UTC(
    actual.year,
    actual.month - 1,
    actual.day,
    actual.hour,
    actual.minute,
    0
  )
  const intendedUtc = Date.UTC(year, month - 1, day, hour, minute, 0)
  const diffMs = intendedUtc - actualUtc
  return new Date(utcGuess.getTime() + diffMs).toISOString()
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
const MAX_VIDEO_BYTES = 64 * 1024 * 1024

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

function findFirstErrorMessage(errors: Record<string, unknown>): string | null {
  for (const value of Object.values(errors)) {
    if (!value) continue
    if (typeof value === "object" && "message" in (value as Record<string, unknown>)) {
      const message = (value as { message?: string }).message
      if (typeof message === "string" && message) return message
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object" && "message" in item) {
          const msg = (item as { message?: string }).message
          if (typeof msg === "string" && msg) return msg
        }
        if (item && typeof item === "object") {
          const nested = findFirstErrorMessage(item as Record<string, unknown>)
          if (nested) return nested
        }
      }
    } else if (typeof value === "object") {
      const nested = findFirstErrorMessage(value as Record<string, unknown>)
      if (nested) return nested
    }
  }
  return null
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
      const bairro = String(row.bairro ?? "").trim() || undefined
      const cep = String(row.cep ?? "").trim() || undefined
      const rua = String(row.rua ?? "").trim() || undefined
      const numero_residencia = String(row.numero_residencia ?? "").trim() || undefined
      const complemento = String(row.complemento ?? "").trim() || undefined
      const ponto_referencia = String(row.ponto_referencia ?? "").trim() || undefined
      const genero = String(row.genero ?? "").trim() || undefined
      const data_nascimento = String(row.data_nascimento ?? "").trim() || undefined

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
        bairro,
        cep,
        rua,
        numero_residencia,
        complemento,
        ponto_referencia,
        genero,
        data_nascimento,
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
  isSubmitting,
  submitError
}: CampaignFormProps) {
  const resolvedInitial = useMemo(
    () =>
      initialData
        ? {
            ...defaultValues,
            ...initialData,
            timezone: DEFAULT_TIMEZONE,
            media_type: initialData.link_preview
              ? "link"
              : initialData.media_type ?? "none"
          }
        : defaultValues,
    [initialData]
  )

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: resolvedInitial
  })

  const hasInitializedRef = useRef(false)

  const submitActionRef = useRef<"publish" | "draft" | "keep">("publish")
  const mediaInputRef = useRef<HTMLInputElement | null>(null)
  const initialSchedule = splitDateTimeInTimeZone(initialData?.scheduled_at ?? null)
  const [scheduleMode, setScheduleMode] = useState<"now" | "schedule">(
    initialData?.scheduled_at ? "schedule" : "now"
  )
  const [scheduleDate, setScheduleDate] = useState(initialSchedule.date)
  const [scheduleTime, setScheduleTime] = useState(initialSchedule.time)
  const scheduleSyncRef = useRef(false)
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
  const [linkPreviewData, setLinkPreviewData] = useState<{
    url: string
    title?: string
    description?: string
    image?: string
    siteName?: string
  } | null>(null)
  const lastPreviewRef = useRef<string | null>(null)

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "variants"
  })

  const watchedInstanceId = form.watch("instance_id")
  const [citySearch, setCitySearch] = useState("")
  const [debouncedCitySearch, setDebouncedCitySearch] = useState("")
  const lastInstanceRef = useRef<string | null>(null)

  const { data: instances } = useQuery({
    queryKey: ["instances"],
    queryFn: () => fetchInstances()
  })

  const watchValues = form.watch()
  const watchRandomizer = watchValues.use_randomizer
  const messageBody = watchValues.message_body ?? ""
  const mediaUrl = watchValues.media_url
  const mediaType = watchValues.media_type
  const linkPreview = watchValues.link_preview
  const typingDelay = watchValues.typing_delay_seconds ?? 0
  const isAudio = mediaType === "audio"
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const busy = isSubmitting ?? form.formState.isSubmitting
  const scheduleEnabled = scheduleMode === "schedule"
  const currentStatus = resolvedInitial.status ?? "draft"
  const canPublishFromDraft = mode === "edit" && currentStatus === "draft"
  const audienceTags = watchValues.audience_tags ?? []
  const audienceTagsExclude = watchValues.audience_tags_exclude ?? []
  const audienceCities = watchValues.audience_cities ?? []
  const audienceBairros = watchValues.audience_bairros ?? []
  const audienceRuas = watchValues.audience_ruas ?? []
  const selectedCity = audienceCities[0] ?? ""
  const selectedBairro = audienceBairros[0] ?? ""
  const selectedRua = audienceRuas[0] ?? ""

  const {
    data: contactFilterOptions,
    isLoading: isFilterOptionsLoading
  } = useQuery({
    queryKey: [
      "contact-filter-options",
      watchedInstanceId,
      debouncedCitySearch,
      selectedCity,
      selectedBairro
    ],
    queryFn: () =>
      fetchContactFilterOptions(watchedInstanceId as string, {
        citySearch: debouncedCitySearch,
        city: selectedCity || undefined,
        bairro: selectedBairro || undefined
      }),
    enabled: audienceMode === "all" && Boolean(watchedInstanceId)
  })

  const filterOptions = contactFilterOptions ?? {
    tags: [],
    cities: [],
    bairros: [],
    ruas: []
  }
  const tagIncludeOptions = filterOptions.tags.filter(
    (tag) => !audienceTagsExclude.includes(tag)
  )
  const tagExcludeOptions = filterOptions.tags.filter(
    (tag) => !audienceTags.includes(tag)
  )

  const toggleArrayValue = (
    fieldName:
      | "audience_tags"
      | "audience_tags_exclude"
      | "audience_cities"
      | "audience_bairros"
      | "audience_ruas",
    value: string
  ) => {
    const current = (form.getValues(fieldName) ?? []) as string[]
    const exists = current.includes(value)
    const next = exists ? current.filter((item) => item !== value) : [...current, value]
    form.setValue(fieldName, next, { shouldDirty: true, shouldValidate: false })

    if (!exists && fieldName === "audience_tags") {
      const excluded = (form.getValues("audience_tags_exclude") ?? []) as string[]
      if (excluded.includes(value)) {
        form.setValue(
          "audience_tags_exclude",
          excluded.filter((item) => item !== value),
          { shouldDirty: true, shouldValidate: false }
        )
      }
    }

    if (!exists && fieldName === "audience_tags_exclude") {
      const included = (form.getValues("audience_tags") ?? []) as string[]
      if (included.includes(value)) {
        form.setValue(
          "audience_tags",
          included.filter((item) => item !== value),
          { shouldDirty: true, shouldValidate: false }
        )
      }
    }
  }

  const clearArrayValue = (
    fieldName:
      | "audience_tags"
      | "audience_tags_exclude"
      | "audience_cities"
      | "audience_bairros"
      | "audience_ruas"
  ) => {
    form.setValue(fieldName, [], { shouldDirty: true, shouldValidate: false })
  }

  const setSingleSelection = (
    fieldName: "audience_cities" | "audience_bairros" | "audience_ruas",
    value: string
  ) => {
    const current = (form.getValues(fieldName) ?? []) as string[]
    const currentValue = current[0] ?? ""
    const nextValue = currentValue === value ? "" : value
    form.setValue(fieldName, nextValue ? [nextValue] : [], {
      shouldDirty: true,
      shouldValidate: false
    })
    return nextValue
  }

  const setCitySelection = (value: string) => {
    const nextValue = setSingleSelection("audience_cities", value)
    form.setValue("audience_bairros", [], { shouldDirty: true, shouldValidate: false })
    form.setValue("audience_ruas", [], { shouldDirty: true, shouldValidate: false })
    if (!nextValue) {
      setCitySearch("")
    }
  }

  const setBairroSelection = (value: string) => {
    setSingleSelection("audience_bairros", value)
    form.setValue("audience_ruas", [], { shouldDirty: true, shouldValidate: false })
  }

  const setRuaSelection = (value: string) => {
    setSingleSelection("audience_ruas", value)
  }

  useEffect(() => {
    if (!initialData) return
    if (!hasInitializedRef.current || !form.formState.isDirty) {
      form.reset(resolvedInitial)
      const schedule = splitDateTimeInTimeZone(initialData.scheduled_at ?? null)
      setScheduleMode(initialData.scheduled_at ? "schedule" : "now")
      setScheduleDate(schedule.date)
      setScheduleTime(schedule.time)
      scheduleSyncRef.current = true
      setAudienceMode(initialData.audience_source ?? "all")
      hasInitializedRef.current = true
    }
  }, [initialData, resolvedInitial, form])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedCitySearch(citySearch.trim())
    }, 300)
    return () => clearTimeout(timeout)
  }, [citySearch])

  useEffect(() => {
    if (!watchedInstanceId) {
      lastInstanceRef.current = null
      setCitySearch("")
      setDebouncedCitySearch("")
      return
    }

    if (lastInstanceRef.current && lastInstanceRef.current !== watchedInstanceId) {
      form.setValue("audience_tags", [], { shouldDirty: true, shouldValidate: false })
      form.setValue("audience_tags_exclude", [], { shouldDirty: true, shouldValidate: false })
      form.setValue("audience_cities", [], { shouldDirty: true, shouldValidate: false })
      form.setValue("audience_bairros", [], { shouldDirty: true, shouldValidate: false })
      form.setValue("audience_ruas", [], { shouldDirty: true, shouldValidate: false })
      setCitySearch("")
      setDebouncedCitySearch("")
    }

    lastInstanceRef.current = watchedInstanceId
  }, [watchedInstanceId, form])
  const firstFormError = useMemo(
    () => findFirstErrorMessage(form.formState.errors as Record<string, unknown>),
    [form.formState.errors]
  )

  useEffect(() => {
    if (!scheduleEnabled) {
      const shouldDirty = !scheduleSyncRef.current
      form.setValue("scheduled_at", null, { shouldDirty, shouldValidate: true })
      if (scheduleSyncRef.current) {
        scheduleSyncRef.current = false
      }
      return
    }

    if (scheduleDate && scheduleTime) {
      const iso = dateTimeInTimeZoneToUtcIso(scheduleDate, scheduleTime)
      if (iso) {
        const shouldDirty = !scheduleSyncRef.current
        form.setValue("scheduled_at", iso, { shouldDirty, shouldValidate: true })
        if (scheduleSyncRef.current) {
          scheduleSyncRef.current = false
        }
      }
    }
  }, [scheduleEnabled, scheduleDate, scheduleTime, form])

  useEffect(() => {
    form.setValue("audience_source", audienceMode, { shouldDirty: true })
    if (audienceMode === "all") {
      form.setValue("audience_contact_ids", [], { shouldDirty: true })
      setImportedContacts([])
      setImportSummary(null)
      setImportError(null)
    } else {
      form.setValue("audience_tags", [], { shouldDirty: true, shouldValidate: false })
      form.setValue("audience_tags_exclude", [], { shouldDirty: true, shouldValidate: false })
      form.setValue("audience_cities", [], { shouldDirty: true, shouldValidate: false })
      form.setValue("audience_bairros", [], { shouldDirty: true, shouldValidate: false })
      form.setValue("audience_ruas", [], { shouldDirty: true, shouldValidate: false })
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
    if ((mediaType === "none" || mediaType === "link") && mediaUrl) {
      form.setValue("media_url", "", { shouldDirty: true, shouldValidate: true })
      setUploadError(null)
    }
  }, [mediaType, mediaUrl, form])

  useEffect(() => {
    if (mediaType === "link") {
      if (!linkPreview) {
        form.setValue("link_preview", true, { shouldDirty: true, shouldValidate: false })
      }
      return
    }
    if (linkPreview) {
      form.setValue("link_preview", false, { shouldDirty: true, shouldValidate: false })
    }
  }, [mediaType, linkPreview, form])

  useEffect(() => {
    if (mediaType === "audio" && watchValues.use_randomizer) {
      form.setValue("use_randomizer", false, { shouldDirty: true, shouldValidate: false })
    }
  }, [mediaType, watchValues.use_randomizer, form])

  useEffect(() => {
    if (!watchValues.use_composing) {
      if ((watchValues.typing_delay_seconds ?? 0) !== 0) {
        form.setValue("typing_delay_seconds", 0, { shouldDirty: true, shouldValidate: false })
      }
    } else if ((watchValues.typing_delay_seconds ?? 0) === 0) {
      form.setValue("typing_delay_seconds", 6, { shouldDirty: true, shouldValidate: false })
    }
  }, [watchValues.use_composing, watchValues.typing_delay_seconds, form])

  const linkUrl = useMemo(() => {
    if (!linkPreview && mediaType !== "link") return null
    const text = messageBody ?? ""
    const match = text.match(/https?:\/\/\S+/i)
    return match?.[0] ?? null
  }, [linkPreview, mediaType, messageBody])

  useEffect(() => {
    if (!linkUrl) {
      setLinkPreviewData(null)
      lastPreviewRef.current = null
      return
    }
    if (lastPreviewRef.current === linkUrl) {
      return
    }
    lastPreviewRef.current = linkUrl

    const controller = new AbortController()
    const timeout = setTimeout(() => {
      fetch(`/api/link-preview?url=${encodeURIComponent(linkUrl)}`, {
        signal: controller.signal
      })
        .then((res) => res.json())
        .then((data) => {
          setLinkPreviewData({
            url: linkUrl,
            title: data.title,
            description: data.description,
            image: data.image,
            siteName: data.siteName
          })
        })
        .catch(() => {
          setLinkPreviewData({ url: linkUrl })
        })
    }, 200)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [linkUrl])

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

  const scheduledIso = scheduleEnabled
    ? dateTimeInTimeZoneToUtcIso(scheduleDate, scheduleTime)
    : null

  const summary = {
    title: watchValues.title,
    instance: instances?.find((inst) => inst.id === watchValues.instance_id)?.name ?? "-",
    scheduled: scheduledIso ? formatDateTimeInTimeZone(scheduledIso) : "Sem agendamento",
    delay: `${watchValues.delay_min_seconds ?? 0}s - ${watchValues.delay_max_seconds ?? 0}s`,
    batch: watchValues.batch_size ?? 0,
    maxAttempts: watchValues.max_attempts ?? 0,
    useRandomizer: watchValues.use_randomizer
  }

  const contentOptions = [
    { value: "none", label: "Texto", icon: MessageSquare },
    { value: "link", label: "Link", icon: Link2 },
    { value: "image", label: "Imagem", icon: ImageIcon },
    { value: "audio", label: "Áudio", icon: Mic },
    { value: "video", label: "Vídeo", icon: Video },
    { value: "document", label: "Documento", icon: FileText }
  ]

  const audienceError = form.formState.errors.audience_contact_ids?.message

  return (
    <Form {...form}>
      <form
        className="grid gap-6 lg:grid-cols-[2fr_1fr]"
        onSubmit={form.handleSubmit(async (values) => {
          const payload: CampaignFormValues = { ...values }
          const shouldSchedule = scheduleEnabled && Boolean(scheduledIso)

          payload.timezone = DEFAULT_TIMEZONE
          payload.scheduled_at = scheduleEnabled ? scheduledIso : null

          if (scheduleEnabled && !scheduledIso) {
            form.setError("scheduled_at", {
              type: "manual",
              message: "Informe uma data e horário válidos"
            })
            return
          }

          if (audienceMode === "file" && (payload.audience_contact_ids ?? []).length === 0) {
            form.setError("audience_contact_ids", {
              type: "manual",
              message: "Importe a planilha para selecionar os contatos"
            })
            return
          }

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

          if (mode === "edit") {
            if (submitActionRef.current === "draft") {
              payload.status = "draft"
              payload.scheduled_at = null
            } else if (submitActionRef.current === "publish") {
              payload.status = shouldSchedule ? "scheduled" : "processing"
              if (!shouldSchedule) {
                payload.scheduled_at = null
              }
            }
          }

          await onSubmit(payload)
        })}
      >
        <div className="space-y-6">
          {submitError ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {submitError}
            </div>
          ) : form.formState.isSubmitted && firstFormError ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {firstFormError}
            </div>
          ) : null}
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
                            <Input
                              placeholder={DEFAULT_TIMEZONE}
                              readOnly
                              {...field}
                            />
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

              {audienceMode === "all" ? (
                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                    Selecione filtros para segmentar a base. Sem filtros, a campanha
                    será enviada para todos os contatos válidos da instância.
                  </div>

                  {!watchedInstanceId ? (
                    <p className="text-sm text-muted-foreground">
                      Selecione uma instância para carregar os filtros disponíveis.
                    </p>
                  ) : isFilterOptionsLoading ? (
                    <p className="text-sm text-muted-foreground">Carregando filtros...</p>
                  ) : (
                    <>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">Tags incluídas</p>
                            {audienceTags.length > 0 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => clearArrayValue("audience_tags")}
                              >
                                Limpar
                              </Button>
                            ) : null}
                          </div>
                          {tagIncludeOptions.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              Nenhuma tag cadastrada.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {tagIncludeOptions.map((tag) => (
                                <button
                                  key={`tag-${tag}`}
                                  type="button"
                                  className="focus:outline-none"
                                  onClick={() => toggleArrayValue("audience_tags", tag)}
                                >
                                  <Badge
                                    variant={audienceTags.includes(tag) ? "default" : "secondary"}
                                  >
                                    {tag}
                                  </Badge>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">Tags excluídas</p>
                            {audienceTagsExclude.length > 0 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => clearArrayValue("audience_tags_exclude")}
                              >
                                Limpar
                              </Button>
                            ) : null}
                          </div>
                          {tagExcludeOptions.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              Nenhuma tag cadastrada.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {tagExcludeOptions.map((tag) => (
                                <button
                                  key={`tag-exclude-${tag}`}
                                  type="button"
                                  className="focus:outline-none"
                                  onClick={() => toggleArrayValue("audience_tags_exclude", tag)}
                                >
                                  <Badge
                                    variant={
                                      audienceTagsExclude.includes(tag) ? "destructive" : "secondary"
                                    }
                                  >
                                    {tag}
                                  </Badge>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">Cidades</p>
                            {selectedCity ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setCitySelection("")}
                              >
                                Limpar
                              </Button>
                            ) : null}
                          </div>
                          <Input
                            placeholder="Buscar cidade..."
                            value={citySearch}
                            onChange={(event) => setCitySearch(event.target.value)}
                            className="h-9"
                          />
                          {selectedCity ? (
                            <p className="text-xs text-muted-foreground">
                              Cidade selecionada: <span className="font-medium">{selectedCity}</span>
                            </p>
                          ) : null}
                          <ScrollArea className="h-40 rounded-lg border bg-muted/30 p-3">
                            {filterOptions.cities.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                {debouncedCitySearch
                                  ? "Nenhuma cidade encontrada."
                                  : "Nenhuma cidade cadastrada."}
                              </p>
                            ) : (
                              <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={!selectedCity}
                                    onCheckedChange={() => setCitySelection("")}
                                  />
                                  <span>Todas as cidades</span>
                                </label>
                                {filterOptions.cities.map((city) => (
                                  <label key={city} className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                      checked={selectedCity === city}
                                      onCheckedChange={() => setCitySelection(city)}
                                    />
                                    <span>{city}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </ScrollArea>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">Bairros</p>
                            {selectedBairro ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setBairroSelection("")}
                              >
                                Limpar
                              </Button>
                            ) : null}
                          </div>
                          <ScrollArea className="h-40 rounded-lg border bg-muted/30 p-3">
                            {!selectedCity ? (
                              <p className="text-xs text-muted-foreground">
                                Selecione uma cidade para listar os bairros.
                              </p>
                            ) : filterOptions.bairros.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Nenhum bairro cadastrado para a cidade selecionada.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={!selectedBairro}
                                    onCheckedChange={() => setBairroSelection("")}
                                  />
                                  <span>Todos os bairros</span>
                                </label>
                                {filterOptions.bairros.map((bairro) => (
                                  <label key={bairro} className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                      checked={selectedBairro === bairro}
                                      onCheckedChange={() => setBairroSelection(bairro)}
                                    />
                                    <span>{bairro}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </ScrollArea>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">Ruas</p>
                            {selectedRua ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setRuaSelection("")}
                              >
                                Limpar
                              </Button>
                            ) : null}
                          </div>
                          <ScrollArea className="h-40 rounded-lg border bg-muted/30 p-3">
                            {!selectedCity ? (
                              <p className="text-xs text-muted-foreground">
                                Selecione uma cidade para listar as ruas.
                              </p>
                            ) : !selectedBairro ? (
                              <p className="text-xs text-muted-foreground">
                                Selecione um bairro para listar as ruas.
                              </p>
                            ) : filterOptions.ruas.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Nenhuma rua cadastrada para o bairro selecionado.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={!selectedRua}
                                    onCheckedChange={() => setRuaSelection("")}
                                  />
                                  <span>Todas as ruas</span>
                                </label>
                                {filterOptions.ruas.map((rua) => (
                                  <label key={rua} className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                      checked={selectedRua === rua}
                                      onCheckedChange={() => setRuaSelection(rua)}
                                    />
                                    <span>{rua}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </ScrollArea>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : null}

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

                  {audienceError ? (
                    <p className="text-sm text-destructive">{audienceError}</p>
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
                          if (option.value !== "none" && option.value !== "link") {
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

                {mediaType !== "none" && mediaType !== "link" ? (
                  <>
                    <FormItem>
                      <FormLabel>Arquivo da mídia (Supabase)</FormLabel>
                      <FormControl>
                        <Input
                          ref={mediaInputRef}
                          type="file"
                          accept={acceptTypes}
                          disabled={isUploading}
                          onChange={async (event) => {
                            const file = event.target.files?.[0]
                            if (!file) return
                            if (mediaType === "video" && file.size > MAX_VIDEO_BYTES) {
                              setUploadError(
                                "Vídeo acima de 64 MB. Envie um arquivo menor."
                              )
                              event.target.value = ""
                              return
                            }
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
                                error instanceof Error
                                  ? error.message
                                  : "Erro ao enviar mídia"
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
                  </>
                ) : null}
              </div>

              <FormField
                control={form.control}
                name="message_body"
                render={({ field }) => (
                  !isAudio ? (
                    <FormItem>
                      <FormLabel>
                        {mediaType && mediaType !== "none" && mediaType !== "link"
                          ? "Mensagem principal (opcional)"
                          : "Mensagem principal"}
                      </FormLabel>
                      <FormControl>
                        <WhatsAppMessageEditor
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Digite a mensagem"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  ) : (
                    <FormItem>
                      <FormLabel>Mensagem principal</FormLabel>
                      <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                        Áudio não usa texto. O envio será apenas com o arquivo de áudio.
                      </div>
                    </FormItem>
                  )
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

              {watchValues.use_composing ? (
                <FormField
                  control={form.control}
                  name="typing_delay_seconds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tempo de digitando (segundos)</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-3">
                          <Input
                            type="range"
                            min={1}
                            max={15}
                            step={1}
                            value={field.value ?? 6}
                            onChange={(event) => field.onChange(Number(event.target.value))}
                            className="h-2"
                          />
                          <span className="text-sm font-medium">{field.value ?? 6}s</span>
                        </div>
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Controla o tempo exibindo "digitando" antes do envio.
                      </p>
                    </FormItem>
                  )}
                />
              ) : null}
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
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isAudio}
                        />
                      </FormControl>
                      <FormLabel>Ativar</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              {isAudio ? (
                <p className="text-xs text-muted-foreground">
                  Randomizador indisponível para áudio.
                </p>
              ) : null}
              {form.formState.errors.variants?.message ? (
                <p className="text-xs text-destructive">
                  {String(form.formState.errors.variants.message)}
                </p>
              ) : null}

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
                                    <Input
                                      type="number"
                                      value={field.value ?? ""}
                                      onChange={(event) => {
                                        const value = event.target.value
                                        if (value === "") {
                                          field.onChange(undefined)
                                          return
                                        }
                                        const numeric = Number(value)
                                        field.onChange(Number.isNaN(numeric) ? value : numeric)
                                      }}
                                    />
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
            linkPreview={linkPreview || mediaType === "link"}
            linkPreviewData={linkPreviewData ?? undefined}
            useRandomizer={watchRandomizer}
            variants={watchValues.variants}
          />

          <Card>
            <div className="space-y-3">
              <h3 className="font-display text-lg font-semibold">Ações</h3>
              <p className="text-sm text-muted-foreground">
                Salve sua campanha ou volte depois.
              </p>
              {mode === "create" || canPublishFromDraft ? (
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
                  submitActionRef.current = mode === "edit" && !canPublishFromDraft ? "keep" : "publish"
                }}
              >
                {busy
                  ? "Salvando..."
                  : mode === "edit"
                    ? canPublishFromDraft
                      ? scheduleEnabled
                        ? "Agendar campanha"
                        : "Publicar campanha"
                      : "Salvar alterações"
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


