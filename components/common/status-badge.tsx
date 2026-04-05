import { Badge } from "@/components/ui/badge"
import { STATUS_BADGE_VARIANT } from "@/lib/constants/status"

interface StatusBadgeProps {
  status: keyof typeof STATUS_BADGE_VARIANT
  label: string
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status]} className="capitalize">
      {label}
    </Badge>
  )
}

