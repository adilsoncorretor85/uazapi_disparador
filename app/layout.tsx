import type { Metadata } from "next"
import { Space_Grotesk, IBM_Plex_Sans } from "next/font/google"
import type { ReactNode } from "react"
import "./globals.css"
import Providers from "./providers"

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"]
})

const sansFont = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"]
})

export const metadata: Metadata = {
  title: "Disparador de Mensagens",
  description: "Operação de campanhas e disparo de mensagens via WhatsApp."
}

export default function RootLayout({
  children
}: {
  children: ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${displayFont.variable} ${sansFont.variable}`}>
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

