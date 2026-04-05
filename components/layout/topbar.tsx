"use client"

import Link from "next/link"
import { Bell, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function Topbar() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b bg-card/70 px-6 py-4 backdrop-blur">
      <div>
        <p className="font-display text-xl font-semibold">Centro de Operações</p>
        <p className="text-sm text-muted-foreground">
          Acompanhe envios, campanhas e métricas em tempo real.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-end gap-3 sm:flex-none">
        <div className="hidden items-center gap-2 rounded-lg border bg-background/60 px-3 py-2 md:flex">
          <Input
            className="h-7 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
            placeholder="Buscar campanha, contato..."
          />
        </div>
        <Button asChild variant="secondary" className="hidden md:inline-flex">
          <Link href="/campaigns/new">
            <Plus className="mr-2 h-4 w-4" />
            Nova campanha
          </Link>
        </Button>
        <Button size="icon" variant="ghost">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}

