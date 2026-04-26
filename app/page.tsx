"use client"

import Link from "next/link"
import { useEffect, useRef, useState, useCallback, useMemo } from "react"

// ─── Utility ───────────────────────────────────────────────────────────────────
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^⊕≡∑∏∫√∂∇"
const rand   = (a: number, b: number) => Math.random() * (b - a) + a
const pick   = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
const clamp  = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

// ─── Matrix Rain ───────────────────────────────────────────────────────────────
function MatrixRain() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext("2d")!
    let id: number
    const resize = () => { c.width = c.offsetWidth; c.height = c.offsetHeight }
    resize(); window.addEventListener("resize", resize)
    const cols  = Math.floor(c.width / 20)
    const drops = Array.from({ length: cols }, () => rand(0, c.height / 20))
    const draw  = () => {
      ctx.fillStyle = "rgba(5,5,5,0.045)"
      ctx.fillRect(0, 0, c.width, c.height)
      for (let i = 0; i < drops.length; i++) {
        ctx.fillStyle = `rgba(59,130,246,${rand(0.04, 0.22)})`
        ctx.font = "13px 'Courier New',monospace"
        ctx.fillText(pick(GLYPHS.split("")), i * 20, drops[i] * 20)
        if (drops[i] * 20 > c.height && Math.random() > 0.975) drops[i] = 0
        drops[i] += 0.38
      }
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(id) }
  }, [])
  return <canvas ref={ref} className="absolute inset-0 w-full h-full opacity-25" />
}

// ─── Scramble hook ─────────────────────────────────────────────────────────────
// Must start with the real target string to avoid SSR/client hydration mismatch.
// Scrambling only begins after mount (useEffect = client only).
function useScramble(target: string, speed = 28, delay = 0) {
  const [text, setText] = useState(target) // ← always start with real text
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    const t = setTimeout(() => {
      let iter = 0
      const iv = setInterval(() => {
        setText(target.split("").map((ch, i) => {
          if (ch === " ") return " "
          if (i < iter) return ch
          return pick(GLYPHS.split(""))
        }).join(""))
        iter += 0.45
        if (iter >= target.length) clearInterval(iv)
      }, speed)
      return () => clearInterval(iv)
    }, delay)
    return () => clearTimeout(t)
  }, [mounted, target, speed, delay])

  return text
}

// ─── Cipher ticker ─────────────────────────────────────────────────────────────
const TICKS = [
  "AES-128  ▸  ROUND 7/10   ▸  MIXCOLUMNS",
  "SHA-256  ▸  BLOCK 3/8    ▸  COMPRESSION",
  "RSA-2048 ▸  p=61  q=53   ▸  SIGNING",
  "CAESAR   ▸  SHIFT +3     ▸  H→K E→H",
  "ECDH     ▸  ALICE ⟷ BOB  ▸  SHARED",
  "DES      ▸  ROUND 12/16  ▸  S-BOX",
]
function CipherTicker() {
  const [i, setI]             = useState(0)
  const [on, setOn]           = useState(true)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => {
      setOn(false)
      setTimeout(() => { setI(x => (x + 1) % TICKS.length); setOn(true) }, 300)
    }, 2600)
    return () => clearInterval(t)
  }, [mounted])
  return (
    <span className="font-mono text-[10px] text-blue-400/50 tracking-widest"
      style={{ opacity: on ? 1 : 0, transition: "opacity 0.3s" }}>
      ▶&nbsp;{TICKS[i]}
    </span>
  )
}

// ─── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const done = useRef(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true
        let v = 0
        const step = Math.ceil(to / 50)
        const iv = setInterval(() => {
          v = Math.min(v + step, to); setVal(v)
          if (v >= to) clearInterval(iv)
        }, 25)
      }
    })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [to])
  return <span ref={ref}>{val}{suffix}</span>
}

// ─── Terminal boot ─────────────────────────────────────────────────────────────
const BOOT = [
  { t: "CRYPTOVERSE OS v2.0.1 — INITIALIZING...", d: 0    },
  { t: "► Loading cipher engines................OK", d: 320  },
  { t: "► Connecting to contest server..........OK", d: 640  },
  { t: "► Generating RSA-2048 keypair............OK", d: 960  },
  { t: "► All systems nominal. Welcome.",            d: 1260 },
]
function TerminalBoot({ onDone }: { onDone: () => void }) {
  const [lines, setLines] = useState<string[]>([])
  useEffect(() => {
    BOOT.forEach(({ t, d }) => setTimeout(() => setLines(l => [...l, t]), d))
    setTimeout(onDone, 2000)
  }, [onDone])
  return (
    <div className="fixed inset-0 z-[100] bg-[#030303] flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <div className="border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#0a0a0a] border-b border-gray-800">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-[11px] text-gray-600 font-mono">cryptoverse — boot</span>
          </div>
          <div className="p-6 bg-[#060606] space-y-2 min-h-[160px]">
            {lines.map((l, i) => (
              <div key={i} className="flex gap-2 font-mono text-[12px]">
                <span className="text-blue-500 shrink-0">$</span>
                <span className={i === lines.length - 1 ? "text-emerald-400" : "text-gray-500"}>{l}</span>
              </div>
            ))}
            <div className="flex gap-2 items-center">
              <span className="text-blue-500 font-mono text-[12px]">$</span>
              <span className="w-2 h-[14px] bg-blue-400 animate-[pulse_0.8s_ease-in-out_infinite]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── useParallax: scroll-driven value ─────────────────────────────────────────
function useScrollY() {
  const [y, setY]             = useState(0)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const fn = () => setY(window.scrollY)
    window.addEventListener("scroll", fn, { passive: true })
    return () => window.removeEventListener("scroll", fn)
  }, [mounted])
  return y
}

// ─── 3D Tilt Card ──────────────────────────────────────────────────────────────
function TiltCard({
  children, color, className = "", style = {},
}: {
  children: React.ReactNode
  color: string
  className?: string
  style?: React.CSSProperties
}) {
  const ref      = useRef<HTMLDivElement>(null)
  const raf      = useRef<number | undefined>(undefined)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 })
  const [hov, setHov]   = useState(false)

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current; if (!el) return
    cancelAnimationFrame(raf.current!)
    raf.current = requestAnimationFrame(() => {
      const { left, top, width, height } = el.getBoundingClientRect()
      const x = (e.clientX - left) / width
      const y = (e.clientY - top) / height
      setTilt({
        rx: (y - 0.5) * -18,
        ry: (x - 0.5) *  18,
        gx: x * 100,
        gy: y * 100,
      })
    })
  }, [])

  const onLeave = useCallback(() => {
    setHov(false)
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 })
  }, [])

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={onLeave}
      className={className}
      style={{
        ...style,
        transform: hov
          ? `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale3d(1.02,1.02,1.02)`
          : "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)",
        transition: hov ? "transform 0.1s linear" : "transform 0.6s cubic-bezier(0.23,1,0.32,1)",
        transformStyle: "preserve-3d",
      }}
    >
      {/* Dynamic gradient highlight following cursor */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none z-10 opacity-0 transition-opacity duration-300"
        style={{
          opacity: hov ? 1 : 0,
          background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, ${color}18 0%, transparent 65%)`,
        }}
      />
      {/* Gloss shine */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none z-10"
        style={{
          background: hov
            ? `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.04) 0%, transparent 50%)`
            : "none",
        }}
      />
      {children}
    </div>
  )
}

// ─── Modules data ──────────────────────────────────────────────────────────────
const MODULES = [
  {
    id: "01", title: "Classical Ciphers",
    sub: "Caesar · Vigenère · Playfair · Hill · Rail Fence",
    desc: "Walk through ancient encryption letter-by-letter. Watch substitutions happen in real time with animated grids.",
    href: "/classical", color: "#3b82f6",
    icon: "A→D", tags: ["Shift", "Polyalpha", "Digraph"],
    stat: "2400 BC", statLabel: "Origins",
    preview: ["HELLO", "↓ +3", "KHOOR"],
  },
  {
    id: "02", title: "Symmetric Key",
    sub: "AES-128 · DES · 3DES · Feistel Network",
    desc: "Every AES round visualized — SubBytes, ShiftRows, MixColumns with a live color-coded 4×4 state matrix.",
    href: "/symmetric", color: "#10b981",
    icon: "⊕", tags: ["Block Cipher", "10 Rounds"],
    stat: "128 bit", statLabel: "Key Size",
    preview: ["PLAINTEXT", "↓ AES", "C7 1B E4 F2"],
  },
  {
    id: "03", title: "Hashing & Signatures",
    sub: "SHA-256 · SHA-512 · Avalanche Effect",
    desc: "Flip one bit and watch the avalanche cascade across 256 bits. Sign and verify with real RSA-2048 keys.",
    href: "/hashing", color: "#8b5cf6",
    icon: "#", tags: ["One-way", "Avalanche"],
    stat: "256 bit", statLabel: "Digest",
    preview: ["hello", "↓ SHA-256", "2CF24D..."],
  },
  {
    id: "04", title: "Asymmetric Encryption",
    sub: "RSA-2048 · ECDH · Key Exchange",
    desc: "Generate real keypairs in browser. Encrypt with public, decrypt with private. Simulate Diffie-Hellman.",
    href: "/asymmetric", color: "#f59e0b",
    icon: "🔑", tags: ["Public Key", "ECDH"],
    stat: "2048 bit", statLabel: "RSA Key",
    preview: ["PUB KEY", "↓ RSA", "CIPHERTEXT"],
  },
  {
    id: "05", title: "Daily Contest",
    sub: "Live · Global Leaderboard · Elo Rating",
    desc: "One new cipher puzzle every midnight. Earn Elo rating, climb from Novice to Master, and compete globally.",
    href: "/contest", color: "#ef4444",
    icon: "★", tags: ["🔴 Live", "Rated"],
    stat: "Daily", statLabel: "Resets At",
    preview: ["KHOOR ZRUOG", "↓ Decrypt", "??? ????"],
  },
  {
    id: "06", title: "Cipher Battle",
    sub: "Real-time 1v1 · Room Code · Winner Takes All",
    desc: "Challenge anyone to a live cipher race. Both get the same puzzle — first to decrypt wins the match.",
    href: "/battle", color: "#f472b6",
    icon: "⚔", tags: ["Real-time", "1v1"],
    stat: "Live", statLabel: "Multiplayer",
    preview: ["ROOM: AB3X", "↓ RACE", "YOU WIN!"],
  },
  {
    id: "07", title: "Blockchain Lab",
    sub: "SHA-256 · ECDSA · Mining · Tokens",
    desc: "7-chapter guided tour. Mine real blocks, generate key pairs, send transactions, and deploy your own token.",
    href: "/blockchain", color: "#4ade80",
    icon: "⛓", tags: ["Web Crypto", "7 Chapters"],
    stat: "Real", statLabel: "Cryptography",
    preview: ["HASH: 00af…", "↓ Mine", "BLOCK #3"],
  },
  {
    id: "08", title: "Speed Round",
    sub: "60 Seconds · Unlimited Ciphers · Personal Best",
    desc: "Race against the clock. Solve as many ciphers as you can in 60 seconds. Your high score is tracked forever.",
    href: "/speed", color: "#fb923c",
    icon: "⚡", tags: ["60s Timer", "Streak"],
    stat: "60s", statLabel: "Time Limit",
    preview: ["CIPHER 1", "→ CORRECT!", "CIPHER 2"],
  },
  {
    id: "09", title: "Dashboard",
    sub: "Benchmarks · Radar · Analytics",
    desc: "Compare 9 algorithms across speed, security, memory, and simplicity with animated radar charts.",
    href: "/dashboard", color: "#ec4899",
    icon: "↑", tags: ["Analytics", "9 Algos"],
    stat: "Live", statLabel: "Benchmarks",
    preview: ["AES ████████", "DES █████░░░", "RSA ██████░░"],
  },
]

// ─── Premium module card ───────────────────────────────────────────────────────
function ModuleCard({ mod, index }: { mod: typeof MODULES[0]; index: number }) {
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.08 }
    )
    if (wrapRef.current) obs.observe(wrapRef.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={wrapRef}
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? "translateY(0) scale(1)" : "translateY(32px) scale(0.97)",
        transition: `opacity 0.65s cubic-bezier(0.23,1,0.32,1) ${index * 90}ms,
                     transform 0.65s cubic-bezier(0.23,1,0.32,1) ${index * 90}ms`,
      }}
    >
      <TiltCard
        color={mod.color}
        className="relative rounded-2xl overflow-hidden h-full"
        style={{
          background: "#080808",
          border: `1px solid ${hovered ? mod.color + "35" : "rgba(255,255,255,0.065)"}`,
          transition: "border-color 0.4s",
          boxShadow: hovered
            ? `0 0 0 1px ${mod.color}20, 0 20px 60px ${mod.color}12, 0 4px 16px rgba(0,0,0,0.6)`
            : "0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        {/* Scanline texture overlay */}
        <div className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
          }} />

        {/* Corner accent */}
        <div className="absolute top-0 right-0 w-20 h-20 pointer-events-none"
          style={{
            background: `linear-gradient(225deg, ${mod.color}20, transparent 60%)`,
            opacity: hovered ? 1 : 0.4,
            transition: "opacity 0.4s",
          }} />

        {/* Bottom glow */}
        <div className="absolute bottom-0 inset-x-0 h-px pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${mod.color}60, transparent)`,
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.4s",
          }} />

        <div
          className="relative z-10 p-5 flex flex-col h-full"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Header row */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2.5">
              {/* ID chip */}
              <span className="font-mono text-[9px] text-gray-700 border border-gray-800 px-1.5 py-0.5 rounded">
                {mod.id}
              </span>
              {/* Icon */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[16px] font-black"
                style={{
                  background:  `${mod.color}12`,
                  border:      `1px solid ${mod.color}30`,
                  color:        mod.color,
                  boxShadow:   hovered ? `0 0 16px ${mod.color}30` : "none",
                  transition:  "box-shadow 0.3s",
                  transform:   "translateZ(20px)",
                }}
              >
                {mod.icon}
              </div>
            </div>
            {/* Stat */}
            <div className="text-right" style={{ transform: "translateZ(10px)" }}>
              <p className="text-[17px] font-black leading-none" style={{ color: mod.color }}>
                {mod.stat}
              </p>
              <p className="text-[9px] text-gray-600 tracking-widest uppercase mt-0.5">{mod.statLabel}</p>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-[15px] font-bold text-white mb-0.5 leading-tight"
            style={{ transform: "translateZ(8px)" }}>
            {mod.title}
          </h3>
          <p className="text-[10px] font-mono text-gray-600 mb-3 tracking-wide leading-relaxed">
            {mod.sub}
          </p>

          {/* Live preview terminal */}
          <div
            className="rounded-xl p-3 mb-4 font-mono text-[10px] leading-relaxed"
            style={{
              background: "#030303",
              border: `1px solid ${mod.color}18`,
              transform: "translateZ(4px)",
              opacity: hovered ? 1 : 0.7,
              transition: "opacity 0.3s",
            }}
          >
            {mod.preview.map((line, i) => (
              <div key={i} className={i === 1 ? "text-gray-600 pl-1" : i === 0 ? "text-gray-400" : ""}
                style={{ color: i === 2 ? mod.color : undefined }}>
                {i === 1 ? "" : "> "}{line}
              </div>
            ))}
          </div>

          {/* Description */}
          <p className="text-[11.5px] text-gray-500 leading-relaxed mb-4 flex-1" style={{ fontFamily: "system-ui" }}>
            {mod.desc}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {mod.tags.map(t => (
              <span key={t}
                className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{
                  color: mod.color, border: `1px solid ${mod.color}30`,
                  background: `${mod.color}0d`,
                }}>
                {t}
              </span>
            ))}
          </div>

          {/* CTA */}
          <Link href={mod.href}
            className="group/btn flex items-center justify-between px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all duration-200"
            style={{
              background:   hovered ? `${mod.color}18` : "transparent",
              border:       `1px solid ${mod.color}${hovered ? "40" : "20"}`,
              color:        hovered ? mod.color : "#6b7280",
              transition:   "all 0.25s",
            }}>
            <span>Open module</span>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
              style={{ transform: hovered ? "translateX(3px)" : "translateX(0)", transition: "transform 0.25s" }}>
              <path d="M1.5 6.5h10M7.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </TiltCard>
    </div>
  )
}

// ─── Floating particles ────────────────────────────────────────────────────────
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  x: `${(i * 5.8 + 3) % 96}%`,
  y: `${(i * 6.1 + 5) % 92}%`,
  val: ["3A","F2","C7","FF","AES","SHA","RSA","XOR","⊕","KEY","IV","01","E4","72","∑","∂","∇","🔑"][i],
  delay: `${(i * 0.37) % 4}s`,
  dur:   `${4 + (i % 4)}s`,
}))

// ─── Glitch text ───────────────────────────────────────────────────────────────
// glitch state must never be true on the server — only fire after mount.
function GlitchText({ text, color }: { text: string; color: string }) {
  const [mounted, setMounted] = useState(false)
  const [glitch,  setGlitch]  = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    let timeout: ReturnType<typeof setTimeout>
    const schedule = () => {
      timeout = setTimeout(() => {
        setGlitch(true)
        setTimeout(() => { setGlitch(false); schedule() }, 120)
      }, rand(3500, 6000))
    }
    schedule()
    return () => clearTimeout(timeout)
  }, [mounted])

  return (
    <span className="relative inline-block select-none" style={{ color }}>
      {text}
      {mounted && glitch && (
        <>
          <span className="absolute inset-0 pointer-events-none" style={{
            color: "#ff0055", transform: "translate(-2px,0)", opacity: 0.7, clipPath: "inset(30% 0 50% 0)",
          }}>{text}</span>
          <span className="absolute inset-0 pointer-events-none" style={{
            color: "#00ffff", transform: "translate(2px,0)", opacity: 0.7, clipPath: "inset(60% 0 10% 0)",
          }}>{text}</span>
        </>
      )}
    </span>
  )
}

// ─── Scroll progress bar ───────────────────────────────────────────────────────
function ScrollBar() {
  const [pct, setPct]         = useState(0)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const fn = () => {
      const { scrollTop: st, scrollHeight: sh, clientHeight: ch } = document.documentElement
      setPct(sh - ch > 0 ? (st / (sh - ch)) * 100 : 0)
    }
    window.addEventListener("scroll", fn, { passive: true })
    return () => window.removeEventListener("scroll", fn)
  }, [mounted])
  if (!mounted) return null
  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-[2px] bg-transparent pointer-events-none">
      <div className="h-full transition-all duration-100"
        style={{ width: `${pct}%`, background: "linear-gradient(90deg,#3b82f6,#8b5cf6,#ec4899)" }} />
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  // Boot is now handled by layout.tsx — homepage just starts in booted state
  const [booted, setBooted] = useState(false)
  const scrollY = useScrollY()

  useEffect(() => {
    // Small delay so hero animations play after layout fade-in
    const t = setTimeout(() => setBooted(true), 200)
    return () => clearTimeout(t)
  }, [])

  const heroTitle = useScramble("CRYPTOVERSE", 25, 300)
  const heroSub   = useScramble("INTERACTIVE CRYPTOGRAPHY LAB", 18, 600)

  // Parallax values derived from scrollY
  const parallaxSlow  = -scrollY * 0.18
  const parallaxMid   = -scrollY * 0.08
  const parallaxFast  = -scrollY * 0.35
  const heroOpacity   = clamp(1 - scrollY / 500, 0, 1)

  return (
    <>
      <ScrollBar />

      <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden"
        style={{ fontFamily: "'Courier New', Courier, monospace" }}>

        {/* ╔══ NAVBAR ══════════════════════════════════════════════════════╗ */}
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 py-4"
          style={{
            background: scrollY > 40 ? "rgba(5,5,5,0.92)" : "transparent",
            backdropFilter: scrollY > 40 ? "blur(20px)" : "none",
            borderBottom: scrollY > 40 ? "1px solid rgba(255,255,255,0.06)" : "none",
            transition: "all 0.4s ease",
          }}>
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black"
              style={{ background:"linear-gradient(135deg,#2563eb,#4f46e5)", boxShadow:"0 0 12px rgba(37,99,235,0.4)" }}>
              🔐
            </div>
            <span className="font-black text-[13px] tracking-tight text-white font-mono">CryptoVerse</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {[
              { label:"Contest",    href:"/contest"    },
              { label:"Battle",     href:"/battle"     },
              { label:"Blockchain", href:"/blockchain" },
              { label:"Pricing",    href:"/pricing"    },
            ].map(({ label, href }) => (
              <Link key={label} href={href}
                className="text-[12px] text-gray-500 hover:text-white transition-colors font-mono tracking-wide">
                {label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard"
              className="text-[12px] text-gray-500 hover:text-white px-4 py-2 rounded-lg transition-colors font-mono">
              Sign In
            </Link>
            <Link href="/contest"
              className="text-[12px] font-black text-white px-4 py-2 rounded-lg transition-all"
              style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow:"0 0 16px rgba(37,99,235,0.3)" }}>
              Play Free
            </Link>
          </div>
        </nav>

        {/* ╔══ HERO ═══════════════════════════════════════════════════════╗ */}
        <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">

          {/* Parallax matrix background */}
          <div className="absolute inset-0" style={{ transform: `translateY(${parallaxFast}px)` }}>
            <MatrixRain />
          </div>

          {/* Radial glow — moves slightly on scroll */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ transform: `translateY(${parallaxSlow}px)` }}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
              style={{ background: "radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)" }} />
            <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full"
              style={{ background: "radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)" }} />
          </div>

          {/* Hex particles parallax mid */}
          <div className="absolute inset-0 pointer-events-none select-none hidden sm:block"
            style={{ transform: `translateY(${parallaxMid}px)` }}>
            {PARTICLES.map((p, i) => (
              <span key={i} className="absolute font-mono text-[10px] text-blue-500/12 animate-pulse"
                style={{ left: p.x, top: p.y, animationDelay: p.delay, animationDuration: p.dur }}>
                {p.val}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.022] pointer-events-none"
            style={{
              backgroundImage: "linear-gradient(rgba(59,130,246,1) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,1) 1px,transparent 1px)",
              backgroundSize: "80px 80px",
              transform: `translateY(${parallaxMid}px)`,
            }} />

          {/* Vignette */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, transparent 35%, #050505 100%)" }} />

          {/* Hero content */}
          <div className="relative z-10 px-6 sm:px-10 max-w-5xl mx-auto w-full pt-24 pb-20"
            style={{ opacity: heroOpacity, transform: `translateY(${parallaxMid}px)` }}>

            {/* Status pill */}
            <div className="inline-flex items-center gap-2.5 border rounded-full px-3.5 py-1.5 mb-10"
              style={{
                borderColor: "rgba(59,130,246,0.22)",
                background: "rgba(59,130,246,0.05)",
                opacity: booted ? 1 : 0,
                transform: booted ? "translateY(0)" : "translateY(-12px)",
                transition: "all 0.7s cubic-bezier(0.23,1,0.32,1) 0.1s",
              }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
              </span>
              <span className="text-[10px] text-blue-400 tracking-[0.18em] uppercase">System Online</span>
              <span className="text-[10px] text-gray-700">|</span>
              <CipherTicker />
            </div>

            {/* Giant title */}
            <div style={{
              opacity: booted ? 1 : 0,
              transform: booted ? "translateY(0)" : "translateY(24px)",
              transition: "all 0.9s cubic-bezier(0.23,1,0.32,1) 0.3s",
            }}>
              <p className="text-[10px] text-gray-700 tracking-[0.4em] uppercase mb-4">▶ DECRYPTING...</p>

              <h1 className="leading-none tracking-[-0.03em] mb-3"
                style={{ fontSize: "clamp(60px, 12vw, 120px)", fontWeight: 900 }}>
                <GlitchText text={heroTitle}
                  color="transparent" />
                <span style={{
                  background: "linear-gradient(135deg, #fff 0%, #93c5fd 35%, #3b82f6 65%, #4f46e5 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  display: "block",
                  lineHeight: 1,
                }}>
                  {heroTitle}
                </span>
              </h1>

              <p className="text-[12px] sm:text-[14px] tracking-[0.28em] uppercase mb-8"
                style={{ color: "rgba(96,165,250,0.45)" }}>
                {heroSub}
              </p>
            </div>

            {/* Description */}
            <p className="text-[14px] sm:text-[15px] text-gray-400 max-w-xl leading-relaxed mb-10"
              style={{
                fontFamily: "system-ui",
                opacity: booted ? 1 : 0,
                transform: booted ? "translateY(0)" : "translateY(16px)",
                transition: "all 0.9s cubic-bezier(0.23,1,0.32,1) 0.55s",
              }}>
              From ancient Caesar shifts to modern AES rounds — explore, interact,
              and compete in a cryptography lab that actually shows you what's happening inside.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mb-16"
              style={{
                opacity: booted ? 1 : 0,
                transform: booted ? "translateY(0)" : "translateY(12px)",
                transition: "all 0.9s cubic-bezier(0.23,1,0.32,1) 0.75s",
              }}>
              <Link href="/contest"
                className="relative group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-[13px] font-black text-white overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  boxShadow: "0 0 40px rgba(59,130,246,0.4), 0 4px 16px rgba(0,0,0,0.4)",
                }}>
                <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-[0.07] transition-opacity duration-200 rounded-xl" />
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                </span>
                Play Today's Contest
              </Link>
              <Link href="/classical"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-[13px] font-bold transition-all duration-200 hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.12)", color: "#d1d5db" }}>
                Explore Ciphers
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M1.5 5.5h8M6.5 2.5l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <Link href="/blockchain"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-[13px] font-bold transition-all duration-200 hover:bg-emerald-500/5"
                style={{ border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80" }}>
                ⛓ Blockchain Lab
              </Link>
            </div>

            {/* Stats bar */}
            <div className="overflow-hidden rounded-2xl"
              style={{
                border: "1px solid rgba(255,255,255,0.055)",
                opacity: booted ? 1 : 0,
                transition: "opacity 0.9s ease 1s",
              }}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[rgba(255,255,255,0.04)]">
                {[
                  { n: 6,    s: "+", label: "Ciphers",    c: "#3b82f6" },
                  { n: 10,   s: "",  label: "AES Rounds", c: "#10b981" },
                  { n: 2048, s: "b", label: "RSA Key",    c: "#8b5cf6" },
                  { n: 9,    s: "",  label: "Algorithms", c: "#f59e0b" },
                ].map(({ n, s, label, c }) => (
                  <div key={label} className="bg-[#080808] px-5 py-5 text-center">
                    <p className="text-[22px] sm:text-[26px] font-black leading-none mb-1" style={{ color: c }}>
                      <Counter to={n} suffix={s} />
                    </p>
                    <p className="text-[9px] text-gray-600 uppercase tracking-[0.15em]">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scroll cue */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
            style={{ opacity: heroOpacity }}>
            <span className="text-[8px] text-gray-700 tracking-[0.3em] uppercase animate-bounce">Scroll</span>
            <div className="w-px h-8 overflow-hidden">
              <div className="w-full bg-blue-500/50 animate-[drip_1.5s_ease-in-out_infinite]"
                style={{ height: "50%", animation: "drip 1.5s ease-in-out infinite" }} />
            </div>
          </div>
        </section>

        {/* ╔══ SECTION DIVIDER ═════════════════════════════════════════════╗ */}
        <div className="relative h-px overflow-visible flex items-center justify-center">
          <div className="absolute inset-x-0 top-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.3), transparent)" }} />
          <div className="relative z-10 bg-[#050505] px-4">
            <span className="font-mono text-[9px] text-blue-500/40 tracking-[0.3em] uppercase">
              ── MODULES BELOW ──
            </span>
          </div>
        </div>

        {/* ╔══ MODULES ═════════════════════════════════════════════════════╗ */}
        <section className="px-6 sm:px-10 py-24 max-w-5xl mx-auto">
          {/* Section header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-[10px] text-blue-500 tracking-[0.3em] uppercase font-bold">// MODULES</span>
              <div className="flex-1 h-px"
                style={{ background: "linear-gradient(90deg, rgba(59,130,246,0.25), transparent)" }} />
              <span className="font-mono text-[9px] text-gray-700">09 available</span>
            </div>
            <h2 className="leading-tight mb-3"
              style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 900 }}>
              <span className="text-white">Choose Your </span>
              <GlitchText text="Module" color="#3b82f6" />
            </h2>
            <p className="text-[13px] text-gray-600 max-w-md" style={{ fontFamily: "system-ui" }}>
              Hover cards to feel the 3D depth. Every module is a live interactive simulation.
            </p>
          </div>

          {/* 3-col grid on large, 2-col on md, 1-col on sm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODULES.map((mod, i) => (
              <ModuleCard key={mod.id} mod={mod} index={i} />
            ))}
          </div>
        </section>


        {/* ╔══ STATS BAR ════════════════════════════════════════════════╗ */}
        <section className="py-16 px-6 sm:px-10" style={{ borderTop:"1px solid rgba(255,255,255,0.05)", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
          <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[
              { value:"700+", label:"Cipher Puzzles",    color:"#60a5fa" },
              { value:"27",   label:"Achievements",      color:"#fbbf24" },
              { value:"9",    label:"Modules",           color:"#4ade80" },
              { value:"FREE", label:"To Get Started",    color:"#f472b6" },
            ].map(({ value, label, color }) => (
              <div key={label} className="group cursor-default">
                <p className="text-[42px] font-black leading-none mb-2 transition-transform group-hover:scale-110"
                  style={{ color, textShadow:`0 0 40px ${color}50` }}>{value}</p>
                <p className="text-[11px] text-gray-600 uppercase tracking-[0.15em] font-semibold">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ╔══ FEATURES ════════════════════════════════════════════════╗ */}
        <section className="px-6 sm:px-10 py-24 max-w-5xl mx-auto">
          <div className="mb-14 text-center">
            <span className="font-mono text-[10px] text-emerald-500 tracking-[0.3em] uppercase font-bold">// WHY CRYPTOVERSE</span>
            <h2 className="mt-3 text-white font-black leading-tight"
              style={{ fontSize:"clamp(28px,5vw,44px)" }}>
              Not just another tutorial.<br/>
              <span style={{ color:"#4ade80" }}>A full competitive platform.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon:"⚔️", color:"#f87171", glow:"rgba(248,113,113,0.2)",
                title:"Real Competition",
                desc:"Daily contests with Elo ratings, global leaderboards, and live 1v1 cipher battles. Your ranking updates after every solve."
              },
              {
                icon:"🔐", color:"#60a5fa", glow:"rgba(96,165,250,0.2)",
                title:"Real Cryptography",
                desc:"SHA-256, ECDSA, AES-128, RSA-OAEP — built with the browser's native Web Crypto API. No simulations, no shortcuts."
              },
              {
                icon:"🏆", color:"#fbbf24", glow:"rgba(251,191,36,0.2)",
                title:"Real Rewards",
                desc:"Earn coins, unlock 27 achievement badges, buy power-ups, get verifiable certificates. Progress that actually means something."
              },
              {
                icon:"⚡", color:"#a78bfa", glow:"rgba(167,139,250,0.2)",
                title:"Speed Round",
                desc:"60 seconds. Unlimited ciphers. How many can you solve? Your personal best is tracked and shown on your profile."
              },
              {
                icon:"⛓", color:"#4ade80", glow:"rgba(74,222,128,0.2)",
                title:"Blockchain Lab",
                desc:"Mine real blocks with SHA-256, generate ECDSA wallets, send transactions, mint tokens — a complete guided blockchain tutorial."
              },
              {
                icon:"👥", color:"#f472b6", glow:"rgba(244,114,182,0.2)",
                title:"Friends & Social",
                desc:"Add friends, compare ratings on a private leaderboard, and challenge them directly to battles. Cryptography is better together."
              },
            ].map(({ icon, color, glow, title, desc }) => (
              <div key={title}
                className="rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 cursor-default group"
                style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${color}40`; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 32px ${glow}` }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4"
                  style={{ background:`${color}12`, border:`1px solid ${color}30` }}>
                  {icon}
                </div>
                <p className="text-[15px] font-black text-white mb-2">{title}</p>
                <p className="text-[12px] text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ╔══ SOCIAL PROOF ════════════════════════════════════════════════╗ */}
        <section className="px-6 sm:px-10 py-16 max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="font-mono text-[10px] text-gray-600 tracking-[0.3em] uppercase">// What learners say</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { quote:"The blockchain chapter is genuinely the best explanation of SHA-256 mining I've seen. Better than any YouTube video.", name:"Rohan M.", role:"CS Student, NIT", color:"#60a5fa" },
              { quote:"I studied cryptography for 2 semesters but the AES visualizer here made it click in 10 minutes. The state matrix is genius.", name:"Priya S.", role:"Software Engineer", color:"#4ade80" },
              { quote:"Cipher Battle with my friends is addictive. It's the only platform that made me actually want to learn this stuff.", name:"Aditya K.", role:"Final Year B.Tech", color:"#a78bfa" },
            ].map(({ quote, name, role, color }) => (
              <div key={name} className="rounded-2xl p-6 relative"
                style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)" }}>
                <div className="text-3xl mb-4 opacity-40" style={{ color }}>"</div>
                <p className="text-[13px] text-gray-400 leading-relaxed mb-5 italic">{quote}</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black"
                    style={{ background:`${color}20`, color, border:`1px solid ${color}30` }}>
                    {name[0]}
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-white">{name}</p>
                    <p className="text-[10px] text-gray-600">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ╔══ HOW IT WORKS ════════════════════════════════════════════════╗ */}
        <section className="px-6 sm:px-10 py-20"
          style={{ background:"rgba(255,255,255,0.01)", borderTop:"1px solid rgba(255,255,255,0.05)", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <span className="font-mono text-[10px] text-blue-500 tracking-[0.3em] uppercase font-bold">// HOW IT WORKS</span>
              <h2 className="mt-3 text-white font-black" style={{ fontSize:"clamp(24px,4vw,38px)" }}>
                From zero to Cryptanalyst
              </h2>
            </div>
            <div className="space-y-0">
              {[
                { step:"01", color:"#60a5fa", title:"Create your account",      desc:"Free signup. No credit card. You get 1000 rating, 0 coins, and a clean slate.",        icon:"👤" },
                { step:"02", color:"#4ade80", title:"Learn the fundamentals",   desc:"Start with Classical Ciphers — Caesar, Vigenère, Playfair. Then Symmetric, Hashing, Asymmetric.", icon:"📚" },
                { step:"03", color:"#fbbf24", title:"Compete in Daily Contests", desc:"One cipher puzzle every day. Solve it, earn coins, climb the leaderboard.",         icon:"📅" },
                { step:"04", color:"#f87171", title:"Battle other players",      desc:"Challenge anyone to a live 1v1 cipher race. First to decrypt wins.",                  icon:"⚔️" },
                { step:"05", color:"#a78bfa", title:"Earn & unlock",            desc:"Collect 27 achievement badges. Buy power-ups. Get certified. Go Pro.",                icon:"🏆" },
              ].map(({ step, color, title, desc, icon }, i) => (
                <div key={step} className="flex gap-6 py-6"
                  style={{ borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <div className="shrink-0 flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-[13px]"
                      style={{ background:`${color}15`, border:`1.5px solid ${color}40`, color }}>
                      {step}
                    </div>
                    {i < 4 && <div className="w-px flex-1 min-h-[20px]" style={{ background:`${color}20` }}/>}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{icon}</span>
                      <p className="text-[15px] font-black text-white">{title}</p>
                    </div>
                    <p className="text-[12px] text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ╔══ PRICING PREVIEW ════════════════════════════════════════════════╗ */}
        <section className="px-6 sm:px-10 py-24 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="font-mono text-[10px] text-amber-500 tracking-[0.3em] uppercase font-bold">// PRICING</span>
            <h2 className="mt-3 text-white font-black" style={{ fontSize:"clamp(24px,4vw,38px)" }}>
              Free to start. Pro to dominate.
            </h2>
            <p className="text-[13px] text-gray-600 mt-2">No paywalls on learning. Pro unlocks competitive advantages.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {/* Free */}
            <div className="rounded-2xl p-6" style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-2">Free</p>
              <p className="text-[36px] font-black text-white mb-4">₹0 <span className="text-[14px] text-gray-600 font-normal">forever</span></p>
              <ul className="space-y-2.5 mb-6">
                {["All cipher visualizers","Daily Contest","Cipher Challenge","Speed Round","Cipher Battle","Basic profile & achievements"].map(f=>(
                  <li key={f} className="flex items-center gap-2 text-[12px] text-gray-400">
                    <span className="text-gray-600">✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/dashboard"
                className="block w-full py-2.5 rounded-xl text-[12px] font-bold text-center text-gray-400 transition-colors hover:text-white"
                style={{ border:"1px solid rgba(255,255,255,0.1)" }}>
                Get Started Free
              </Link>
            </div>
            {/* Pro */}
            <div className="rounded-2xl p-6 relative overflow-hidden"
              style={{ background:"rgba(251,191,36,0.05)", border:"2px solid rgba(251,191,36,0.3)", boxShadow:"0 0 40px rgba(251,191,36,0.08)" }}>
              <div className="absolute top-4 right-4 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
                style={{ background:"rgba(251,191,36,0.2)", color:"#fbbf24", border:"1px solid rgba(251,191,36,0.4)" }}>
                POPULAR
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color:"#fbbf24" }}>💎 Pro</p>
              <p className="text-[36px] font-black text-white mb-4">₹99 <span className="text-[14px] text-gray-500 font-normal">/month</span></p>
              <ul className="space-y-2.5 mb-6">
                {["Everything in Free","Unlimited Speed Rounds","Hard difficulty unlocked","Pro badge on profile","Downloadable certificates","Priority support"].map(f=>(
                  <li key={f} className="flex items-center gap-2 text-[12px] text-gray-300">
                    <span style={{ color:"#fbbf24" }}>✦</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/pricing"
                className="block w-full py-2.5 rounded-xl text-[13px] font-black text-center text-white transition-all hover:brightness-110"
                style={{ background:"linear-gradient(135deg,#d97706,#b45309)", boxShadow:"0 0 20px rgba(217,119,6,0.35)" }}>
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </section>

        {/* ╔══ FINAL CTA ════════════════════════════════════════════════╗ */}
        <section className="px-6 sm:px-10 py-24 relative overflow-hidden"
          style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-20"
              style={{ background:"linear-gradient(90deg,#3b82f6,#8b5cf6)" }}/>
          </div>
          <div className="max-w-2xl mx-auto text-center relative z-10">
            <p className="font-mono text-[10px] text-blue-500 tracking-[0.3em] uppercase font-bold mb-4">// START NOW</p>
            <h2 className="text-white font-black mb-4 leading-tight"
              style={{ fontSize:"clamp(28px,6vw,52px)" }}>
              The cipher won&apos;t<br/>
              <span style={{ color:"#60a5fa" }}>decrypt itself.</span>
            </h2>
            <p className="text-[14px] text-gray-500 mb-8 leading-relaxed">
              Join thousands of students learning cryptography the right way —<br/>
              by actually breaking codes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/contest"
                className="px-8 py-4 rounded-2xl text-[14px] font-black text-white transition-all hover:brightness-110"
                style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow:"0 0 32px rgba(37,99,235,0.4)" }}>
                Start Daily Contest →
              </Link>
              <Link href="/blockchain"
                className="px-8 py-4 rounded-2xl text-[14px] font-black transition-all hover:bg-white/10"
                style={{ border:"1px solid rgba(255,255,255,0.15)", color:"#9ca3af" }}>
                Explore Blockchain Lab
              </Link>
            </div>
            <p className="text-[11px] text-gray-700 mt-5">Free forever · No credit card · 200+ puzzles waiting</p>
          </div>
        </section>

        {/* ╔══ BOTTOM STRIP ════════════════════════════════════════════════╗ */}
        <footer className="px-6 sm:px-10 py-8"
          style={{ borderTop: "1px solid rgba(255,255,255,0.045)" }}>
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center"
                style={{ boxShadow: "0 0 16px rgba(59,130,246,0.4)" }}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1.5L2 4.5v5l5 3 5-3v-5L7 1.5z" stroke="white" strokeWidth="1.3" strokeLinejoin="round"/>
                  <circle cx="7" cy="7" r="1.5" fill="white"/>
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-bold text-white leading-tight">CryptoVerse</p>
                <p className="text-[9px] text-gray-700 tracking-[0.15em] uppercase">© 2026 Priyanshu Roy · All Rights Reserved</p>
              </div>
            </div>
            <nav className="flex flex-wrap gap-x-5 gap-y-2">
              {[
                ["Contest",      "/contest"],
                ["Challenge",    "/challenge"],
                ["Battle",       "/battle"],
                ["Blockchain",   "/blockchain"],
                ["Friends",      "/friends"],
                ["Pricing",      "/pricing"],
                ["Certificates", "/certificates"],
                ["Profile",      "/profile"],
              ].map(([label, href]) => (
                <Link key={label} href={href}
                  className="text-[11px] font-mono text-gray-700 hover:text-blue-400 transition-colors tracking-wider">
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </footer>
      </div>

      {/* Drip keyframe */}
      <style>{`
        @keyframes drip {
          0%   { transform: translateY(-100%); opacity: 1; }
          80%  { transform: translateY(200%);  opacity: 0.2; }
          100% { transform: translateY(-100%); opacity: 0; }
        }
      `}</style>
    </>
  )
}