import { Activity, CheckCircle2, Rocket, Users } from "lucide-react"
import { KpiCard } from "@/components/common/kpi-card"
import { PageHeader } from "@/components/common/page-header"
import { Card } from "@/components/ui/card"
import { getDashboardStats } from "@/lib/data/dashboard"
import { formatNumber, formatPercent } from "@/lib/format"

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Visão geral das operações de disparo."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Campanhas ativas"
          value={formatNumber(stats.activeCampaigns)}
          icon={<Rocket className="h-4 w-4" />}
        />
        <KpiCard
          label="Envios em fila"
          value={formatNumber(stats.queuedMessages)}
          icon={<Activity className="h-4 w-4" />}
        />
        <KpiCard
          label="Enviados"
          value={formatNumber(stats.sentMessages)}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <KpiCard
          label="Taxa de entrega"
          value={formatPercent(stats.deliveryRate)}
          tone="success"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <KpiCard
          label="Contatos ativos"
          value={formatNumber(stats.activeContacts)}
          icon={<Users className="h-4 w-4" />}
        />
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

