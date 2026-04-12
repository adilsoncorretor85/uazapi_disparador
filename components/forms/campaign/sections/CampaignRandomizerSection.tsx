import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"
import { useFormContext, useWatch, type FieldArrayWithId } from "react-hook-form"
import type { CampaignFormValues } from "@/lib/schemas/campaign"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel
} from "@/components/ui/form"
import { WhatsAppMessageEditor } from "@/components/common/whatsapp-message-editor"

interface CampaignRandomizerSectionProps {
  fields: FieldArrayWithId<CampaignFormValues, "variants", "fieldId">[]
  append: (value: CampaignFormValues["variants"][number]) => void
  remove: (index: number) => void
  move: (from: number, to: number) => void
  watchRandomizer: boolean
  isAudio: boolean
  variantError?: string | null
}

export function CampaignRandomizerSection({
  fields,
  append,
  remove,
  move,
  watchRandomizer,
  isAudio,
  variantError
}: CampaignRandomizerSectionProps) {
  const form = useFormContext<CampaignFormValues>()
  useWatch({ control: form.control, name: "variants" })

  const handleRemoveVariant = (index: number) => {
    remove(index)
    queueMicrotask(() => {
      void form.trigger("variants")
    })
  }

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Randomizador</h2>
            <p className="text-sm text-muted-foreground">Crie variantes de texto e distribua por peso.</p>
          </div>
          <FormField
            control={form.control}
            name="use_randomizer"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isAudio} />
                </FormControl>
                <FormLabel>Ativar</FormLabel>
              </FormItem>
            )}
          />
        </div>

        {isAudio ? <p className="text-xs text-muted-foreground">Randomizador indisponível para áudio.</p> : null}
        {variantError ? <p className="text-xs text-destructive">{variantError}</p> : null}

        {watchRandomizer ? (
          <div className="space-y-4">
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">Adicione variantes para ativar o randomizador.</p>
            ) : null}

            <div className="space-y-3">
              {fields.map((fieldItem, index) => (
                <div
                  key={fieldItem.fieldId ?? fieldItem.id ?? fieldItem.sort_order ?? index}
                  className="rounded-xl border bg-muted/30 p-4"
                >
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
                        onClick={() => handleRemoveVariant(index)}
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
                              value={field.value ?? ""}
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
  )
}
