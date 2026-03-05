import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "../styles/globals.css"
import Sidebar from "@/components/sidebar"
import PageTransition from "@/components/PageTransition"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "CryptoVerse — Simulation Lab",
  description: "Interactive Cryptography Simulation Lab",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0a] text-white`}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Desktop top bar */}
            <header className="hidden md:flex h-12 border-b border-gray-800/60 items-center px-5 gap-3 shrink-0 bg-[#080808]/80 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1.5" y="3"   width="11" height="1.5" rx="0.75" fill="currentColor"/>
                  <rect x="1.5" y="6.25"width="11" height="1.5" rx="0.75" fill="currentColor"/>
                  <rect x="1.5" y="9.5" width="11" height="1.5" rx="0.75" fill="currentColor"/>
                </svg>
              </div>
              <span className="text-[13px] text-gray-400 font-medium">CryptoVerse</span>
              <div className="ml-auto">
                <span className="text-[10px] text-gray-700 font-mono tracking-widest">v1.0</span>
              </div>
            </header>

            {/* Page content — add top padding on mobile for fixed header */}
            <main className="flex-1 overflow-y-auto pt-12 md:pt-0">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}