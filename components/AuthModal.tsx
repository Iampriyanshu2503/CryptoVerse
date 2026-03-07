"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/AuthContext"

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
    { label: "Strong", hint: "great password \u2713",   color: "#10b981" },
  ]
  return { score: s, ...levels[s] }
}

function Field({ label, type = "text", value, onChange, onKeyDown, placeholder, autoComplete, error, hint, suffix }: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void; placeholder?: string; autoComplete?: string;
  error?: string; hint?: string; suffix?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="font-mono text-[9px] font-bold uppercase tracking-[0.2em]"
          style={{ color: error ? "#f87171" : focused ? "#60a5fa" : "#374151" }}>{label}</label>
        {error ? (
          <span className="font-mono text-[9px] flex items-center gap-1 text-red-400">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <circle cx="4" cy="4" r="3.5" stroke="currentColor" strokeWidth="1"/>
              <path d="M4 2v2.5M4 5.5h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {error}
          </span>
        ) : hint ? <span className="font-mono text-[9px] text-gray-700">{hint}</span> : null}
      </div>
      <div className="relative">
        <input type={type} value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          placeholder={placeholder} autoComplete={autoComplete} spellCheck={false}
          className="w-full font-mono text-[13px] text-white placeholder-gray-700 rounded-xl outline-none transition-all duration-200"
          style={{
            padding: suffix ? "11px 44px 11px 14px" : "11px 14px",
            background: error ? "rgba(239,68,68,0.05)" : focused ? "rgba(59,130,246,0.07)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${error ? "rgba(239,68,68,0.45)" : focused ? "rgba(59,130,246,0.55)" : value ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)"}`,
            boxShadow: focused && !error ? "0 0 0 3px rgba(59,130,246,0.09)" : "none",
          }} />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
    </div>
  )
}

interface Props { onClose: () => void; defaultTab?: "login" | "register" }

export default function AuthModal({ onClose, defaultTab = "login" }: Props) {
  const { signIn, signUp } = useAuth()
  const [tab,      setTab]      = useState<"login"|"register">(defaultTab)
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

  const switchTab = (t: "login"|"register") => { setTab(t); setErrs({}); setSuccess(""); setUnconfirmed(false); setResendSuccess(false) }
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
    try {
      if (tab === "login") {
        const rawErr = await signIn(email, password)
        if (!rawErr) { onClose(); return }
        const isUnconfirmed = /confirm|verified|not confirmed/i.test(rawErr)
        if (isUnconfirmed) {
          setUnconfirmed(true)
          setErrs({ global: "Your email hasn't been confirmed yet." })
        } else {
          setErrs({ global: /invalid.*credentials|wrong.*password|no user/i.test(rawErr)
            ? "Incorrect email or password. Please try again."
            : rawErr })
        }
        shake()
      } else {
        const err = await signUp(email, password, username.trim())
        if (err) { setErrs({ global: err }); shake() }
        else { setSuccess("Account created! Check your inbox and click the confirmation link, then sign in."); switchTab("login"); setEmail(""); setPassword("") }
      }
    } catch (e: any) {
      setErrs({ global: e?.message ?? "Something went wrong." }); shake()
    } finally { setLoading(false) }
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
                <div className="rounded-xl px-3.5 py-3 mb-4"
                  style={{ background: unconfirmed ? "rgba(245,158,11,0.07)" : "rgba(239,68,68,0.07)",
                    border: `1px solid ${unconfirmed ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.22)"}`,
                    animation: "cv-up 0.3s ease both" }}>
                  <div className="flex items-start gap-2.5">
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
                          {strength.label.toUpperCase()} \u2014 {strength.hint}
                        </p>
                      </div>
                    )}
                  </div>
                  {tab === "login" && (
                    <div className="flex justify-end -mt-1">
                      <button className="font-mono text-[9px] text-gray-700 hover:text-blue-400 transition-colors tracking-widest">
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
            </div>
          </div>
        </div>
      </div>
    </>
  )
}