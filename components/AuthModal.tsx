"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/AuthContext"
import { supabase } from "@/lib/supabase"

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%⊕∑∂∇"
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]

const DEMOS = [
  { label: "CAESAR",   plain: "HELLO",    cipher: "KHOOR"     },
  { label: "AES-128",  plain: "SECRET",   cipher: "3A·F2·C7"  },
  { label: "SHA-256",  plain: "password", cipher: "5E88·4898" },
  { label: "RSA-2048", plain: "KEY",      cipher: "E4·1B·72"  },
  { label: "VIGENERE", plain: "ATTACK",   cipher: "LXFOPV"    },
]

function LeftPanel() {
  const [stream,  setStream]  = useState<string[]>([])
  const [demoIdx, setDemoIdx] = useState(0)
  const [phase,   setPhase]   = useState<"in"|"show"|"out">("show")
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    const iv = setInterval(() => {
      setStream(s => {
        const next = [...s, Array.from({ length: 3 }, () => pick(GLYPHS.split(""))).join("")]
        return next.length > 30 ? next.slice(-30) : next
      })
    }, 170)
    return () => clearInterval(iv)
  }, [mounted])

  useEffect(() => {
    if (!mounted) return
    let cancelled = false
    const cycle = () => {
      if (cancelled) return
      setPhase("in")
      setTimeout(() => { if (!cancelled) setPhase("show") }, 500)
      setTimeout(() => { if (!cancelled) setPhase("out") }, 2900)
      setTimeout(() => {
        if (!cancelled) { setDemoIdx(i => (i + 1) % DEMOS.length); cycle() }
      }, 3500)
    }
    const t = setTimeout(cycle, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [mounted])

  const demo = DEMOS[demoIdx]

  return (
    <div className="relative hidden md:flex flex-col justify-between p-9 overflow-hidden"
      style={{ background: "linear-gradient(155deg,#020409 0%,#03060e 55%,#020407 100%)" }}>
      <div className="absolute inset-0 pointer-events-none opacity-[0.032]"
        style={{ backgroundImage: "linear-gradient(rgba(59,130,246,1) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,1) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle,rgba(59,130,246,0.07) 0%,transparent 70%)" }} />
      {mounted && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <div className="flex flex-wrap gap-x-3 gap-y-1 p-6 opacity-[0.06]">
            {stream.map((tok, i) => <span key={i} className="font-mono text-[11px] text-blue-400">{tok}</span>)}
          </div>
        </div>
      )}
      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0"
            style={{ boxShadow: "0 0 20px rgba(59,130,246,0.55)" }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5L2 4.5v5l5 3 5-3v-5L7 1.5z" stroke="white" strokeWidth="1.3" strokeLinejoin="round"/>
              <circle cx="7" cy="7" r="1.5" fill="white"/>
            </svg>
          </div>
          <span className="font-mono text-[14px] font-black text-white tracking-wider">CryptoVerse</span>
        </div>
        <p className="font-mono text-[9px] text-blue-500/35 tracking-[0.28em] uppercase">Interactive Cryptography Lab</p>
      </div>
      <div className="relative z-10">
        <p className="font-mono text-[9px] text-gray-700 tracking-[0.3em] uppercase mb-3">▶ Live Demo</p>
        <div className="rounded-2xl p-5"
          style={{ background: "rgba(8,12,22,0.85)", border: "1px solid rgba(59,130,246,0.14)", boxShadow: "0 0 40px rgba(59,130,246,0.05)" }}>
          <div className="flex items-center gap-2 mb-5">
            <span className="font-mono text-[9px] font-bold tracking-widest px-2.5 py-1 rounded-full"
              style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.22)", color: "#60a5fa" }}>
              {demo.label}
            </span>
            <div className="flex-1 h-px bg-blue-500/10" />
            <span className="font-mono text-[8px] text-gray-700 animate-pulse">encrypting...</span>
          </div>
          <div className="mb-3">
            <p className="font-mono text-[8px] text-gray-700 uppercase tracking-[0.25em] mb-1.5">Plaintext</p>
            <p className="font-mono text-[22px] font-black text-white tracking-[0.12em]"
              style={{ opacity: phase === "out" ? 0.25 : 1, transition: "opacity 0.45s" }}>{demo.plain}</p>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 rounded-full transition-all duration-700"
              style={{ background: phase === "show" ? "linear-gradient(90deg,transparent,rgba(59,130,246,0.55))" : "rgba(255,255,255,0.04)" }} />
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
              style={{ color: phase === "show" ? "#3b82f6" : "#1e293b", transition: "color 0.5s" }}>
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="font-mono text-[8px] text-gray-700 uppercase tracking-[0.25em] mb-1.5">Ciphertext</p>
            <p className="font-mono text-[22px] font-black tracking-[0.12em]"
              style={{ color: "#3b82f6", opacity: phase === "show" ? 1 : 0, transform: phase === "show" ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.5s,transform 0.5s", textShadow: "0 0 24px rgba(59,130,246,0.5)" }}>
              {demo.cipher}
            </p>
          </div>
        </div>
      </div>
      <div className="relative z-10 grid grid-cols-3 gap-2">
        {[{ n: "6+", l: "Ciphers" }, { n: "2048", l: "RSA bits" }, { n: "\u221e", l: "Puzzles" }].map(({ n, l }) => (
          <div key={l} className="text-center rounded-xl py-3"
            style={{ background: "rgba(255,255,255,0.022)", border: "1px solid rgba(255,255,255,0.045)" }}>
            <p className="font-mono text-[15px] font-black text-white leading-none mb-0.5">{n}</p>
            <p className="font-mono text-[8px] text-gray-600 tracking-wider uppercase">{l}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function pwStrength(pw: string) {
  if (!pw) return { score: 0, label: "", hint: "", color: "" }
  let s = 0
  if (pw.length >= 8)           s++
  if (pw.length >= 12)          s++
  if (/[A-Z]/.test(pw))        s++
  if (/[0-9]/.test(pw))        s++
  if (/[^a-zA-Z0-9]/.test(pw)) s++
  const levels = [
    { label: "Weak",   hint: "add uppercase & numbers", color: "#ef4444" },
    { label: "Weak",   hint: "add uppercase & numbers", color: "#ef4444" },
    { label: "Fair",   hint: "add special characters",  color: "#f59e0b" },
    { label: "Good",   hint: "almost there!",           color: "#3b82f6" },
    { label: "Strong", hint: "great password \u2713",   color: "#10b981" },
  ]
  return { score: s, ...levels[Math.min(s - 1, 4)] }
}

interface FieldProps {
  label: string; value: string; onChange: (v: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  type?: string; placeholder?: string; autoComplete?: string
  error?: string; hint?: string; suffix?: React.ReactNode; disabled?: boolean
}
function Field({ label, value, onChange, onKeyDown, type = "text", placeholder, autoComplete, error, hint, suffix, disabled }: FieldProps) {
  return (
    <div>
      <label className="block font-mono text-[10px] tracking-[0.2em] uppercase mb-1.5" style={{ color: "#4b5563" }}>{label}</label>
      <div className="relative">
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown} placeholder={placeholder} autoComplete={autoComplete} disabled={disabled}
          className="w-full px-3.5 py-2.5 rounded-xl font-mono text-[13px] text-white placeholder-gray-700 outline-none transition-all duration-200"
          style={{ background: "rgba(255,255,255,0.032)", border: `1px solid ${error ? "rgba(239,68,68,0.45)" : "rgba(255,255,255,0.08)"}`,
            boxShadow: error ? "0 0 0 3px rgba(239,68,68,0.08)" : undefined,
            opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : undefined }} />
        {suffix && <div className="absolute inset-y-0 right-2 flex items-center">{suffix}</div>}
      </div>
      {error && <p className="font-mono text-[10px] text-red-400 mt-1 tracking-wide">{error}</p>}
      {hint && !error && <p className="font-mono text-[9px] text-gray-700 mt-1 tracking-wider">{hint}</p>}
    </div>
  )
}

// ── OTP Input — 6 boxes ───────────────────────────────────────────────────────
function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const digits = value.padEnd(6, "").split("").slice(0, 6)
  const refs = Array.from({ length: 6 }, () => null) as Array<HTMLInputElement | null>

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault()
      const next = value.slice(0, i) + value.slice(i + 1)
      onChange(next)
      if (i > 0) refs[i - 1]?.focus()
    }
  }

  const handleChange = (i: number, v: string) => {
    const char = v.replace(/\D/g, "").slice(-1)
    const next = value.slice(0, i) + char + value.slice(i + 1)
    onChange(next.slice(0, 6))
    if (char && i < 5) refs[i + 1]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    onChange(pasted)
    refs[Math.min(pasted.length, 5)]?.focus()
  }

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input key={i} ref={el => { refs[i] = el }} type="text" inputMode="numeric"
          value={d} maxLength={1} disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          className="w-11 h-12 text-center font-mono text-[20px] font-black text-white rounded-xl outline-none transition-all duration-150"
          style={{
            background: d ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.032)",
            border: `1px solid ${d ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.08)"}`,
            boxShadow: d ? "0 0 14px rgba(59,130,246,0.18)" : undefined,
          }} />
      ))}
    </div>
  )
}

// ── Forgot Password — 3-step flow ─────────────────────────────────────────────
type ForgotStep = "email" | "otp" | "newpw" | "done"

function ForgotPanel({ onBack }: { onBack: () => void }) {
  const [step,       setStep]       = useState<ForgotStep>("email")
  const [email,      setEmail]      = useState("")
  const [otp,        setOtp]        = useState("")
  const [newPw,      setNewPw]      = useState("")
  const [confirmPw,  setConfirmPw]  = useState("")
  const [showPw,     setShowPw]     = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [err,        setErr]        = useState("")
  const [resendCool, setResendCool] = useState(0)
  const strength = pwStrength(newPw)

  // Resend cooldown timer
  useEffect(() => {
    if (resendCool <= 0) return
    const t = setTimeout(() => setResendCool(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCool])

  // ── Step 1: Send OTP email ─────────────────────────────────────────────────
  const sendOtp = async () => {
    setErr("")
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr("Please enter a valid email address."); return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      })
      if (error) {
        // Supabase returns an error if email not found — show generic msg for security
        if (/not found|no user/i.test(error.message)) {
          setErr("No account found with that email address.")
        } else {
          setErr(error.message)
        }
        return
      }
      setStep("otp")
      setResendCool(60)
    } catch (e: any) {
      setErr(e?.message ?? "Failed to send OTP. Try again.")
    } finally { setLoading(false) }
  }

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const verifyOtp = async () => {
    setErr("")
    if (otp.length !== 6) { setErr("Please enter all 6 digits."); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "magiclink",
      })
      if (error) {
        setErr("Invalid or expired code. Please try again.")
        setOtp("")
        return
      }
      setStep("newpw")
    } catch (e: any) {
      setErr(e?.message ?? "Verification failed.")
    } finally { setLoading(false) }
  }

  // ── Step 3: Update password ───────────────────────────────────────────────
  const updatePw = async () => {
    setErr("")
    if (newPw.length < 6)      { setErr("Password must be at least 6 characters."); return }
    if (newPw !== confirmPw)   { setErr("Passwords do not match."); return }
    if (strength.score < 2)    { setErr("Please choose a stronger password."); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw })
      if (error) { setErr(error.message); return }
      setStep("done")
    } catch (e: any) {
      setErr(e?.message ?? "Failed to update password.")
    } finally { setLoading(false) }
  }

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const resendOtp = async () => {
    if (resendCool > 0) return
    setErr(""); setOtp("")
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email, options: { shouldCreateUser: false },
      })
      if (error) { setErr(error.message); return }
      setResendCool(60)
    } finally { setLoading(false) }
  }

  const stepNum = step === "email" ? 1 : step === "otp" ? 2 : step === "newpw" ? 3 : 3

  return (
    <div style={{ animation: "cv-up 0.35s ease both" }}>
      {/* Back button */}
      {step !== "done" && (
        <button onClick={onBack}
          className="flex items-center gap-1.5 font-mono text-[10px] text-gray-600 hover:text-gray-400 tracking-widest mb-6 transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          BACK TO SIGN IN
        </button>
      )}

      {/* Step indicator */}
      {step !== "done" && (
        <div className="flex items-center gap-2 mb-6">
          {[1,2,3].map(n => (
            <div key={n} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-black transition-all duration-300"
                style={{
                  background: n < stepNum ? "#10b981" : n === stepNum ? "#3b82f6" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${n < stepNum ? "#10b981" : n === stepNum ? "#3b82f6" : "rgba(255,255,255,0.08)"}`,
                  color: n <= stepNum ? "#fff" : "#374151",
                  boxShadow: n === stepNum ? "0 0 14px rgba(59,130,246,0.4)" : undefined,
                }}>
                {n < stepNum ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : n}
              </div>
              {n < 3 && <div className="flex-1 h-px w-8" style={{ background: n < stepNum ? "#10b981" : "rgba(255,255,255,0.06)" }} />}
            </div>
          ))}
          <span className="font-mono text-[9px] text-gray-600 tracking-widest ml-1">
            {step === "email" ? "ENTER EMAIL" : step === "otp" ? "VERIFY CODE" : "NEW PASSWORD"}
          </span>
        </div>
      )}

      <h2 className="font-mono text-[19px] font-black text-white tracking-tight leading-none mb-1.5">
        {step === "email" ? "Reset password" :
         step === "otp"   ? "Enter your code" :
         step === "newpw" ? "New password" :
                             "Password updated!"}
      </h2>
      <p className="text-[12px] text-gray-600 mb-6" style={{ fontFamily: "system-ui,sans-serif" }}>
        {step === "email" ? "We\'ll send a 6-digit verification code to your email." :
         step === "otp"   ? `Code sent to ${email}. Check your inbox and spam folder.` :
         step === "newpw" ? "Choose a strong new password for your account." :
                             "You can now sign in with your new password."}
      </p>

      {/* Error */}
      {err && (
        <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 mb-4"
          style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.22)", animation: "cv-up 0.25s ease both" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-px shrink-0" style={{ color: "#f87171" }}>
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M7 4v3.5M7 9v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <p className="text-[12px] text-red-400 leading-snug" style={{ fontFamily: "system-ui" }}>{err}</p>
        </div>
      )}

      {/* ── Step 1: Email ── */}
      {step === "email" && (
        <div className="space-y-4">
          <Field label="Email Address" type="email" value={email} onChange={setEmail}
            onKeyDown={e => { if (e.key === "Enter") sendOtp() }}
            placeholder="you@example.com" autoComplete="email" />
          <button onClick={sendOtp} disabled={loading}
            className="w-full py-3 rounded-xl font-mono text-[12px] font-bold tracking-wider flex items-center justify-center gap-2.5 transition-all duration-200"
            style={{ background: loading ? "rgba(37,99,235,0.4)" : "linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%)",
              color: "#fff", boxShadow: loading ? "none" : "0 0 30px rgba(59,130,246,0.28)",
              cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="5.5" stroke="white" strokeWidth="2" strokeDasharray="24 10"/>
                </svg>
                SENDING CODE...
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M1 3h12v9H1V3zm0 0l6 5 6-5" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/>
                </svg>
                SEND VERIFICATION CODE
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Step 2: OTP ── */}
      {step === "otp" && (
        <div className="space-y-5">
          <div>
            <p className="font-mono text-[10px] text-gray-600 tracking-[0.2em] uppercase mb-3 text-center">6-DIGIT CODE</p>
            <OtpInput value={otp} onChange={setOtp} disabled={loading} />
          </div>
          <button onClick={verifyOtp} disabled={loading || otp.length !== 6}
            className="w-full py-3 rounded-xl font-mono text-[12px] font-bold tracking-wider flex items-center justify-center gap-2.5 transition-all duration-200"
            style={{
              background: (loading || otp.length !== 6) ? "rgba(37,99,235,0.3)" : "linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%)",
              color: "#fff", boxShadow: (loading || otp.length !== 6) ? "none" : "0 0 30px rgba(59,130,246,0.28)",
              cursor: (loading || otp.length !== 6) ? "not-allowed" : "pointer",
              opacity: otp.length !== 6 ? 0.6 : 1,
            }}>
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="5.5" stroke="white" strokeWidth="2" strokeDasharray="24 10"/>
                </svg>
                VERIFYING...
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M2 7l3 3 6-6" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                VERIFY CODE
              </>
            )}
          </button>
          <div className="text-center">
            <button onClick={resendOtp} disabled={resendCool > 0 || loading}
              className="font-mono text-[10px] tracking-widest transition-colors"
              style={{ color: resendCool > 0 ? "#374151" : "#3b82f6", cursor: resendCool > 0 ? "not-allowed" : "pointer" }}>
              {resendCool > 0 ? `RESEND CODE IN ${resendCool}s` : "RESEND CODE"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: New Password ── */}
      {step === "newpw" && (
        <div className="space-y-3.5">
          <div>
            <Field label="New Password" type={showPw ? "text" : "password"} value={newPw} onChange={setNewPw}
              placeholder="min. 6 characters" autoComplete="new-password"
              suffix={
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="p-1 rounded-lg transition-colors"
                  style={{ color: showPw ? "#60a5fa" : "#374151" }}>
                  {showPw ? (
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2l12 12M6.8 6.8A2.5 2.5 0 0 0 10 10.5M3.5 4C2 5.3 1 8 1 8s2.5 5 7 5a9 9 0 0 0 3.8-.9M5.5 2.3C6.3 2.1 7.1 2 8 2c4.5 0 7 5 7 6 0 .5-.4 1.3-.9 2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                      <path d="M1 8s2.5-5.5 7-5.5S15 8 15 8s-2.5 5.5-7 5.5S1 8 1 8z" stroke="currentColor" strokeWidth="1.35"/>
                      <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.35"/>
                    </svg>
                  )}
                </button>
              } />
            {newPw && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(n => (
                    <div key={n} className="flex-1 h-[3px] rounded-full transition-all duration-300"
                      style={{ background: n <= strength.score ? strength.color : "rgba(255,255,255,0.05)" }} />
                  ))}
                </div>
                <p className="font-mono text-[9px] tracking-widest" style={{ color: strength.color }}>
                  {strength.label?.toUpperCase()} — {strength.hint}
                </p>
              </div>
            )}
          </div>
          <Field label="Confirm Password" type={showPw ? "text" : "password"} value={confirmPw} onChange={setConfirmPw}
            onKeyDown={e => { if (e.key === "Enter") updatePw() }}
            placeholder="repeat password" autoComplete="new-password"
            error={confirmPw && confirmPw !== newPw ? "Passwords do not match" : undefined} />
          <button onClick={updatePw} disabled={loading}
            className="w-full py-3 rounded-xl font-mono text-[12px] font-bold tracking-wider flex items-center justify-center gap-2.5 transition-all duration-200 mt-2"
            style={{ background: loading ? "rgba(37,99,235,0.4)" : "linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%)",
              color: "#fff", boxShadow: loading ? "none" : "0 0 30px rgba(59,130,246,0.28)",
              cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="5.5" stroke="white" strokeWidth="2" strokeDasharray="24 10"/>
                </svg>
                UPDATING...
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <rect x="2" y="6" width="9" height="6" rx="1.2" stroke="white" strokeWidth="1.4"/>
                  <path d="M4.5 6V4a2 2 0 0 1 4 0v2" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                UPDATE PASSWORD
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Done ── */}
      {step === "done" && (
        <div className="text-center" style={{ animation: "cv-up 0.4s ease both" }}>
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", boxShadow: "0 0 30px rgba(16,185,129,0.15)" }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M6 14l5.5 5.5 10.5-11" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="font-mono text-[13px] text-emerald-400 font-bold tracking-wider mb-2">PASSWORD UPDATED!</p>
          <p className="text-[12px] text-gray-500 mb-6" style={{ fontFamily: "system-ui" }}>
            Your password has been successfully changed. You can now sign in.
          </p>
          <button onClick={onBack}
            className="w-full py-3 rounded-xl font-mono text-[12px] font-bold tracking-wider transition-all duration-200"
            style={{ background: "linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%)", color: "#fff", boxShadow: "0 0 30px rgba(59,130,246,0.28)" }}>
            SIGN IN NOW →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────
interface Props { onClose: () => void; defaultTab?: "login" | "register" }

export default function AuthModal({ onClose, defaultTab = "login" }: Props) {
  const { signIn, signUp } = useAuth()
  const [tab,      setTab]      = useState<"login"|"register"|"forgot">(defaultTab)
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState("")
  const [shaking,  setShaking]  = useState(false)
  const [errs,          setErrs]         = useState<{ username?: string; email?: string; password?: string; global?: string }>({})
  const [unconfirmed,   setUnconfirmed]  = useState(false)
  const [resending,     setResending]    = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const strength = pwStrength(password)

  const switchTab = (t: "login"|"register"|"forgot") => {
    setTab(t); setErrs({}); setSuccess(""); setUnconfirmed(false); setResendSuccess(false)
  }
  const shake = () => { setShaking(true); setTimeout(() => setShaking(false), 500) }

  const handleUsername = (v: string) => {
    setUsername(v)
    if (!v) return setErrs(e => ({ ...e, username: undefined }))
    if (v.length < 3) return setErrs(e => ({ ...e, username: "Min 3 chars" }))
    if (!/^[a-zA-Z0-9_]+$/.test(v)) return setErrs(e => ({ ...e, username: "Letters, numbers, _ only" }))
    setErrs(e => ({ ...e, username: undefined }))
  }
  const handleEmail = (v: string) => {
    setEmail(v)
    setErrs(e => ({ ...e, email: (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) ? undefined : "Invalid email" }))
  }
  const handlePassword = (v: string) => {
    setPassword(v)
    setErrs(e => ({ ...e, password: (tab === "register" && v && v.length < 6) ? "Min 6 characters" : undefined }))
  }

  const validate = () => {
    const n: typeof errs = {}
    if (tab === "register") {
      if (!username.trim())                        n.username = "Required"
      else if (username.trim().length < 3)         n.username = "Min 3 chars"
      else if (!/^[a-zA-Z0-9_]+$/.test(username)) n.username = "Letters, numbers, _ only"
    }
    if (!email.trim())                                    n.email = "Required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))  n.email = "Invalid email"
    if (!password)                                        n.password = "Required"
    else if (tab === "register" && password.length < 6)   n.password = "Min 6 characters"
    setErrs(n)
    return Object.keys(n).length === 0
  }

  const handleSubmit = async () => {
    setErrs({}); setSuccess(""); setUnconfirmed(false); setResendSuccess(false)
    if (!validate()) { shake(); return }
    setLoading(true)
    const safetyTimer = setTimeout(() => {
      setLoading(false)
      setErrs({ global: "Request timed out. Please try again." })
    }, 12000)
    try {
      if (tab === "login") {
        const rawErr = await signIn(email, password)
        if (!rawErr) { onClose(); return }
        const isUnconfirmed = /confirm|verified|not confirmed/i.test(rawErr)
        if (isUnconfirmed) {
          setUnconfirmed(true)
          setErrs({ global: "Your email hasn\'t been confirmed yet." })
        } else {
          setErrs({ global: /invalid.*credentials|wrong.*password|no user/i.test(rawErr)
            ? "Incorrect email or password. Please try again."
            : rawErr })
        }
        shake()
      } else {
        const err = await signUp(email, password, username.trim())
        if (err) { setErrs({ global: err }); shake() }
        else { onClose() }
      }
    } catch (e: any) {
      setErrs({ global: e?.message ?? "Something went wrong." }); shake()
    } finally {
      clearTimeout(safetyTimer)
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email || resending || resendSuccess) return
    setResending(true)
    try {
      const { createClient } = await import("@supabase/supabase-js")
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      await sb.auth.resend({ type: "signup", email })
      setResendSuccess(true)
      setErrs(e => ({ ...e, global: undefined }))
      setSuccess("Confirmation email resent! Check your inbox (and spam folder).")
    } catch {
      setErrs(e => ({ ...e, global: "Failed to resend — try again in a moment." }))
    } finally { setResending(false) }
  }

  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !loading) handleSubmit() }

  return (
    <>
      <style>{`
        @keyframes cv-in    { from{opacity:0;transform:scale(0.96) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes cv-up    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cv-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-7px)} 40%{transform:translateX(7px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes cv-bar   { 0%{background-position:0% 0%} 100%{background-position:200% 0%} }
      `}</style>

      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)" }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}>

        <div className="relative w-full overflow-hidden rounded-2xl"
          style={{ maxWidth: "800px", background: "#060810", border: "1px solid rgba(59,130,246,0.11)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.035),0 40px 100px rgba(0,0,0,0.75),0 0 80px rgba(59,130,246,0.05)",
            animation: "cv-in 0.38s cubic-bezier(0.23,1,0.32,1) both" }}>

          {loading && (
            <div className="absolute top-0 inset-x-0 h-[2px] z-20 overflow-hidden rounded-t-2xl">
              <div className="h-full w-full"
                style={{ background: "linear-gradient(90deg,#3b82f6,#8b5cf6,#ec4899,#3b82f6)", backgroundSize: "200% 100%", animation: "cv-bar 1.2s linear infinite" }} />
            </div>
          )}

          <div className="grid md:grid-cols-[1fr_1.15fr]" style={{ minHeight: "530px" }}>
            <LeftPanel />

            <div className="relative flex flex-col justify-center px-7 sm:px-9 py-10" style={{ background: "#060810" }}>
              <button onClick={onClose} aria-label="Close"
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200"
                style={{ color: "#374151", border: "1px solid rgba(255,255,255,0.055)" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = "#e5e7eb"; el.style.background = "rgba(255,255,255,0.06)" }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = "#374151"; el.style.background = "transparent" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>

              {/* ── Forgot Password Flow ── */}
              {tab === "forgot" ? (
                <ForgotPanel onBack={() => switchTab("login")} />
              ) : (
                <>
                  <div className="mb-6" style={{ animation: "cv-up 0.4s ease both" }}>
                    <h2 className="font-mono text-[21px] font-black text-white tracking-tight leading-none mb-1.5">
                      {tab === "login" ? "Welcome back." : "Join the lab."}
                    </h2>
                    <p className="text-[12px] text-gray-600" style={{ fontFamily: "system-ui,sans-serif" }}>
                      {tab === "login"
                        ? "Sign in to access your contest ratings and profile."
                        : "Create an account to compete in daily cipher contests."}
                    </p>
                  </div>

                  <div className="flex p-[3px] rounded-xl mb-5"
                    style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.055)", animation: "cv-up 0.4s ease 0.04s both" }}>
                    {(["login", "register"] as const).map(t => (
                      <button key={t} onClick={() => switchTab(t)}
                        className="flex-1 py-2 rounded-[9px] font-mono text-[10px] font-bold uppercase tracking-[0.18em] transition-all duration-200"
                        style={{ background: tab === t ? "#3b82f6" : "transparent", color: tab === t ? "#fff" : "#4b5563", boxShadow: tab === t ? "0 0 22px rgba(59,130,246,0.35)" : "none" }}>
                        {t === "login" ? "Sign In" : "Register"}
                      </button>
                    ))}
                  </div>

                  {errs.global && (
                    <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 mb-4"
                      style={{ background: unconfirmed ? "rgba(245,158,11,0.07)" : "rgba(239,68,68,0.07)",
                        border: `1px solid ${unconfirmed ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.22)"}`,
                        animation: "cv-up 0.3s ease both" }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-px shrink-0"
                        style={{ color: unconfirmed ? "#fbbf24" : "#f87171" }}>
                        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M7 4v3.5M7 9v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <div className="flex-1">
                        <p className="text-[12px] leading-snug mb-2"
                          style={{ color: unconfirmed ? "#fcd34d" : "#f87171", fontFamily: "system-ui" }}>
                          {errs.global}
                        </p>
                        {unconfirmed && !resendSuccess && (
                          <button onClick={handleResend} disabled={resending}
                            className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wider px-3 py-1.5 rounded-lg transition-all duration-200"
                            style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)",
                              color: resending ? "#92400e" : "#fbbf24", cursor: resending ? "not-allowed" : "pointer" }}>
                            {resending ? (
                              <>
                                <svg className="w-3 h-3 animate-spin" viewBox="0 0 12 12" fill="none">
                                  <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="16 8"/>
                                </svg>
                                SENDING...
                              </>
                            ) : (
                              <>
                                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                                  <path d="M1 5.5h8M6.5 2.5l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                RESEND CONFIRMATION EMAIL
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {success && (
                    <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 mb-4"
                      style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.22)", animation: "cv-up 0.3s ease both" }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-px shrink-0" style={{ color: "#34d399" }}>
                        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <p className="text-[12px] text-emerald-400 leading-snug" style={{ fontFamily: "system-ui" }}>{success}</p>
                    </div>
                  )}

                  <div style={{ animation: shaking ? "cv-shake 0.5s ease both" : "cv-up 0.4s ease 0.08s both" }}>
                    <div className="space-y-3.5 mb-5">
                      {tab === "register" && (
                        <Field label="Username" value={username} onChange={handleUsername}
                          onKeyDown={onKey} placeholder="cryptomaster42"
                          autoComplete="username" error={errs.username} hint="letters \u00b7 numbers \u00b7 _" />
                      )}
                      <Field label="Email" type="email" value={email} onChange={handleEmail}
                        onKeyDown={onKey} placeholder="you@example.com" autoComplete="email" error={errs.email} />
                      <div>
                        <Field label="Password" type={showPw ? "text" : "password"}
                          value={password} onChange={handlePassword} onKeyDown={onKey}
                          placeholder={tab === "register" ? "min. 6 characters" : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
                          autoComplete={tab === "login" ? "current-password" : "new-password"}
                          error={errs.password}
                          suffix={
                            <button type="button" onClick={() => setShowPw(v => !v)}
                              className="p-1 rounded-lg transition-colors"
                              style={{ color: showPw ? "#60a5fa" : "#374151" }}
                              aria-label={showPw ? "Hide password" : "Show password"}>
                              {showPw ? (
                                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                                  <path d="M2 2l12 12M6.8 6.8A2.5 2.5 0 0 0 10 10.5M3.5 4C2 5.3 1 8 1 8s2.5 5 7 5a9 9 0 0 0 3.8-.9M5.5 2.3C6.3 2.1 7.1 2 8 2c4.5 0 7 5 7 6 0 .5-.4 1.3-.9 2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
                                </svg>
                              ) : (
                                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                                  <path d="M1 8s2.5-5.5 7-5.5S15 8 15 8s-2.5 5.5-7 5.5S1 8 1 8z" stroke="currentColor" strokeWidth="1.35"/>
                                  <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.35"/>
                                </svg>
                              )}
                            </button>
                          } />
                        {tab === "register" && password && (
                          <div className="mt-2 space-y-1.5">
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(n => (
                                <div key={n} className="flex-1 h-[3px] rounded-full transition-all duration-300"
                                  style={{ background: n <= strength.score ? strength.color : "rgba(255,255,255,0.05)" }} />
                              ))}
                            </div>
                            <p className="font-mono text-[9px] tracking-widest" style={{ color: strength.color }}>
                              {strength.label?.toUpperCase()} \u2014 {strength.hint}
                            </p>
                          </div>
                        )}
                      </div>
                      {tab === "login" && (
                        <div className="flex justify-end -mt-1">
                          <button onClick={() => switchTab("forgot")}
                            className="font-mono text-[9px] text-gray-700 hover:text-blue-400 transition-colors tracking-widest">
                            FORGOT PASSWORD?
                          </button>
                        </div>
                      )}
                    </div>

                    <button onClick={handleSubmit} disabled={loading}
                      className="w-full py-3 rounded-xl font-mono text-[12px] font-bold tracking-wider flex items-center justify-center gap-2.5 mb-5 transition-all duration-200"
                      style={{ background: loading ? "rgba(37,99,235,0.4)" : "linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%)", color: "#fff",
                        boxShadow: loading ? "none" : "0 0 30px rgba(59,130,246,0.28),0 4px 18px rgba(0,0,0,0.35)",
                        cursor: loading ? "not-allowed" : "pointer", transform: loading ? "scale(0.985)" : "scale(1)" }}>
                      {loading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="5.5" stroke="white" strokeWidth="2" strokeDasharray="24 10"/>
                          </svg>
                          {tab === "login" ? "Signing in..." : "Creating account..."}
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <path d={tab === "login" ? "M1.5 6.5h10M8 3l3.5 3.5L8 10" : "M6.5 1.5v10M1.5 6.5h10"}
                              stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {tab === "login" ? "Sign In" : "Create Account"}
                        </>
                      )}
                    </button>

                    <p className="text-center font-mono text-[10px] tracking-wider" style={{ color: "#374151" }}>
                      {tab === "login" ? "No account yet? " : "Already a member? "}
                      <button onClick={() => switchTab(tab === "login" ? "register" : "login")}
                        className="font-black transition-colors duration-150" style={{ color: "#3b82f6" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#93c5fd"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#3b82f6"}>
                        {tab === "login" ? "Register \u2192" : "Sign in \u2192"}
                      </button>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}