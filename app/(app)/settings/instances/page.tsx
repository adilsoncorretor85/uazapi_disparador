import { PageHeader } from "@/components/common/page-header"
import InstancesPanel from "@/components/settings/instances-panel"

export default function InstancesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Instâncias"
        description="Gerencie credenciais e parâmetros de envio."
      />
      <InstancesPanel />
    </div>
  )
}

