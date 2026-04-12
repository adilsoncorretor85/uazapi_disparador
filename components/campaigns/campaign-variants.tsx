"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchCampaignVariants } from "@/lib/services/campaigns"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

interface CampaignVariantsProps {
  campaignId: string
}

export default function CampaignVariants({ campaignId }: CampaignVariantsProps) {
  const { data } = useQuery({
    queryKey: ["campaign-variants", campaignId],
    queryFn: () => fetchCampaignVariants(campaignId)
  })

  const variants = data?.data ?? []

  return (
    <div className="space-y-4">
      {variants.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">Nenhuma variante configurada.</p>
        </Card>
      ) : (
        variants.map((variant) => (
          <Card key={variant.id}>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Variante #{variant.sort_order}</p>
                <p className="text-xs text-muted-foreground">Peso {variant.weight ?? 1}</p>
                <p className="text-xs text-muted-foreground">
                  Uso: {variant.usage_count ?? 0}
                </p>
              </div>
              <Badge variant={variant.is_active ? "default" : "secondary"}>
                {variant.is_active ? "Ativa" : "Inativa"}
              </Badge>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm">{variant.message_body}</p>
          </Card>
        ))
      )}
    </div>
  )
}
