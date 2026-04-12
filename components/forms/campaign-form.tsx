"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { AlertCircle } from "lucide-react"

import {
  campaignFormSchema,
  type CampaignFormValues
} from "@/lib/schemas/campaign"
import { fetchInstances } from "@/lib/services/instances"
import { fetchContactFilterOptions, importContacts } from "@/lib/services/contacts"
import { uploadMedia } from "@/lib/services/storage"
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { WhatsAppPreview } from "@/components/common/whatsapp-preview"
import { CampaignBasicsSection } from "@/components/forms/campaign/sections/CampaignBasicsSection"
import { CampaignAudienceSection } from "@/components/forms/campaign/sections/CampaignAudienceSection"
import { CampaignContentSection } from "@/components/forms/campaign/sections/CampaignContentSection"
import { CampaignDeliverySection } from "@/components/forms/campaign/sections/CampaignDeliverySection"
import { CampaignRandomizerSection } from "@/components/forms/campaign/sections/CampaignRandomizerSection"
import { CampaignSummarySection } from "@/components/forms/campaign/sections/CampaignSummarySection"
import {
  DEFAULT_TIMEZONE,
  dateTimeInTimeZoneToUtcIso,
  formatDateTimeInTimeZone,
  splitDateTimeInTimeZone
} from "@/components/forms/campaign/helpers/date-time"
import { parseContactsTemplate } from "@/components/forms/campaign/helpers/import-template"
import { findFirstErrorMessage } from "@/components/forms/campaign/helpers/form-errors"
import { normalizeCampaignFormValues } from "@/components/forms/campaign/helpers/normalize"
import { applySubmitIntent } from "@/components/forms/campaign/helpers/submit"
import { getAcceptTypes, MAX_VIDEO_BYTES } from "@/components/forms/campaign/helpers/content"
import { useLinkPreview } from "@/components/forms/campaign/hooks/useLinkPreview"
import { isInstanceConnected } from "@/lib/utils/instance-connection"

type AudienceContact = {
  id: string
  whatsapp_e164: string
  first_name?: string | null
  full_name?: string | null
}

interface CampaignFormProps {
  initialData?: CampaignFormValues
  initialImportedContacts?: AudienceContact[]
  onSubmit: (values: CampaignFormValues) => Promise<void>
  mode?: "create" | "edit"
  isSubmitting?: boolean
  submitError?: string | null
  allowPublishFromDraft?: boolean
}

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
  delay_min_seconds: 60,
  delay_max_seconds: 180,
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

function inferMediaTypeFromUrl(url?: string | null) {
  if (!url) return null
  const clean = url.split("?")[0]
  const ext = clean.split(".").pop()?.toLowerCase()
  if (!ext) return null
  if (["mp4", "mov", "webm", "m4v"].includes(ext)) return "video"
  if (["mp3", "wav", "ogg", "m4a", "aac"].includes(ext)) return "audio"
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image"
  if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)) return "document"
  return null
}

export function CampaignForm({
  initialData,
  initialImportedContacts,
  onSubmit,
  mode = "create",
  isSubmitting,
  submitError,
  allowPublishFromDraft
}: CampaignFormProps) {
  const resolvedInitial = useMemo(() => {
  if (!initialData) return defaultValues
  const rawMediaType = initialData.media_type ?? "none"
  const inferred = inferMediaTypeFromUrl(initialData.media_url ?? null)
  const normalizedMediaType =
    rawMediaType && rawMediaType !== "text"
      ? rawMediaType
      : initialData.link_preview
        ? "link"
        : inferred ?? "none"

  return {
    ...defaultValues,
    ...initialData,
    message_body: initialData.message_body ?? "",
    timezone: DEFAULT_TIMEZONE,
    media_type: normalizedMediaType
  }
}, [initialData])
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: resolvedInitial,
    shouldUnregister: true
  })

  const hasInitializedRef = useRef(false)

  const submitActionRef = useRef<"publish" | "draft" | "keep">("publish")
  const mediaInputRef = useRef<HTMLInputElement | null>(null)
  const initialSchedule = splitDateTimeInTimeZone(initialData?.scheduled_at ?? null)
  const initialScheduleExpired = Boolean(
    initialData?.scheduled_at && new Date(initialData.scheduled_at).getTime() <= Date.now()
  )
  const [scheduleMode, setScheduleMode] = useState<"now" | "schedule">(
    initialScheduleExpired ? "now" : initialData?.scheduled_at ? "schedule" : "now"
  )
  const [scheduleDate, setScheduleDate] = useState(
    initialScheduleExpired ? "" : initialSchedule.date
  )
  const [scheduleTime, setScheduleTime] = useState(
    initialScheduleExpired ? "" : initialSchedule.time
  )
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
  const [importedContacts, setImportedContacts] = useState<AudienceContact[]>([])
  const [defaultDdd, setDefaultDdd] = useState("47")

  const handleRemoveImportedContact = (contactId: string) => {
    const next = importedContacts.filter((contact) => contact.id !== contactId)
    setImportedContacts(next)
    form.setValue(
      "audience_contact_ids",
      next.map((contact) => contact.id),
      { shouldDirty: true, shouldValidate: true }
    )
  }

  const { fields, append, remove, move, replace } = useFieldArray({
    control: form.control,
    name: "variants",
    keyName: "fieldId"
  })

  const watchedInstanceId = form.watch("instance_id")
  const [citySearch, setCitySearch] = useState("")
  const [debouncedCitySearch, setDebouncedCitySearch] = useState("")
  const lastInstanceRef = useRef<string | null>(null)

  const { data: instancesResponse } = useQuery({
    queryKey: ["instances"],
    queryFn: () => fetchInstances()
  })

  const allInstances = useMemo(() => instancesResponse?.data ?? [], [instancesResponse?.data])
  const connectedInstances = useMemo(
    () => allInstances.filter((instance) => isInstanceConnected(instance.conexao_w)),
    [allInstances]
  )
  const selectableInstances = useMemo(() => {
    if (mode === "create") return connectedInstances
    return allInstances
  }, [allInstances, connectedInstances, mode])
  const watchValues = form.watch()
  const watchRandomizer = watchValues.use_randomizer
  const messageBody = watchValues.message_body ?? ""
  const mediaUrl = watchValues.media_url
  const mediaType =
    form.watch("media_type", resolvedInitial.media_type ?? "none") ??
    resolvedInitial.media_type ??
    "none"
  const linkPreview = watchValues.link_preview
  const isAudio = mediaType === "audio"
  const { data: linkPreviewData } = useLinkPreview({
    text: messageBody ?? "",
    enabled: linkPreview || mediaType === "link"
  })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const busy = isSubmitting ?? form.formState.isSubmitting
  const scheduleEnabled = scheduleMode === "schedule"
  const currentStatus = resolvedInitial.status ?? "draft"
  const canPublishFromDraft =
    mode === "edit" && (allowPublishFromDraft ?? currentStatus === "draft")
  const audienceTags = watchValues.audience_tags ?? []
  const audienceTagsExclude = watchValues.audience_tags_exclude ?? []
  const audienceCities = watchValues.audience_cities ?? []
  const audienceBairros = watchValues.audience_bairros ?? []
  const audienceRuas = watchValues.audience_ruas ?? []
  const selectedCity = audienceCities[0] ?? ""
  const selectedBairro = audienceBairros[0] ?? ""
  const selectedRua = audienceRuas[0] ?? ""

  const {
    data: contactFilterResponse,
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

  const filterOptions = contactFilterResponse?.data ?? {
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
      replace(resolvedInitial.variants ?? [])
      const schedule = splitDateTimeInTimeZone(initialData.scheduled_at ?? null)
      const scheduleExpired = Boolean(
        initialData.scheduled_at && new Date(initialData.scheduled_at).getTime() <= Date.now()
      )
      setScheduleMode(scheduleExpired ? "now" : initialData.scheduled_at ? "schedule" : "now")
      setScheduleDate(scheduleExpired ? "" : schedule.date)
      setScheduleTime(scheduleExpired ? "" : schedule.time)
      scheduleSyncRef.current = true
      setAudienceMode(initialData.audience_source ?? "all")
      if (initialImportedContacts && initialImportedContacts.length) {
        setImportedContacts(initialImportedContacts)
        form.setValue(
          "audience_contact_ids",
          initialImportedContacts.map((contact) => contact.id),
          { shouldDirty: false, shouldValidate: false }
        )
        setAudienceMode("file")
      } else {
        setImportedContacts([])
      }
      hasInitializedRef.current = true
    }
  }, [initialData, initialImportedContacts, resolvedInitial, form, replace])

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

  useEffect(() => {
    if (mode !== "create") return
    if (!watchedInstanceId) return
    const allowed = connectedInstances.some((instance) => instance.id === watchedInstanceId)
    if (!allowed) {
      form.setValue("instance_id", "", { shouldDirty: true, shouldValidate: true })
      form.setError("instance_id", {
        type: "manual",
        message: "Selecione uma instância conectada."
      })
    }
  }, [mode, watchedInstanceId, connectedInstances, form])
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

  const acceptTypes = getAcceptTypes(mediaType)

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


  const handleImportFile = async (file: File) => {
    setImporting(true)
    setImportError(null)
    try {
      const instanceId = form.getValues("instance_id")
      if (!instanceId) {
        throw new Error("Selecione uma instância antes de importar.")
      }

      const parsed = await parseContactsTemplate(file)
      const totalRows = parsed.totalRows
      if (parsed.rows.length === 0) {
        throw new Error("Nenhum número válido encontrado no arquivo.")
      }

      const result = await importContacts(parsed.rows, instanceId, defaultDdd)
      const payload = result.data
      setImportSummary({
        total: totalRows,
        inserted: payload.inserted,
        ignored: payload.ignored + Math.max(0, totalRows - parsed.rows.length)
      })
      setImportedContacts(payload.contacts)
      setAudienceMode("file")
      form.setValue(
        "audience_contact_ids",
        payload.contacts.map((contact) => contact.id),
        { shouldDirty: true, shouldValidate: false }
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao importar contatos"
      setImportError(message)
    } finally {
      setImporting(false)
    }
  }

  const handleMediaTypeChange = (value: string) => {
    form.setValue("media_type", value, {
      shouldDirty: true,
      shouldValidate: true
    })
    if (value !== "none" && value !== "link") {
      setTimeout(() => mediaInputRef.current?.click(), 0)
    }
  }

  const handleFileSelected = async (file: File) => {
    if (mediaType === "video" && file.size > MAX_VIDEO_BYTES) {
      setUploadError("Vídeo acima de 64 MB. Envie um arquivo menor.")
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
      const message = error instanceof Error ? error.message : "Erro ao enviar mídia"
      setUploadError(message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveMedia = () => {
    form.setValue("media_url", "", {
      shouldDirty: true,
      shouldValidate: true
    })
    setUploadError(null)
    if (mediaInputRef.current) {
      mediaInputRef.current.value = ""
    }
  }
  const scheduledIso = scheduleEnabled
    ? dateTimeInTimeZoneToUtcIso(scheduleDate, scheduleTime)
    : null

  const summary = {
    title: watchValues.title,
    instanceName:
      allInstances.find((inst) => inst.id === watchValues.instance_id)?.name ?? "-",
    scheduledLabel: scheduledIso
      ? formatDateTimeInTimeZone(scheduledIso)
      : "Sem agendamento",
    delayLabel: `${watchValues.delay_min_seconds ?? 0}s - ${watchValues.delay_max_seconds ?? 0}s`,
    useRandomizer: watchValues.use_randomizer
  }

  const audienceError = form.formState.errors.audience_contact_ids?.message

  return (
    <Form {...form}>
      <form
        className="grid gap-6 lg:grid-cols-[2fr_1fr]"
        onSubmit={form.handleSubmit(async (values) => {
          const normalized = normalizeCampaignFormValues(values)
          if (scheduleEnabled && !scheduledIso) {
            form.setError("scheduled_at", {
              type: "manual",
              message: "Informe uma data e horário válidos"
            })
            return
          }

          if (audienceMode === "file" && (normalized.audience_contact_ids ?? []).length === 0) {
            form.setError("audience_contact_ids", {
              type: "manual",
              message: "Importe a planilha para selecionar os contatos"
            })
            return
          }

          const payload = applySubmitIntent(normalized, {
            intent: submitActionRef.current,
            mode,
            scheduleEnabled,
            scheduledIso
          })

          if (payload.status === "scheduled") {
            const target = scheduleEnabled ? scheduledIso : null
            const isPast = target ? new Date(target).getTime() <= Date.now() : !scheduleEnabled
            if (isPast) {
              payload.status = "processing"
              payload.scheduled_at = null
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

          <CampaignBasicsSection
            instances={selectableInstances}
            scheduleMode={scheduleMode}
            onScheduleModeChange={setScheduleMode}
            scheduleEnabled={scheduleEnabled}
            scheduleDate={scheduleDate}
            scheduleTime={scheduleTime}
            onScheduleDateChange={setScheduleDate}
            onScheduleTimeChange={setScheduleTime}
            timezonePlaceholder={DEFAULT_TIMEZONE}
          />

          <CampaignAudienceSection
            audienceMode={audienceMode}
            onAudienceModeChange={setAudienceMode}
            watchedInstanceId={watchedInstanceId}
            isFilterOptionsLoading={isFilterOptionsLoading}
            filterOptions={filterOptions}
            tagIncludeOptions={tagIncludeOptions}
            tagExcludeOptions={tagExcludeOptions}
            audienceTags={audienceTags}
            audienceTagsExclude={audienceTagsExclude}
            citySearch={citySearch}
            onCitySearchChange={setCitySearch}
            debouncedCitySearch={debouncedCitySearch}
            selectedCity={selectedCity}
            selectedBairro={selectedBairro}
            selectedRua={selectedRua}
            onClearField={clearArrayValue}
            onToggleField={toggleArrayValue}
            onCitySelect={setCitySelection}
            onBairroSelect={setBairroSelection}
            onRuaSelect={setRuaSelection}
            defaultDdd={defaultDdd}
            onDefaultDddChange={setDefaultDdd}
            onImportFile={handleImportFile}
            importing={importing}
            importError={importError}
            importSummary={importSummary}
            importedContacts={importedContacts}
            onRemoveContact={handleRemoveImportedContact}
            audienceError={audienceError ? String(audienceError) : null}
          />

          <CampaignContentSection
            mediaType={mediaType ?? "none"}
            isAudio={isAudio}
            mediaInputRef={mediaInputRef}
            acceptTypes={acceptTypes}
            isUploading={isUploading}
            uploadError={uploadError}
            onMediaTypeChange={handleMediaTypeChange}
            onFileSelected={handleFileSelected}
            onRemoveMedia={handleRemoveMedia}
          />

          <CampaignDeliverySection showTypingDelay={watchValues.use_composing} />

          <CampaignRandomizerSection
            fields={fields}
            append={append}
            remove={remove}
            move={move}
            watchRandomizer={watchRandomizer}
            isAudio={isAudio}
            variantError={form.formState.errors.variants?.message ? String(form.formState.errors.variants.message) : null}
          />

          <CampaignSummarySection
            title={summary.title}
            instanceName={summary.instanceName}
            scheduledLabel={summary.scheduledLabel}
            timezone={watchValues.timezone ?? DEFAULT_TIMEZONE}
            delayLabel={summary.delayLabel}
            useRandomizer={summary.useRandomizer}
            variantCount={fields.length}
          />
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
                      const normalized = normalizeCampaignFormValues(values)
                      const payload = applySubmitIntent(normalized, {
                        intent: "draft",
                        mode,
                        scheduleEnabled: false,
                        scheduledIso: null
                      })
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





















