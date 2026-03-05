"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"

const navItems = [
  {
    group: "Algorithms",
    items: [
      {
        label: "Classical Ciphers",
        href: "/classical",
        icon: (
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M7.5 4.5v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        label: "Symmetric Key",
        href: "/symmetric",
        icon: (
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M5.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm0 0h4m0 0v1.5m0-1.5V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        label: "Hashing",
        href: "/hashing",
        icon: (
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M3 5h9M3 10h9M6 2.5v10M9 2.5v10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        label: "Asymmetric",
        href: "/asymmetric",
        icon: (
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M3 7.5h3m6 0h-3m0-3v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <circle cx="3" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
            <circle cx="12" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        ),
        tag: "New",
      },
    ],
  },
  {
    group: "Analysis",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: (
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M2 11L5.5 7l3 2.5L12 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
      },
    ],
  },
]

function NavContent({ pathname, onNavClick }: { pathname: string; onNavClick?: () => void }) {
  return (
    <nav className="flex-1 px-2 py-4 space-y-5 overflow-y-auto">
      {navItems.map(({ group, items }) => (
        <div key={group}>
          <p className="text-[10px] text-gray-600 px-2 mb-1.5 uppercase tracking-[0.14em] font-medium">{group}</p>
          <ul className="space-y-0.5">
            {items.map(({ label, href, icon, tag }: any) => {
              const active = pathname === href || pathname.startsWith(href + "/")
              return (
                <li key={href}>
                  <Link href={href} onClick={onNavClick}
                    className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-[13px] transition-all duration-150 ${
                      active ? "bg-gray-800/80 text-white" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800/40"
                    }`}>
                    <div className="flex items-center gap-2.5">
                      <span className={`transition-colors ${active ? "text-blue-400" : "text-gray-600 group-hover:text-gray-400"}`}>
                        {icon}
                      </span>
                      {label}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {tag && (
                        <span className="text-[9px] font-bold tracking-wider bg-blue-600/20 text-blue-400 border border-blue-600/30 px-1.5 py-0.5 rounded">
                          {tag}
                        </span>
                      )}
                      {active && <span className="w-1 h-1 rounded-full bg-blue-400" />}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function LogoBlock() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1.5L2 4.5v5l5 3 5-3v-5L7 1.5z" stroke="white" strokeWidth="1.3" strokeLinejoin="round"/>
          <circle cx="7" cy="7" r="1.5" fill="white"/>
        </svg>
      </div>
      <div>
        <p className="text-[13px] font-semibold text-white tracking-tight leading-tight">CryptoVerse</p>
        <p className="text-[10px] text-gray-600 leading-tight tracking-widest">SIMULATION LAB</p>
      </div>
    </div>
  )
}

function StatusDot() {
  return (
    <div className="border-t border-gray-800/60 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span className="text-[10px] text-gray-600 tracking-widest">PHASE 1 · EDUCATIONAL</span>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 border-r border-gray-800/60 bg-[#080808] flex-col shrink-0 h-full">
        <div className="h-12 border-b border-gray-800/60 flex items-center px-4">
          <LogoBlock />
        </div>
        <NavContent pathname={pathname} />
        <StatusDot />
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-50 h-12 bg-[#080808] border-b border-gray-800/60 flex items-center justify-between px-4">
        <LogoBlock />
        <button onClick={() => setMobileOpen(!mobileOpen)}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors rounded-md hover:bg-gray-800"
          aria-label="Toggle menu">
          {mobileOpen ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="4" width="12" height="1.5" rx="0.75" fill="currentColor"/>
              <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" fill="currentColor"/>
              <rect x="2" y="10.5" width="12" height="1.5" rx="0.75" fill="currentColor"/>
            </svg>
          )}
        </button>
      </div>

      {/* ── Mobile drawer backdrop ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Mobile drawer ── */}
      <aside className={`md:hidden fixed top-12 left-0 bottom-0 z-50 w-64 bg-[#080808] border-r border-gray-800/60 flex flex-col transform transition-transform duration-300 ease-out ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <NavContent pathname={pathname} onNavClick={() => setMobileOpen(false)} />
        <StatusDot />
      </aside>
    </>
  )
}