"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/AuthContext"
import { supabase, type ContestEntry } from "@/lib/supabase"
import AuthModal from "@/components/AuthModal"

function formatTime(s: number) {
  const m = Math.floor(s / 60), sec = s % 60
  return m > 0 ? `${m}m ${String(sec).padStart(2, "0")}s` : `${sec}s`
}

const TIERS = [
  { name: "Novice",       min: 0,    color: "text-gray-400",   bg: "bg-gray-500/10 border-gray-500/20",    icon: "🔰" },
  { name: "Apprentice",   min: 500,  color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20",  icon: "⚡" },
  { name: "Cryptanalyst", min: 1000, color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20",    icon: "🔍" },
  { name: "Specialist",   min: 1500, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20",icon: "💎" },
  { name: "Expert",       min: 2000, color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20",  icon: "🏆" },
  { name: "Master",       min: 2500, color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20",      icon: "👑" },
]
function getTier(r: number) { return [...TIERS].reverse().find(t => r >= t.min) ?? TIERS[0] }

const DIFF_COLORS: Record<string, string> = {
  Easy:   "text-emerald-400",
  Medium: "text-amber-400",
  Hard:   "text-red-400",
}

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth()
  const [showAuth, setShowAuth]   = useState(false)
  const [entries, setEntries]     = useState<ContestEntry[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    supabase
      .from("contest_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => { setEntries((data ?? []) as ContestEntry[]); setLoading(false) })
  }, [user])

  if (!user || !profile) return (
    <div className="p-8 max-w-2xl mx-auto">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <div className="text-center py-24 border border-gray-800/40 rounded-2xl">
        <p className="text-4xl mb-4">🔐</p>
        <h2 className="text-[15px] font-semibold text-white mb-2">Sign in to view your profile</h2>
        <p className="text-[13px] text-gray-500 mb-6">Track your rating, contest history, and solved puzzles.</p>
        <button onClick={() => setShowAuth(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-[13px] font-semibold transition-colors">
          Sign In / Register
        </button>
      </div>
    </div>
  )

  const tier          = getTier(profile.rating)
  const nextTier      = TIERS.find(t => t.min > profile.rating)
  const ptsToNext     = nextTier ? nextTier.min - profile.rating : null
  const tierProgress  = nextTier
    ? ((profile.rating - tier.min) / (nextTier.min - tier.min)) * 100
    : 100
  const avgScore      = entries.length ? Math.round(entries.reduce((a, e) => a + e.score, 0) / entries.length) : 0
  const avgTime       = entries.length ? Math.round(entries.reduce((a, e) => a + e.time_seconds, 0) / entries.length) : 0
  const noHintSolves  = entries.filter(e => e.hints_used === 0).length
  const hardSolves    = entries.filter(e => e.difficulty === "Hard").length

  // Build rating history for mini sparkline
  const ratingHistory = entries
    .slice().reverse()
    .map(e => e.rating_after)

  const sparkMin = Math.min(...ratingHistory) - 20
  const sparkMax = Math.max(...ratingHistory) + 20
  const sparkH   = 48

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight mb-0.5">Profile</h1>
          <p className="text-[13px] text-gray-500">Your contest history, rating, and achievements.</p>
        </div>
        <button onClick={signOut}
          className="text-[12px] text-gray-500 hover:text-gray-300 border border-gray-800 px-3 py-1.5 rounded-lg transition-colors">
          Sign out
        </button>
      </div>

      {/* Profile hero */}
      <div className="bg-[#0d0d0d] border border-gray-800/60 rounded-2xl p-6 mb-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/4 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center text-3xl shrink-0 ${tier.bg} ${tier.color.replace("text-","border-")}`}>
            {tier.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-white">{profile.username}</h2>
              <span className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full ${tier.bg} ${tier.color}`}>
                {tier.name}
              </span>
            </div>
            <p className="text-[12px] text-gray-600 mb-3">
              Member since {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>

            {/* Rating bar */}
            <div className="mb-1 flex items-center gap-3">
              <span className={`text-2xl font-bold ${tier.color}`}>{profile.rating}</span>
              <span className="text-[11px] text-gray-600">/ {nextTier?.min ?? "MAX"}</span>
              {ptsToNext && <span className="text-[11px] text-gray-600 ml-auto">{ptsToNext} pts to {nextTier?.name}</span>}
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${
                tier.color.includes("gray") ? "bg-gray-500" :
                tier.color.includes("green") ? "bg-green-500" :
                tier.color.includes("blue") ? "bg-blue-500" :
                tier.color.includes("violet") ? "bg-violet-500" :
                tier.color.includes("amber") ? "bg-amber-500" : "bg-red-500"
              }`} style={{ width: `${tierProgress}%` }} />
            </div>
            <div className="flex gap-1 mt-1">
              {TIERS.map(t => (
                <div key={t.name} className="flex-1 text-center">
                  <span className={`text-[8px] ${profile.rating >= t.min ? t.color : "text-gray-800"}`}>{t.icon}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: "Contests",    value: profile.contests_played, color: "text-white"        },
          { label: "Best Score",  value: profile.best_score,      color: "text-emerald-400"  },
          { label: "Avg Score",   value: avgScore,                color: "text-blue-400"     },
          { label: "Avg Time",    value: avgTime ? formatTime(avgTime) : "—", color: "text-violet-400" },
          { label: "No-Hint ✓",  value: noHintSolves,            color: "text-amber-400"    },
          { label: "Hard Solved", value: hardSolves,              color: "text-red-400"      },
          { label: "Streak",      value: `${profile.streak}🔥`,  color: "text-orange-400"   },
          { label: "Last Played", value: profile.last_played ?? "—", color: "text-gray-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#0d0d0d] border border-gray-800/60 rounded-xl p-4 text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Rating sparkline */}
      {ratingHistory.length >= 2 && (
        <div className="bg-[#0d0d0d] border border-gray-800/60 rounded-2xl p-5 mb-5">
          <p className="text-[11px] font-semibold text-white mb-4">Rating History</p>
          <div className="relative" style={{ height: `${sparkH + 16}px` }}>
            <svg width="100%" height={sparkH + 16} className="overflow-visible">
              {/* Grid lines */}
              {[0, 0.5, 1].map(f => (
                <line key={f}
                  x1="0" y1={sparkH - f * sparkH + 8}
                  x2="100%" y2={sparkH - f * sparkH + 8}
                  stroke="#1f1f1f" strokeWidth="1" />
              ))}
              {/* Area fill */}
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {ratingHistory.length >= 2 && (() => {
                const n = ratingHistory.length
                const pts = ratingHistory.map((v, i) => {
                  const x = (i / (n - 1)) * 100
                  const y = sparkH - ((v - sparkMin) / (sparkMax - sparkMin)) * sparkH + 8
                  return `${x}%,${y}`
                })
                const lineD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p}`).join(" ")
                const areaD = `${lineD} L 100%,${sparkH + 8} L 0%,${sparkH + 8} Z`
                return (
                  <>
                    <path d={areaD} fill="url(#sparkGrad)" />
                    <path d={lineD} stroke="#3b82f6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    {ratingHistory.map((v, i) => {
                      const x = `${(i / (n - 1)) * 100}%`
                      const y = sparkH - ((v - sparkMin) / (sparkMax - sparkMin)) * sparkH + 8
                      return <circle key={i} cx={x} cy={y} r="3" fill="#3b82f6" stroke="#0d0d0d" strokeWidth="1.5" />
                    })}
                  </>
                )
              })()}
            </svg>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between pointer-events-none pr-2">
              <span className="text-[9px] text-gray-700 font-mono">{sparkMax}</span>
              <span className="text-[9px] text-gray-700 font-mono">{sparkMin}</span>
            </div>
          </div>
        </div>
      )}

      {/* Contest history */}
      <div className="bg-[#0d0d0d] border border-gray-800/60 rounded-2xl p-5">
        <p className="text-[11px] font-semibold text-white mb-4">Contest History</p>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <svg className="animate-spin w-5 h-5 text-blue-500" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeDasharray="30 20"/>
            </svg>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-[12px] text-gray-600">No contest history yet. Play your first Daily Challenge!</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="grid grid-cols-[100px_1fr_80px_70px_55px_90px_80px] gap-3 px-3 py-1">
              {["Date","Puzzle","Score","Time","Hints","Rating","Δ"].map(h => (
                <p key={h} className="text-[10px] text-gray-600 uppercase tracking-wider">{h}</p>
              ))}
            </div>
            {entries.map((e, i) => {
              const delta = e.rating_after - e.rating_before
              return (
                <div key={i} className="grid grid-cols-[100px_1fr_80px_70px_55px_90px_80px] gap-3 items-center px-3 py-2.5 rounded-xl border bg-gray-900/30 border-gray-800/30 hover:border-gray-700/40 transition-colors">
                  <span className="text-[11px] font-mono text-gray-500">{e.puzzle_date}</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[10px] font-bold ${DIFF_COLORS[e.difficulty] ?? "text-gray-400"}`}>
                      {e.difficulty[0]}
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono truncate">{e.puzzle_id}</span>
                  </div>
                  <span className="text-[12px] font-bold text-emerald-400">{e.score}</span>
                  <span className="text-[11px] font-mono text-blue-400">{formatTime(e.time_seconds)}</span>
                  <span className="text-[11px] text-gray-500">{e.hints_used}/3</span>
                  <span className="text-[11px] font-mono text-white">{e.rating_after}</span>
                  <span className={`text-[11px] font-mono font-bold ${delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {delta >= 0 ? `+${delta}` : delta}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}