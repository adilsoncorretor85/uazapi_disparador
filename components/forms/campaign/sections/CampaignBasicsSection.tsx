import { useFormContext } from "react-hook-form"
import type { CampaignFormValues } from "@/lib/schemas/campaign"
import type { WhatsAppInstance } from "@/types/entities"
import { cn } from "@/lib/utils"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select"
import { Card } from "@/components/ui/card"

interface CampaignBasicsSectionProps {
  instances?: WhatsAppInstance[]
  scheduleMode: "now" | "schedule"
  onScheduleModeChange: (mode: "now" | "schedule") => void
  scheduleEnabled: boolean
  scheduleDate: string
  scheduleTime: string
  onScheduleDateChange: (value: string) => void
  onScheduleTimeChange: (value: string) => void
  timezonePlaceholder: string
}

export function CampaignBasicsSection({
  instances,
  scheduleMode,
  onScheduleModeChange,
  scheduleEnabled,
  scheduleDate,
  scheduleTime,
  onScheduleDateChange,
  onScheduleTimeChange,
  timezonePlaceholder
}: CampaignBasicsSectionProps) {
  const form = useFormContext<CampaignFormValues>()

  return (
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
                    {instances && instances.length > 0 ? (
                      instances.map((instance) => (
                        <SelectItem key={instance.id} value={String(instance.id)}>
                          {instance.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__none__" disabled>
                        Nenhuma instância conectada
                      </SelectItem>
                    )}
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
              onClick={() => onScheduleModeChange("now")}
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
              onClick={() => onScheduleModeChange("schedule")}
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
                    onChange={(event) => onScheduleDateChange(event.target.value)}
                  />
                </FormControl>
              </FormItem>
              <FormItem>
                <FormLabel>Horário</FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(event) => onScheduleTimeChange(event.target.value)}
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
                      <Input placeholder={timezonePlaceholder} readOnly {...field} />
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
  )
}
