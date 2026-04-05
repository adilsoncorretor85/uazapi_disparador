"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { CampaignForm } from "@/components/forms/campaign-form"
import { createCampaign } from "@/lib/services/campaigns"
import type { CampaignFormValues } from "@/lib/schemas/campaign"
import { AlertCircle } from "lucide-react"

export default function CampaignCreate() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (values: CampaignFormValues) => createCampaign(values),
    onSuccess: (data) => {
      setError(null)
      router.push(`/campaigns/${data.id}`)
    },
    onError: (err: Error) => {
      setError(err.message)
    }
  })

  return (
    <div className="space-y-4">
      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      <CampaignForm
        onSubmit={async (values) => {
          await mutation.mutateAsync(values)
        }}
        submitLabel={mutation.isPending ? "Salvando..." : "Criar campanha"}
      />
    </div>
  )
}




