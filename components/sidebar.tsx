"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/AuthContext"
import { useGame } from "@/lib/GameContext"

const TIERS = [
  { name:"Novice",       min:0,    color:"text-gray-400",   icon:"🔰" },
  { name:"Apprentice",   min:500,  color:"text-green-400",  icon:"⚡" },
  { name:"Cryptanalyst", min:1000, color:"text-blue-400",   icon:"🔍" },
  { name:"Specialist",   min:1500, color:"text-violet-400", icon:"💎" },
  { name:"Expert",       min:2000, color:"text-amber-400",  icon:"🏆" },
  { name:"Master",       min:2500, color:"text-red-400",    icon:"👑" },
]
function getTier(r: number) { return [...TIERS].reverse().find(t => r >= t.min) ?? TIERS[0] }

const navItems = [
  {
    group: "Algorithms",
    items: [
      { label: "Classical Ciphers", href: "/classical",   tag: null,
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/><path d="M7.5 4.5v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
      { label: "Symmetric Key",     href: "/symmetric",   tag: null,
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M5.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm0 0h4m0 0v1.5m0-1.5V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
      { label: "Hashing",           href: "/hashing",     tag: null,
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 5h9M3 10h9M6 2.5v10M9 2.5v10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
      { label: "Asymmetric",        href: "/asymmetric",  tag: "New",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 7.5h3m6 0h-3m0-3v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="3" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="12" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/></svg> },
    ],
  },
  {
    group: "Practice",
    items: [
      { label: "Cipher Challenge",  href: "/challenge",   tag: "🏆",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 3.5v4m0 1.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
      { label: "Daily Contest",     href: "/contest",     tag: "🔴",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1l1.8 3.6L13 5.3l-2.75 2.7.65 3.8L7.5 10l-3.4 1.8.65-3.8L2 5.3l3.7-.7z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/></svg> },
      { label: "Speed Round",       href: "/speed",       tag: "⚡",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M8.5 1.5L3 8.5h5.5l-2 5 6.5-7H7.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
      { label: "Cipher Battle",     href: "/battle",      tag: "⚔️",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 2l11 11M13 2L2 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
    ],
  },
  {
    group: "Rewards",
    items: [
      { label: "Hint Marketplace",  href: "/marketplace", tag: "🪙",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/><path d="M7.5 4v1.5m0 4V11m-2-3.5h3.5a1 1 0 0 0 0-2h-3a1 1 0 0 1 0-2H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
    ],
  },
  {
    group: "Analysis",
    items: [
      { label: "Dashboard",         href: "/dashboard",   tag: null,
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 11L5.5 7l3 2.5L12 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
      { label: "Profile",            href: "/profile",     tag: null,
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2"/><path d="M2.5 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
    ],
  },
  {
    group: "Earn & Compete",
    items: [
      { label: "Pricing & Pro",     href: "/pricing",      tag: "💎",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1l2 4h4l-3.2 2.8 1.2 4-4-2.4-4 2.4 1.2-4L1.5 5h4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg> },
      { label: "Tournaments",       href: "/tournaments",  tag: "🏆",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M5 1h5v5a2.5 2.5 0 01-5 0V1z" stroke="currentColor" strokeWidth="1.2"/><path d="M5 4H3.5a1.5 1.5 0 000 3H5M10 4h1.5a1.5 1.5 0 010 3H10" stroke="currentColor" strokeWidth="1.2"/><path d="M7.5 9v3M5.5 12h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
      { label: "Certificates",      href: "/certificates", tag: "🎓",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="2" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="7.5" cy="6.5" r="1.8" stroke="currentColor" strokeWidth="1.2"/><path d="M5.5 13.5l2-2 2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    ],
  },
]

function NavContent({ pathname, onNavClick }: { pathname: string; onNavClick?: () => void }) {
  const { requestLeave, isGameActive } = useGame()
  const router = useRouter()

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (pathname === href) return
    if (isGameActive) {
      e.preventDefault()
      requestLeave().then((confirmed) => {
        if (confirmed) {
          onNavClick?.()
          router.push(href)
        }
      })
    } else {
      onNavClick?.()
    }
  }

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
                  <Link href={href} onClick={(e) => handleNavClick(e, href)}
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
                      {tag === "New" && (
                        <span className="text-[9px] font-bold tracking-wider bg-blue-600/20 text-blue-400 border border-blue-600/30 px-1.5 py-0.5 rounded">New</span>
                      )}
                      {tag === "🏆" && <span className="text-[11px]">🏆</span>}
                      {tag === "⚡" && <span className="text-[11px]">⚡</span>}
                      {tag === "⚔️" && <span className="text-[11px]">⚔️</span>}
                      {tag === "🪙" && <span className="text-[11px]">🪙</span>}
                      {tag === "🔴" && (
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
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

function UserFooter({ onNavClick }: { onNavClick?: () => void }) {
  const { profile, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    // signOut redirects to "/" so finally never runs — that's fine
  }

  if (!profile) return (
    <div className="border-t border-gray-800/60 px-3 py-3">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span className="text-[10px] text-gray-600 tracking-widest">PHASE 1 · EDUCATIONAL</span>
      </div>
    </div>
  )
  const tier = getTier(profile.rating)
  return (
    <div className="border-t border-gray-800/60 px-2 py-2 space-y-1">
      <Link href="/profile" onClick={onNavClick}
        className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-800/40 transition-colors group">
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center text-sm shrink-0 ${tier.color.replace("text-","border-").replace("-400","-700/40")} bg-gray-900/60`}>
          {tier.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-white truncate">{profile.username}</p>
          <p className={`text-[10px] ${tier.color}`}>{profile.rating} · {tier.name}</p>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-gray-700 group-hover:text-gray-500 shrink-0 transition-colors">
          <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </Link>
      <button onClick={handleSignOut} disabled={signingOut}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
        {signingOut ? (
          <svg className="w-3.5 h-3.5 animate-spin shrink-0" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 10"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
            <path d="M5 2H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2M9.5 9.5L12 7l-2.5-2.5M12 7H5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        <span className="text-[11px] font-medium tracking-wide">{signingOut ? "Signing out..." : "Sign out"}</span>
      </button>
    </div>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex w-56 border-r border-gray-800/60 bg-[#080808] flex-col shrink-0 h-full">
        <div className="h-12 border-b border-gray-800/60 flex items-center px-4"><LogoBlock /></div>
        <NavContent pathname={pathname} />
        <UserFooter />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-50 h-12 bg-[#080808] border-b border-gray-800/60 flex items-center justify-between px-4">
        <LogoBlock />
        <button onClick={() => setMobileOpen(!mobileOpen)}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors rounded-md hover:bg-gray-800">
          {mobileOpen
            ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="1.5" rx="0.75" fill="currentColor"/><rect x="2" y="7.25" width="12" height="1.5" rx="0.75" fill="currentColor"/><rect x="2" y="10.5" width="12" height="1.5" rx="0.75" fill="currentColor"/></svg>
          }
        </button>
      </div>

      {mobileOpen && <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />}

      <aside className={`md:hidden fixed top-12 left-0 bottom-0 z-50 w-64 bg-[#080808] border-r border-gray-800/60 flex flex-col transform transition-transform duration-300 ease-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <NavContent pathname={pathname} onNavClick={() => setMobileOpen(false)} />
        <UserFooter onNavClick={() => setMobileOpen(false)} />
      </aside>
    </>
  )
}