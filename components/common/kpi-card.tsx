import { ReactNode } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  label: string
  value: string
  icon?: ReactNode
  helper?: string
  tone?: "default" | "success" | "warning" | "danger"
}

const tones = {
  default: "text-foreground",
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-rose-600"
}

export function KpiCard({ label, value, icon, helper, tone = "default" }: KpiCardProps) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      </div>
      <div>
        <p className={cn("metric", tones[tone])}>{value}</p>
        {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
      </div>
    </Card>
  )
}

