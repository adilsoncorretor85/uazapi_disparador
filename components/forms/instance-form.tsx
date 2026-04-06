"use client"

import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { instanceFormSchema, type InstanceFormValues } from "@/lib/schemas/instance"

interface InstanceFormProps {
  defaultValues?: InstanceFormValues
  onSubmit: (values: InstanceFormValues) => Promise<void>
  submitLabel?: string
}

const initialValues: InstanceFormValues = {
  name: "",
  instance_name: "",
  owner_number: "",
  descricao: "",
  cep: "",
  rua: "",
  bairro: "",
  numero_residencia: "",
  complemento: "",
  cidade: "",
  estado: "",
  campanha_pause: false,
  campanha_horario_pause: null,
  campanha_horario_reinicio: null,
  is_active: true,
  throttle_per_minute: 60
}

const normalizeCep = (value: string) => value.replace(/\D/g, "").slice(0, 8)

export function InstanceForm({ defaultValues, onSubmit, submitLabel }: InstanceFormProps) {
  const form = useForm<InstanceFormValues>({
    resolver: zodResolver(instanceFormSchema),
    defaultValues: defaultValues ?? initialValues
  })

  const cep = useWatch({ control: form.control, name: "cep" })
  const pauseCampaigns = useWatch({ control: form.control, name: "campanha_pause" })
  const pauseTime = useWatch({ control: form.control, name: "campanha_horario_pause" })
  const resumeTime = useWatch({ control: form.control, name: "campanha_horario_reinicio" })
  const throttleValue = useWatch({ control: form.control, name: "throttle_per_minute" })
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState<string | null>(null)
  const [throttleEnabled, setThrottleEnabled] = useState(
    () => (defaultValues?.throttle_per_minute ?? initialValues.throttle_per_minute) != null
  )

  useEffect(() => {
    form.reset(defaultValues ?? initialValues)
    setThrottleEnabled(
      (defaultValues?.throttle_per_minute ?? initialValues.throttle_per_minute) != null
    )
  }, [defaultValues, form])

  useEffect(() => {
    const normalized = cep ? normalizeCep(cep) : ""
    if (normalized.length !== 8) {
      setCepError(null)
      return
    }

    let active = true
    setCepLoading(true)
    setCepError(null)

    fetch(`https://viacep.com.br/ws/${normalized}/json/`)
      .then((response) => response.json())
      .then((data) => {
        if (!active) return
        if (data?.erro) {
          setCepError("CEP nao encontrado")
          return
        }
        form.setValue("rua", data?.logradouro ?? "")
        form.setValue("bairro", data?.bairro ?? "")
        form.setValue("cidade", data?.localidade ?? "")
        form.setValue("estado", data?.uf ?? "")
      })
      .catch(() => {
        if (active) {
          setCepError("Falha ao consultar CEP")
        }
      })
      .finally(() => {
        if (active) setCepLoading(false)
      })

    return () => {
      active = false
    }
  }, [cep, form])

  useEffect(() => {
    if (!throttleEnabled) {
      form.setValue("throttle_per_minute", null)
    } else if (throttleValue == null) {
      form.setValue("throttle_per_minute", 60)
    }
  }, [throttleEnabled, throttleValue, form])

  useEffect(() => {
    if (!pauseCampaigns) {
      if (pauseTime !== null) {
        form.setValue("campanha_horario_pause", null)
      }
      if (resumeTime !== null) {
        form.setValue("campanha_horario_reinicio", null)
      }
      return
    }
    if (!pauseTime) {
      form.setValue("campanha_horario_pause", "20:00")
    }
    if (!resumeTime) {
      form.setValue("campanha_horario_reinicio", "07:00")
    }
  }, [pauseCampaigns, pauseTime, resumeTime, form])

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="instance_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da instancia</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="owner_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numero do dono</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descricao</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="cep"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CEP</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    inputMode="numeric"
                    placeholder="Somente numeros"
                    onBlur={(event) => {
                      const normalized = normalizeCep(event.target.value)
                      form.setValue("cep", normalized)
                      field.onBlur()
                    }}
                  />
                </FormControl>
                <FormDescription>
                  {cepLoading
                    ? "Consultando CEP..."
                    : cepError
                      ? cepError
                      : "Digite o CEP para preencher o endereco automaticamente."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rua"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rua</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="bairro"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bairro</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cidade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cidade</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="estado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="numero_residencia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numero</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="complemento"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Complemento</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="campanha_pause"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel>Pausar campanhas</FormLabel>
              </FormItem>
            )}
          />
          {pauseCampaigns ? (
            <FormField
              control={form.control}
              name="campanha_horario_pause"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horario de pausa</FormLabel>
                  <FormControl>
                    <Select value={field.value ?? "20:00"} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="17:00">17h</SelectItem>
                        <SelectItem value="18:00">18h</SelectItem>
                        <SelectItem value="19:00">19h</SelectItem>
                        <SelectItem value="20:00">20h</SelectItem>
                        <SelectItem value="21:00">21h</SelectItem>
                        <SelectItem value="22:00">22h</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />
          ) : null}
        </div>

        {pauseCampaigns ? (
          <FormField
            control={form.control}
            name="campanha_horario_reinicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horario de reinicio</FormLabel>
                <FormControl>
                  <Select value={field.value ?? "07:00"} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="07:00">07h</SelectItem>
                      <SelectItem value="08:00">08h</SelectItem>
                      <SelectItem value="09:00">09h</SelectItem>
                      <SelectItem value="12:00">12h</SelectItem>
                      <SelectItem value="13:00">13h</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
            )}
          />
        ) : null}

        <div className="space-y-2 rounded-lg border border-dashed p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Limite de envios por minuto</p>
              <p className="text-xs text-muted-foreground">
                Ative apenas se quiser limitar a velocidade de envio.
              </p>
            </div>
            <Switch checked={throttleEnabled} onCheckedChange={setThrottleEnabled} />
          </div>
          <FormField
            control={form.control}
            name="throttle_per_minute"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    disabled={!throttleEnabled}
                    placeholder={throttleEnabled ? "Ex: 60" : "Desativado"}
                  />
                </FormControl>
                <FormDescription>
                  {throttleEnabled
                    ? "Limite de envios por minuto para esta instancia."
                    : "Limite desativado. Os envios seguem o ritmo configurado na campanha."}
                </FormDescription>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel>Ativa</FormLabel>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          {submitLabel ?? "Salvar"}
        </Button>
      </form>
    </Form>
  )
}
