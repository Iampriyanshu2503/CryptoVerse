"use client"

import { useState } from "react"

type TabId = "RSA" | "Key Exchange" | "ECC"

const TABS: { id: TabId; soon?: boolean }[] = [
  { id: "RSA" },
  { id: "Key Exchange" },
  { id: "ECC", soon: true },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
function ab2hex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

function ab2b64(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function pemWrap(b64: string, type: string) {
  const lines = b64.match(/.{1,64}/g)?.join("\n") ?? b64
  return `-----BEGIN ${type}-----\n${lines}\n-----END ${type}-----`
}

// ── RSA Tab ────────────────────────────────────────────────────────────────────
function RSATab() {
  const [keyPair, setKeyPair] = useState<CryptoKeyPair | null>(null)
  const [pubPem, setPubPem]   = useState("")
  const [privPem, setPrivPem] = useState("")
  const [message, setMessage] = useState("Hello, CryptoVerse!")
  const [encrypted, setEncrypted] = useState("")
  const [decrypted, setDecrypted] = useState("")
  const [encBuf, setEncBuf] = useState<ArrayBuffer | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState(0)

  const generateKeys = async () => {
    setLoading("keygen")
    setEncrypted(""); setDecrypted(""); setEncBuf(null)
    try {
      const kp = await crypto.subtle.generateKey(
        { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
        true, ["encrypt", "decrypt"]
      )
      setKeyPair(kp)
      const [pub, priv] = await Promise.all([
        crypto.subtle.exportKey("spki",  kp.publicKey),
        crypto.subtle.exportKey("pkcs8", kp.privateKey),
      ])
      setPubPem(pemWrap(ab2b64(pub),  "PUBLIC KEY"))
      setPrivPem(pemWrap(ab2b64(priv), "PRIVATE KEY"))
      setActiveStep(1)
    } finally { setLoading(null) }
  }

  const encryptMsg = async () => {
    if (!keyPair || !message) return
    setLoading("encrypt"); setDecrypted("")
    try {
      const buf = await crypto.subtle.encrypt(
        { name: "RSA-OAEP" }, keyPair.publicKey, new TextEncoder().encode(message)
      )
      setEncBuf(buf)
      setEncrypted(ab2hex(buf))
      setActiveStep(2)
    } finally { setLoading(null) }
  }

  const decryptMsg = async () => {
    if (!keyPair || !encBuf) return
    setLoading("decrypt")
    try {
      const buf = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, keyPair.privateKey, encBuf)
      setDecrypted(new TextDecoder().decode(buf))
      setActiveStep(3)
    } finally { setLoading(null) }
  }

  const steps = [
    { label: "Generate Keys",   done: !!keyPair },
    { label: "Encrypt Message", done: !!encrypted },
    { label: "Decrypt Message", done: !!decrypted },
  ]

  return (
    <div>
      <h2 className="text-[15px] font-semibold text-white mb-0.5">RSA — Rivest–Shamir–Adleman</h2>
      <p className="text-[13px] text-gray-500 mb-6">
        Asymmetric encryption using a public key to encrypt and a private key to decrypt. Based on the difficulty of factoring large prime products.
      </p>

      {/* How it works */}
      <div className="bg-gray-900/40 border border-gray-800/40 rounded-xl p-4 mb-6">
        <p className="text-[11px] text-gray-600 uppercase tracking-widest mb-3">How RSA Works</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: "🔑", label: "Key Generation", desc: "Choose two large primes p, q. Compute n = p×q and φ(n). Pick e coprime to φ(n). Compute d = e⁻¹ mod φ(n)." },
            { icon: "🔒", label: "Encryption",     desc: "Anyone with the public key (e, n) can encrypt: C = Mᵉ mod n. Only the private key holder can decrypt." },
            { icon: "🔓", label: "Decryption",     desc: "Only the private key d can decrypt: M = Cᵈ mod n. Factoring n to find d is computationally infeasible." },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="text-center">
              <div className="text-2xl mb-2">{icon}</div>
              <p className="text-[12px] font-semibold text-white mb-1">{label}</p>
              <p className="text-[11px] text-gray-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Workflow stepper */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map(({ label, done }, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-all ${
              done          ? "bg-emerald-900/30 border-emerald-700/40 text-emerald-400"
              : activeStep === i ? "bg-blue-900/30 border-blue-700/40 text-blue-400"
              : "bg-gray-900/40 border-gray-800/40 text-gray-600"
            }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${done ? "bg-emerald-500 text-black" : "border border-current"}`}>
                {done ? "✓" : i + 1}
              </span>
              {label}
            </div>
            {i < steps.length - 1 && <span className="text-gray-800 text-xs">→</span>}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={generateKeys} disabled={!!loading}
          className="border border-gray-700 text-gray-300 hover:bg-gray-800/60 hover:text-white disabled:opacity-50 px-4 py-1.5 rounded-lg text-[12px] font-medium transition-colors flex items-center gap-2">
          {loading === "keygen" && <Spinner />}
          Generate RSA-2048 Keys
        </button>
        <button onClick={encryptMsg} disabled={!keyPair || !!loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg text-[12px] font-medium transition-colors flex items-center gap-2">
          {loading === "encrypt" && <Spinner />}
          Encrypt with Public Key
        </button>
        <button onClick={decryptMsg} disabled={!encBuf || !!loading}
          className="border border-gray-700 text-gray-300 hover:bg-gray-800/60 hover:text-white disabled:opacity-40 px-4 py-1.5 rounded-lg text-[12px] font-medium transition-colors flex items-center gap-2">
          {loading === "decrypt" && <Spinner />}
          Decrypt with Private Key
        </button>
      </div>

      {/* Message input */}
      <div className="mb-5">
        <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Plaintext Message</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-gray-900/60 border border-gray-800 rounded-xl px-3.5 py-3 text-sm font-mono resize-none h-16 focus:outline-none focus:border-gray-600 text-white transition-colors" />
      </div>

      {/* Keys display */}
      {pubPem && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: "Public Key (SPKI)", pem: pubPem, color: "text-blue-400" },
            { label: "Private Key (PKCS8)", pem: privPem, color: "text-amber-400" },
          ].map(({ label, pem, color }) => (
            <div key={label} className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-3">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">{label}</p>
              <pre className={`text-[10px] font-mono ${color} whitespace-pre-wrap break-all leading-relaxed line-clamp-6`}>{pem}</pre>
            </div>
          ))}
        </div>
      )}

      {/* Encrypted output */}
      {encrypted && (
        <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4 mb-3">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Ciphertext ({encrypted.length * 4} bits)</p>
          <p className="text-[11px] font-mono text-red-400 break-all line-clamp-3">{encrypted}</p>
        </div>
      )}

      {/* Decrypted output */}
      {decrypted && (
        <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-4">
          <p className="text-[10px] text-emerald-600 uppercase tracking-widest mb-1">✓ Decrypted Message</p>
          <p className="text-[14px] font-mono text-emerald-400">{decrypted}</p>
        </div>
      )}
    </div>
  )
}

// ── Key Exchange (Diffie-Hellman) ──────────────────────────────────────────────
function KeyExchangeTab() {
  const [aliceKey,  setAliceKey]  = useState<CryptoKeyPair | null>(null)
  const [bobKey,    setBobKey]    = useState<CryptoKeyPair | null>(null)
  const [aliceShared, setAliceShared] = useState("")
  const [bobShared,   setBobShared]   = useState("")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)

  const genKeys = async () => {
    setLoading(true); setStep(0)
    setAliceShared(""); setBobShared("")
    try {
      const params = { name: "ECDH", namedCurve: "P-256" } as const
      const [a, b] = await Promise.all([
        crypto.subtle.generateKey(params, true, ["deriveKey", "deriveBits"]),
        crypto.subtle.generateKey(params, true, ["deriveKey", "deriveBits"]),
      ])
      setAliceKey(a); setBobKey(b)
      setStep(1)
    } finally { setLoading(false) }
  }

  const deriveShared = async () => {
    if (!aliceKey || !bobKey) return
    setLoading(true)
    try {
      const [aBits, bBits] = await Promise.all([
        crypto.subtle.deriveBits({ name: "ECDH", public: bobKey.publicKey },   aliceKey.privateKey, 256),
        crypto.subtle.deriveBits({ name: "ECDH", public: aliceKey.publicKey }, bobKey.privateKey,   256),
      ])
      setAliceShared(ab2hex(aBits))
      setBobShared(ab2hex(bBits))
      setStep(2)
    } finally { setLoading(false) }
  }

  const match = aliceShared && bobShared && aliceShared === bobShared

  return (
    <div>
      <h2 className="text-[15px] font-semibold text-white mb-0.5">Diffie-Hellman Key Exchange (ECDH)</h2>
      <p className="text-[13px] text-gray-500 mb-6">
        Two parties derive the same shared secret over a public channel without ever transmitting the secret itself.
      </p>

      {/* Visual diagram */}
      <div className="bg-gray-900/40 border border-gray-800/40 rounded-xl p-5 mb-6">
        <p className="text-[11px] text-gray-600 uppercase tracking-widest mb-5 text-center">Key Exchange Protocol</p>
        <div className="flex items-start justify-between gap-4">
          {/* Alice */}
          <div className="flex-1 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-600/40 flex items-center justify-center mx-auto mb-2 text-blue-400 text-lg font-bold">A</div>
            <p className="text-[12px] font-semibold text-white mb-1">Alice</p>
            <p className="text-[10px] text-gray-600">Private key: <span className="text-blue-400">a</span></p>
            <p className="text-[10px] text-gray-600">Public key: <span className="text-blue-400">g^a mod p</span></p>
            {aliceShared && <p className="text-[10px] text-emerald-400 mt-2 font-mono">Shared: {aliceShared.slice(0, 12)}…</p>}
          </div>

          {/* Arrow exchange */}
          <div className="flex-1 flex flex-col items-center gap-3 pt-4">
            <div className="flex items-center gap-1 w-full">
              <div className="flex-1 h-px bg-gray-700" />
              <span className="text-[10px] text-blue-400 font-mono px-1">g^a</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-gray-600 shrink-0">
                <path d="M2 5h6m0 0L5 2m3 3L5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="text-[11px] text-gray-700 font-mono">Public Channel</div>
            <div className="flex items-center gap-1 w-full">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-gray-600 shrink-0">
                <path d="M8 5H2m0 0l3-3M2 5l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-[10px] text-amber-400 font-mono px-1">g^b</span>
              <div className="flex-1 h-px bg-gray-700" />
            </div>
            {match && (
              <div className="bg-emerald-900/30 border border-emerald-700/30 rounded-lg px-3 py-1.5 text-center">
                <p className="text-[10px] text-emerald-400 font-semibold">✓ Shared Secret Match</p>
                <p className="text-[9px] text-emerald-600 mt-0.5">Both computed: g^ab mod p</p>
              </div>
            )}
          </div>

          {/* Bob */}
          <div className="flex-1 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-600/20 border border-amber-600/40 flex items-center justify-center mx-auto mb-2 text-amber-400 text-lg font-bold">B</div>
            <p className="text-[12px] font-semibold text-white mb-1">Bob</p>
            <p className="text-[10px] text-gray-600">Private key: <span className="text-amber-400">b</span></p>
            <p className="text-[10px] text-gray-600">Public key: <span className="text-amber-400">g^b mod p</span></p>
            {bobShared && <p className="text-[10px] text-emerald-400 mt-2 font-mono">Shared: {bobShared.slice(0, 12)}…</p>}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        <button onClick={genKeys} disabled={loading}
          className="border border-gray-700 text-gray-300 hover:bg-gray-800/60 hover:text-white disabled:opacity-50 px-4 py-1.5 rounded-lg text-[12px] font-medium transition-colors flex items-center gap-2">
          {loading && step === 0 && <Spinner />}
          Generate Key Pairs (Alice + Bob)
        </button>
        <button onClick={deriveShared} disabled={!aliceKey || !bobKey || loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg text-[12px] font-medium transition-colors flex items-center gap-2">
          {loading && step === 1 && <Spinner />}
          Derive Shared Secret
        </button>
      </div>

      {aliceShared && bobShared && (
        <div className="space-y-2">
          {[
            { label: "Alice's Shared Secret", val: aliceShared, color: "text-blue-400" },
            { label: "Bob's Shared Secret",   val: bobShared,   color: "text-amber-400" },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-3">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">{label}</p>
              <p className={`text-[11px] font-mono ${color} break-all`}>{val}</p>
            </div>
          ))}
          {match && (
            <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-3 text-center">
              <p className="text-[13px] font-semibold text-emerald-400">✓ Perfect Match — Shared Secret Established</p>
              <p className="text-[11px] text-gray-500 mt-1">Both parties computed the same 256-bit secret without ever transmitting it.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Spinner ────────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin w-3 h-3" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="14 6" />
    </svg>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function AsymmetricPage() {
  const [activeTab, setActiveTab] = useState<TabId>("RSA")

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-7">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-semibold text-white tracking-tight">Asymmetric Encryption</h1>
          <span className="text-[10px] font-semibold uppercase tracking-widest border px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border-amber-500/20">
            Public Key
          </span>
        </div>
        <p className="text-[13px] text-gray-500">
          Public-key cryptography — encrypt with a public key, decrypt with a private key. Powers HTTPS, email security, and blockchain.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-7 flex-wrap">
        {TABS.map(({ id, soon }) => (
          <button key={id} disabled={soon}
            onClick={() => setActiveTab(id)}
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

      {activeTab === "RSA"          && <RSATab />}
      {activeTab === "Key Exchange" && <KeyExchangeTab />}
    </div>
  )
}