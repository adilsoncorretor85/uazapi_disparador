import { PageHeader } from "@/components/common/page-header"
import CampaignCreate from "@/components/campaigns/campaign-create"

export default function CampaignNewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova campanha"
        description="Configure uma campanha completa com randomizador e regras de envio."
      />
      <CampaignCreate />
    </div>
  )
}

