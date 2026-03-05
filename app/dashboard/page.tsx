"use client"

import { useState, useEffect } from "react"

// ── Types ──────────────────────────────────────────────────────────────────────
interface AlgoMeta {
  name: string
  type: string
  keySize: string
  blockSize: string
  security: number   // 0-100
  speed: number      // 0-100
  memory: number     // 0-100
  simplicity: number // 0-100
  color: string
  accent: string
  yearIntroduced: number
  broken: boolean
}

// ── Data ───────────────────────────────────────────────────────────────────────
const ALGORITHMS: AlgoMeta[] = [
  { name: "Caesar",      type: "Classical",   keySize: "5 bit",    blockSize: "—",       security: 2,  speed: 99, memory: 99, simplicity: 98, color: "#f97316", accent: "text-orange-400",  yearIntroduced: -50,  broken: true  },
  { name: "Vigenère",    type: "Classical",   keySize: "variable", blockSize: "—",       security: 12, speed: 97, memory: 97, simplicity: 80, color: "#fb923c", accent: "text-orange-300",  yearIntroduced: 1553, broken: true  },
  { name: "AES-128",     type: "Symmetric",   keySize: "128 bit",  blockSize: "128 bit", security: 96, speed: 88, memory: 82, simplicity: 30, color: "#3b82f6", accent: "text-blue-400",    yearIntroduced: 2001, broken: false },
  { name: "AES-256",     type: "Symmetric",   keySize: "256 bit",  blockSize: "128 bit", security: 99, speed: 82, memory: 78, simplicity: 28, color: "#60a5fa", accent: "text-blue-300",    yearIntroduced: 2001, broken: false },
  { name: "DES",         type: "Symmetric",   keySize: "56 bit",   blockSize: "64 bit",  security: 18, speed: 72, memory: 80, simplicity: 55, color: "#a78bfa", accent: "text-violet-400",  yearIntroduced: 1977, broken: true  },
  { name: "3DES",        type: "Symmetric",   keySize: "168 bit",  blockSize: "64 bit",  security: 55, speed: 35, memory: 72, simplicity: 45, color: "#8b5cf6", accent: "text-violet-500",  yearIntroduced: 1998, broken: false },
  { name: "SHA-256",     type: "Hashing",     keySize: "—",        blockSize: "256 bit", security: 95, speed: 85, memory: 88, simplicity: 40, color: "#10b981", accent: "text-emerald-400", yearIntroduced: 2001, broken: false },
  { name: "SHA-512",     type: "Hashing",     keySize: "—",        blockSize: "512 bit", security: 98, speed: 78, memory: 75, simplicity: 38, color: "#34d399", accent: "text-emerald-300", yearIntroduced: 2001, broken: false },
  { name: "RSA-2048",    type: "Asymmetric",  keySize: "2048 bit", blockSize: "—",       security: 88, speed: 12, memory: 45, simplicity: 25, color: "#f59e0b", accent: "text-amber-400",   yearIntroduced: 1977, broken: false },
]

const TYPE_COLORS: Record<string, string> = {
  Classical:  "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Symmetric:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Hashing:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Asymmetric: "bg-amber-500/10 text-amber-400 border-amber-500/20",
}

// ── Radar Chart ────────────────────────────────────────────────────────────────
const RADAR_AXES = ["Security", "Speed", "Memory", "Simplicity"]

function polarToCart(angle: number, r: number, cx: number, cy: number) {
  const rad = (angle - 90) * (Math.PI / 180)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function RadarChart({ algos }: { algos: AlgoMeta[] }) {
  const cx = 160, cy = 160, maxR = 120
  const n = RADAR_AXES.length
  const rings = [25, 50, 75, 100]

  const getPath = (algo: AlgoMeta) => {
    const vals = [algo.security, algo.speed, algo.memory, algo.simplicity]
    return vals.map((v, i) => {
      const angle = (360 / n) * i
      const r = (v / 100) * maxR
      const p = polarToCart(angle, r, cx, cy)
      return `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`
    }).join(" ") + " Z"
  }

  return (
    <svg viewBox="0 0 320 320" className="w-full max-w-xs mx-auto">
      {/* Rings */}
      {rings.map((r) => {
        const pts = RADAR_AXES.map((_, i) => {
          const p = polarToCart((360 / n) * i, (r / 100) * maxR, cx, cy)
          return `${p.x},${p.y}`
        }).join(" ")
        return <polygon key={r} points={pts} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      })}

      {/* Axis lines */}
      {RADAR_AXES.map((_, i) => {
        const p = polarToCart((360 / n) * i, maxR, cx, cy)
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
      })}

      {/* Axis labels */}
      {RADAR_AXES.map((label, i) => {
        const p = polarToCart((360 / n) * i, maxR + 18, cx, cy)
        return (
          <text key={label} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            className="fill-gray-600 text-[9px]" fontSize="9" fontFamily="monospace">
            {label.toUpperCase()}
          </text>
        )
      })}

      {/* Algorithm paths */}
      {algos.map((algo) => (
        <path key={algo.name} d={getPath(algo)} fill={algo.color + "22"} stroke={algo.color}
          strokeWidth="1.5" strokeLinejoin="round" className="transition-all duration-300" />
      ))}

      {/* Center dot */}
      <circle cx={cx} cy={cy} r="3" fill="rgba(255,255,255,0.1)" />
    </svg>
  )
}

// ── Security Badge ─────────────────────────────────────────────────────────────
function SecurityBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-mono text-gray-500 w-6 text-right">{value}</span>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [selected, setSelected] = useState<string[]>(["AES-128", "SHA-256", "RSA-2048"])
  const [activeTab, setActiveTab] = useState<"overview" | "radar" | "timeline">("overview")
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const toggleAlgo = (name: string) => {
    setSelected((prev) =>
      prev.includes(name)
        ? prev.length > 1 ? prev.filter((n) => n !== name) : prev
        : prev.length < 4 ? [...prev, name] : prev
    )
  }

  const selectedAlgos = ALGORITHMS.filter((a) => selected.includes(a.name))

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-white tracking-tight mb-0.5">Performance Dashboard</h1>
        <p className="text-[13px] text-gray-500">Compare algorithm security, speed, and trade-offs at a glance.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-7">
        {[
          { label: "Algorithms", value: ALGORITHMS.length.toString(), sub: "tracked" },
          { label: "Broken",     value: ALGORITHMS.filter(a => a.broken).length.toString(), sub: "insecure", warn: true },
          { label: "Max Security", value: "99",  sub: "AES-256" },
          { label: "Fastest",    value: "99",  sub: "Caesar" },
        ].map(({ label, value, sub, warn }) => (
          <div key={label} className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4">
            <p className={`text-2xl font-bold ${warn ? "text-red-400" : "text-white"}`}>{value}</p>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-0.5">{label}</p>
            <p className="text-[10px] text-gray-700 font-mono mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-gray-900/60 border border-gray-800/80 rounded-xl p-1 mb-6 w-fit">
        {(["overview", "radar", "timeline"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 text-[12px] font-medium rounded-lg transition-all capitalize ${
              activeTab === t ? "bg-white text-black" : "text-gray-500 hover:text-gray-300"
            }`}>{t}</button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === "overview" && (
        <div className="space-y-2">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_90px_90px_1fr_1fr_1fr_1fr_60px] gap-3 px-4 py-2">
            {["Algorithm", "Type", "Key Size", "Security", "Speed", "Memory", "Simplicity", "Status"].map((h) => (
              <p key={h} className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">{h}</p>
            ))}
          </div>

          {ALGORITHMS.map((algo, i) => (
            <div key={algo.name}
              className={`grid grid-cols-[1fr_90px_90px_1fr_1fr_1fr_1fr_60px] gap-3 items-center px-4 py-3 rounded-xl border transition-all duration-150 ${
                selected.includes(algo.name)
                  ? "bg-gray-900/80 border-gray-700/60"
                  : "bg-gray-900/30 border-gray-800/30 opacity-60"
              }`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: algo.color }} />
                <span className="text-[13px] font-medium text-white">{algo.name}</span>
              </div>
              <span className={`text-[10px] font-semibold border px-1.5 py-0.5 rounded-full w-fit ${TYPE_COLORS[algo.type]}`}>
                {algo.type}
              </span>
              <span className="text-[11px] font-mono text-gray-500">{algo.keySize}</span>
              <SecurityBar value={algo.security} color={algo.security > 70 ? "#10b981" : algo.security > 30 ? "#f59e0b" : "#ef4444"} />
              <SecurityBar value={algo.speed}    color={algo.color} />
              <SecurityBar value={algo.memory}   color={algo.color} />
              <SecurityBar value={algo.simplicity} color={algo.color} />
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${algo.broken ? "text-red-400" : "text-emerald-400"}`}>
                {algo.broken ? "Broken" : "Secure"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Radar ── */}
      {activeTab === "radar" && (
        <div className="grid grid-cols-[1fr_220px] gap-6">
          <div className="bg-gray-900/60 border border-gray-800/60 rounded-2xl p-6">
            <p className="text-[11px] text-gray-600 uppercase tracking-widest mb-4">Multi-Axis Comparison</p>
            <RadarChart algos={selectedAlgos} />
            <div className="flex flex-wrap gap-3 mt-4 justify-center">
              {selectedAlgos.map((a) => (
                <div key={a.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                  <span className="text-[11px] text-gray-400">{a.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] text-gray-600 uppercase tracking-widest mb-3">Select up to 4</p>
            {ALGORITHMS.map((algo) => {
              const active = selected.includes(algo.name)
              return (
                <button key={algo.name} onClick={() => toggleAlgo(algo.name)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] border transition-all ${
                    active
                      ? "bg-gray-800/80 border-gray-600/60 text-white"
                      : "bg-gray-900/30 border-gray-800/30 text-gray-500 hover:text-gray-300"
                  }`}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: active ? algo.color : "#374151" }} />
                  {algo.name}
                  <span className={`ml-auto text-[9px] border px-1.5 py-0.5 rounded-full ${TYPE_COLORS[algo.type]}`}>
                    {algo.type}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Timeline ── */}
      {activeTab === "timeline" && (
        <div className="bg-gray-900/60 border border-gray-800/60 rounded-2xl p-6">
          <p className="text-[11px] text-gray-600 uppercase tracking-widest mb-6">Algorithm Introduction Timeline</p>
          <div className="relative">
            {/* Line */}
            <div className="absolute left-24 top-0 bottom-0 w-px bg-gray-800" />

            <div className="space-y-4">
              {[...ALGORITHMS].sort((a, b) => a.yearIntroduced - b.yearIntroduced).map((algo) => (
                <div key={algo.name} className="flex items-center gap-4">
                  <span className="text-[11px] font-mono text-gray-600 w-20 text-right shrink-0">
                    {algo.yearIntroduced < 0 ? `${Math.abs(algo.yearIntroduced)} BC` : algo.yearIntroduced}
                  </span>
                  <div className="relative z-10 w-2.5 h-2.5 rounded-full border-2 shrink-0"
                    style={{ backgroundColor: algo.color + "44", borderColor: algo.color }} />
                  <div className="flex-1 flex items-center gap-3">
                    <span className="text-[13px] font-medium text-white">{algo.name}</span>
                    <span className={`text-[9px] border px-1.5 py-0.5 rounded-full ${TYPE_COLORS[algo.type]}`}>
                      {algo.type}
                    </span>
                    {algo.broken && (
                      <span className="text-[9px] text-red-400 border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                        Broken
                      </span>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <div className="w-24 h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${algo.security}%`, backgroundColor: algo.color }} />
                      </div>
                      <span className="text-[10px] font-mono text-gray-600">{algo.security}/100</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}