import type { ReactNode } from "react"
import Sidebar from "@/components/layout/sidebar"
import Topbar from "@/components/layout/topbar"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 page-in">
          {children}
        </main>
      </div>
    </div>
  )
}


