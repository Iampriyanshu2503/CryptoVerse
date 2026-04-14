"use client"

import { useState, useEffect, useRef } from "react"
import { ACHIEVEMENTS, RARITY, getUnlocked } from "@/lib/achievements"
import { useAuth } from "@/lib/AuthContext"
import { supabase, type ContestEntry } from "@/lib/supabase"
import AuthModal from "@/components/AuthModal"
import EditProfileModal from "@/components/EditProfileModal"

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(s: number) {
  const m = Math.floor(s / 60), sec = s % 60
  return m > 0 ? `${m}m ${String(sec).padStart(2,"0")}s` : `${sec}s`
}

function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) { setVal(0); return }
    let start = 0, startTime: number | null = null
    const step = (t: number) => {
      if (!startTime) startTime = t
      const p = Math.min((t - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(ease * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return val
}

const TIERS = [
  { name:"Novice",       min:0,    color:"#9ca3af", glow:"rgba(156,163,175,0.2)",  icon:"🔰", bg:"rgba(156,163,175,0.06)" },
  { name:"Apprentice",   min:500,  color:"#4ade80", glow:"rgba(74,222,128,0.2)",   icon:"⚡", bg:"rgba(74,222,128,0.06)" },
  { name:"Cryptanalyst", min:1000, color:"#60a5fa", glow:"rgba(96,165,250,0.2)",   icon:"🔍", bg:"rgba(96,165,250,0.06)" },
  { name:"Specialist",   min:1500, color:"#a78bfa", glow:"rgba(167,139,250,0.2)",  icon:"💎", bg:"rgba(167,139,250,0.06)" },
  { name:"Expert",       min:2000, color:"#fbbf24", glow:"rgba(251,191,36,0.2)",   icon:"🏆", bg:"rgba(251,191,36,0.06)" },
  { name:"Master",       min:2500, color:"#f87171", glow:"rgba(248,113,113,0.2)",  icon:"👑", bg:"rgba(248,113,113,0.06)" },
]
function getTier(r: number) { return [...TIERS].reverse().find(t => r >= t.min) ?? TIERS[0] }

const DIFF_COLORS: Record<string,string> = { Easy:"#4ade80", Medium:"#fbbf24", Hard:"#f87171" }

// ─── RatingChart ──────────────────────────────────────────────────────────────
function RatingChart({ data, dates, color, glow }: {
  data: number[]; dates?: string[]; color: string; glow: string
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [svgW, setSvgW] = useState(800)

  useEffect(() => {
    if (!svgRef.current) return
    const obs = new ResizeObserver(e => setSvgW(e[0].contentRect.width))
    obs.observe(svgRef.current)
    return () => obs.disconnect()
  }, [])

  if (data.length < 2) return null

  // Layout constants
  const W = svgW, H = 200
  const PAD_L = 52, PAD_R = 20, PAD_T = 20, PAD_B = 36

  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B

  const rawMin = Math.min(...data)
  const rawMax = Math.max(...data)
  const range  = Math.max(rawMax - rawMin, 80)
  const mn = rawMin - range * 0.12
  const mx = rawMax + range * 0.12

  const toX = (i: number) => PAD_L + (i / (data.length - 1)) * chartW
  const toY = (v: number) => PAD_T + chartH - ((v - mn) / (mx - mn)) * chartH

  const pts = data.map((v, i) => ({ x: toX(i), y: toY(v), v }))

  // Smooth bezier path
  const lineD = pts.map((p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const pp = pts[i - 1]
    const cpx = (pp.x + p.x) / 2
    return `C ${cpx} ${pp.y} ${cpx} ${p.y} ${p.x} ${p.y}`
  }).join(" ")

  const areaD = `${lineD} L ${pts[pts.length-1].x} ${PAD_T + chartH} L ${PAD_L} ${PAD_T + chartH} Z`

  // Y-axis grid values
  const yTicks = 4
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => Math.round(mn + (mx - mn) * (i / yTicks)))

  // Which dots to show (always first, last, and every nth)
  const step = data.length <= 8 ? 1 : Math.ceil(data.length / 8)
  const visibleDots = pts.filter((_, i) => i % step === 0 || i === pts.length - 1)

  const last = pts[pts.length - 1]
  const allTimeChange = data[data.length - 1] - data[0]
  const isUp = allTimeChange >= 0

  return (
    <div className="relative w-full select-none" style={{ height: H }}>
      <svg ref={svgRef} width="100%" height={H} style={{ overflow: "visible" }}
        onMouseLeave={() => setHovered(null)}>
        <defs>
          <linearGradient id="rc-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.22"/>
            <stop offset="70%"  stopColor={color} stopOpacity="0.06"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="rc-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor={color} stopOpacity="0.4"/>
            <stop offset="100%" stopColor={color} stopOpacity="1"/>
          </linearGradient>
          <filter id="rc-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="rc-dot-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <clipPath id="rc-clip">
            <rect x={PAD_L} y={PAD_T} width={chartW} height={chartH}/>
          </clipPath>
        </defs>

        {/* Y-axis labels + grid */}
        {yLabels.map((v, i) => {
          const y = toY(v)
          return (
            <g key={i}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                stroke="rgba(255,255,255,0.045)" strokeWidth="1"
                strokeDasharray={i === 0 ? "none" : "3 5"}/>
              <text x={PAD_L - 8} y={y + 4} textAnchor="end"
                style={{ fontSize: 9, fill: "rgba(255,255,255,0.25)", fontFamily:"monospace" }}>
                {v}
              </text>
            </g>
          )
        })}

        {/* X-axis baseline */}
        <line x1={PAD_L} y1={PAD_T + chartH} x2={W - PAD_R} y2={PAD_T + chartH}
          stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>

        {/* Area fill (clipped) */}
        <g clipPath="url(#rc-clip)">
          <path d={areaD} fill="url(#rc-area)"/>
        </g>

        {/* Main line */}
        <path d={lineD} stroke="url(#rc-line)" strokeWidth="2.5" fill="none"
          filter="url(#rc-glow)" strokeLinecap="round" strokeLinejoin="round"
          clipPath="url(#rc-clip)"/>

        {/* Hover vertical line */}
        {hovered !== null && (
          <line x1={pts[hovered].x} y1={PAD_T} x2={pts[hovered].x} y2={PAD_T + chartH}
            stroke={color} strokeWidth="1" strokeDasharray="3 4" opacity="0.4"/>
        )}

        {/* Data dots */}
        {visibleDots.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4"
            fill={color} stroke="rgba(5,5,10,0.95)" strokeWidth="2"
            filter="url(#rc-dot-glow)" opacity="0.85"/>
        ))}

        {/* Hover zone (invisible rects per segment) */}
        {pts.map((p, i) => (
          <rect key={i}
            x={i === 0 ? PAD_L : (pts[i-1].x + p.x) / 2}
            y={PAD_T}
            width={i === 0
              ? (pts[1]?.x - PAD_L) / 2 || chartW
              : i === pts.length - 1
                ? p.x - (pts[i-1].x + p.x) / 2
                : (pts[i+1]?.x - pts[i-1].x) / 2}
            height={chartH}
            fill="transparent"
            onMouseEnter={() => setHovered(i)}/>
        ))}

        {/* Hovered dot (enlarged) */}
        {hovered !== null && (
          <>
            <circle cx={pts[hovered].x} cy={pts[hovered].y} r="8" fill={color} opacity="0.15"/>
            <circle cx={pts[hovered].x} cy={pts[hovered].y} r="5"
              fill={color} stroke="rgba(5,5,10,0.95)" strokeWidth="2.5"/>
          </>
        )}

        {/* Live pulse on last point */}
        <circle cx={last.x} cy={last.y} r="9" fill={color} opacity="0.08">
          <animate attributeName="r" values="6;12;6" dur="2.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.12;0;0.12" dur="2.5s" repeatCount="indefinite"/>
        </circle>
        <circle cx={last.x} cy={last.y} r="5"
          fill={color} stroke="rgba(5,5,10,0.95)" strokeWidth="2.5"
          filter="url(#rc-dot-glow)"/>

        {/* X-axis labels (contest indices) */}
        {pts.filter((_, i) => i === 0 || i === pts.length - 1 || (data.length > 4 && i === Math.floor(pts.length / 2))).map((p, i, arr) => (
          <text key={i} x={p.x} y={H - 4} textAnchor="middle"
            style={{ fontSize:9, fill:"rgba(255,255,255,0.2)", fontFamily:"monospace" }}>
            {i === 0 ? "Start" : i === arr.length - 1 ? "Latest" : `#${Math.floor(data.length/2)}`}
          </text>
        ))}
      </svg>

      {/* Hover tooltip */}
      {hovered !== null && (
        <div className="absolute pointer-events-none px-3 py-2 rounded-xl text-center"
          style={{
            left: Math.min(Math.max(pts[hovered].x - 36, 0), svgW - 80),
            top: Math.max(pts[hovered].y - 52, 0),
            background: "rgba(8,8,16,0.95)",
            border: `1px solid ${color}35`,
            boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 12px ${glow}`,
            minWidth: 72,
          }}>
          <p className="text-[14px] font-black leading-none" style={{ color }}>{pts[hovered].v}</p>
          <p className="text-[9px] text-gray-600 mt-0.5 uppercase tracking-wider">Rating</p>
          {hovered > 0 && (() => {
            const d = pts[hovered].v - pts[hovered-1].v
            return <p className="text-[10px] font-bold mt-0.5" style={{ color:d>=0?"#4ade80":"#f87171" }}>{d>=0?"+":""}{d}</p>
          })()}
        </div>
      )}
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, delay = 0 }: {
  icon: string; label: string; value: string | number; color: string; delay?: number
}) {
  return (
    <div className="group relative rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 cursor-default overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        animationDelay: `${delay}ms`,
      }}>
      {/* hover shimmer */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${color}10 0%, transparent 70%)` }}/>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xl">{icon}</span>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }}/>
      </div>
      <p className="text-[22px] font-black tracking-tight mb-0.5 leading-none" style={{ color }}>{value}</p>
      <p className="text-[9px] text-gray-600 uppercase tracking-widest font-semibold">{label}</p>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, profile, signOut, updateProfileLocal } = useAuth()
  const [showAuth,    setShowAuth]    = useState(false)
  const [entries,     setEntries]     = useState<ContestEntry[]>([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState<"overview"|"achievements"|"history">("overview")
  const [coins,       setCoins]       = useState(0)
  const [unlocked,    setUnlocked]    = useState<string[]>([])
  const [localStreak, setLocalStreak] = useState(0)
  const [joined,      setJoined]      = useState("—")
  const [achFilter,   setAchFilter]   = useState<"all"|"earned"|"locked">("all")
  const [achRarity,   setAchRarity]   = useState<"all"|"common"|"rare"|"epic"|"legendary">("all")
  const [showEdit,    setShowEdit]    = useState(false)

  useEffect(() => {
    const sync = () => {
      try {
        setCoins(Number(localStorage.getItem("cv_coins") ?? "0"))
        const ls = Number(localStorage.getItem("cv_streak") ?? "0")
        if (ls > 0) setLocalStreak(ls)
        setUnlocked(getUnlocked())
      } catch {}
    }
    sync()
    window.addEventListener("cv_coins_changed", sync)
    window.addEventListener("focus", sync)
    return () => { window.removeEventListener("cv_coins_changed", sync); window.removeEventListener("focus", sync) }
  }, [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    supabase.from("contest_entries").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => { setEntries((data ?? []) as ContestEntry[]); setLoading(false) })
  }, [user])

  useEffect(() => {
    if (profile?.created_at)
      setJoined(new Date(profile.created_at).toLocaleDateString("en-US", { month:"long", year:"numeric" }))
  }, [profile?.created_at])

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!user || !profile) return (
    <div className="min-h-screen flex items-center justify-center p-8"
      style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(59,130,246,0.06) 0%, #050508 60%)" }}>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <div className="text-center max-w-sm">
        <div className="relative w-24 h-24 mx-auto mb-7">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
            style={{ background:"rgba(59,130,246,0.08)", border:"1px solid rgba(59,130,246,0.18)", boxShadow:"0 0 60px rgba(59,130,246,0.12)" }}>
            🔐
          </div>
          <div className="absolute -inset-3 rounded-[2rem] border border-blue-500/10 animate-ping" style={{ animationDuration:"3s" }}/>
        </div>
        <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Your profile awaits</h2>
        <p className="text-[13px] text-gray-500 mb-7 leading-relaxed">Track rating, earn badges, and see your<br/>cryptography journey unfold.</p>
        <button onClick={() => setShowAuth(true)}
          className="px-8 py-3 rounded-xl text-[13px] font-bold text-white transition-all hover:scale-105 active:scale-95"
          style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow:"0 0 32px rgba(59,130,246,0.35), 0 4px 16px rgba(0,0,0,0.3)" }}>
          Sign In / Register
        </button>
      </div>
    </div>
  )

  // ── Derived stats ──────────────────────────────────────────────────────────
  const tier      = getTier(profile.rating)
  const nextTier  = TIERS.find(t => t.min > profile.rating)
  const ptsToNext = nextTier ? nextTier.min - profile.rating : null
  const tierProg  = nextTier ? ((profile.rating - tier.min) / (nextTier.min - tier.min)) * 100 : 100

  const avgScore     = entries.length ? Math.round(entries.reduce((a,e) => a+e.score,0) / entries.length) : 0
  const avgTime      = entries.length ? Math.round(entries.reduce((a,e) => a+e.time_seconds,0) / entries.length) : 0
  const noHintSolves = entries.filter(e => e.hints_used === 0).length
  const hardSolves   = entries.filter(e => e.difficulty === "Hard").length
  const bestTime     = entries.length ? Math.min(...entries.map(e => e.time_seconds)) : 0
  const streak       = Math.max(profile.streak, localStreak)
  const winRate      = entries.length ? Math.round((entries.filter(e => e.score >= 700).length / entries.length)*100) : 0
  const ratingHistory = entries.slice().reverse().map(e => e.rating_after)

  const unlockedSet  = new Set(unlocked)
  const earnedCount  = ACHIEVEMENTS.filter(a => unlockedSet.has(a.id)).length
  const rarityOrder: Record<string,number> = { legendary:0, epic:1, rare:2, common:3 }

  const filteredAch = [...ACHIEVEMENTS]
    .filter(a => achFilter === "all" ? true : achFilter === "earned" ? unlockedSet.has(a.id) : !unlockedSet.has(a.id))
    .filter(a => achRarity === "all" ? true : a.rarity === achRarity)
    .sort((a,b) => {
      const ae = unlockedSet.has(a.id), be = unlockedSet.has(b.id)
      if (ae !== be) return ae ? -1 : 1
      return rarityOrder[a.rarity] - rarityOrder[b.rarity]
    })

  return (
    <div className="min-h-screen" style={{ background:"#050508" }}>
      <style>{`
        @keyframes cv-up   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cv-fade { from{opacity:0} to{opacity:1} }
        @keyframes cv-scale{ from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
        @keyframes tier-bar{ from{width:0%} to{width:var(--w)} }
        @keyframes pulse-dot{ 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
        .cv-u  { animation: cv-up   0.5s cubic-bezier(0.23,1,0.32,1) both }
        .cv-u1 { animation: cv-up   0.5s cubic-bezier(0.23,1,0.32,1) 0.07s both }
        .cv-u2 { animation: cv-up   0.5s cubic-bezier(0.23,1,0.32,1) 0.14s both }
        .cv-u3 { animation: cv-up   0.5s cubic-bezier(0.23,1,0.32,1) 0.21s both }
        .cv-fd { animation: cv-fade 0.6s ease both }
        .glass {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(12px);
        }
        .glass-hover { transition: border-color 0.2s, box-shadow 0.2s; }
        .glass-hover:hover { border-color: rgba(255,255,255,0.12); }
        .ach-card-earned:hover { transform: translateY(-2px); box-shadow: var(--ach-glow) !important; }
        .ach-card { transition: transform 0.2s, box-shadow 0.2s; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
      `}</style>

      {showEdit && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEdit(false)}
          onSaved={(updates) => updateProfileLocal(updates)}
        />
      )}

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ paddingBottom: 0 }}>

        {/* Atmospheric background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Primary glow orb */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full blur-[160px]"
            style={{ background: tier.color, opacity: 0.12 }}/>
          {/* Secondary accent */}
          <div className="absolute top-20 right-0 w-[300px] h-[300px] rounded-full blur-[120px]"
            style={{ background: tier.color, opacity: 0.06 }}/>
          {/* Grid texture */}
          <div className="absolute inset-0 opacity-[0.018]"
            style={{ backgroundImage:"linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)", backgroundSize:"48px 48px" }}/>
          {/* Bottom fade */}
          <div className="absolute bottom-0 inset-x-0 h-24"
            style={{ background:"linear-gradient(transparent,#050508)" }}/>
        </div>

        <div className="relative z-10 px-6 md:px-10 pt-8 pb-6 max-w-5xl mx-auto">

          {/* Breadcrumb + sign out */}
          <div className="flex items-center justify-between mb-8 cv-u">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-gray-700">Profile</span>
              <span className="text-gray-800">/</span>
              <span className="font-bold" style={{ color: tier.color }}>{profile.username}</span>
            </div>
            <button onClick={async () => await signOut()}
              className="flex items-center gap-2 text-[11px] text-gray-500 hover:text-white px-3.5 py-2 rounded-xl transition-all hover:bg-white/5"
              style={{ border:"1px solid rgba(255,255,255,0.08)" }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M8 2l4 4-4 4M12 6H5M2 1H1a1 1 0 00-1 1v8a1 1 0 001 1h1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Sign out
            </button>
          </div>

          {/* Profile hero row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 cv-u1">

            {/* Avatar */}
            <div className="relative shrink-0 group cursor-pointer" onClick={() => setShowEdit(true)}>
              {/* Outer ring */}
              <div className="absolute -inset-2 rounded-[2rem] border transition-all group-hover:border-opacity-60"
                style={{ borderColor: `${tier.color}25`, boxShadow: `0 0 40px ${tier.glow}` }}/>
              <div className="w-24 h-24 rounded-3xl overflow-hidden relative"
                style={{
                  background: `radial-gradient(circle at 35% 35%, ${tier.color}25 0%, rgba(0,0,0,0.6) 100%)`,
                  border: `1.5px solid ${tier.color}40`,
                  boxShadow: `0 8px 40px ${tier.glow}, 0 0 0 1px ${tier.color}15`,
                }}>
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover"/>
                  : <div className="w-full h-full flex items-center justify-center text-5xl">{tier.icon}</div>
                }
                {/* Edit overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background:"rgba(0,0,0,0.55)" }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M14.7 2.3a1 1 0 011.4 1.4l-10 10L3 15l1.3-3.1 10-9.6z" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              {/* Online dot */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background:"#050508", border:`2px solid #050508` }}>
                <div className="w-3 h-3 rounded-full bg-emerald-400"
                  style={{ boxShadow:"0 0 8px rgba(74,222,128,0.8)", animation:"pulse-dot 2s ease infinite" }}/>
              </div>
            </div>

            {/* Name + tier */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-1.5">
                <h1 className="text-4xl font-black text-white tracking-tight leading-none">
                  {profile.display_name ?? profile.username}
                </h1>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                  style={{ color:tier.color, background:tier.bg, border:`1px solid ${tier.color}30`, boxShadow:`0 0 16px ${tier.glow}` }}>
                  <span>{tier.icon}</span><span>{tier.name}</span>
                </div>
                <button onClick={() => setShowEdit(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-gray-500 hover:text-white transition-all hover:bg-white/5"
                  style={{ border:"1px solid rgba(255,255,255,0.08)" }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M8.7 1.3a1 1 0 011.4 1.4l-7 7L1 10.5l.8-2.1 6.9-7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  </svg>
                  Edit Profile
                </button>
              </div>
              {profile.display_name && (
                <p className="text-[12px] text-gray-600 mb-0.5">@{profile.username}</p>
              )}
              {profile.bio && (
                <p className="text-[12px] text-gray-400 mb-2 max-w-md leading-relaxed">{profile.bio}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {profile.location && (
                  <span className="flex items-center gap-1 text-[11px] text-gray-600">
                    <span>📍</span>{profile.location}
                  </span>
                )}
                <span className="text-[11px] text-gray-700">Joined {joined}</span>
                <span className="text-[11px] text-gray-700">·</span>
                <span className="text-[11px] text-gray-700">{profile.contests_played} contests</span>
              </div>
              {/* Social links */}
              <div className="flex flex-wrap gap-2 mb-3">
                {profile.github   && (
                  <a href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all hover:scale-105"
                    style={{ background:"rgba(226,232,240,0.08)", border:"1px solid rgba(226,232,240,0.15)", color:"#e2e8f0" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                    </svg>
                    {profile.github}
                  </a>
                )}
                {profile.linkedin && (
                  <a href={`https://linkedin.com/in/${profile.linkedin}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all hover:scale-105"
                    style={{ background:"rgba(10,102,194,0.12)", border:"1px solid rgba(10,102,194,0.3)", color:"#60a5fa" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    {profile.linkedin}
                  </a>
                )}
                {profile.twitter  && (
                  <a href={`https://x.com/${profile.twitter}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all hover:scale-105"
                    style={{ background:"rgba(231,233,234,0.06)", border:"1px solid rgba(231,233,234,0.15)", color:"#e7e9ea" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    @{profile.twitter}
                  </a>
                )}
                {profile.discord  && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                    style={{ background:"rgba(88,101,242,0.12)", border:"1px solid rgba(88,101,242,0.3)", color:"#818cf8" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 00-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 00-5.487 0 12.36 12.36 0 00-.617-1.23A.077.077 0 008.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 00-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 00.031.055 20.03 20.03 0 005.993 2.98.078.078 0 00.084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 01-1.872-.878.075.075 0 01-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 01.078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 01.079.009c.12.098.245.195.372.288a.075.075 0 01-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 00-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 00.084.028 19.963 19.963 0 006.002-2.981.076.076 0 00.032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 00-.031-.028z"/>
                    </svg>
                    {profile.discord}
                  </span>
                )}
                {profile.website  && (
                  <a href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all hover:scale-105"
                    style={{ background:"rgba(96,165,250,0.08)", border:"1px solid rgba(96,165,250,0.2)", color:"#60a5fa" }}>
                    🌐 {profile.website.replace(/^https?:\/\//,"").replace(/\/$/,"")}
                  </a>
                )}
                {/* Show add links prompt if nothing set */}
                {!profile.github && !profile.linkedin && !profile.twitter && !profile.discord && !profile.website && (
                  <button onClick={() => setShowEdit(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-gray-700 hover:text-gray-400 transition-colors"
                    style={{ border:"1px dashed rgba(255,255,255,0.08)" }}>
                    + Add social links
                  </button>
                )}
              </div>

              {/* Tier progress bar */}
              <div className="max-w-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold" style={{ color: tier.color }}>{tier.name}</span>
                  {ptsToNext
                    ? <span className="text-[10px] text-gray-600">{ptsToNext} pts → <span className="text-gray-400">{nextTier?.name}</span></span>
                    : <span className="text-[10px] font-bold" style={{ color: tier.color }}>✦ MAX RANK</span>}
                </div>
                <div className="h-2 rounded-full overflow-hidden relative" style={{ background:"rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all duration-1200"
                    style={{ width:`${Math.max(tierProg,2)}%`, background:`linear-gradient(90deg, ${tier.color}60, ${tier.color})`, boxShadow:`0 0 12px ${tier.color}` }}/>
                </div>
              </div>
            </div>

            {/* Big rating display */}
            <div className="text-right shrink-0 hidden sm:block">
              <div className="text-6xl font-black leading-none" style={{ color:tier.color, textShadow:`0 0 40px ${tier.glow}, 0 0 80px ${tier.glow}` }}>
                {profile.rating}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mt-1.5" style={{ color:`${tier.color}70` }}>Contest Rating</p>
            </div>
          </div>

          {/* Quick stat strip */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-7 pt-5 cv-u2"
            style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
            {[
              { label:"Best Score",     v: profile.best_score || "—",              c:"#4ade80" },
              { label:"Win Rate",       v: entries.length ? `${winRate}%` : "—",   c:"#60a5fa" },
              { label:"Streak",         v: streak >= 1 ? `${streak} 🔥` : "—",    c:"#fb923c" },
              { label:"Coins",          v: `🪙 ${coins}`,                          c:"#fbbf24" },
              { label:"No-Hint Solves", v: noHintSolves,                            c:"#a78bfa" },
              { label:"Badges",         v: `${earnedCount} / ${ACHIEVEMENTS.length}`, c:"#f472b6" },
            ].map(({ label, v, c }) => (
              <div key={label} className="group text-center cursor-default">
                <p className="text-[17px] font-black leading-none mb-1 transition-all group-hover:scale-110" style={{ color:c }}>{v}</p>
                <p className="text-[9px] text-gray-700 uppercase tracking-widest font-semibold">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TABS ──────────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 px-6 md:px-10 max-w-5xl mx-auto"
        style={{ background:"rgba(5,5,8,0.85)", backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)" }}>
        <div className="flex gap-1" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          {([
            { id:"overview",     label:"Overview",     icon:"◈" },
            { id:"achievements", label:"Achievements", icon:"🏅" },
            { id:"history",      label:"History",      icon:"📋" },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="relative flex items-center gap-2 px-5 py-3.5 text-[12px] font-semibold transition-all"
              style={{ color: tab===t.id ? "#fff" : "#4b5563" }}>
              <span className="text-base">{t.icon}</span>
              <span>{t.label}</span>
              {tab===t.id && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-t-full"
                  style={{ background:`linear-gradient(90deg, ${tier.color}80, ${tier.color})`, boxShadow:`0 0 8px ${tier.color}` }}/>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────────────────────────────────────── */}
      <div className="px-6 md:px-10 py-6 max-w-5xl mx-auto space-y-4">

        {/* ══ OVERVIEW ══════════════════════════════════════════════════════════ */}
        {tab === "overview" && (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 cv-u">
              <StatCard icon="📅" label="Contests Played"  value={profile.contests_played}              color="#60a5fa" delay={0}/>
              <StatCard icon="⭐" label="Best Score"        value={profile.best_score || "—"}            color="#4ade80" delay={50}/>
              <StatCard icon="📊" label="Avg Score"         value={avgScore || "—"}                      color="#a78bfa" delay={100}/>
              <StatCard icon="⏱"  label="Avg Time"          value={avgTime ? formatTime(avgTime) : "—"}  color="#f472b6" delay={150}/>
              <StatCard icon="⚡" label="Best Time"         value={bestTime ? formatTime(bestTime) : "—"} color="#22d3ee" delay={200}/>
              <StatCard icon="💡" label="No-Hint Solves"    value={noHintSolves}                          color="#fbbf24" delay={250}/>
              <StatCard icon="🏔️" label="Hard Solved"       value={hardSolves}                            color="#f87171" delay={300}/>
              <StatCard icon="🔥" label="Best Streak"       value={streak >= 1 ? `${streak}🔥` : "—"}    color="#fb923c" delay={350}/>
            </div>

            {/* Rating chart */}
            <div className="glass glass-hover rounded-2xl p-6 cv-u1">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-[14px] font-bold text-white mb-1">Rating Curve</p>
                  <p className="text-[11px] text-gray-600">{ratingHistory.length} data points</p>
                </div>
                <div className="flex items-center gap-3">
                  {ratingHistory.length >= 2 && (() => {
                    const d = ratingHistory[ratingHistory.length-1] - ratingHistory[0]
                    return (
                      <span className="text-[12px] font-bold px-3 py-1.5 rounded-full"
                        style={{ color:d>=0?"#4ade80":"#f87171", background:d>=0?"rgba(74,222,128,0.1)":"rgba(248,113,113,0.1)", border:`1px solid ${d>=0?"rgba(74,222,128,0.2)":"rgba(248,113,113,0.2)"}` }}>
                        {d>=0?"+":""}{d} total
                      </span>
                    )
                  })()}
                  <div className="text-right">
                    <p className="text-[18px] font-black leading-none" style={{ color:tier.color }}>{profile.rating}</p>
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider mt-0.5">Current</p>
                  </div>
                </div>
              </div>
              {ratingHistory.length >= 2
                ? <RatingChart data={ratingHistory} color={tier.color} glow={tier.glow}/>
                : <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <span className="text-3xl opacity-30">📈</span>
                    <p className="text-[12px] text-gray-700">Play Daily Contests to build your rating curve</p>
                  </div>
              }
            </div>

            {/* Difficulty + Score Distribution */}
            {entries.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 cv-u2">
                {/* Difficulty breakdown */}
                <div className="glass glass-hover rounded-2xl p-5">
                  <p className="text-[13px] font-bold text-white mb-5">Difficulty Split</p>
                  <div className="space-y-4">
                    {[
                      { label:"Easy",   n:entries.filter(e=>e.difficulty==="Easy").length,   color:"#4ade80", icon:"🟢" },
                      { label:"Medium", n:entries.filter(e=>e.difficulty==="Medium").length, color:"#fbbf24", icon:"🟡" },
                      { label:"Hard",   n:entries.filter(e=>e.difficulty==="Hard").length,   color:"#f87171", icon:"🔴" },
                    ].map(({ label, n, color, icon }) => (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-300">
                            <span>{icon}</span>{label}
                          </span>
                          <span className="text-[11px] font-mono" style={{ color }}>
                            {n} <span className="text-gray-600">({Math.round((n/entries.length)*100)}%)</span>
                          </span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.05)" }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width:`${(n/entries.length)*100}%`, background:`linear-gradient(90deg,${color}60,${color})` }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Score distribution buckets */}
                <div className="glass glass-hover rounded-2xl p-5">
                  <p className="text-[13px] font-bold text-white mb-5">Score Breakdown</p>
                  <div className="space-y-4">
                    {[
                      { label:"Excellent (900+)", n:entries.filter(e=>e.score>=900).length,              color:"#4ade80" },
                      { label:"Good (700–899)",   n:entries.filter(e=>e.score>=700&&e.score<900).length, color:"#fbbf24" },
                      { label:"Fair (<700)",       n:entries.filter(e=>e.score<700).length,              color:"#f87171" },
                    ].map(({ label, n, color }) => (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-semibold text-gray-300">{label}</span>
                          <span className="text-[11px] font-mono" style={{ color }}>
                            {n} <span className="text-gray-600">({Math.round((n/entries.length)*100)}%)</span>
                          </span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.05)" }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width:`${(n/entries.length)*100}%`, background:`linear-gradient(90deg,${color}60,${color})` }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recent activity */}
            {entries.length > 0 && (
              <div className="glass glass-hover rounded-2xl overflow-hidden cv-u3">
                <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-[13px] font-bold text-white">Recent Activity</p>
                  <button onClick={() => setTab("history")}
                    className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1">
                    View all <span>→</span>
                  </button>
                </div>
                {entries.slice(0,5).map((e,i) => {
                  const delta = e.rating_after - e.rating_before
                  return (
                    <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                      style={{ borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
                        style={{ background:`${DIFF_COLORS[e.difficulty]}12`, border:`1px solid ${DIFF_COLORS[e.difficulty]}25` }}>
                        {e.difficulty === "Easy" ? "🟢" : e.difficulty === "Medium" ? "🟡" : "🔴"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-gray-300 truncate">{e.puzzle_id}</p>
                        <p className="text-[10px] text-gray-600">{e.puzzle_date} · {formatTime(e.time_seconds)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-black" style={{ color:e.score>=900?"#4ade80":e.score>=700?"#fbbf24":"#9ca3af" }}>{e.score}</p>
                        <p className="text-[10px] font-bold" style={{ color:delta>=0?"#4ade80":"#f87171" }}>{delta>=0?"+":""}{delta}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ══ ACHIEVEMENTS ══════════════════════════════════════════════════════ */}
        {tab === "achievements" && (
          <div className="cv-fd">
            {/* Summary bar */}
            <div className="glass rounded-2xl p-5 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-[22px] font-black text-white leading-none">
                    {earnedCount}
                    <span className="text-gray-600 font-normal text-[14px]"> / {ACHIEVEMENTS.length}</span>
                  </p>
                  <p className="text-[11px] text-gray-600 mt-1">{ACHIEVEMENTS.length - earnedCount} badges remaining</p>
                </div>
                {/* Rarity counters */}
                <div className="flex gap-2 flex-wrap">
                  {(["legendary","epic","rare","common"] as const).map(r => {
                    const total = ACHIEVEMENTS.filter(a => a.rarity === r).length
                    const earned = ACHIEVEMENTS.filter(a => a.rarity===r && unlockedSet.has(a.id)).length
                    return (
                      <button key={r} onClick={() => setAchRarity(achRarity===r?"all":r)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:scale-105"
                        style={{
                          background: achRarity===r ? RARITY[r].bg : "rgba(255,255,255,0.03)",
                          border:`1px solid ${achRarity===r ? RARITY[r].border : "rgba(255,255,255,0.06)"}`,
                          color: achRarity===r ? RARITY[r].color : "#4b5563",
                          boxShadow: achRarity===r ? `0 0 16px ${RARITY[r].glow}` : "none",
                        }}>
                        <span style={{ color:RARITY[r].color }}>{earned}</span>
                        <span className="text-gray-600">/</span>
                        <span className="text-gray-600">{total}</span>
                        <span className="capitalize text-[9px] opacity-70">{r}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-2 rounded-full overflow-hidden mb-1" style={{ background:"rgba(255,255,255,0.05)" }}>
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width:`${(earnedCount/ACHIEVEMENTS.length)*100}%`,
                    background:"linear-gradient(90deg,#3b82f6,#8b5cf6,#fbbf24)",
                    boxShadow:"0 0 12px rgba(139,92,246,0.5)" }}/>
              </div>
              <p className="text-[10px] text-gray-700 text-right">{Math.round((earnedCount/ACHIEVEMENTS.length)*100)}% complete</p>
            </div>

            {/* Filter row */}
            <div className="flex gap-2 mb-4">
              {(["all","earned","locked"] as const).map(f => (
                <button key={f} onClick={() => setAchFilter(f)}
                  className="px-4 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all"
                  style={{
                    background: achFilter===f ? "rgba(255,255,255,0.09)" : "transparent",
                    color:      achFilter===f ? "#fff" : "#4b5563",
                    border:     `1px solid ${achFilter===f ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.04)"}`,
                  }}>
                  {f === "earned" ? `✦ Earned (${earnedCount})` : f === "locked" ? `🔒 Locked (${ACHIEVEMENTS.length-earnedCount})` : "All"}
                </button>
              ))}
            </div>

            {/* Achievement grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAch.map((a, i) => {
                const earned   = unlockedSet.has(a.id)
                const r        = RARITY[a.rarity]
                const isSecret = a.secret && !earned
                return (
                  <div key={a.id}
                    className={`ach-card rounded-2xl p-4 cursor-default ${earned ? "ach-card-earned" : ""}`}
                    style={{
                      background:  earned ? r.bg : "rgba(255,255,255,0.015)",
                      border:      `1px solid ${earned ? r.border : "rgba(255,255,255,0.04)"}`,
                      boxShadow:   earned ? `0 0 24px ${r.glow}` : "none",
                      opacity:     earned ? 1 : 0.38,
                      "--ach-glow": `0 4px 32px ${r.glow}`,
                      animationDelay: `${i*0.02}s`,
                    } as any}>
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 relative"
                        style={{
                          background: earned ? r.bg : "rgba(255,255,255,0.04)",
                          border: `1px solid ${earned ? r.border : "rgba(255,255,255,0.07)"}`,
                          boxShadow: earned ? `0 0 16px ${r.glow}` : "none",
                        }}>
                        {isSecret ? "🔒" : a.icon}
                        {earned && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ background:r.color, boxShadow:`0 0 8px ${r.glow}` }}>
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                              <path d="M1.5 4l2 2 3-3" stroke="#000" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[12px] font-bold text-white truncate">
                            {isSecret ? "???" : a.label}
                          </p>
                          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0"
                            style={{ color:r.color, background:r.bg, border:`1px solid ${r.border}` }}>
                            {a.rarity[0]}
                          </span>
                        </div>
                        <p className="text-[10px] leading-relaxed" style={{ color:earned?"#6b7280":"#1f2937" }}>
                          {isSecret ? "Keep playing to reveal this secret" : a.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {filteredAch.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🏅</p>
                <p className="text-[13px] text-gray-500">No achievements match this filter</p>
              </div>
            )}
          </div>
        )}

        {/* ══ HISTORY ═══════════════════════════════════════════════════════════ */}
        {tab === "history" && (
          <div className="glass rounded-2xl overflow-hidden cv-fd">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <p className="text-[14px] font-bold text-white">Contest History</p>
                <p className="text-[11px] text-gray-600 mt-0.5">{entries.length} total contests</p>
              </div>
              {entries.length > 0 && (
                <div className="flex gap-5">
                  {[
                    { v: avgScore, label:"Avg Score", c:"#4ade80" },
                    { v: `${winRate}%`, label:"Win Rate", c:"#60a5fa" },
                    { v: formatTime(avgTime), label:"Avg Time", c:"#a78bfa" },
                  ].map(({ v, label, c }) => (
                    <div key={label} className="text-right hidden sm:block">
                      <p className="text-[15px] font-black" style={{ color:c }}>{v}</p>
                      <p className="text-[9px] text-gray-700 uppercase tracking-wider">{label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor:`${tier.color}50`, borderTopColor:"transparent" }}/>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3 opacity-30">📭</p>
                <p className="text-[13px] text-white mb-1.5">No contest history yet</p>
                <p className="text-[12px] text-gray-600">Complete a Daily Contest to see your results here.</p>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="hidden sm:grid px-5 py-2.5 text-[9px] font-bold text-gray-700 uppercase tracking-widest"
                  style={{ gridTemplateColumns:"90px 1fr 68px 68px 52px 76px 52px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  {["Date","Cipher","Score","Time","Hints","Rating","Δ"].map(h=><span key={h}>{h}</span>)}
                </div>
                <div>
                  {entries.map((e,i) => {
                    const delta = e.rating_after - e.rating_before
                    return (
                      <div key={i}
                        className="hidden sm:grid items-center px-5 py-3.5 transition-colors hover:bg-white/[0.025]"
                        style={{ gridTemplateColumns:"90px 1fr 68px 68px 52px 76px 52px", borderBottom:i<entries.length-1?"1px solid rgba(255,255,255,0.03)":"none" }}>
                        <span className="text-[10px] font-mono text-gray-600">{e.puzzle_date}</span>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ color:DIFF_COLORS[e.difficulty], background:`${DIFF_COLORS[e.difficulty]}15`, border:`1px solid ${DIFF_COLORS[e.difficulty]}25` }}>
                            {e.difficulty[0]}
                          </span>
                          <span className="text-[11px] text-gray-400 font-mono truncate">{e.puzzle_id}</span>
                        </div>
                        <span className="text-[12px] font-black" style={{ color:e.score>=900?"#4ade80":e.score>=700?"#fbbf24":"#9ca3af" }}>{e.score}</span>
                        <span className="text-[11px] font-mono text-blue-400">{formatTime(e.time_seconds)}</span>
                        <span className="text-[11px] text-center" style={{ color:e.hints_used===0?"#a78bfa":"#374151" }}>
                          {e.hints_used===0 ? "✦" : e.hints_used}
                        </span>
                        <span className="text-[11px] font-mono text-white">{e.rating_after}</span>
                        <span className="text-[12px] font-black" style={{ color:delta>=0?"#4ade80":"#f87171" }}>
                          {delta>=0?`+${delta}`:delta}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-white/[0.04]">
                  {entries.map((e,i) => {
                    const delta = e.rating_after - e.rating_before
                    return (
                      <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background:`${DIFF_COLORS[e.difficulty]}12`, border:`1px solid ${DIFF_COLORS[e.difficulty]}25` }}>
                          <span className="text-sm">{e.difficulty==="Easy"?"🟢":e.difficulty==="Medium"?"🟡":"🔴"}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-gray-300 truncate font-mono">{e.puzzle_id}</p>
                          <p className="text-[10px] text-gray-600">{e.puzzle_date} · {formatTime(e.time_seconds)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-black" style={{ color:e.score>=900?"#4ade80":e.score>=700?"#fbbf24":"#9ca3af" }}>{e.score}</p>
                          <p className="text-[10px] font-bold" style={{ color:delta>=0?"#4ade80":"#f87171" }}>{delta>=0?"+":""}{delta}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}