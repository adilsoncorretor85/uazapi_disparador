"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { NAV_ITEMS } from "@/lib/constants/navigation"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden h-screen w-64 flex-col gap-8 border-r bg-card/70 px-5 py-6 shadow-sm lg:flex">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <span className="font-display text-lg font-semibold">DM</span>
        </div>
        <div>
          <p className="font-display text-lg font-semibold">Disparador</p>
          <p className="text-xs text-muted-foreground">Operação WhatsApp</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          )
        })}
      </nav>

      <div className="rounded-xl border bg-muted/60 p-4">
        <p className="text-sm font-medium">Ambiente</p>
        <p className="text-xs text-muted-foreground">Supabase + N8N + Uazapi</p>
        <Badge className="mt-3" variant="secondary">
          Pronto para operar
        </Badge>
      </div>
    </aside>
  )
}

