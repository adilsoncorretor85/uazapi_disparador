"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { fetchContacts } from "@/lib/services/contacts"
import type { Contact } from "@/types/entities"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function ContactsTable() {
  const [search, setSearch] = useState("")
  const [city, setCity] = useState("")
  const [tag, setTag] = useState("")
  const [optedIn, setOptedIn] = useState<string | undefined>(undefined)
  const [isValid, setIsValid] = useState<string | undefined>(undefined)
  const [selected, setSelected] = useState<Contact | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["contacts", search, city, tag, optedIn, isValid],
    queryFn: () =>
      fetchContacts({
        search,
        city,
        tag,
        opted_in: optedIn ?? "",
        is_valid: isValid ?? ""
      })
  })

  const contacts = data ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border bg-background/70 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, número ou email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-7 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
          />
        </div>

        <Input
          placeholder="Cidade"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          className="max-w-xs"
        />

        <Input
          placeholder="Tag"
          value={tag}
          onChange={(event) => setTag(event.target.value)}
          className="max-w-xs"
        />

        <Select value={optedIn} onValueChange={(value) => setOptedIn(value === "all" ? undefined : value)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Opt-in" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Sim</SelectItem>
            <SelectItem value="false">Não</SelectItem>
          </SelectContent>
        </Select>

        <Select value={isValid} onValueChange={(value) => setIsValid(value === "all" ? undefined : value)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Válido" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Sim</SelectItem>
            <SelectItem value="false">Não</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Número</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Cidade</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Opt-in</TableHead>
            <TableHead>Válido</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8}>Carregando contatos...</TableCell>
            </TableRow>
          ) : contacts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8}>Nenhum contato encontrado.</TableCell>
            </TableRow>
          ) : (
            contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell>{contact.full_name ?? contact.first_name ?? "-"}</TableCell>
                <TableCell>{contact.whatsapp_e164}</TableCell>
                <TableCell>{contact.email ?? "-"}</TableCell>
                <TableCell>{contact.city ?? "-"}</TableCell>
                <TableCell>{contact.tags?.join(", ") ?? "-"}</TableCell>
                <TableCell>{contact.opted_in ? "Sim" : "Não"}</TableCell>
                <TableCell>{contact.is_valid ? "Sim" : "Não"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(contact)}>
                    Detalhes
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => (!open ? setSelected(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do contato</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-3 text-sm">
              <p><strong>Nome:</strong> {selected.full_name ?? selected.first_name ?? "-"}</p>
              <p><strong>Número:</strong> {selected.whatsapp_e164}</p>
              <p><strong>Email:</strong> {selected.email ?? "-"}</p>
              <p><strong>Cidade/UF:</strong> {selected.city ?? "-"} {selected.state ?? ""}</p>
              <p><strong>Tags:</strong> {selected.tags?.join(", ") ?? "-"}</p>
              <p><strong>Notas:</strong> {selected.notes ?? "-"}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

