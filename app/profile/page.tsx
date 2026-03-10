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
  { name: "Novice",       min: 0,    color: "text-gray-400",   bg: "bg-gray-500/10 border-gray-500/20",     icon: "🔰" },
  { name: "Apprentice",   min: 500,  color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20",   icon: "⚡" },
  { name: "Cryptanalyst", min: 1000, color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20",     icon: "🔍" },
  { name: "Specialist",   min: 1500, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", icon: "💎" },
  { name: "Expert",       min: 2000, color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20",   icon: "🏆" },
  { name: "Master",       min: 2500, color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20",       icon: "👑" },
]
function getTier(r: number) { return [...TIERS].reverse().find(t => r >= t.min) ?? TIERS[0] }

const DIFF_COLORS: Record<string, string> = {
  Easy:   "text-emerald-400",
  Medium: "text-amber-400",
  Hard:   "text-red-400",
}
const DIFF_BG: Record<string, string> = {
  Easy:   "bg-emerald-500/10 border-emerald-500/20",
  Medium: "bg-amber-500/10 border-amber-500/20",
  Hard:   "bg-red-500/10 border-red-500/20",
}

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [entries, setEntries]   = useState<ContestEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<"overview"|"history">("overview")
  const [coins, setCoins]       = useState(0)
  const [localStreak, setLocalStreak] = useState(0)
  const [joined, setJoined]     = useState("—")

  useEffect(() => {
    const sync = () => {
      try {
        setCoins(Number(localStorage.getItem("cv_coins") ?? "0"))
        const lsStreak = Number(localStorage.getItem("cv_streak") ?? "0")
        if (lsStreak > 0) setLocalStreak(lsStreak)
      } catch {}
    }
    sync()
    window.addEventListener("cv_coins_changed", sync)
    window.addEventListener("focus", sync)
    return () => {
      window.removeEventListener("cv_coins_changed", sync)
      window.removeEventListener("focus", sync)
    }
  }, [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    supabase
      .from("contest_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { setEntries((data ?? []) as ContestEntry[]); setLoading(false) })
  }, [user])

  useEffect(() => {
    if (profile?.created_at) {
      setJoined(new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }))
    }
  }, [profile?.created_at])

  if (!user || !profile) return (
    <div className="p-8 max-w-2xl mx-auto">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <div className="text-center py-28 border border-gray-800/40 rounded-2xl bg-[#0d0d0d]">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4 text-3xl">🔐</div>
        <h2 className="text-[15px] font-semibold text-white mb-2">Sign in to view your profile</h2>
        <p className="text-[13px] text-gray-500 mb-6">Track your rating, contest history and achievements.</p>
        <button onClick={() => setShowAuth(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-[13px] font-semibold transition-colors">
          Sign In / Register
        </button>
      </div>
    </div>
  )

  const tier         = getTier(profile.rating)
  const nextTier     = TIERS.find(t => t.min > profile.rating)
  const ptsToNext    = nextTier ? nextTier.min - profile.rating : null
  const tierProgress = nextTier ? ((profile.rating - tier.min) / (nextTier.min - tier.min)) * 100 : 100

  const avgScore     = entries.length ? Math.round(entries.reduce((a, e) => a + e.score, 0) / entries.length) : 0
  const avgTime      = entries.length ? Math.round(entries.reduce((a, e) => a + e.time_seconds, 0) / entries.length) : 0
  const noHintSolves = entries.filter(e => e.hints_used === 0).length
  const hardSolves   = entries.filter(e => e.difficulty === "Hard").length
  const bestTime     = entries.length ? Math.min(...entries.map(e => e.time_seconds)) : 0

  const ratingHistory = entries.slice().reverse().map(e => e.rating_after)
  const sparkMin = ratingHistory.length ? Math.min(...ratingHistory) - 30 : 970
  const sparkMax = ratingHistory.length ? Math.max(...ratingHistory) + 30 : 1030
  const sparkH   = 56

  const tierBarColor =
    tier.color.includes("gray")   ? "from-gray-500 to-gray-400" :
    tier.color.includes("green")  ? "from-green-600 to-green-400" :
    tier.color.includes("blue")   ? "from-blue-600 to-blue-400" :
    tier.color.includes("violet") ? "from-violet-600 to-violet-400" :
    tier.color.includes("amber")  ? "from-amber-600 to-amber-400" :
                                    "from-red-600 to-red-400"

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Profile</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Your stats, rating history and contest records.</p>
        </div>
        <button onClick={async () => { await signOut() }}
          className="text-[12px] text-gray-500 hover:text-gray-300 border border-gray-800 px-3 py-1.5 rounded-lg transition-colors">
          Sign out
        </button>
      </div>

      {/* Hero card */}
      <div className="bg-[#0d0d0d] border border-gray-800/60 rounded-2xl p-6 mb-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-60"
          style={{ background: tier.color.includes("blue") ? "radial-gradient(circle,rgba(59,130,246,0.07) 0%,transparent 70%)" : tier.color.includes("violet") ? "radial-gradient(circle,rgba(139,92,246,0.07) 0%,transparent 70%)" : tier.color.includes("amber") ? "radial-gradient(circle,rgba(245,158,11,0.07) 0%,transparent 70%)" : "radial-gradient(circle,rgba(100,100,100,0.05) 0%,transparent 70%)" }} />

        <div className="flex items-start gap-5">
          <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center text-3xl shrink-0 ${tier.bg}`}>
            {tier.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-1">
              <h2 className="text-xl font-bold text-white">{profile.username}</h2>
              <span className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full ${tier.bg} ${tier.color}`}>
                {tier.icon} {tier.name}
              </span>
            </div>
            <p className="text-[11px] text-gray-600 mb-4">Joined {joined}</p>

            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-3xl font-bold ${tier.color}`}>{profile.rating}</span>
              <span className="text-[12px] text-gray-600">contest rating</span>
              {ptsToNext && (
                <span className="text-[11px] text-gray-700 ml-auto">{ptsToNext} pts to {nextTier?.icon} {nextTier?.name}</span>
              )}
            </div>

            <div className="h-2 bg-gray-800/80 rounded-full overflow-hidden mb-1.5">
              <div className={`h-full rounded-full bg-gradient-to-r ${tierBarColor} transition-all duration-1000`}
                style={{ width: `${Math.max(tierProgress, 3)}%` }} />
            </div>
            <div className="flex">
              {TIERS.map((t, i) => (
                <div key={t.name} className="flex-1 text-center relative">
                  <span className={`text-[10px] ${profile.rating >= t.min ? t.color : "text-gray-800"}`}>{t.icon}</span>
                  {i < TIERS.length - 1 && (
                    <div className="absolute top-1/2 right-0 w-px h-2 bg-gray-800 -translate-y-1/2" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-900/50 border border-gray-800/50 rounded-xl p-1 w-fit">
        {(["overview", "history"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-1.5 rounded-lg text-[12px] font-medium capitalize transition-all ${
              tab === t ? "bg-gray-800 text-white" : "text-gray-600 hover:text-gray-400"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {[
              { label: "Contests Played", value: profile.contests_played,                            color: "text-white"       },
              { label: "Best Score",       value: profile.best_score > 0 ? profile.best_score : "—",  color: "text-emerald-400" },
              { label: "Avg Score",        value: avgScore || "—",                                    color: "text-blue-400"    },
              { label: "Avg Time",         value: avgTime ? formatTime(avgTime) : "—",                color: "text-violet-400"  },
              { label: "Best Time",        value: bestTime ? formatTime(bestTime) : "—",              color: "text-cyan-400"    },
              { label: "No-Hint Solves",   value: noHintSolves,                                       color: "text-amber-400"   },
              { label: "Hard Solved",      value: hardSolves,                                         color: "text-red-400"     },
              { label: "Streak", value: (() => { const s = Math.max(profile.streak, localStreak); return s >= 1 ? `${s} 🔥` : "—" })(), color: Math.max(profile.streak, localStreak) >= 1 ? "text-orange-400" : "text-gray-500" },
              { label: "Coins",            value: coins > 0 ? `🪙 ${coins}` : "0",                         color: "text-amber-400"   },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#0d0d0d] border border-gray-800/60 rounded-xl p-4 text-center">
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Rating sparkline */}
          {ratingHistory.length >= 1 ? (
            <div className="bg-[#0d0d0d] border border-gray-800/60 rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[12px] font-semibold text-white">Rating History</p>
                <span className="text-[11px] font-mono text-gray-600">{ratingHistory.length} contests</span>
              </div>
              <div className="relative" style={{ height: `${sparkH + 24}px` }}>
                <svg width="100%" height={sparkH + 24} className="overflow-visible">
                  <defs>
                    <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25"/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  {[0, 0.5, 1].map(f => (
                    <line key={f} x1="0" y1={sparkH - f * sparkH + 12} x2="100%" y2={sparkH - f * sparkH + 12}
                      stroke="#1a1a1a" strokeWidth="1" />
                  ))}
                  {(() => {
                    const n = ratingHistory.length
                    const pts = ratingHistory.map((v, i) => ({
                      x: n === 1 ? "50%" : `${(i / (n - 1)) * 100}%`,
                      y: sparkH - ((sparkMax - sparkMin) > 0 ? ((v - sparkMin) / (sparkMax - sparkMin)) * sparkH : sparkH / 2) + 12
                    }))
                    const lineD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
                    const areaD = `${lineD} L 100% ${sparkH + 12} L 0% ${sparkH + 12} Z`
                    return (
                      <>
                        <path d={areaD} fill="url(#sparkGrad)" />
                        <path d={lineD} stroke="#3b82f6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        {pts.map((p, i) => (
                          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#3b82f6" stroke="#0d0d0d" strokeWidth="2" />
                        ))}
                      </>
                    )
                  })()}
                </svg>
                <div className="absolute left-0 top-0 h-full flex flex-col justify-between pointer-events-none">
                  <span className="text-[9px] text-gray-700 font-mono">{sparkMax}</span>
                  <span className="text-[9px] text-gray-700 font-mono">{sparkMin}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#0d0d0d] border border-gray-800/60 rounded-2xl p-5 mb-4 text-center py-8">
              <p className="text-[12px] text-gray-600">Play your first Daily Contest to see your rating history.</p>
            </div>
          )}

          {/* Achievements */}
          <div className="bg-[#0d0d0d] border border-gray-800/60 rounded-2xl p-5">
            <p className="text-[12px] font-semibold text-white mb-4">Achievements</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: "🎯", label: "First Blood",          desc: "Complete your first contest",        earned: profile.contests_played >= 1         },
                { icon: "🔥", label: "On a Roll",             desc: "2-day contest streak",               earned: profile.streak >= 2                  },
                { icon: "💡", label: "Pure Intellect",        desc: "Solve without any hints",            earned: noHintSolves >= 1                    },
                { icon: "⚡", label: "Speed Demon",           desc: "Solve a puzzle under 60 seconds",    earned: bestTime > 0 && bestTime < 60        },
                { icon: "💎", label: "Specialist",            desc: "Reach 1500 rating",                  earned: profile.rating >= 1500               },
                { icon: "👑", label: "Master Cryptanalyst",   desc: "Reach 2500 rating",                  earned: profile.rating >= 2500               },
                { icon: "🧩", label: "Puzzle Veteran",        desc: "Play 10 contests",                   earned: profile.contests_played >= 10        },
                { icon: "🏔️", label: "Hard Mode",             desc: "Solve 5 hard puzzles",               earned: hardSolves >= 5                      },
                { icon: "🎓", label: "Perfectionist",         desc: "10 no-hint solves",                  earned: noHintSolves >= 10                   },
              ].map(({ icon, label, desc, earned }) => (
                <div key={label} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  earned ? "bg-blue-900/10 border-blue-700/20" : "border-gray-800/40 opacity-40"
                }`}>
                  <span className="text-xl shrink-0">{icon}</span>
                  <div className="flex-1">
                    <p className={`text-[11px] font-semibold ${earned ? "text-white" : "text-gray-600"}`}>{label}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{desc}</p>
                  </div>
                  {earned && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 mt-0.5 text-blue-400">
                      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M3.5 6l2 2 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "history" && (
        <div className="bg-[#0d0d0d] border border-gray-800/60 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[12px] font-semibold text-white">Contest History</p>
            <span className="text-[11px] text-gray-600">{entries.length} entries</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="animate-spin w-5 h-5 text-blue-500" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeDasharray="30 20"/>
              </svg>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-3xl mb-3">📭</p>
              <p className="text-[13px] text-white mb-1">No contest history yet</p>
              <p className="text-[12px] text-gray-600">Complete your first Daily Contest to see results here.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="grid grid-cols-[90px_1fr_70px_70px_50px_80px_60px] gap-3 px-3 py-1.5">
                {["Date","Cipher","Score","Time","Hints","Rating","Δ"].map(h => (
                  <p key={h} className="text-[9px] text-gray-600 uppercase tracking-widest">{h}</p>
                ))}
              </div>
              {entries.map((e, i) => {
                const delta = e.rating_after - e.rating_before
                return (
                  <div key={i} className="grid grid-cols-[90px_1fr_70px_70px_50px_80px_60px] gap-3 items-center px-3 py-2.5 rounded-xl border bg-gray-900/20 border-gray-800/30 hover:border-gray-700/50 transition-colors">
                    <span className="text-[11px] font-mono text-gray-500">{e.puzzle_date}</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-[9px] font-bold uppercase tracking-wider border px-1.5 py-0.5 rounded-full shrink-0 ${DIFF_BG[e.difficulty] ?? ""} ${DIFF_COLORS[e.difficulty] ?? "text-gray-400"}`}>
                        {e.difficulty[0]}
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono truncate">{e.puzzle_id}</span>
                    </div>
                    <span className="text-[12px] font-bold text-emerald-400">{e.score}</span>
                    <span className="text-[11px] font-mono text-blue-400">{formatTime(e.time_seconds)}</span>
                    <span className="text-[11px] text-gray-500 text-center">{e.hints_used}/3</span>
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
      )}
    </div>
  )
}