"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/AuthContext"
import { supabase } from "@/lib/supabase"
import { mockPurchase } from "@/lib/pro"
import MockPaymentModal from "@/components/MockPaymentModal"
import AuthModal from "@/components/AuthModal"

interface Tournament {
  id: string; title: string; description: string; entry_fee_inr: number
  prize_pool_inr: number; max_players: number; status: string
  starts_at: string; ends_at: string; sponsor_name?: string
}

function TimeLeft({ date }: { date: string }) {
  const [label, setLabel] = useState("")
  useEffect(() => {
    const calc = () => {
      const diff = new Date(date).getTime() - Date.now()
      if (diff <= 0) { setLabel("Started"); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setLabel(d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`)
    }
    calc()
    const iv = setInterval(calc, 30000)
    return () => clearInterval(iv)
  }, [date])
  return <span>{label}</span>
}

export default function TournamentsPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [entries,     setEntries]     = useState<string[]>([])   // tournament ids user joined
  const [loading,     setLoading]     = useState(true)
  const [payTarget,   setPayTarget]   = useState<any>(null)
  const [showAuth,    setShowAuth]    = useState(false)
  const [successMsg,  setSuccessMsg]  = useState<string|null>(null)

  useEffect(() => {
    supabase.from("tournaments").select("*").order("starts_at").then(({ data }) => {
      setTournaments((data ?? []) as Tournament[])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!user) return
    supabase.from("tournament_entries").select("tournament_id").eq("user_id", user.id)
      .then(({ data }) => setEntries((data ?? []).map((e:any) => e.tournament_id)))
  }, [user])

  const join = (t: Tournament) => {
    if (!user) { setShowAuth(true); return }
    if (entries.includes(t.id)) return
    setPayTarget({
      title:       `Join: ${t.title}`,
      description: `Entry fee — 70% goes to prize pool`,
      amount_inr:  t.entry_fee_inr,
      onSuccess: async (pid: string) => {
        await fetch("/api/payments/join-tournament", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ user_id:user.id, username:profile?.username, tournament_id:t.id, payment_id:pid, amount_inr:t.entry_fee_inr })
        })
        setEntries(e => [...e, t.id])
        setPayTarget(null)
        setSuccessMsg(`✅ Joined "${t.title}"! Good luck!`)
      }
    })
  }

  const statusColor: Record<string,string> = { upcoming:"#60a5fa", active:"#4ade80", completed:"#6b7280" }
  const statusBg:    Record<string,string> = { upcoming:"rgba(96,165,250,0.1)", active:"rgba(74,222,128,0.1)", completed:"rgba(107,114,128,0.1)" }

  return (
    <div className="min-h-screen px-6 md:px-10 py-10 max-w-5xl mx-auto" style={{ background:"#050508" }}>
      <style>{`@keyframes cv-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.cv-u{animation:cv-up 0.5s cubic-bezier(0.23,1,0.32,1) both}`}</style>

      {showAuth  && <AuthModal onClose={() => setShowAuth(false)} />}
      {payTarget && <MockPaymentModal {...payTarget} onClose={() => setPayTarget(null)} />}

      {successMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl text-[13px] font-bold text-white"
          style={{ background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.35)", backdropFilter:"blur(12px)", boxShadow:"0 4px 24px rgba(34,197,94,0.2)" }}>
          {successMsg} <button onClick={() => setSuccessMsg(null)} className="ml-3 text-gray-400">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="mb-10 cv-u">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-black text-white tracking-tight">🏆 Tournaments</h1>
        </div>
        <p className="text-[13px] text-gray-500">Pay a small entry fee, compete against others, win from the prize pool.</p>
        <div className="flex gap-4 mt-4">
          {[
            { label:"70% of fees", sub:"goes to prize pool", icon:"💰", c:"#4ade80" },
            { label:"Real prizes",  sub:"paid out to winners", icon:"🎁", c:"#fbbf24" },
            { label:"Weekly events",sub:"new every Monday",   icon:"📅", c:"#60a5fa" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
              <span>{s.icon}</span>
              <div>
                <p className="text-[11px] font-bold" style={{ color:s.c }}>{s.label}</p>
                <p className="text-[9px] text-gray-600">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor:"rgba(96,165,250,0.4)", borderTopColor:"#60a5fa" }}/>
        </div>
      ) : (
        <div className="space-y-4">
          {tournaments.map((t, i) => {
            const joined   = entries.includes(t.id)
            const sc       = statusColor[t.status] ?? "#9ca3af"
            const sb       = statusBg[t.status]    ?? "rgba(156,163,175,0.1)"
            return (
              <div key={t.id} className="rounded-2xl p-6 transition-all hover:border-white/10"
                style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)", animationDelay:`${i*0.06}s` }}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-[15px] font-black text-white">{t.title}</h3>
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                        style={{ color:sc, background:sb, border:`1px solid ${sc}40` }}>
                        {t.status}
                      </span>
                      {t.sponsor_name && (
                        <span className="text-[9px] text-gray-600 px-2 py-0.5 rounded-full"
                          style={{ border:"1px solid rgba(255,255,255,0.06)" }}>
                          by {t.sponsor_name}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-gray-500 mb-4">{t.description}</p>
                    <div className="flex flex-wrap gap-5">
                      {[
                        { label:"Entry Fee",    v:`₹${t.entry_fee_inr}`, c:"#f87171" },
                        { label:"Prize Pool",   v:`₹${t.prize_pool_inr}`, c:"#4ade80" },
                        { label:"Max Players",  v:String(t.max_players),  c:"#60a5fa" },
                        { label:"Starts In",    v:<TimeLeft date={t.starts_at}/>, c:"#fbbf24" },
                      ].map(({ label, v, c }) => (
                        <div key={label}>
                          <p className="text-[13px] font-black" style={{ color:c }}>{v}</p>
                          <p className="text-[9px] text-gray-700 uppercase tracking-wider">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {joined ? (
                      <div className="px-5 py-2.5 rounded-xl text-[12px] font-bold text-emerald-400 text-center"
                        style={{ background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.25)" }}>
                        ✓ Registered
                      </div>
                    ) : t.status === "completed" ? (
                      <div className="px-5 py-2.5 rounded-xl text-[12px] font-bold text-gray-600 text-center"
                        style={{ border:"1px solid rgba(255,255,255,0.07)" }}>
                        Ended
                      </div>
                    ) : (
                      <button onClick={() => join(t)}
                        className="px-5 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all hover:scale-105"
                        style={{ background:"linear-gradient(135deg,#1d4ed8,#1e40af)", boxShadow:"0 0 20px rgba(37,99,235,0.3)" }}>
                        Join — ₹{t.entry_fee_inr}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}