"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/AuthContext"
import { supabase } from "@/lib/supabase"
// coins read from localStorage in useEffect
import { ACHIEVEMENTS, getUnlocked } from "@/lib/achievements"
import { getProStatus } from "@/lib/pro"
import { useRouter } from "next/navigation"
import Link from "next/link"

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatTime(s: number) {
  const m = Math.floor(s / 60), sec = s % 60
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}
function getTier(r: number) {
  const TIERS = [
    { name:"Novice", min:0, color:"#9ca3af", icon:"🔰" },
    { name:"Apprentice", min:500, color:"#4ade80", icon:"⚡" },
    { name:"Cryptanalyst", min:1000, color:"#60a5fa", icon:"🔍" },
    { name:"Specialist", min:1500, color:"#a78bfa", icon:"💎" },
    { name:"Expert", min:2000, color:"#fbbf24", icon:"🏆" },
    { name:"Master", min:2500, color:"#f87171", icon:"👑" },
  ]
  return [...TIERS].reverse().find(t => r >= t.min) ?? TIERS[0]
}
const ALGO_META: Record<string, { security:number; speed:number; color:string; type:string }> = {
  "Caesar":      { security:2,  speed:99, color:"#f97316", type:"Classical"  },
  "Vigenère":    { security:12, speed:97, color:"#fb923c", type:"Classical"  },
  "Rail Fence":  { security:8,  speed:98, color:"#fcd34d", type:"Classical"  },
  "Atbash":      { security:3,  speed:99, color:"#f59e0b", type:"Classical"  },
  "ROT13":       { security:1,  speed:99, color:"#e5e7eb", type:"Classical"  },
  "Monoalphabetic":{ security:15, speed:96, color:"#d97706", type:"Classical"},
  "AES-128":     { security:96, speed:88, color:"#3b82f6", type:"Symmetric"  },
  "DES":         { security:18, speed:72, color:"#8b5cf6", type:"Symmetric"  },
  "SHA-256":     { security:95, speed:85, color:"#10b981", type:"Hashing"    },
  "RSA-2048":    { security:88, speed:12, color:"#f59e0b", type:"Asymmetric" },
}

// ── Mini sparkline ─────────────────────────────────────────────────────────────
function MiniSpark({ data, color }: { data:number[]; color:string }) {
  if (data.length < 2) return <span className="text-[10px] text-gray-700">not enough data</span>
  const W = 120, H = 32
  const mn = Math.min(...data) - 20, mx = Math.max(...data) + 20
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((v - mn) / (mx - mn)) * H
  }))
  const d = pts.map((p,i) => i === 0 ? `M${p.x} ${p.y}` : `L${p.x} ${p.y}`).join(" ")
  return (
    <svg width={W} height={H} style={{ overflow:"visible" }}>
      <path d={d} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="3"
        fill={color} stroke="rgba(5,5,10,0.9)" strokeWidth="1.5"/>
    </svg>
  )
}

// ── Radial progress ────────────────────────────────────────────────────────────
function RadialProgress({ pct, color, size = 64, label }: { pct:number; color:string; size?:number; label:string }) {
  const r = size/2 - 6, circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition:"stroke-dasharray 1s ease" }}/>
      </svg>
      <p className="text-[9px] text-gray-600 uppercase tracking-wider text-center">{label}</p>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, profile } = useAuth()
  const router = useRouter()

  const [entries,     setEntries]     = useState<any[]>([])
  const [topPlayers,  setTopPlayers]  = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [coins,       setCoins]       = useState(0)
  const [unlocked,    setUnlocked]    = useState<string[]>([])
  const [localStreak, setLocalStreak] = useState(0)

  useEffect(() => {
    try {
      setCoins(Number(localStorage.getItem("cv_coins") ?? "0"))
      setLocalStreak(Number(localStorage.getItem("cv_streak") ?? "0"))
      setUnlocked(getUnlocked())
    } catch {}
  }, [])

  useEffect(() => {
    // Load user's contest entries
    const loadEntries = async () => {
      if (user) {
        const { data } = await supabase.from("contest_entries").select("*")
          .eq("user_id", user.id).order("created_at", { ascending:false }).limit(10)
        setEntries(data ?? [])
      }
      // Load top players
      const { data:top } = await supabase.from("profiles")
        .select("username,rating,contests_played,streak,display_name,is_pro")
        .order("rating", { ascending:false }).limit(5)
      setTopPlayers(top ?? [])
      setLoading(false)
    }
    loadEntries()
  }, [user])

  const tier         = getTier(profile?.rating ?? 0)
  const nextTierMin  = [500,1000,1500,2000,2500].find(m => m > (profile?.rating ?? 0))
  const tierProg     = nextTierMin ? ((( profile?.rating ?? 0) - tier.min) / (nextTierMin - tier.min)) * 100 : 100
  const ratingHistory = entries.slice().reverse().map(e => e.rating_after)
  const avgScore      = entries.length ? Math.round(entries.reduce((a,e)=>a+e.score,0)/entries.length) : 0
  const bestTime      = entries.length ? Math.min(...entries.map(e=>e.time_seconds)) : 0
  const streak        = Math.max(profile?.streak ?? 0, localStreak)
  const achEarned     = unlocked.length
  const winRate       = entries.length ? Math.round(entries.filter(e=>e.score>=700).length/entries.length*100) : 0
  const { isPro }     = getProStatus(profile)

  // Cipher type breakdown
  const cipherBreakdown = entries.reduce((acc:Record<string,number>, e) => {
    const cipher = e.puzzle_id?.split("-")[0] ?? "Unknown"
    acc[cipher] = (acc[cipher] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="min-h-screen px-6 md:px-10 py-8 max-w-6xl mx-auto" style={{ background:"#050508" }}>
      <style>{`
        @keyframes cv-up { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .cv-u  { animation:cv-up 0.45s cubic-bezier(0.23,1,0.32,1) both }
        .cv-u1 { animation:cv-up 0.45s cubic-bezier(0.23,1,0.32,1) 0.07s both }
        .cv-u2 { animation:cv-up 0.45s cubic-bezier(0.23,1,0.32,1) 0.14s both }
        .cv-u3 { animation:cv-up 0.45s cubic-bezier(0.23,1,0.32,1) 0.21s both }
        .cv-u4 { animation:cv-up 0.45s cubic-bezier(0.23,1,0.32,1) 0.28s both }
        .glass { background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07); }
        .glass:hover { border-color:rgba(255,255,255,0.11); }
      `}</style>

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8 cv-u">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {profile ? `Welcome back, ${profile.display_name ?? profile.username} 👋` : "Dashboard"}
          </h1>
          <p className="text-[12px] text-gray-600 mt-1">
            {profile
              ? `${tier.icon} ${tier.name} · Rating ${profile.rating} · ${streak > 0 ? `${streak}🔥 streak` : "Start your streak today"}`
              : "Sign in to see your personalized stats"}
          </p>
        </div>
        {isPro && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold"
            style={{ background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.25)", color:"#fbbf24" }}>
            💎 Pro Member
          </div>
        )}
      </div>

      {/* ── Row 1: Hero stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 cv-u1">
        {[
          { label:"Contest Rating", value: profile?.rating ?? "—",       color:"#60a5fa", icon:"⭐", link:"/contest"    },
          { label:"Coins",          value: `🪙 ${coins}`,                color:"#fbbf24", icon:"🪙", link:"/marketplace" },
          { label:"Achievements",   value: `${achEarned}/${ACHIEVEMENTS.length}`, color:"#f472b6", icon:"🏅", link:"/profile" },
          { label:"Win Rate",       value: entries.length ? `${winRate}%` : "—", color:"#4ade80", icon:"📈", link:"/profile" },
        ].map(({ label, value, color, icon, link }) => (
          <Link key={label} href={link}
            className="glass rounded-2xl p-4 flex flex-col gap-2 transition-all hover:-translate-y-0.5 cursor-pointer group">
            <div className="flex items-center justify-between">
              <span className="text-lg">{icon}</span>
              <div className="w-1.5 h-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background:color, boxShadow:`0 0 6px ${color}` }}/>
            </div>
            <p className="text-[22px] font-black leading-none" style={{ color }}>{value}</p>
            <p className="text-[9px] text-gray-600 uppercase tracking-widest">{label}</p>
          </Link>
        ))}
      </div>

      {/* ── Row 2: Rating chart + Tier progress ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 cv-u2">

        {/* Rating trend */}
        <div className="glass rounded-2xl p-5 sm:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[13px] font-bold text-white">Rating Trend</p>
              <p className="text-[10px] text-gray-600 mt-0.5">Last {entries.length} contests</p>
            </div>
            {ratingHistory.length >= 2 && (() => {
              const d = ratingHistory[ratingHistory.length-1] - ratingHistory[0]
              return (
                <span className="text-[12px] font-bold px-2.5 py-1 rounded-full"
                  style={{ color:d>=0?"#4ade80":"#f87171", background:d>=0?"rgba(74,222,128,0.1)":"rgba(248,113,113,0.1)", border:`1px solid ${d>=0?"rgba(74,222,128,0.2)":"rgba(248,113,113,0.2)"}` }}>
                  {d>=0?"+":""}{d}
                </span>
              )
            })()}
          </div>

          {ratingHistory.length >= 2 ? (() => {
            const W = 500, H = 80
            const mn = Math.min(...ratingHistory)-30, mx = Math.max(...ratingHistory)+30
            const pts = ratingHistory.map((v,i)=>({
              x:(i/(ratingHistory.length-1))*100,
              y:H-((v-mn)/(mx-mn))*H
            }))
            const lineD = pts.map((p,i)=>{
              if(i===0) return `M${p.x}% ${p.y}`
              const pp=pts[i-1], cx=(pp.x+p.x)/2
              return `C${cx}% ${pp.y} ${cx}% ${p.y} ${p.x}% ${p.y}`
            }).join(" ")
            return (
              <div className="relative" style={{ height:H+8 }}>
                <svg width="100%" height={H+8} style={{ overflow:"visible" }}>
                  <defs>
                    <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={tier.color} stopOpacity="0.2"/>
                      <stop offset="100%" stopColor={tier.color} stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d={`${lineD} L 100% ${H+8} L 0% ${H+8} Z`} fill="url(#dg)"/>
                  <path d={lineD} stroke={tier.color} strokeWidth="2" fill="none" strokeLinecap="round"/>
                  {pts.map((p,i)=>(
                    <circle key={i} cx={`${p.x}%`} cy={p.y} r="3" fill={tier.color}
                      stroke="rgba(5,5,10,0.9)" strokeWidth="1.5"/>
                  ))}
                </svg>
                <div className="absolute left-0 top-0 flex flex-col justify-between h-full pointer-events-none">
                  <span className="text-[9px] font-mono" style={{color:tier.color}}>{mx-30}</span>
                  <span className="text-[9px] font-mono text-gray-700">{mn+30}</span>
                </div>
              </div>
            )
          })() : (
            <div className="flex items-center justify-center py-8">
              <p className="text-[12px] text-gray-700">Play contests to build your rating curve</p>
            </div>
          )}
        </div>

        {/* Tier progress card */}
        <div className="glass rounded-2xl p-5 flex flex-col">
          <p className="text-[13px] font-bold text-white mb-4">Rank Progress</p>
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl relative"
              style={{ background:`${tier.color}15`, border:`1.5px solid ${tier.color}30`, boxShadow:`0 0 32px ${tier.color}20` }}>
              {tier.icon}
            </div>
            <div className="text-center">
              <p className="text-[18px] font-black" style={{ color:tier.color }}>{tier.name}</p>
              <p className="text-[11px] text-gray-600">{profile?.rating ?? 0} rating</p>
            </div>
            <div className="w-full">
              <div className="h-2 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width:`${Math.max(tierProg,2)}%`, background:`linear-gradient(90deg,${tier.color}60,${tier.color})` }}/>
              </div>
              {nextTierMin && (
                <p className="text-[10px] text-gray-600 mt-1.5 text-center">
                  {nextTierMin - (profile?.rating??0)} pts to next rank
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Quick stats + Leaderboard + Activity ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 cv-u3">

        {/* Performance stats */}
        <div className="glass rounded-2xl p-5">
          <p className="text-[13px] font-bold text-white mb-4">Your Performance</p>
          <div className="space-y-3">
            {[
              { label:"Contests Played", value: profile?.contests_played ?? 0,   color:"#60a5fa" },
              { label:"Best Score",       value: profile?.best_score || "—",      color:"#4ade80" },
              { label:"Avg Score",        value: avgScore || "—",                 color:"#a78bfa" },
              { label:"Best Time",        value: bestTime ? formatTime(bestTime) : "—", color:"#22d3ee" },
              { label:"No-Hint Solves",   value: entries.filter(e=>e.hints_used===0).length, color:"#fbbf24" },
              { label:"Hard Solved",      value: entries.filter(e=>e.difficulty==="Hard").length, color:"#f87171" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500">{label}</span>
                <span className="text-[12px] font-bold" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Global leaderboard preview */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-bold text-white">Top Players</p>
            <Link href="/contest" className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors">
              Full board →
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor:"rgba(96,165,250,0.4)", borderTopColor:"#60a5fa" }}/>
            </div>
          ) : (
            <div className="space-y-2.5">
              {topPlayers.map((p, i) => {
                const t = getTier(p.rating)
                const isMe = p.username === profile?.username
                return (
                  <div key={p.username}
                    className="flex items-center gap-3 px-2.5 py-2 rounded-xl transition-colors"
                    style={{ background: isMe ? `${tier.color}10` : "rgba(255,255,255,0.02)", border:`1px solid ${isMe ? tier.color+"30" : "rgba(255,255,255,0.04)"}` }}>
                    <span className="text-[12px] font-black w-5 text-center"
                      style={{ color: i===0?"#fbbf24":i===1?"#d1d5db":i===2?"#f97316":"#4b5563" }}>
                      {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`}
                    </span>
                    <span className="text-sm">{t.icon}</span>
                    <span className="flex-1 text-[11px] font-semibold text-gray-300 truncate">
                      {p.display_name ?? p.username}
                      {p.is_pro && <span className="ml-1 text-amber-400">💎</span>}
                    </span>
                    <span className="text-[12px] font-black shrink-0" style={{ color:t.color }}>{p.rating}</span>
                  </div>
                )
              })}
              {topPlayers.length === 0 && (
                <p className="text-[12px] text-gray-700 text-center py-4">No players yet</p>
              )}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="glass rounded-2xl p-5 flex flex-col gap-3">
          <p className="text-[13px] font-bold text-white mb-1">Quick Actions</p>
          {[
            { label:"Daily Contest",     sub:"Today's cipher puzzle",  href:"/contest",     icon:"📅", color:"#60a5fa" },
            { label:"Cipher Challenge",  sub:`250 puzzles to crack`,   href:"/challenge",   icon:"🧩", color:"#a78bfa" },
            { label:"Speed Round",       sub:"60 seconds, go!",        href:"/speed",       icon:"⚡", color:"#fbbf24" },
            { label:"Cipher Battle",     sub:"1v1 real-time fight",    href:"/battle",      icon:"⚔️", color:"#f87171" },
            { label:"Marketplace",       sub:`🪙 ${coins} to spend`,   href:"/marketplace", icon:"🛒", color:"#4ade80" },
          ].map(({ label, sub, href, icon, color }) => (
            <Link key={label} href={href}
              className="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02] group"
              style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background:`${color}12`, border:`1px solid ${color}25` }}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-white">{label}</p>
                <p className="text-[10px] text-gray-600">{sub}</p>
              </div>
              <span className="text-gray-700 group-hover:text-gray-400 transition-colors text-sm">→</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Row 4: Recent activity + Achievement progress + Learning ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 cv-u4">

        {/* Recent contest activity */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[13px] font-bold text-white">Recent Activity</p>
            <Link href="/profile" className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors">
              Full history →
            </Link>
          </div>
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <span className="text-3xl opacity-20">📭</span>
              <p className="text-[12px] text-gray-600">No contests played yet</p>
              <Link href="/contest" className="text-[11px] text-blue-400 hover:underline">Play today's contest →</Link>
            </div>
          ) : entries.slice(0,5).map((e, i) => {
            const delta = e.rating_after - e.rating_before
            const dc: Record<string,string> = { Easy:"#4ade80", Medium:"#fbbf24", Hard:"#f87171" }
            return (
              <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                style={{ borderBottom:i<4?"1px solid rgba(255,255,255,0.03)":"none" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ background:`${dc[e.difficulty]}12`, border:`1px solid ${dc[e.difficulty]}25` }}>
                  {e.difficulty==="Easy"?"🟢":e.difficulty==="Medium"?"🟡":"🔴"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-gray-300 truncate">{e.puzzle_id}</p>
                  <p className="text-[10px] text-gray-600">{e.puzzle_date} · {formatTime(e.time_seconds)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[12px] font-black" style={{ color:e.score>=900?"#4ade80":e.score>=700?"#fbbf24":"#9ca3af" }}>{e.score}</p>
                  <p className="text-[10px] font-bold" style={{ color:delta>=0?"#4ade80":"#f87171" }}>{delta>=0?"+":""}{delta}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Achievement progress + Learning modules */}
        <div className="flex flex-col gap-4">

          {/* Achievement snapshot */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-bold text-white">Achievements</p>
              <Link href="/profile" className="text-[10px] text-blue-400 hover:text-blue-300">View all →</Link>
            </div>
            <div className="flex items-center gap-4 mb-3">
              {(["legendary","epic","rare","common"] as const).map(r => {
                const colors: Record<string,string> = { legendary:"#fbbf24", epic:"#a78bfa", rare:"#60a5fa", common:"#9ca3af" }
                const count = ACHIEVEMENTS.filter(a => a.rarity===r && unlocked.includes(a.id)).length
                const total = ACHIEVEMENTS.filter(a => a.rarity===r).length
                return (
                  <div key={r} className="flex-1 text-center">
                    <p className="text-[16px] font-black" style={{ color:colors[r] }}>{count}</p>
                    <p className="text-[8px] text-gray-700 uppercase tracking-wider">{r[0].toUpperCase()}</p>
                    <div className="h-1 rounded-full mt-1.5 overflow-hidden" style={{ background:"rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full" style={{ width:`${(count/total)*100}%`, background:colors[r] }}/>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.05)" }}>
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width:`${(achEarned/ACHIEVEMENTS.length)*100}%`,
                  background:"linear-gradient(90deg,#3b82f6,#8b5cf6,#fbbf24)" }}/>
            </div>
            <p className="text-[10px] text-gray-600 text-right mt-1">{achEarned}/{ACHIEVEMENTS.length} unlocked</p>
          </div>

          {/* Learning modules */}
          <div className="glass rounded-2xl p-5">
            <p className="text-[13px] font-bold text-white mb-4">Learning Modules</p>
            <div className="space-y-2.5">
              {[
                { label:"Classical Ciphers",     href:"/classical",  icon:"📜", color:"#f97316", desc:"Caesar, Vigenère, Playfair..." },
                { label:"Symmetric Key",          href:"/symmetric",  icon:"🔑", color:"#3b82f6", desc:"AES-128, DES" },
                { label:"Hashing",                href:"/hashing",    icon:"#️⃣", color:"#10b981", desc:"SHA, MD5, HMAC, avalanche" },
                { label:"Asymmetric",             href:"/asymmetric", icon:"🔓", color:"#f59e0b", desc:"RSA-OAEP, ECDH" },
              ].map(({ label, href, icon, color, desc }) => (
                <Link key={label} href={href}
                  className="flex items-center gap-3 p-2.5 rounded-xl transition-all hover:bg-white/[0.03] group">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                    style={{ background:`${color}12`, border:`1px solid ${color}25` }}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-gray-300">{label}</p>
                    <p className="text-[9px] text-gray-600">{desc}</p>
                  </div>
                  <span className="text-gray-700 group-hover:text-gray-400 text-sm transition-colors">→</span>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}