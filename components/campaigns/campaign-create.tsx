"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { CampaignForm } from "@/components/forms/campaign-form"
import { createCampaign } from "@/lib/services/campaigns"
import type { CampaignFormValues } from "@/lib/schemas/campaign"

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
      <CampaignForm
        mode="create"
        isSubmitting={mutation.isPending}
        submitError={error}
        onSubmit={async (values) => {
          await mutation.mutateAsync(values)
        }}
      />
    </div>
  )
}




