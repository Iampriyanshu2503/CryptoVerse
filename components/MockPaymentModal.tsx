"use client"
// ─── Mock Payment Modal ───────────────────────────────────────────────────────
// Simulates Razorpay checkout. Swap this component with real Razorpay later.
import { useState } from "react"

interface Props {
  title:       string
  description: string
  amount_inr:  number
  onSuccess:   (payment_id: string) => Promise<void>
  onClose:     () => void
}

export default function MockPaymentModal({ title, description, amount_inr, onSuccess, onClose }: Props) {
  const [step,       setStep]       = useState<"review"|"processing"|"done">("review")
  const [cardNum,    setCardNum]     = useState("4111 1111 1111 1111")
  const [expiry,     setExpiry]      = useState("12/26")
  const [cvv,        setCvv]         = useState("123")
  const [name,       setName]        = useState("")
  const [error,      setError]       = useState<string|null>(null)

  const handlePay = async () => {
    if (!name.trim()) { setError("Enter cardholder name"); return }
    setError(null)
    setStep("processing")
    // Simulate network delay
    await new Promise(r => setTimeout(r, 1800))
    const payment_id = `mock_${Date.now()}_${Math.random().toString(36).slice(2,8)}`
    setStep("done")
    await onSuccess(payment_id)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background:"rgba(0,0,0,0.85)", backdropFilter:"blur(16px)" }}
      onClick={e => { if (e.target === e.currentTarget && step !== "processing") onClose() }}>

      <div className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background:"#0a0a10", border:"1px solid rgba(255,255,255,0.1)", boxShadow:"0 32px 80px rgba(0,0,0,0.7)" }}>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom:"1px solid rgba(255,255,255,0.06)", background:"rgba(255,255,255,0.02)" }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
              style={{ background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.3)" }}>🔒</div>
            <span className="text-[12px] font-bold text-white">Secure Checkout</span>
          </div>
          <div className="text-[10px] text-gray-600 font-mono px-2 py-0.5 rounded"
            style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)" }}>
            TEST MODE
          </div>
        </div>

        {step === "done" ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
              style={{ background:"rgba(34,197,94,0.15)", border:"2px solid rgba(34,197,94,0.4)", boxShadow:"0 0 32px rgba(34,197,94,0.2)" }}>
              ✓
            </div>
            <p className="text-[16px] font-black text-white">Payment Successful!</p>
            <p className="text-[12px] text-gray-500 text-center">Your purchase is being activated…</p>
          </div>
        ) : step === "processing" ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor:"rgba(96,165,250,0.4)", borderTopColor:"#60a5fa" }}/>
            <p className="text-[13px] text-gray-400">Processing payment…</p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {/* Order summary */}
            <div className="rounded-2xl p-4" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[13px] font-bold text-white mb-1">{title}</p>
              <p className="text-[11px] text-gray-600 mb-3">{description}</p>
              <div className="flex items-center justify-between pt-3" style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                <span className="text-[11px] text-gray-600">Total</span>
                <span className="text-[18px] font-black text-white">₹{amount_inr}</span>
              </div>
            </div>

            {/* Card form */}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-600 uppercase tracking-widest block mb-1.5">Card Number</label>
                <input value={cardNum} onChange={e => setCardNum(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-[13px] font-mono text-white outline-none"
                  style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)" }}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-600 uppercase tracking-widest block mb-1.5">Expiry</label>
                  <input value={expiry} onChange={e => setExpiry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-[13px] font-mono text-white outline-none"
                    style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)" }}/>
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 uppercase tracking-widest block mb-1.5">CVV</label>
                  <input value={cvv} onChange={e => setCvv(e.target.value)} type="password" maxLength={4}
                    className="w-full px-3.5 py-2.5 rounded-xl text-[13px] font-mono text-white outline-none"
                    style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)" }}/>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-600 uppercase tracking-widest block mb-1.5">Name on Card</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your Name"
                  className="w-full px-3.5 py-2.5 rounded-xl text-[13px] text-white placeholder-gray-700 outline-none"
                  style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)" }}/>
              </div>
            </div>

            {error && <p className="text-[11px] text-red-400">{error}</p>}

            <p className="text-[9px] text-gray-700 text-center">
              🔒 This is a simulated checkout. No real payment is processed.
            </p>

            <div className="flex gap-2 pt-1">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-gray-500 hover:text-gray-300 transition-colors"
                style={{ border:"1px solid rgba(255,255,255,0.08)" }}>
                Cancel
              </button>
              <button onClick={handlePay}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all hover:scale-105 active:scale-95"
                style={{ background:"linear-gradient(135deg,#16a34a,#15803d)", boxShadow:"0 0 24px rgba(34,197,94,0.3)" }}>
                Pay ₹{amount_inr}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}