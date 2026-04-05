import { PageHeader } from "@/components/common/page-header"
import CampaignEdit from "@/components/campaigns/campaign-edit"

export default function CampaignEditPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar campanha"
        description="Atualize o conteúdo e parâmetros de envio."
      />
      <CampaignEdit />
    </div>
  )
}

