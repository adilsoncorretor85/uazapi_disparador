import type { RefObject } from "react"
import { useFormContext } from "react-hook-form"
import {
  MessageSquare,
  Image as ImageIcon,
  Mic,
  Video,
  FileText,
  Link2,
  Trash2,
  UploadCloud
} from "lucide-react"
import type { CampaignFormValues } from "@/lib/schemas/campaign"
import { cn } from "@/lib/utils"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { WhatsAppMessageEditor } from "@/components/common/whatsapp-message-editor"

interface CampaignContentSectionProps {
  mediaType: string
  isAudio: boolean
  mediaInputRef: RefObject<HTMLInputElement>
  acceptTypes: string
  isUploading: boolean
  uploadError: string | null
  onMediaTypeChange: (value: string) => void
  onFileSelected: (file: File) => void
  onRemoveMedia: () => void
}

const CONTENT_OPTIONS = [
  { value: "none", label: "Texto", icon: MessageSquare },
  { value: "link", label: "Link", icon: Link2 },
  { value: "image", label: "Imagem", icon: ImageIcon },
  { value: "audio", label: "Áudio", icon: Mic },
  { value: "video", label: "Vídeo", icon: Video },
  { value: "document", label: "Documento", icon: FileText }
]

export function CampaignContentSection({
  mediaType,
  isAudio,
  mediaInputRef,
  acceptTypes,
  isUploading,
  uploadError,
  onMediaTypeChange,
  onFileSelected,
  onRemoveMedia
}: CampaignContentSectionProps) {
  const form = useFormContext<CampaignFormValues>()
  const mediaUrl = form.watch("media_url") ?? ""
  const hasVideo = mediaType === "video" && Boolean(mediaUrl)
  const showMediaFields = mediaType !== "none" && mediaType !== "link"

  return (
    <Card>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="media_type"
          render={({ field }) => (
            <input
              type="hidden"
              value={field.value ?? "none"}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
            />
          )}
        />
        <div>
          <h2 className="font-display text-lg font-semibold">Conteúdo da mensagem</h2>
          <p className="text-sm text-muted-foreground">Configure texto principal e mídia.</p>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            {CONTENT_OPTIONS.map((option) => {
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
                  onClick={() => onMediaTypeChange(option.value)}
                >
                  <Icon className="h-5 w-5" />
                  <span>{option.label}</span>
                </button>
              )
            })}
          </div>

          {showMediaFields ? (
            <>
              {mediaType === "video" ? (
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Vídeo anexado</p>
                      <p className="text-xs text-muted-foreground">
                        {hasVideo
                          ? "Reproduza, substitua ou remova o vídeo atual."
                          : "Nenhum vídeo anexado ainda."}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isUploading}
                        onClick={() => mediaInputRef.current?.click()}
                      >
                        <UploadCloud className="mr-2 h-4 w-4" />
                        {hasVideo ? "Trocar vídeo" : "Anexar vídeo"}
                      </Button>
                      {hasVideo ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={isUploading}
                          onClick={onRemoveMedia}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 overflow-hidden rounded-lg border bg-black/90">
                    {hasVideo ? (
                      <video
                        src={mediaUrl}
                        className="h-56 w-full"
                        controls
                        preload="metadata"
                      />
                    ) : (
                      <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
                        Nenhum vídeo carregado.
                      </div>
                    )}
                  </div>

                  {isUploading ? (
                    <p className="mt-3 text-xs text-muted-foreground">Enviando arquivo...</p>
                  ) : null}
                  {uploadError ? (
                    <p className="mt-2 text-xs text-destructive">{uploadError}</p>
                  ) : null}
                </div>
              ) : null}

              <FormItem className={mediaType === "video" ? "sr-only" : undefined}>
                <FormLabel>Arquivo da mídia (Supabase)</FormLabel>
                <FormControl>
                  <Input
                    ref={mediaInputRef}
                    type="file"
                    accept={acceptTypes}
                    disabled={isUploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      onFileSelected(file)
                    }}
                  />
                </FormControl>
                {mediaType !== "video" && isUploading ? (
                  <p className="text-xs text-muted-foreground">Enviando arquivo...</p>
                ) : null}
                {mediaType !== "video" && uploadError ? (
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
                      <Input
                        placeholder="URL gerada automaticamente"
                        readOnly
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          ) : null}

          <FormField
            control={form.control}
            name="message_body"
            render={({ field }) =>
              !isAudio ? (
                <FormItem>
                  <FormLabel>
                    {mediaType && mediaType !== "none" && mediaType !== "link"
                      ? "Mensagem principal (opcional)"
                      : "Mensagem principal"}
                  </FormLabel>
                  <FormControl>
                    <WhatsAppMessageEditor
                      value={field.value ?? ""}
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
            }
          />
        </div>
      </div>
    </Card>
  )
}

