import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Sidebar from "@/components/sidebar"
import PageTransition from "@/components/PageTransition"
import { AuthProvider } from "@/lib/AuthContext"
import { GameProvider } from "@/lib/GameContext"
import BootOverlay from "@/components/BootOverlay"
import AchievementToastWrapper from "@/components/AchievementToastWrapper"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "CryptoVerse — Cryptography Simulation Lab",
  description: "Interactive cryptography education platform",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#030303] text-white antialiased`}>
        <AuthProvider>
          <GameProvider>
            {/* Boot overlay — client component, covers everything via fixed positioning */}
            <BootOverlay />
            <AchievementToastWrapper />

            {/* App shell — given an id so BootOverlay can control its opacity via DOM */}
            <div id="app-shell" className="flex h-screen overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto pt-12 md:pt-0">
                <PageTransition>{children}</PageTransition>
              </main>
            </div>
          </GameProvider>
        </AuthProvider>
      </body>
    </html>
  )
}