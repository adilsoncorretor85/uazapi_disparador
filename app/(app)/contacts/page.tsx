import { PageHeader } from "@/components/common/page-header"
import ContactsTable from "@/components/tables/contacts-table"

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contatos"
        description="Base de contatos opt-in e segmentada por tags e cidade."
      />
      <ContactsTable />
    </div>
  )
}

