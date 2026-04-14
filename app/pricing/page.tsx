"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/AuthContext"
import { PLANS, COIN_BUNDLES, mockPurchase } from "@/lib/pro"
import { addCoins } from "@/lib/inventory"
import MockPaymentModal from "@/components/MockPaymentModal"
import AuthModal from "@/components/AuthModal"

interface PaymentTarget {
  title: string; description: string; amount_inr: number
  onSuccess: (pid: string) => Promise<void>
}

export default function PricingPage() {
  const { user, profile, updateProfileLocal } = useAuth()
  const router = useRouter()
  const [payTarget,  setPayTarget]  = useState<PaymentTarget | null>(null)
  const [showAuth,   setShowAuth]   = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [billing,    setBilling]    = useState<"monthly"|"annual">("monthly")
  const [coinsBalance, setCoinsBalance] = useState(0)

  useEffect(() => {
    try { setCoinsBalance(Number(localStorage.getItem("cv_coins") ?? "0")) } catch {}
  }, [])

  const isPro = profile?.is_pro && profile?.pro_expires_at && new Date(profile.pro_expires_at) > new Date()

  const requireAuth = (cb: () => void) => {
    if (!user) { setShowAuth(true); return }
    cb()
  }

  const buyPro = (planId: "pro_monthly" | "pro_annual") => {
    const plan = PLANS[planId]
    requireAuth(() => setPayTarget({
      title:       `CryptoVerse ${plan.name}`,
      description: `${plan.duration_days}-day Pro access — all premium features unlocked`,
      amount_inr:  plan.price_inr,
      onSuccess: async (pid) => {
        await mockPurchase({ user_id:user!.id, type:planId, amount_inr:plan.price_inr })
        await fetch("/api/payments/activate-pro", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ user_id:user!.id, plan:planId, payment_id:pid })
        })
        const expiresAt = new Date(Date.now() + plan.duration_days * 86400000).toISOString()
        updateProfileLocal({ is_pro:true, pro_expires_at:expiresAt })
        setPayTarget(null)
        setSuccessMsg(`🎉 Pro activated! Enjoy ${plan.duration_days} days of premium access.`)
      }
    }))
  }

  const buyBundle = (bundle: typeof COIN_BUNDLES[0]) => {
    requireAuth(() => setPayTarget({
      title:       `${bundle.coins + bundle.bonus} Coins`,
      description: `${bundle.coins} coins${bundle.bonus > 0 ? ` + ${bundle.bonus} bonus coins` : ""}`,
      amount_inr:  bundle.price_inr,
      onSuccess: async (pid) => {
        const total = bundle.coins + bundle.bonus
        await fetch("/api/payments/grant-coins", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ user_id:user!.id, coins:total, payment_id:pid, bundle_id:bundle.id, amount_inr:bundle.price_inr })
        })
        addCoins(total)
        setPayTarget(null)
        setSuccessMsg(`🪙 ${total} coins added to your wallet!`)
      }
    }))
  }

  return (
    <div className="min-h-screen px-6 md:px-10 py-10 max-w-5xl mx-auto" style={{ background:"#050508" }}>
      <style>{`
        @keyframes cv-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .cv-u  { animation:cv-up 0.5s cubic-bezier(0.23,1,0.32,1) both }
        .cv-u1 { animation:cv-up 0.5s cubic-bezier(0.23,1,0.32,1) 0.08s both }
        .cv-u2 { animation:cv-up 0.5s cubic-bezier(0.23,1,0.32,1) 0.16s both }
      `}</style>

      {showAuth  && <AuthModal onClose={() => setShowAuth(false)} />}
      {payTarget && <MockPaymentModal {...payTarget} onClose={() => setPayTarget(null)} />}

      {/* Success banner */}
      {successMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl text-[13px] font-bold text-white"
          style={{ background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.35)", boxShadow:"0 4px 24px rgba(34,197,94,0.2)", backdropFilter:"blur(12px)" }}>
          {successMsg}
          <button onClick={() => setSuccessMsg(null)} className="ml-4 text-gray-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-12 cv-u">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold mb-4"
          style={{ background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.25)", color:"#fbbf24" }}>
          💎 CryptoVerse Pro
        </div>
        <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Unlock Your Full Potential</h1>
        <p className="text-[14px] text-gray-500 max-w-md mx-auto">
          Go Pro for premium features, buy coin bundles to power up your gameplay, or earn certificates to prove your skills.
        </p>
        {isPro && (
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full text-[12px] font-bold"
            style={{ background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.3)", color:"#fbbf24" }}>
            ✓ You are currently Pro · expires {new Date(profile!.pro_expires_at!).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* ── Pro Plans ── */}
      <div className="mb-14 cv-u1">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[18px] font-black text-white">Pro Subscription</h2>
          {/* Billing toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)" }}>
            {(["monthly","annual"] as const).map(b => (
              <button key={b} onClick={() => setBilling(b)}
                className="px-4 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all"
                style={{ background:billing===b?"rgba(255,255,255,0.1)":"transparent", color:billing===b?"#fff":"#4b5563" }}>
                {b} {b==="annual" && <span className="text-emerald-400 ml-1">Save 33%</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Free */}
          <div className="rounded-2xl p-6" style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-2">Free</p>
            <p className="text-4xl font-black text-white mb-1">₹0</p>
            <p className="text-[11px] text-gray-600 mb-6">Forever free</p>
            <ul className="space-y-2.5 mb-6">
              {["All cipher visualizers","Daily Contest","3 Speed Rounds/day","Easy & Medium challenges","Basic profile"].map(f => (
                <li key={f} className="flex items-center gap-2 text-[12px] text-gray-400">
                  <span className="text-gray-700">✓</span>{f}
                </li>
              ))}
            </ul>
            <div className="w-full py-2.5 rounded-xl text-[12px] font-bold text-gray-600 text-center"
              style={{ border:"1px solid rgba(255,255,255,0.07)" }}>
              Current Plan
            </div>
          </div>

          {/* Pro */}
          {(() => {
            const planId  = billing === "annual" ? "pro_annual" : "pro_monthly"
            const plan    = PLANS[planId]
            return (
              <div className="rounded-2xl p-6 relative overflow-hidden"
                style={{ background:"rgba(251,191,36,0.05)", border:"2px solid rgba(251,191,36,0.3)", boxShadow:"0 0 40px rgba(251,191,36,0.08)" }}>
                {/* Popular badge */}
                <div className="absolute top-4 right-4 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
                  style={{ background:"rgba(251,191,36,0.2)", color:"#fbbf24", border:"1px solid rgba(251,191,36,0.4)" }}>
                  MOST POPULAR
                </div>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color:"#fbbf24" }}>💎 Pro</p>
                <div className="flex items-end gap-2 mb-1">
                  <p className="text-4xl font-black text-white">₹{plan.price_inr}</p>
                  <p className="text-[12px] text-gray-500 mb-1">/{billing === "annual" ? "year" : "mo"}</p>
                </div>
                {billing === "annual" && (
                  <p className="text-[11px] text-emerald-400 mb-4">That's just ₹{Math.round(plan.price_inr/12)}/month</p>
                )}
                <ul className="space-y-2.5 mb-6 mt-4">
                  {plan.perks.map(f => (
                    <li key={f} className="flex items-center gap-2 text-[12px] text-gray-300">
                      <span style={{ color:"#fbbf24" }}>✦</span>{f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => buyPro(planId)} disabled={!!isPro}
                  className="w-full py-3 rounded-xl text-[13px] font-black text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background:"linear-gradient(135deg,#d97706,#b45309)", boxShadow:"0 0 24px rgba(217,119,6,0.35)" }}>
                  {isPro ? "✓ Already Pro" : `Get Pro ${billing === "annual" ? "Annual" : "Monthly"}`}
                </button>
              </div>
            )
          })()}
        </div>
      </div>

      {/* ── Coin Bundles ── */}
      <div className="mb-14 cv-u2">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[18px] font-black text-white">Coin Bundles</h2>
            <p className="text-[11px] text-gray-600 mt-0.5">Use coins to buy power-ups in the Marketplace</p>
          </div>
          {profile && (
            <div className="text-right">
              <p className="text-[16px] font-black text-amber-400">🪙 {coinsBalance}</p>
              <p className="text-[9px] text-gray-600 uppercase tracking-wider">Current Balance</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {COIN_BUNDLES.map(bundle => (
            <div key={bundle.id} className="rounded-2xl p-5 relative transition-all hover:-translate-y-0.5 cursor-pointer"
              style={{
                background: bundle.popular ? `rgba(167,139,250,0.06)` : "rgba(255,255,255,0.025)",
                border: `1px solid ${bundle.popular ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.07)"}`,
                boxShadow: bundle.popular ? "0 0 32px rgba(167,139,250,0.1)" : "none",
              }}
              onClick={() => buyBundle(bundle)}>
              {bundle.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
                  style={{ background:"rgba(167,139,250,0.25)", color:"#a78bfa", border:"1px solid rgba(167,139,250,0.4)" }}>
                  BEST VALUE
                </div>
              )}
              <div className="text-3xl mb-3">🪙</div>
              <p className="text-[24px] font-black mb-0.5" style={{ color:bundle.color }}>
                {bundle.coins + bundle.bonus}
              </p>
              <p className="text-[10px] text-gray-600 mb-4">
                {bundle.coins} coins{bundle.bonus > 0 ? ` + ${bundle.bonus} bonus` : ""}
              </p>
              <div className="w-full py-2.5 rounded-xl text-[13px] font-black text-white text-center transition-all hover:scale-105"
                style={{ background:`linear-gradient(135deg,${bundle.color}80,${bundle.color}50)`, border:`1px solid ${bundle.color}50` }}>
                ₹{bundle.price_inr}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Certificates ── */}
      <div className="cv-u2">
        <div className="mb-6">
          <h2 className="text-[18px] font-black text-white">Certificates</h2>
          <p className="text-[11px] text-gray-600 mt-0.5">Verify your cryptography skills with shareable certificates</p>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ border:"1px solid rgba(255,255,255,0.07)" }}>
          {[
            { id:"classical",  icon:"📜", label:"Classical Ciphers",     price:149, desc:"Caesar, Vigenère, Playfair, Hill, Rail Fence" },
            { id:"symmetric",  icon:"🔑", label:"Symmetric Encryption",  price:149, desc:"AES-128 round visualization, DES Feistel rounds" },
            { id:"hashing",    icon:"#️⃣", label:"Hashing & Signatures",  price:149, desc:"SHA-256, MD5, HMAC, avalanche effect, RSA-SHA256" },
            { id:"asymmetric", icon:"🔓", label:"Asymmetric Encryption",  price:149, desc:"RSA-OAEP 2048-bit, ECDH key exchange" },
            { id:"full",       icon:"🏆", label:"Full Cryptography Path", price:399, desc:"All 4 paths combined — most prestigious", highlight:true },
          ].map((cert, i, arr) => (
            <div key={cert.id}
              className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.025]"
              style={{
                borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                background: cert.highlight ? "rgba(251,191,36,0.03)" : "transparent",
              }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)" }}>
                  {cert.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-bold text-white">{cert.label}</p>
                    {cert.highlight && (
                      <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                        style={{ background:"rgba(251,191,36,0.15)", color:"#fbbf24", border:"1px solid rgba(251,191,36,0.3)" }}>
                        BEST
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-600">{cert.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[15px] font-black text-white">₹{cert.price}</span>
                <button onClick={() => router.push("/certificates")}
                  className="px-4 py-2 rounded-xl text-[12px] font-bold text-white transition-all hover:scale-105"
                  style={{ background:"linear-gradient(135deg,#1d4ed8,#1e40af)", boxShadow:"0 0 16px rgba(37,99,235,0.3)" }}>
                  Get Certificate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}