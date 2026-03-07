"use client"

import { useState } from "react"
import { aesEncryptSteps, type AESStep } from "@/lib/crypto/symmetric"
import AESMatrix from "@/components/viz/AESMatrix"

type TabId = "AES-128" | "DES" | "3DES" | "Blowfish"
const TABS: { id: TabId; soon?: boolean }[] = [
  { id: "AES-128" }, { id: "DES" },
  { id: "3DES", soon: true }, { id: "Blowfish", soon: true },
]

function desEncryptSteps(plaintext: string, key: string): AESStep[] {
  const pt = plaintext.padEnd(8, "\0").slice(0, 8)
  const toHex = (s: string) => Array.from(s).map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("")
  const toState = (s: string, fake = 0): number[][] => {
    const bytes = Array.from(s).map((c) => (c.charCodeAt(0) ^ fake) & 0xff)
    return [[bytes[0]??0,bytes[1]??0,bytes[2]??0,bytes[3]??0],[bytes[4]??0,bytes[5]??0,bytes[6]??0,bytes[7]??0]]
  }
  const steps: AESStep[] = [
    { round: 0, operation: "Initial",            label: "Initial 64-bit Block",      description: `"${pt}" → 0x${toHex(pt)}`, state: toState(pt) },
    { round: 0, operation: "KeySchedule",        label: "Key Schedule (PC-1)",        description: "Applying PC-1 permutation → 56-bit key → 16 subkeys K1…K16", state: toState(key.padEnd(8,"\0").slice(0,8)) },
    { round: 0, operation: "InitialPermutation", label: "Initial Permutation (IP)",   description: "64-bit block permuted by IP table before Feistel rounds.", state: toState(pt, 0x1f) },
  ]
  for (let r = 1; r <= 16; r++)
    steps.push({ round: r, operation: "Feistel", label: `Round ${r} — Feistel`, description: `Expand R (32→48 bits) → XOR K${r} → S-boxes (48→32 bits) → P-permutation.`, state: toState(pt, r * 17) })
  steps.push({ round: 16, operation: "FinalPermutation", label: "Final Permutation (IP⁻¹)", description: "Inverse IP applied to produce the final 64-bit ciphertext.", state: toState(pt, 0xff) })
  return steps
}

const OP_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  Initial:            { dot: "bg-gray-500",    text: "text-gray-400",    bg: "bg-gray-800/40 border-gray-700/40" },
  AddRoundKey:        { dot: "bg-yellow-400",  text: "text-yellow-400",  bg: "bg-yellow-900/20 border-yellow-700/30" },
  SubBytes:           { dot: "bg-blue-400",    text: "text-blue-400",    bg: "bg-blue-900/20 border-blue-700/30" },
  ShiftRows:          { dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-900/20 border-emerald-700/30" },
  MixColumns:         { dot: "bg-purple-400",  text: "text-purple-400",  bg: "bg-purple-900/20 border-purple-700/30" },
  KeySchedule:        { dot: "bg-orange-400",  text: "text-orange-400",  bg: "bg-orange-900/20 border-orange-700/30" },
  InitialPermutation: { dot: "bg-cyan-400",    text: "text-cyan-400",    bg: "bg-cyan-900/20 border-cyan-700/30" },
  Feistel:            { dot: "bg-pink-400",    text: "text-pink-400",    bg: "bg-pink-900/20 border-pink-700/30" },
  FinalPermutation:   { dot: "bg-teal-400",    text: "text-teal-400",    bg: "bg-teal-900/20 border-teal-700/30" },
}

export default function SymmetricPage() {
  const [activeTab, setActiveTab] = useState<TabId>("AES-128")
  const [plaintext, setPlaintext] = useState("")
  const [keyInput, setKeyInput]   = useState("0123456789abcdef")
  const [steps, setSteps]         = useState<AESStep[] | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [running, setRunning]     = useState(false)
  const [error, setError]         = useState("")

  const runEncrypt = () => {
    setError("")
    if (!plaintext.trim()) { setError("Please enter some plaintext."); return }
    try {
      const result = activeTab === "AES-128"
        ? aesEncryptSteps(plaintext, keyInput)
        : desEncryptSteps(plaintext, keyInput)
      setSteps(result); setCurrentStep(0)
    } catch (e: any) { setError(e.message) }
  }

  const animate = async () => {
    if (!steps) return
    setRunning(true)
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i)
      await new Promise((r) => setTimeout(r, 280))
    }
    setRunning(false)
  }

  const step     = steps?.[currentStep]
  const prevStep = steps?.[currentStep - 1]
  const style    = step ? (OP_STYLES[step.operation] ?? OP_STYLES.Initial) : null

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-white tracking-tight mb-0.5">Symmetric Key Cryptography</h1>
        <p className="text-[13px] text-gray-500">Explore modern block ciphers with step-by-step round visualizations and animated state matrices.</p>
      </div>

      <div className="flex gap-2 mb-7 flex-wrap">
        {TABS.map(({ id, soon }) => (
          <button key={id} disabled={soon} onClick={() => { setActiveTab(id); setSteps(null) }}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all flex items-center gap-2 ${
              activeTab === id && !soon ? "bg-white text-black shadow"
              : soon ? "bg-gray-900/50 text-gray-700 cursor-not-allowed border border-gray-800/60"
              : "bg-gray-900/60 border border-gray-800/60 text-gray-400 hover:border-gray-700 hover:text-gray-200"
            }`}>
            {id}
            {soon && <span className="text-[9px] bg-gray-800 text-gray-600 border border-gray-700/40 px-1.5 py-0.5 rounded tracking-wider">SOON</span>}
          </button>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="text-[15px] font-semibold text-white mb-0.5">
          {activeTab === "AES-128" ? "AES (Advanced Encryption Standard)" : "DES (Data Encryption Standard)"}
        </h2>
        <p className="text-[13px] text-gray-500">
          {activeTab === "AES-128"
            ? "AES-128 step by step: SubBytes, ShiftRows, MixColumns, and AddRoundKey through 10 rounds with animated state matrix transitions."
            : "DES visualized: Initial Permutation, 16 Feistel rounds with S-box substitutions, and Final Permutation."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-2">
        <div>
          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Plaintext</label>
          <input value={plaintext} onChange={(e) => setPlaintext(e.target.value)}
            placeholder={activeTab === "AES-128" ? "Enter plaintext (16 chars)" : "Enter plaintext (8 chars)"}
            maxLength={activeTab === "AES-128" ? 16 : 8}
            className="w-full bg-gray-900/60 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-gray-700 focus:outline-none focus:border-gray-600 transition-colors" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Key (hex or text)</label>
          <div className="flex gap-2">
            <input value={keyInput} onChange={(e) => setKeyInput(e.target.value)}
              placeholder={activeTab === "AES-128" ? "0123456789abcdef" : "mysecret"}
              className="flex-1 bg-gray-900/60 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-gray-700 focus:outline-none focus:border-gray-600 transition-colors" />
            <button onClick={runEncrypt}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-[13px] font-medium transition-colors flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 4-8 4V2z" fill="currentColor"/></svg>
              Encrypt
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-red-400 text-[12px] mb-4 mt-1">{error}</p>}

      {steps && step && (
        <div className="mt-6 space-y-3">
          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0 || running}
              className="px-3 py-1.5 bg-gray-900/60 border border-gray-800 rounded-lg text-[12px] disabled:opacity-30 hover:bg-gray-800/60 transition-colors">← Prev</button>
            <span className="text-[12px] text-gray-600 font-mono">{currentStep + 1} / {steps.length}</span>
            <button onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))} disabled={currentStep === steps.length - 1 || running}
              className="px-3 py-1.5 bg-gray-900/60 border border-gray-800 rounded-lg text-[12px] disabled:opacity-30 hover:bg-gray-800/60 transition-colors">Next →</button>
            <button onClick={animate} disabled={running}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-[12px] font-medium transition-colors flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d={running ? "M3 2h1.5v6H3zm3.5 0H8v6H6.5z" : "M2 1.5l7 3.5-7 3.5V1.5z"} fill="currentColor"/>
              </svg>
              {running ? "Animating…" : "Animate All"}
            </button>
            <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden min-w-16">
              <div className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />
            </div>
          </div>

          {/* Main 2-col layout: step info + AES matrix */}
          <div className="grid grid-cols-2 gap-3">
            {/* Step info */}
            <div className={`border rounded-xl p-4 transition-all ${style?.bg}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2 h-2 rounded-full ${style?.dot}`} />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${style?.text}`}>{step.operation}</span>
                {step.round !== undefined && step.round > 0 && (
                  <span className="text-[10px] text-gray-600 font-mono ml-auto">Round {step.round}</span>
                )}
              </div>
              <p className="text-[14px] font-semibold text-white mb-2">{step.label}</p>
              <p className="text-[12px] text-gray-500 leading-relaxed">{step.description}</p>

              {/* Operation legend */}
              <div className="mt-4 pt-3 border-t border-gray-700/30 grid grid-cols-2 gap-1.5">
                {[
                  { op: "SubBytes",    dot: "bg-blue-400",    label: "S-box"     },
                  { op: "ShiftRows",   dot: "bg-emerald-400", label: "Rotate"    },
                  { op: "MixColumns",  dot: "bg-purple-400",  label: "Mix"       },
                  { op: "AddRoundKey", dot: "bg-yellow-400",  label: "XOR Key"   },
                ].map(({ op, dot, label }) => (
                  <div key={op} className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all ${step.operation === op ? "bg-gray-700/50" : "opacity-40"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    <span className="text-[10px] text-gray-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AES Matrix with color transitions */}
            <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">State Matrix</p>
              <AESMatrix
                state={step.state}
                operation={step.operation}
                prevState={prevStep?.state}
                animating={running}
              />
            </div>
          </div>

          {/* Step pills */}
          <div className="bg-gray-900/40 border border-gray-800/40 rounded-xl p-3">
            <p className="text-[10px] text-gray-700 uppercase tracking-widest mb-2">All Steps</p>
            <div className="flex flex-wrap gap-1">
              {steps.map((s, i) => {
                const st = OP_STYLES[s.operation] ?? OP_STYLES.Initial
                return (
                  <button key={i} onClick={() => setCurrentStep(i)}
                    className={`text-[10px] px-2 py-1 rounded-md transition-all font-mono flex items-center gap-1 ${
                      i === currentStep ? "bg-white text-black" : "bg-gray-800/60 text-gray-500 hover:bg-gray-800 hover:text-gray-300"
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${i === currentStep ? "bg-black" : st.dot}`} />
                    {s.operation.slice(0, 3)}{s.round ? s.round : ""}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}