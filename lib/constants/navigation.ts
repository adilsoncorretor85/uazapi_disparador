import type { Route } from "next"
import { LayoutGrid, Users, Megaphone, Settings } from "lucide-react"

export const NAV_ITEMS = [
  {
    title: "Dashboard",
    href: "/dashboard" as Route,
    icon: LayoutGrid
  },
  {
    title: "Contatos",
    href: "/contacts" as Route,
    icon: Users
  },
  {
    title: "Campanhas",
    href: "/campaigns" as Route,
    icon: Megaphone
  },
  {
    title: "Instâncias",
    href: "/settings/instances" as Route,
    icon: Settings
  }
]
