import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"

interface WhatsAppPreviewProps {
  title?: string
  message: string
  mediaType?: string | null
  mediaUrl?: string | null
  linkPreview?: boolean
  linkPreviewData?: {
    url: string
    title?: string
    description?: string
    image?: string
    siteName?: string
  }
  useRandomizer?: boolean
  variants?: Array<{ message_body: string; is_active?: boolean }>
}

const SAMPLE_CONTACT = {
  first_name: "Eduardo",
  full_name: "Eduardo Dias"
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Bom dia"
  if (hour < 18) return "Boa tarde"
  return "Boa noite"
}

function applyVariables(text: string) {
  return text
    .replace(/{{\s*saudacao\s*}}/gi, getGreeting())
    .replace(/{{\s*primeiro_nome\s*}}/gi, SAMPLE_CONTACT.first_name)
    .replace(/{{\s*nome_completo\s*}}/gi, SAMPLE_CONTACT.full_name)
}

function parseInline(text: string, keyPrefix: string) {
  const nodes: ReactNode[] = []
  let buffer = ""
  let i = 0

  const pushBuffer = (key: string) => {
    if (buffer) {
      nodes.push(<span key={`${keyPrefix}-t-${key}`}>{buffer}</span>)
      buffer = ""
    }
  }

  while (i < text.length) {
    if (text.startsWith("```", i)) {
      const end = text.indexOf("```", i + 3)
      if (end !== -1) {
        pushBuffer(String(i))
        const content = text.slice(i + 3, end)
        nodes.push(
          <span
            key={`${keyPrefix}-code-${i}`}
            className="rounded bg-black/5 px-1 py-0.5 font-mono text-[12px]"
          >
            {content}
          </span>
        )
        i = end + 3
        continue
      }
    }

    const marker = text[i]
    if (marker === "*" || marker === "_" || marker === "~") {
      const end = text.indexOf(marker, i + 1)
      if (end !== -1) {
        pushBuffer(String(i))
        const content = text.slice(i + 1, end)
        const key = `${keyPrefix}-${marker}-${i}`
        if (marker === "*") {
          nodes.push(<strong key={key}>{content}</strong>)
        } else if (marker === "_") {
          nodes.push(<em key={key}>{content}</em>)
        } else {
          nodes.push(<s key={key}>{content}</s>)
        }
        i = end + 1
        continue
      }
    }

    buffer += text[i]
    i += 1
  }

  pushBuffer(String(i))
  return nodes
}

function renderWhatsAppText(text: string) {
  const withVars = applyVariables(text)
  const lines = withVars.split("\n")
  const nodes: ReactNode[] = []

  lines.forEach((line, index) => {
    nodes.push(...parseInline(line, `line-${index}`))
    if (index < lines.length - 1) {
      nodes.push(<br key={`br-${index}`} />)
    }
  })

  return nodes
}

function extractFirstUrl(text: string) {
  const match = text.match(/https?:\/\/\S+/i)
  return match?.[0] ?? null
}

function getDomain(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./i, "")
  } catch {
    return url
  }
}

export function WhatsAppPreview({
  title = "Visualização",
  message,
  mediaType,
  mediaUrl,
  linkPreview,
  linkPreviewData,
  useRandomizer,
  variants
}: WhatsAppPreviewProps) {
  const hasMessage = Boolean(message?.trim())
  const baseMessage = hasMessage ? message : "Sua mensagem aparecerá aqui."
  const activeVariants =
    useRandomizer && variants?.length
      ? variants.filter((variant) => variant.is_active !== false)
      : []

  const showMedia = Boolean(mediaUrl && mediaType !== "none")
  const showPlaceholder = !hasMessage && !showMedia
  const hasLinkPreview =
    Boolean(linkPreview) && /https?:\/\//i.test(hasMessage ? message : baseMessage)
  const previewUrl =
    linkPreviewData?.url ??
    (hasLinkPreview ? extractFirstUrl(hasMessage ? message : baseMessage) : null)
  const previewDomain = previewUrl ? getDomain(previewUrl) : null
  const previewTitle =
    linkPreviewData?.title || linkPreviewData?.siteName || previewDomain || "Link"
  const previewDescription = linkPreviewData?.description
  const previewImage = linkPreviewData?.image

  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">{SAMPLE_CONTACT.full_name}</p>
          </div>
          <div className="text-xs text-muted-foreground">WhatsApp</div>
        </div>
      </div>

      <div className="bg-[#efe7dd] px-4 py-5">
        <div className="space-y-3">
          {showMedia ? (
            <div className="max-w-[85%] overflow-hidden rounded-2xl bg-white shadow-sm">
              {mediaType === "image" ? (
                <img src={mediaUrl ?? ""} alt="Preview" className="h-48 w-full object-cover" />
              ) : (
                <div className="p-3 text-xs text-muted-foreground">
                  {mediaType?.toUpperCase()} anexado
                </div>
              )}
              {hasMessage ? (
                <div className="px-3 pb-2 pt-2 text-sm text-[#222]">
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {renderWhatsAppText(baseMessage)}
                  </div>
                </div>
              ) : null}
              <div className="px-3 pb-2 text-right text-[10px] text-muted-foreground">10:01</div>
            </div>
          ) : (
            <div className="max-w-[85%] rounded-2xl bg-white px-3 py-2 text-sm shadow-sm">
              {hasLinkPreview ? (
                <div className="mb-2 overflow-hidden rounded-lg border">
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="h-28 w-full object-cover" />
                  ) : (
                    <div className="flex h-20 items-center justify-center bg-black/5 text-[11px] text-muted-foreground">
                      Previa do link
                    </div>
                  )}
                  <div className="space-y-1 px-2 py-1">
                    {previewTitle ? (
                      <p className="text-[11px] font-semibold text-[#222]">{previewTitle}</p>
                    ) : null}
                    {previewDescription ? (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {previewDescription}
                      </p>
                    ) : null}
                    {previewUrl ? (
                      <p className="text-[10px] text-muted-foreground">{previewUrl}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <div className="whitespace-pre-wrap leading-relaxed text-[#222]">
                {renderWhatsAppText(showPlaceholder ? baseMessage : message)}
              </div>
              <div className="mt-2 text-right text-[10px] text-muted-foreground">10:01</div>
            </div>
          )}

          {activeVariants.length > 0 ? (
            <div className="space-y-2">
              {activeVariants.slice(0, 3).map((variant, index) => (
                <div
                  key={`variant-${index}`}
                  className="max-w-[85%] rounded-2xl border border-dashed border-emerald-400/60 bg-white px-3 py-2 text-sm shadow-sm"
                >
                  <p className="text-[10px] uppercase text-emerald-600">
                    Variante {index + 1}
                  </p>
                  <div className="whitespace-pre-wrap leading-relaxed text-[#222]">
                    {renderWhatsAppText(variant.message_body)}
                  </div>
                </div>
              ))}
              {activeVariants.length > 3 ? (
                <p className="text-xs text-muted-foreground">
                  +{activeVariants.length - 3} variantes adicionais
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
