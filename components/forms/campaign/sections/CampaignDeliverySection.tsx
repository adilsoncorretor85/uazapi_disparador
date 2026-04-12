import { useFormContext } from "react-hook-form"
import type { CampaignFormValues } from "@/lib/schemas/campaign"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card } from "@/components/ui/card"

interface CampaignDeliverySectionProps {
  showTypingDelay: boolean
}

export function CampaignDeliverySection({ showTypingDelay }: CampaignDeliverySectionProps) {
  const form = useFormContext<CampaignFormValues>()

  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Configuração de envio</h2>
          <p className="text-sm text-muted-foreground">Ajuste delays, batches e comportamento.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <FormField
            control={form.control}
            name="delay_min_seconds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delay mínimo (s)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} value={field.value ?? ""} />
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
                  <Input type="number" {...field} value={field.value ?? ""} />
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
                <FormLabel>Enviar &quot;digitando&quot;</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="batch_size"
          render={({ field }) => <input type="hidden" {...field} value={field.value ?? ""} />}
        />
        <FormField
          control={form.control}
          name="max_attempts"
          render={({ field }) => <input type="hidden" {...field} value={field.value ?? ""} />}
        />

        {showTypingDelay ? (
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
                  Controla o tempo exibindo &quot;digitando&quot; antes do envio.
                </p>
              </FormItem>
            )}
          />
        ) : null}
      </div>
    </Card>
  )
}
