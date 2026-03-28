"use client"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/AuthContext"
import { CERT_PATHS } from "@/lib/pro"
import MockPaymentModal from "@/components/MockPaymentModal"
import AuthModal from "@/components/AuthModal"
import { supabase } from "@/lib/supabase"

interface Certificate { id:string; path_completed:string; issued_at:string; verify_code:string; score:number }

function CertPreview({ cert, name }: { cert:{ icon:string; label:string }; name:string }) {
  return (
    <div className="rounded-2xl p-8 text-center relative overflow-hidden"
      style={{ background:"linear-gradient(135deg,#0a0a14 0%,#0d0d1a 50%,#0a0a14 100%)", border:"1px solid rgba(251,191,36,0.25)", boxShadow:"0 0 60px rgba(251,191,36,0.08)" }}>
      {/* Corner decorations */}
      {["top-3 left-3","top-3 right-3","bottom-3 left-3","bottom-3 right-3"].map(pos => (
        <div key={pos} className={`absolute ${pos} w-6 h-6`}
          style={{ border:"1px solid rgba(251,191,36,0.3)", borderRadius:"4px" }}/>
      ))}
      <div className="absolute inset-0 opacity-[0.015]"
        style={{ backgroundImage:"radial-gradient(rgba(251,191,36,1) 1px,transparent 1px)", backgroundSize:"24px 24px" }}/>
      <div className="relative z-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500/60 mb-4">Certificate of Completion</p>
        <p className="text-[28px] font-black text-white mb-1">{name || "Your Name"}</p>
        <p className="text-[11px] text-gray-500 mb-6">has successfully completed</p>
        <div className="text-4xl mb-2">{cert.icon}</div>
        <p className="text-[18px] font-black mb-1" style={{ color:"#fbbf24" }}>{cert.label}</p>
        <p className="text-[11px] text-gray-600 mb-6">CryptoVerse Cryptography Lab</p>
        <div className="flex items-center justify-center gap-8 pt-4" style={{ borderTop:"1px solid rgba(251,191,36,0.15)" }}>
          <div className="text-center">
            <p className="text-[11px] font-bold text-amber-400">{new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</p>
            <p className="text-[9px] text-gray-700 uppercase tracking-wider mt-0.5">Date Issued</p>
          </div>
          <div className="text-center">
            <p className="text-[11px] font-bold text-amber-400">cryptoverse.app</p>
            <p className="text-[9px] text-gray-700 uppercase tracking-wider mt-0.5">Verify At</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CertificatesPage() {
  const { user, profile } = useAuth()
  const [certs,      setCerts]      = useState<Certificate[]>([])
  const [payTarget,  setPayTarget]  = useState<any>(null)
  const [showAuth,   setShowAuth]   = useState(false)
  const [preview,    setPreview]    = useState<typeof CERT_PATHS[0] | null>(null)
  const [successMsg, setSuccessMsg] = useState<string|null>(null)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    supabase.from("certificates").select("*").eq("user_id", user.id)
      .then(({ data }) => { setCerts((data??[]) as Certificate[]); setLoading(false) })
  }, [user])

  const buy = (path: typeof CERT_PATHS[0]) => {
    if (!user) { setShowAuth(true); return }
    const alreadyOwned = certs.find(c => c.path_completed === path.id)
    if (alreadyOwned) { setPreview(path); return }
    setPayTarget({
      title:       `${path.icon} ${path.label} Certificate`,
      description: "Verifiable PDF certificate with unique ID",
      amount_inr:  path.price_inr,
      onSuccess: async (pid:string) => {
        const res = await fetch("/api/payments/issue-certificate", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            user_id:       user.id,
            username:      profile?.username,
            display_name:  profile?.display_name,
            path_completed:path.id,
            score:         0,
            payment_id:    pid,
          })
        })
        const data = await res.json()
        if (data.certificate) setCerts(c => [...c, data.certificate])
        setPayTarget(null)
        setPreview(path)
        setSuccessMsg(`🎓 Certificate issued! Check your certificates below.`)
      }
    })
  }

  const name = profile?.display_name ?? profile?.username ?? "Your Name"

  return (
    <div className="min-h-screen px-6 md:px-10 py-10 max-w-5xl mx-auto" style={{ background:"#050508" }}>
      {showAuth  && <AuthModal onClose={() => setShowAuth(false)} />}
      {payTarget && <MockPaymentModal {...payTarget} onClose={() => setPayTarget(null)} />}

      {successMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl text-[13px] font-bold text-white"
          style={{ background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.35)", backdropFilter:"blur(12px)" }}>
          {successMsg} <button onClick={() => setSuccessMsg(null)} className="ml-3 text-gray-400">✕</button>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">🎓 Certificates</h1>
        <p className="text-[13px] text-gray-500">Prove your cryptography skills with verifiable certificates. Share on LinkedIn, resume, or anywhere.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — cert list */}
        <div className="space-y-3">
          {CERT_PATHS.map(path => {
            const owned = certs.find(c => c.path_completed === path.id)
            return (
              <div key={path.id} className="rounded-2xl p-4 flex items-center gap-4 transition-all hover:border-white/10 cursor-pointer"
                style={{
                  background: owned ? "rgba(251,191,36,0.05)" : "rgba(255,255,255,0.025)",
                  border: `1px solid ${owned ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.07)"}`,
                }}
                onClick={() => owned ? setPreview(path) : buy(path)}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: owned ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)", border:`1px solid ${owned?"rgba(251,191,36,0.3)":"rgba(255,255,255,0.07)"}` }}>
                  {path.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[13px] font-bold text-white">{path.label}</p>
                    {owned && <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded" style={{ background:"rgba(251,191,36,0.15)", color:"#fbbf24" }}>OWNED</span>}
                  </div>
                  {owned
                    ? <p className="text-[10px] text-gray-600">Issued {new Date(owned.issued_at).toLocaleDateString()} · Code: {owned.verify_code}</p>
                    : <p className="text-[10px] text-gray-600">₹{path.price_inr} · Verifiable PDF</p>
                  }
                </div>
                <div className="shrink-0">
                  {owned
                    ? <span className="text-[11px] font-bold text-amber-400">View →</span>
                    : <span className="text-[11px] font-bold text-blue-400">₹{path.price_inr} →</span>
                  }
                </div>
              </div>
            )
          })}
        </div>

        {/* Right — preview */}
        <div>
          {preview
            ? <CertPreview cert={preview} name={name}/>
            : (
              <div className="rounded-2xl flex flex-col items-center justify-center py-16 text-center"
                style={{ background:"rgba(255,255,255,0.015)", border:"1px dashed rgba(255,255,255,0.08)" }}>
                <p className="text-4xl mb-3 opacity-30">🎓</p>
                <p className="text-[13px] text-gray-600">Select a certificate to preview</p>
              </div>
            )
          }
        </div>
      </div>
    </div>
  )
}