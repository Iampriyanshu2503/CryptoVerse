"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

function CipherText({ text, className }: { text: string; className?: string }) {
  const [displayed, setDisplayed] = useState(text)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let iteration = 0
    clearInterval(intervalRef.current!)
    intervalRef.current = setInterval(() => {
      setDisplayed(
        text.split("").map((char, idx) => {
          if (idx < iteration) return char
          if (char === " ") return " "
          return chars[Math.floor(Math.random() * chars.length)]
        }).join("")
      )
      if (iteration >= text.length) clearInterval(intervalRef.current!)
      iteration += 0.4
    }, 30)
    return () => clearInterval(intervalRef.current!)
  }, [text])

  return <span className={className}>{displayed}</span>
}

function HexGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] md:w-[600px] h-[400px] md:h-[600px] rounded-full bg-blue-600/5 blur-[120px]" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] md:w-[300px] h-[200px] md:h-[300px] rounded-full bg-blue-500/8 blur-[80px]" />
      <div className="hidden sm:block">
        {FLOAT_CHARS.map((item, i) => (
          <div key={i} className="absolute font-mono text-[11px] text-blue-500/20 animate-pulse select-none"
            style={{ left: item.x, top: item.y, animationDelay: item.delay, animationDuration: item.duration }}>
            {item.char}
          </div>
        ))}
      </div>
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(59,130,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.5) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0a0a0a] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
    </div>
  )
}

const FLOAT_CHARS = [
  { x: "8%",  y: "15%", char: "3A F2 09", delay: "0s",   duration: "4s"   },
  { x: "82%", y: "12%", char: "C7 1B E4", delay: "0.8s", duration: "5s"   },
  { x: "5%",  y: "50%", char: "FF 00 AB", delay: "1.2s", duration: "6s"   },
  { x: "88%", y: "45%", char: "72 D3 8C", delay: "0.4s", duration: "4.5s" },
  { x: "15%", y: "78%", char: "01 00 01", delay: "2s",   duration: "5.5s" },
  { x: "75%", y: "75%", char: "AES128",   delay: "1.6s", duration: "4s"   },
  { x: "45%", y: "88%", char: "SHA256",   delay: "0.2s", duration: "7s"   },
  { x: "60%", y: "22%", char: "RSA2048",  delay: "3s",   duration: "4s"   },
  { x: "30%", y: "8%",  char: "XOR ⊕",   delay: "1s",   duration: "6s"   },
  { x: "92%", y: "68%", char: "KEY→IV",   delay: "2.4s", duration: "5s"   },
]

const modules = [
  {
    title: "Classical Ciphers",
    subtitle: "Caesar · Vigenère · Playfair · Hill · Rail Fence · Mono",
    description: "Explore historical encryption techniques with interactive step-by-step visualizations.",
    href: "/classical",
    accent: "blue",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M10 6v4.5l3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    tag: "6 Ciphers",
    stat: "2400 BC",
    statLabel: "Origins",
  },
  {
    title: "Symmetric Key",
    subtitle: "AES-128 · DES · 3DES",
    description: "Visualize block cipher rounds — SubBytes, ShiftRows, MixColumns, Feistel networks.",
    href: "/symmetric",
    accent: "emerald",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M7.5 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm0 0h5m0 0v2m0-2V8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    tag: "Block Cipher",
    stat: "128 bit",
    statLabel: "Key Size",
  },
  {
    title: "Hashing & Signatures",
    subtitle: "SHA-256 · SHA-512 · Avalanche · RSA-2048",
    description: "Compute hashes, visualize avalanche effect, and demo RSA digital signatures.",
    href: "/hashing",
    accent: "violet",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 7h12M4 13h12M8 3.5v13M12 3.5v13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    tag: "4 Algorithms",
    stat: "256 bit",
    statLabel: "Digest",
  },
  {
    title: "Asymmetric Encryption",
    subtitle: "RSA-2048 · ECDH · Key Exchange · Signatures",
    description: "Encrypt with public keys, decrypt with private keys, and simulate Diffie-Hellman key exchange.",
    href: "/asymmetric",
    accent: "amber",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M5 10h4m6 0h-4m0-3v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="5" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="15" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
    tag: "Public Key",
    stat: "2048 bit",
    statLabel: "RSA Key",
  },
  {
    title: "Performance Dashboard",
    subtitle: "Benchmarks · Security Ratings · Radar Analysis",
    description: "Compare algorithm speeds, security levels, and trade-offs with live visualizations.",
    href: "/dashboard",
    accent: "rose",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 14L7.5 9l4 3.5L16 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    tag: "Analytics",
    stat: "Live",
    statLabel: "Benchmarks",
  },
]

const ACCENT_STYLES: Record<string, {
  border: string; glow: string; icon: string; tag: string;
  stat: string; hover: string; badge: string;
}> = {
  blue:    { border: "hover:border-blue-500/50",    glow: "group-hover:bg-blue-500/5",    icon: "text-blue-400",    tag: "bg-blue-500/10 text-blue-400 border-blue-500/20",       stat: "text-blue-400",    hover: "group-hover:text-blue-300",    badge: "bg-blue-500/20"    },
  emerald: { border: "hover:border-emerald-500/50", glow: "group-hover:bg-emerald-500/5", icon: "text-emerald-400", tag: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", stat: "text-emerald-400", hover: "group-hover:text-emerald-300", badge: "bg-emerald-500/20" },
  violet:  { border: "hover:border-violet-500/50",  glow: "group-hover:bg-violet-500/5",  icon: "text-violet-400",  tag: "bg-violet-500/10 text-violet-400 border-violet-500/20",   stat: "text-violet-400",  hover: "group-hover:text-violet-300",  badge: "bg-violet-500/20"  },
  amber:   { border: "hover:border-amber-500/50",   glow: "group-hover:bg-amber-500/5",   icon: "text-amber-400",   tag: "bg-amber-500/10 text-amber-400 border-amber-500/20",      stat: "text-amber-400",   hover: "group-hover:text-amber-300",   badge: "bg-amber-500/20"   },
  rose:    { border: "hover:border-rose-500/50",    glow: "group-hover:bg-rose-500/5",    icon: "text-rose-400",    tag: "bg-rose-500/10 text-rose-400 border-rose-500/20",         stat: "text-rose-400",    hover: "group-hover:text-rose-300",    badge: "bg-rose-500/20"    },
}

const stats = [
  { value: "6+",   label: "Ciphers"      },
  { value: "10",   label: "AES Rounds"   },
  { value: "2048", label: "RSA Bits"     },
  { value: "100%", label: "Educational"  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <HexGrid />

      <section className="relative pt-12 sm:pt-16 md:pt-20 pb-12 md:pb-16 px-5 sm:px-8 md:px-10 max-w-5xl mx-auto">

        {/* Phase badge */}
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 mb-6 md:mb-8">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
          </span>
          <span className="text-[10px] sm:text-[11px] text-blue-400 font-medium tracking-widest uppercase">
            Phase 1 — Educational Mode
          </span>
        </div>

        {/* Headline */}
        <div className="mb-5 md:mb-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-3 md:mb-4">
            <span className="text-white">Crypto</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400">Verse</span>
          </h1>
          <div className="text-[10px] sm:text-[12px] md:text-[13px] font-mono text-gray-600 tracking-widest uppercase mb-4 md:mb-5 truncate">
            <CipherText text="INTERACTIVE CRYPTOGRAPHY SIMULATION LAB" />
          </div>
          <p className="text-[13px] sm:text-[14px] md:text-[15px] text-gray-400 max-w-lg leading-relaxed">
            Learn and visualize cryptographic algorithms — from ancient Caesar ciphers to modern AES encryption — with step-by-step interactive breakdowns.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-3 mb-10 md:mb-16">
          <Link href="/classical"
            className="group relative inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 5-10 5V2z" fill="currentColor"/>
            </svg>
            Start Exploring
            <span className="absolute inset-0 rounded-xl ring-1 ring-white/10" />
          </Link>
          <Link href="/dashboard"
            className="inline-flex items-center gap-2 border border-gray-700/60 text-gray-400 hover:text-white hover:border-gray-500 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200">
            View Dashboard
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6h7m0 0L6.5 3m3 3L6.5 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

        {/* Stats — 2 cols on mobile, 4 on sm+ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-800/40 rounded-2xl overflow-hidden border border-gray-800/60 mb-12 md:mb-20">
          {stats.map(({ value, label }) => (
            <div key={label} className="bg-[#0d0d0d] px-4 sm:px-6 py-4 sm:py-5 text-center">
              <p className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-0.5">{value}</p>
              <p className="text-[10px] sm:text-[11px] text-gray-600 uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>

        {/* Section heading */}
        <div className="flex items-center gap-4 mb-4 md:mb-6">
          <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-[0.16em] shrink-0">Modules</p>
          <div className="flex-1 h-px bg-gray-800/60" />
          <p className="text-[11px] text-gray-700 font-mono shrink-0">05 available</p>
        </div>

        {/* Module cards — 1 col mobile, 2 col md+, last card full width if odd */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {modules.map((mod, idx) => {
            const s = ACCENT_STYLES[mod.accent]
            const isLastOdd = idx === modules.length - 1 && modules.length % 2 !== 0
            return (
              <Link key={mod.href} href={mod.href}
                className={`group relative bg-[#0d0d0d] border border-gray-800/60 rounded-2xl p-4 sm:p-5 transition-all duration-300 overflow-hidden ${s.border} ${isLastOdd ? "md:col-span-2" : ""}`}>

                <div className={`absolute inset-0 transition-all duration-500 ${s.glow}`} />

                {/* Top row */}
                <div className="relative flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border border-gray-800/80 ${s.badge} ${s.icon}`}>
                    {mod.icon}
                  </div>
                  <div className="text-right">
                    <p className={`text-lg sm:text-xl font-bold ${s.stat} leading-none`}>{mod.stat}</p>
                    <p className="text-[10px] text-gray-600 tracking-wider mt-0.5">{mod.statLabel}</p>
                  </div>
                </div>

                {/* Content */}
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className={`text-[14px] font-semibold text-white transition-colors ${s.hover}`}>{mod.title}</h3>
                    <span className={`text-[9px] font-bold uppercase tracking-widest border px-1.5 py-0.5 rounded-full ${s.tag}`}>
                      {mod.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 font-mono mb-2 tracking-wide leading-relaxed">{mod.subtitle}</p>
                  <p className="text-[12px] text-gray-500 leading-relaxed">{mod.description}</p>
                </div>

                {/* Arrow */}
                <div className="relative mt-3 sm:mt-4 flex items-center justify-end">
                  <span className={`text-[11px] font-medium transition-all ${s.icon} flex items-center gap-1 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 duration-200`}>
                    Open module
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6h7m0 0L6.5 3m3 3L6.5 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </div>

                <div className={`absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-all duration-500 bg-gradient-to-r from-transparent via-current to-transparent ${s.icon}`} />
              </Link>
            )
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 md:mt-16 pt-6 border-t border-gray-800/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] sm:text-[11px] text-gray-700 font-mono tracking-wider">
            CRYPTOVERSE — EDUCATIONAL PLATFORM
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {[
              { label: "Classical",   href: "/classical"   },
              { label: "Symmetric",   href: "/symmetric"   },
              { label: "Hashing",     href: "/hashing"     },
              { label: "Asymmetric",  href: "/asymmetric"  },
              { label: "Dashboard",   href: "/dashboard"   },
            ].map(({ label, href }) => (
              <Link key={label} href={href}
                className="text-[11px] text-gray-700 hover:text-gray-400 transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </div>

      </section>
    </div>
  )
}