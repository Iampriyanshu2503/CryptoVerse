"use client"

import { useState } from "react"
import {
  computeHash, avalancheEffect, benchmarkHash,
  type HashResult, type AvalancheResult, type BenchmarkResult,
} from "@/lib/crypto/hashing"

type TabId = "Hash Generator" | "Avalanche Effect" | "Hash Comparison" | "Digital Signatures"
const TABS: TabId[] = ["Hash Generator", "Avalanche Effect", "Hash Comparison", "Digital Signatures"]
const HASH_ALGOS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const
type HashAlgo = typeof HASH_ALGOS[number]

const ALGO_COLORS: Record<string, string> = {
  "SHA-1":   "text-orange-400 bg-orange-500/10 border-orange-500/20",
  "SHA-256": "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "SHA-384": "text-purple-400 bg-purple-500/10 border-purple-500/20",
  "SHA-512": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
}

export default function HashingPage() {
  const [activeTab, setActiveTab] = useState<TabId>("Hash Generator")

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-white tracking-tight mb-0.5">Hashing & Digital Signatures</h1>
        <p className="text-[13px] text-gray-500">Explore cryptographic hash functions, the avalanche effect, and digital signature workflows.</p>
      </div>

      <div className="flex gap-0.5 bg-gray-900/60 border border-gray-800/80 rounded-xl p-1 mb-7 flex-wrap">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-fit px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all duration-150 ${
              activeTab === tab ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-300"
            }`}>{tab}</button>
        ))}
      </div>

      {activeTab === "Hash Generator"    && <HashGenerator />}
      {activeTab === "Avalanche Effect"  && <AvalancheTab />}
      {activeTab === "Hash Comparison"   && <HashComparison />}
      {activeTab === "Digital Signatures"&& <DigitalSignaturesTab />}
    </div>
  )
}

// ─── Hash Generator ───────────────────────────────────────────────────────────

function HashGenerator() {
  const [input, setInput] = useState("")
  const [algo, setAlgo] = useState<HashAlgo>("SHA-256")
  const [result, setResult] = useState<HashResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [showSteps, setShowSteps] = useState(false)
  const [copied, setCopied] = useState(false)

  const compute = async () => {
    if (!input.trim()) return
    setLoading(true)
    try { const r = await computeHash(input, algo); setResult(r); setShowSteps(false) }
    finally { setLoading(false) }
  }

  const copy = () => {
    if (!result?.hash) return
    navigator.clipboard.writeText(result.hash)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div>
      <h2 className="text-[15px] font-semibold text-white mb-0.5">Hash Generator</h2>
      <p className="text-[13px] text-gray-500 mb-5">Compute cryptographic hashes with step-by-step process breakdown.</p>

      <div className="mb-4">
        <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Input</label>
        <textarea
          value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Enter text to hash..."
          className="w-full bg-gray-900/60 border border-gray-800 rounded-xl px-3.5 py-3 text-sm font-mono resize-none h-24 focus:outline-none focus:border-gray-600 text-white placeholder-gray-700 transition-colors"
        />
      </div>

      <div className="flex items-end gap-3 mb-6">
        <div>
          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Algorithm</label>
          <div className="flex gap-1.5">
            {HASH_ALGOS.map((a) => (
              <button key={a} onClick={() => setAlgo(a)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${
                  algo === a ? ALGO_COLORS[a] : "bg-gray-900/40 border-gray-800 text-gray-500 hover:text-gray-300"
                }`}>{a}</button>
            ))}
          </div>
        </div>
        <button onClick={compute} disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-1.5 rounded-xl text-[13px] font-medium transition-colors flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 4-8 4V2z" fill="currentColor"/></svg>
          {loading ? "Computing…" : "Compute Hash"}
        </button>
      </div>

      {result && (
        <div className="space-y-3">
          {/* Hash output */}
          <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full ${ALGO_COLORS[result.algorithm]}`}>
                  {result.algorithm}
                </span>
                <span className="text-[11px] text-gray-600">{result.hash.length * 4} bits</span>
                <span className="text-[11px] text-emerald-600">{result.time.toFixed(3)}ms</span>
              </div>
              <button onClick={copy} className="text-[11px] text-gray-600 hover:text-gray-300 transition-colors">
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <p className="font-mono text-[12px] text-emerald-400 break-all leading-relaxed">{result.hash}</p>
          </div>

          {/* Binary viz */}
          <div className="bg-gray-900/40 border border-gray-800/40 rounded-xl p-4">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2.5">Binary Output (first 128 bits)</p>
            <div className="flex flex-wrap gap-px">
              {result.binary.slice(0, 128).split("").map((bit, i) => (
                <span key={i} className={`text-[10px] font-mono w-3 text-center leading-5 ${
                  bit === "1" ? "text-blue-400" : "text-gray-700"
                }`}>{bit}</span>
              ))}
            </div>
          </div>

          <button onClick={() => setShowSteps(!showSteps)}
            className="text-[12px] text-gray-600 hover:text-gray-300 transition-colors flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d={showSteps ? "M2 4l4 4 4-4" : "M2 8l4-4 4 4"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {showSteps ? "Hide" : "Show"} processing steps ({result.steps.length})
          </button>

          {showSteps && (
            <div className="bg-gray-900/40 border border-gray-800/40 rounded-xl p-4 space-y-3 max-h-72 overflow-y-auto">
              {result.steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[9px] font-mono text-gray-500 shrink-0 mt-0.5">{i + 1}</div>
                  <div>
                    <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">{step.label}</p>
                    <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">{step.description}</p>
                    {step.data && <p className="text-[11px] font-mono text-emerald-400 mt-1 break-all">{step.data.slice(0, 64)}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Avalanche Effect ─────────────────────────────────────────────────────────

function AvalancheTab() {
  const [input1, setInput1] = useState("Hello")
  const [input2, setInput2] = useState("hello")
  const [algo, setAlgo] = useState<HashAlgo>("SHA-256")
  const [result, setResult] = useState<AvalancheResult | null>(null)
  const [loading, setLoading] = useState(false)

  const compute = async () => {
    setLoading(true)
    try { setResult(await avalancheEffect(input1, input2, algo)) }
    finally { setLoading(false) }
  }

  const good = result && result.percentage > 45 && result.percentage < 55

  return (
    <div>
      <h2 className="text-[15px] font-semibold text-white mb-0.5">Avalanche Effect</h2>
      <p className="text-[13px] text-gray-500 mb-5">A tiny input change should flip ~50% of output bits — the hallmark of a strong hash function.</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[{ label: "Input 1", val: input1, set: setInput1 }, { label: "Input 2 (slight change)", val: input2, set: setInput2 }].map(({ label, val, set }) => (
          <div key={label}>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
            <input value={val} onChange={(e) => set(e.target.value)}
              className="w-full bg-gray-900/60 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-gray-600 transition-colors" />
          </div>
        ))}
      </div>

      <div className="flex items-end gap-3 mb-6">
        <div>
          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Algorithm</label>
          <div className="flex gap-1.5">
            {HASH_ALGOS.map((a) => (
              <button key={a} onClick={() => setAlgo(a)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${
                  algo === a ? ALGO_COLORS[a] : "bg-gray-900/40 border-gray-800 text-gray-500 hover:text-gray-300"
                }`}>{a}</button>
            ))}
          </div>
        </div>
        <button onClick={compute} disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-1.5 rounded-xl text-[13px] font-medium transition-colors flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 4-8 4V2z" fill="currentColor"/></svg>
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[
              { val: result.differingBits, label: "Differing Bits", color: "text-white" },
              { val: result.totalBits,     label: "Total Bits",     color: "text-white" },
              { val: `${result.percentage.toFixed(1)}%`, label: good ? "✓ Good Avalanche" : "Avalanche %", color: good ? "text-emerald-400" : "text-yellow-400" },
            ].map(({ val, label, color }) => (
              <div key={label} className={`bg-gray-900/60 border rounded-xl p-4 text-center ${good && label.includes("Avalanche") ? "border-emerald-700/30" : "border-gray-800/60"}`}>
                <p className={`text-2xl font-bold ${color}`}>{val}</p>
                <p className="text-[11px] text-gray-600 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {[{ label: `"${result.input1}"`, hash: result.hash1 }, { label: `"${result.input2}"`, hash: result.hash2 }].map(({ label, hash }) => (
              <div key={label} className="bg-gray-900/40 border border-gray-800/40 rounded-xl px-4 py-3">
                <p className="text-[10px] text-gray-600 font-mono mb-1">{label}</p>
                <p className="font-mono text-[12px] text-emerald-400 break-all">{hash}</p>
              </div>
            ))}
          </div>

          <div className="bg-gray-900/40 border border-gray-800/40 rounded-xl p-4">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">Bit-level diff — first 128 bits of hash 2 (red = changed)</p>
            <div className="flex flex-wrap gap-px">
              {result.binary2.slice(0, 128).split("").map((bit, i) => {
                const diff = result.diffPositions.includes(i)
                return (
                  <span key={i} className={`text-[10px] font-mono w-3 text-center leading-5 rounded-sm ${
                    diff ? "text-red-400 bg-red-900/30" : bit === "1" ? "text-blue-400" : "text-gray-700"
                  }`}>{bit}</span>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Hash Comparison ──────────────────────────────────────────────────────────

function HashComparison() {
  const [input, setInput] = useState("")
  const [results, setResults] = useState<HashResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [benchmarks, setBenchmarks] = useState<BenchmarkResult[] | null>(null)
  const [benchLoading, setBenchLoading] = useState(false)

  const computeAll = async () => {
    if (!input.trim()) return
    setLoading(true)
    try { setResults(await Promise.all(HASH_ALGOS.map((a) => computeHash(input, a)))) }
    finally { setLoading(false) }
  }

  const runBenchmarks = async () => {
    setBenchLoading(true)
    try { setBenchmarks(await Promise.all(HASH_ALGOS.map((a) => benchmarkHash(a, 100, 256)))) }
    finally { setBenchLoading(false) }
  }

  const maxRate = benchmarks ? Math.max(...benchmarks.map((b) => b.hashRate)) : 1

  return (
    <div>
      <h2 className="text-[15px] font-semibold text-white mb-0.5">Hash Comparison</h2>
      <p className="text-[13px] text-gray-500 mb-5">Compare all hash algorithms side by side on the same input.</p>

      <div className="flex gap-2 mb-6">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Enter text to hash with all algorithms..."
          className="flex-1 bg-gray-900/60 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-gray-700 focus:outline-none focus:border-gray-600 transition-colors" />
        <button onClick={computeAll} disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-[13px] font-medium transition-colors flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 4-8 4V2z" fill="currentColor"/></svg>
          {loading ? "Computing…" : "Compare All"}
        </button>
      </div>

      {results && (
        <div className="space-y-2 mb-6">
          {results.map((r) => (
            <div key={r.algorithm} className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full ${ALGO_COLORS[r.algorithm]}`}>
                  {r.algorithm}
                </span>
                <span className="text-[11px] text-gray-600">{r.hash.length * 4} bits</span>
                <span className="text-[11px] text-emerald-600 ml-auto">{r.time.toFixed(3)}ms</span>
              </div>
              <p className="font-mono text-[11px] text-emerald-400 break-all">{r.hash}</p>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-gray-800/60 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[13px] font-semibold text-white">Performance Benchmark</p>
            <p className="text-[11px] text-gray-600">100 iterations × 256-byte input</p>
          </div>
          <button onClick={runBenchmarks} disabled={benchLoading}
            className="border border-gray-700 text-gray-400 hover:bg-gray-800/60 hover:text-white disabled:opacity-50 px-4 py-1.5 rounded-lg text-[12px] transition-colors">
            {benchLoading ? "Running…" : "Run Benchmark"}
          </button>
        </div>

        {benchmarks && (
          <div className="space-y-2.5">
            {benchmarks.map((b) => (
              <div key={b.algorithm} className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full ${ALGO_COLORS[b.algorithm]}`}>
                    {b.algorithm}
                  </span>
                  <div className="flex gap-4 text-[11px] text-gray-500">
                    <span className="font-mono">{b.hashRate.toLocaleString()} H/s</span>
                    <span className="font-mono">{b.avgTime.toFixed(3)}ms avg</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all duration-700"
                    style={{ width: `${(b.hashRate / maxRate) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Digital Signatures ───────────────────────────────────────────────────────

function DigitalSignaturesTab() {
  const [message, setMessage] = useState("Hello, this is my signed message.")
  const [keyPair, setKeyPair] = useState<CryptoKeyPair | null>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const [verified, setVerified] = useState<boolean | null>(null)
  const [publicKeyPem, setPublicKeyPem] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeStep, setActiveStep] = useState<"idle" | "keygen" | "sign" | "verify">("idle")

  const generateKeys = async () => {
    setLoading(true); setActiveStep("keygen"); setSignature(null); setVerified(null)
    try {
      const kp = await crypto.subtle.generateKey(
        { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
        true, ["sign", "verify"]
      )
      setKeyPair(kp)
      const exp = await crypto.subtle.exportKey("spki", kp.publicKey)
      const b64 = btoa(String.fromCharCode(...new Uint8Array(exp)))
      setPublicKeyPem(`-----BEGIN PUBLIC KEY-----\n${b64.match(/.{1,64}/g)?.join("\n")}\n-----END PUBLIC KEY-----`)
    } finally { setLoading(false) }
  }

  const sign = async () => {
    if (!keyPair) return
    setLoading(true); setActiveStep("sign"); setVerified(null)
    try {
      const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keyPair.privateKey, new TextEncoder().encode(message))
      setSignature(Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join(""))
    } finally { setLoading(false) }
  }

  const verify = async () => {
    if (!keyPair || !signature) return
    setLoading(true); setActiveStep("verify")
    try {
      const sigBytes = new Uint8Array(signature.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)))
      setVerified(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", keyPair.publicKey, sigBytes, new TextEncoder().encode(message)))
    } finally { setLoading(false) }
  }

  const workflowSteps = [
    { key: "keygen", label: "Generate Keys", done: !!keyPair },
    { key: "sign",   label: "Sign Message",  done: !!signature },
    { key: "verify", label: "Verify",         done: verified !== null },
  ]

  return (
    <div>
      <h2 className="text-[15px] font-semibold text-white mb-0.5">Digital Signatures — RSA-SHA256</h2>
      <p className="text-[13px] text-gray-500 mb-5">Generate RSA key pairs, sign with the private key, and verify with the public key.</p>

      {/* Workflow tracker */}
      <div className="flex items-center gap-2 mb-6">
        {workflowSteps.map(({ key, label, done }, i) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-all ${
              done ? "bg-emerald-900/30 border-emerald-700/40 text-emerald-400"
              : activeStep === key ? "bg-blue-900/30 border-blue-700/40 text-blue-400"
              : "bg-gray-900/40 border-gray-800/40 text-gray-600"
            }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                done ? "bg-emerald-500 text-black" : "border border-current"
              }`}>{done ? "✓" : i + 1}</span>
              {label}
            </div>
            {i < 2 && <span className="text-gray-800">→</span>}
          </div>
        ))}
      </div>

      <div className="mb-4">
        <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Message</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-gray-900/60 border border-gray-800 rounded-xl px-3.5 py-3 text-sm font-mono resize-none h-20 focus:outline-none focus:border-gray-600 text-white transition-colors" />
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={generateKeys} disabled={loading}
          className="border border-gray-700 text-gray-300 hover:bg-gray-800/60 hover:text-white disabled:opacity-50 px-4 py-1.5 rounded-lg text-[12px] font-medium transition-colors">
          {loading && activeStep === "keygen" ? "Generating…" : "Generate RSA-2048 Keys"}
        </button>
        <button onClick={sign} disabled={!keyPair || loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg text-[12px] font-medium transition-colors">
          {loading && activeStep === "sign" ? "Signing…" : "Sign with Private Key"}
        </button>
        <button onClick={verify} disabled={!signature || loading}
          className="border border-gray-700 text-gray-300 hover:bg-gray-800/60 hover:text-white disabled:opacity-40 px-4 py-1.5 rounded-lg text-[12px] font-medium transition-colors">
          {loading && activeStep === "verify" ? "Verifying…" : "Verify with Public Key"}
        </button>
      </div>

      <div className="space-y-3">
        {publicKeyPem && (
          <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Public Key — RSA-2048 SPKI</p>
            <pre className="text-[11px] font-mono text-emerald-400 whitespace-pre-wrap break-all leading-relaxed">{publicKeyPem}</pre>
          </div>
        )}

        {signature && (
          <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Signature — {signature.length * 4} bits</p>
            <p className="text-[11px] font-mono text-yellow-400 break-all">{signature.slice(0, 128)}…</p>
          </div>
        )}

        {verified !== null && (
          <div className={`border rounded-xl p-4 transition-all ${
            verified ? "bg-emerald-900/20 border-emerald-700/40" : "bg-red-900/20 border-red-700/40"
          }`}>
            <p className={`text-[14px] font-semibold ${verified ? "text-emerald-400" : "text-red-400"}`}>
              {verified ? "✓ Signature Valid" : "✗ Signature Invalid"}
            </p>
            <p className="text-[12px] text-gray-500 mt-1">
              {verified
                ? "The signature was verified successfully. The message is authentic and unmodified."
                : "Verification failed. The message or signature may have been tampered with."}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}