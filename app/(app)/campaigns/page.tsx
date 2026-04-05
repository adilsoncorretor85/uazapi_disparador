import { PageHeader } from "@/components/common/page-header"
import CampaignsList from "@/components/campaigns/campaigns-list"

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Campanhas"
        description="Gestão completa de disparos e acompanhamento de resultados."
      />
      <CampaignsList />
    </div>
  )
}

