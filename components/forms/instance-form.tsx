"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Form,
  FormControl,
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
  provider: "",
  base_url: "",
  instance_name: "",
  owner_number: "",
  descricao: "",
  cidade: "",
  estado: "",
  campanha_pause: false,
  campanha_horario_pause: "20:00",
  campanha_horario_reinicio: "07:00",
  is_active: true,
  send_readchat: false,
  send_composing: false,
  throttle_per_minute: 60,
  token: ""
}

export function InstanceForm({ defaultValues, onSubmit, submitLabel }: InstanceFormProps) {
  const form = useForm<InstanceFormValues>({
    resolver: zodResolver(instanceFormSchema),
    defaultValues: defaultValues ?? initialValues
  })

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
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Provider</FormLabel>
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
          name="base_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Base URL</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="instance_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da instância</FormLabel>
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
                <FormLabel>Número do dono</FormLabel>
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
          name="token"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Token</FormLabel>
              <FormControl>
                <Input {...field} type="password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
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
        </div>

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
          <FormField
            control={form.control}
            name="campanha_horario_pause"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horário de pausa</FormLabel>
                <FormControl>
                  <Select value={field.value ?? "20:00"} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="17:00">17h</SelectItem>
                      <SelectItem value="18:00">18h</SelectItem>
                      <SelectItem value="20:00">20h</SelectItem>
                      <SelectItem value="21:00">21h</SelectItem>
                      <SelectItem value="22:00">22h</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="campanha_horario_reinicio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Horário de reinício</FormLabel>
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

        <FormField
          control={form.control}
          name="throttle_per_minute"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Throttle por minuto</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-3">
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
          <FormField
            control={form.control}
            name="send_readchat"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel>Readchat</FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="send_composing"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel>Composing</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full">
          {submitLabel ?? "Salvar"}
        </Button>
      </form>
    </Form>
  )
}

