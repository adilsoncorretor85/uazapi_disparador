import { Activity, CheckCircle2, Rocket, Users } from "lucide-react"
import { KpiCard } from "@/components/common/kpi-card"
import { PageHeader } from "@/components/common/page-header"
import { Card } from "@/components/ui/card"

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Visão geral das operações de disparo."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Campanhas ativas" value="4" icon={<Rocket className="h-4 w-4" />} />
        <KpiCard label="Envios em fila" value="12.480" icon={<Activity className="h-4 w-4" />} />
        <KpiCard label="Taxa de entrega" value="92,4%" tone="success" icon={<CheckCircle2 className="h-4 w-4" />} />
        <KpiCard label="Contatos ativos" value="38.210" icon={<Users className="h-4 w-4" />} />
      </div>

      <Card>
        <div className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Operação do dia</h2>
          <p className="text-sm text-muted-foreground">
            Os indicadores detalhados ficam disponíveis dentro de cada campanha. Use o módulo
            de envios para acompanhar status em tempo real.
          </p>
        </div>
      </Card>
    </div>
  )
}

