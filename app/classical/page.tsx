"use client"

import { useState, useCallback } from "react"
import {
  caesarCipher, vigenereCipher, playfairCipher, hillCipher,
  railFenceCipher, monoalphabeticCipher, caesarBruteForce,
  type CipherResult, type CipherStep,
} from "@/lib/crypto/classical"
import LetterTransformViz from "@/components/viz/LetterTransform"

type TabId = "Caesar" | "Vigenere" | "Playfair" | "Hill" | "Rail Fence" | "Monoalphabetic"
const TABS: TabId[] = ["Caesar", "Vigenere", "Playfair", "Hill", "Rail Fence", "Monoalphabetic"]

const CIPHER_META: Record<TabId, { title: string; desc: string; badge: string; badgeColor: string }> = {
  Caesar:        { title: "Caesar Cipher",               badge: "Shift",     badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/20", desc: "Each letter is shifted by a fixed number of positions in the alphabet." },
  Vigenere:      { title: "Vigenère Cipher",             badge: "Polyalpha", badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",       desc: "A polyalphabetic cipher using a keyword to apply different shifts per letter." },
  Playfair:      { title: "Playfair Cipher",             badge: "Digraph",   badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20", desc: "Encrypts pairs of letters using a 5×5 key matrix (J=I)." },
  Hill:          { title: "Hill Cipher",                 badge: "Matrix",    badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",    desc: "Encrypts blocks using matrix multiplication modulo 26." },
  "Rail Fence":  { title: "Rail Fence Cipher",           badge: "Transpose", badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",       desc: "Writes text in a zigzag pattern across a number of rails." },
  Monoalphabetic:{ title: "Monoalphabetic Substitution", badge: "Subst.",    badgeColor: "bg-pink-500/10 text-pink-400 border-pink-500/20",       desc: "Each letter is replaced by a fixed letter from a scrambled alphabet." },
}

function buildLetterPairs(
  plain: string, cipher: string, algo: TabId,
  shift?: number, key?: string
): { from: string; to: string; key?: string | number }[] {
  const pairs: { from: string; to: string; key?: string | number }[] = []
  const p = plain.toUpperCase()
  const c = cipher.toUpperCase()
  const len = Math.min(p.length, c.length, 30)
  for (let i = 0; i < len; i++) {
    if (p[i] === " ") { pairs.push({ from: " ", to: " " }); continue }
    let keyHint: string | number | undefined
    if (algo === "Caesar" && shift !== undefined) keyHint = shift
    if (algo === "Vigenere" && key) {
      const ki = key.replace(/[^A-Za-z]/g, "")
      if (ki.length > 0) {
        let letterIdx = 0
        for (let j = 0; j < i; j++) if (p[j] !== " ") letterIdx++
        keyHint = ki[letterIdx % ki.length].toUpperCase()
      }
    }
    if (algo === "Monoalphabetic" && key) keyHint = key[p.charCodeAt(i) - 65]
    pairs.push({ from: p[i], to: c[i] ?? "?", key: keyHint })
  }
  return pairs
}

export default function ClassicalPage() {
  const [activeTab, setActiveTab]     = useState<TabId>("Caesar")
  const [plaintext, setPlaintext]     = useState("")
  const [mode, setMode]               = useState<"encrypt" | "decrypt">("encrypt")
  const [result, setResult]           = useState<CipherResult | null>(null)
  const [showSteps, setShowSteps]     = useState(false)
  const [copied, setCopied]           = useState(false)
  const [caesarShift, setCaesarShift] = useState(3)
  const [bruteForce, setBruteForce]   = useState<{ shift: number; text: string }[] | null>(null)
  const [vigenereKey, setVigenereKey] = useState("KEY")
  const [playfairKey, setPlayfairKey] = useState("KEYWORD")
  const [hillKey, setHillKey]         = useState([[3, 3], [2, 5]])
  const [rails, setRails]             = useState(3)
  const [monoKey, setMonoKey]         = useState("QWERTYUIOPASDFGHJKLZXCVBNM")
  const [animKey, setAnimKey]         = useState(0)

  const run = useCallback(() => {
    setBruteForce(null)
    const d = mode === "decrypt"
    let res: CipherResult | null = null
    if (activeTab === "Caesar")          res = caesarCipher(plaintext, caesarShift, d)
    else if (activeTab === "Vigenere")   res = vigenereCipher(plaintext, vigenereKey, d)
    else if (activeTab === "Playfair")   res = playfairCipher(plaintext, playfairKey, d)
    else if (activeTab === "Hill")       res = hillCipher(plaintext, hillKey, d)
    else if (activeTab === "Rail Fence") res = railFenceCipher(plaintext, rails, d)
    else if (activeTab === "Monoalphabetic") res = monoalphabeticCipher(plaintext, monoKey, d)
    setResult(res)
    setShowSteps(false)
    setAnimKey(k => k + 1)
  }, [activeTab, plaintext, mode, caesarShift, vigenereKey, playfairKey, hillKey, rails, monoKey])

  const copy = () => {
    if (result?.result) { navigator.clipboard.writeText(result.result); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  }

  const meta = CIPHER_META[activeTab]
  const letterPairs = result
    ? buildLetterPairs(
        mode === "encrypt" ? plaintext : result.result,
        mode === "encrypt" ? result.result : plaintext,
        activeTab, caesarShift,
        activeTab === "Vigenere" ? vigenereKey : activeTab === "Monoalphabetic" ? monoKey : undefined
      )
    : []

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-7">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-semibold text-white tracking-tight">Classical Cryptography</h1>
          <span className={`text-[10px] font-semibold uppercase tracking-widest border px-2 py-0.5 rounded-full ${meta.badgeColor}`}>{meta.badge}</span>
        </div>
        <p className="text-[13px] text-gray-500">Explore historical encryption techniques with interactive step-by-step visualizations.</p>
      </div>

      <div className="flex gap-0.5 bg-gray-900/60 border border-gray-800/80 rounded-xl p-1 mb-7 flex-wrap">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => { setActiveTab(tab); setResult(null); setBruteForce(null) }}
            className={`flex-1 min-w-fit px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all duration-150 ${activeTab === tab ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-300"}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="mb-5">
        <h2 className="text-[15px] font-semibold text-white mb-0.5">{meta.title}</h2>
        <p className="text-[13px] text-gray-500">{meta.desc}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Plaintext</label>
          <textarea value={plaintext} onChange={(e) => setPlaintext(e.target.value)}
            placeholder="Enter text (e.g., HELLO WORLD)"
            className="w-full bg-gray-900/60 border border-gray-800 rounded-xl px-3.5 py-3 text-sm font-mono resize-none h-28 focus:outline-none focus:border-gray-600 text-white placeholder-gray-700 transition-colors" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider">Ciphertext</label>
            {result && <button onClick={copy} className="text-[11px] text-gray-600 hover:text-gray-300 transition-colors">{copied ? "✓ Copied" : "Copy"}</button>}
          </div>
          <div className="w-full bg-gray-900/40 border border-gray-800 rounded-xl px-3.5 py-3 text-sm font-mono h-28 overflow-auto">
            {result ? <span className="text-emerald-400">{result.result}</span> : <span className="text-gray-700">Output will appear here...</span>}
          </div>
        </div>
      </div>

      <div className="mb-5 space-y-3">
        {activeTab === "Caesar" && (
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Shift Amount</label>
            <div className="flex items-center gap-3">
              <input type="number" min={0} max={25} value={caesarShift} onChange={(e) => setCaesarShift(Number(e.target.value))}
                className="w-16 bg-gray-900/60 border border-gray-800 rounded-lg px-2.5 py-1.5 text-sm font-mono text-center text-white focus:outline-none focus:border-gray-600" />
              <input type="range" min={0} max={25} value={caesarShift} onChange={(e) => setCaesarShift(Number(e.target.value))} className="flex-1 accent-blue-500" />
              <span className="text-[12px] text-gray-500 font-mono w-16 text-right">Shift: {caesarShift}</span>
            </div>
          </div>
        )}
        {activeTab === "Vigenere" && (
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Keyword</label>
            <input value={vigenereKey} onChange={(e) => setVigenereKey(e.target.value.toUpperCase())} placeholder="e.g., KEY"
              className="w-full bg-gray-900/60 border border-gray-800 rounded-lg px-3.5 py-2 text-sm font-mono text-white placeholder-gray-700 focus:outline-none focus:border-gray-600 transition-colors" />
          </div>
        )}
        {activeTab === "Playfair" && (
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Keyword</label>
            <input value={playfairKey} onChange={(e) => setPlayfairKey(e.target.value.toUpperCase())} placeholder="e.g., KEYWORD"
              className="w-full bg-gray-900/60 border border-gray-800 rounded-lg px-3.5 py-2 text-sm font-mono text-white placeholder-gray-700 focus:outline-none focus:border-gray-600 transition-colors" />
            <PlayfairMatrix keyStr={playfairKey} />
          </div>
        )}
        {activeTab === "Hill" && (
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">2×2 Key Matrix</label>
            <div className="inline-grid grid-cols-2 gap-1.5">
              {[0, 1].map((r) => [0, 1].map((c) => (
                <input key={`${r}${c}`} type="number" value={hillKey[r][c]}
                  onChange={(e) => { const k = hillKey.map((row: number[]) => [...row]); k[r][c] = Number(e.target.value); setHillKey(k) }}
                  className="w-16 bg-gray-900/60 border border-gray-800 rounded-lg px-2 py-1.5 text-sm font-mono text-center text-white focus:outline-none focus:border-gray-600" />
              )))}
            </div>
          </div>
        )}
        {activeTab === "Rail Fence" && (
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Number of Rails</label>
            <div className="flex items-center gap-3">
              <input type="number" min={2} max={10} value={rails} onChange={(e) => setRails(Number(e.target.value))}
                className="w-16 bg-gray-900/60 border border-gray-800 rounded-lg px-2.5 py-1.5 text-sm font-mono text-center text-white focus:outline-none focus:border-gray-600" />
              <input type="range" min={2} max={10} value={rails} onChange={(e) => setRails(Number(e.target.value))} className="flex-1 accent-blue-500" />
              <span className="text-[12px] text-gray-500 font-mono w-20 text-right">Rails: {rails}</span>
            </div>
            {plaintext && <RailFenceViz text={plaintext.replace(/ /g, "").toUpperCase().slice(0, 20)} rails={rails} />}
          </div>
        )}
        {activeTab === "Monoalphabetic" && (
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Substitution Alphabet</label>
            <input value={monoKey} onChange={(e) => setMonoKey(e.target.value.toUpperCase().slice(0, 26))} maxLength={26}
              className="w-full bg-gray-900/60 border border-gray-800 rounded-lg px-3.5 py-2 text-sm font-mono text-white placeholder-gray-700 focus:outline-none focus:border-gray-600 transition-colors" />
            <div className="flex gap-2 mt-2 flex-wrap">
              {"ABCDE".split("").map((ch, i) => (
                <span key={ch} className="text-[11px] font-mono text-gray-600">{ch}<span className="text-gray-700">→</span><span className="text-gray-400">{monoKey[i] || "?"}</span></span>
              ))}
              <span className="text-[11px] text-gray-700">...</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex bg-gray-900/60 border border-gray-800 rounded-lg overflow-hidden text-[12px]">
          {(["encrypt", "decrypt"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-4 py-1.5 capitalize transition-all ${mode === m ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}>{m}</button>
          ))}
        </div>
        <button onClick={run} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-1.5 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 4-8 4V2z" fill="currentColor"/></svg>
          {mode === "encrypt" ? "Encrypt" : "Decrypt"}
        </button>
        {activeTab === "Caesar" && mode === "decrypt" && (
          <button onClick={() => setBruteForce(caesarBruteForce(plaintext))}
            className="border border-amber-600/40 text-amber-500 hover:bg-amber-600/10 px-4 py-1.5 rounded-lg text-[12px] transition-colors">
            Brute Force All 26
          </button>
        )}
        {result && (
          <button onClick={() => setShowSteps(!showSteps)}
            className="ml-auto text-[12px] text-gray-600 hover:text-gray-300 transition-colors flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d={showSteps ? "M2 4l4 4 4-4" : "M2 8l4-4 4 4"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {showSteps ? "Hide" : "Show"} steps ({result.steps.length})
          </button>
        )}
      </div>

      {/* ── Letter Transform Visualization ── */}
      {result && letterPairs.length > 0 && (
        <LetterTransformViz key={animKey} pairs={letterPairs} speed={activeTab === "Caesar" ? 60 : 80} active />
      )}

      {showSteps && result && <StepsPanel steps={result.steps} />}

      {bruteForce && (
        <div className="mt-5 bg-gray-900/60 border border-amber-600/20 rounded-xl p-4">
          <p className="text-[11px] font-semibold text-amber-500 uppercase tracking-widest mb-3">Brute Force — All 26 Shifts</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 max-h-64 overflow-y-auto">
            {bruteForce.map(({ shift, text }) => (
              <div key={shift} className="flex gap-3 text-[12px] font-mono items-baseline">
                <span className="text-gray-600 w-5 shrink-0">+{shift}</span>
                <span className="text-gray-400 truncate">{text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RailFenceViz({ text, rails }: { text: string; rails: number }) {
  const positions: { char: string; rail: number; col: number }[] = []
  let rail = 0, dir = 1
  for (let i = 0; i < text.length; i++) {
    positions.push({ char: text[i], rail, col: i })
    if (rail === 0) dir = 1
    else if (rail === rails - 1) dir = -1
    rail += dir
  }
  const RAIL_COLORS = ["text-blue-400","text-emerald-400","text-purple-400","text-amber-400","text-pink-400"]
  return (
    <div className="mt-3 bg-gray-900/40 border border-gray-800/40 rounded-xl p-3 overflow-x-auto">
      <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Zigzag Pattern</p>
      <div className="relative" style={{ height: `${rails * 28}px` }}>
        {positions.map(({ char, rail: r, col }) => (
          <div key={col}
            className={`absolute w-6 h-6 flex items-center justify-center text-[11px] font-mono font-bold rounded-md bg-gray-800/60 border border-gray-700/40 ${RAIL_COLORS[r % RAIL_COLORS.length]}`}
            style={{ left: `${col * 26}px`, top: `${r * 28}px` }}>
            {char}
          </div>
        ))}
      </div>
    </div>
  )
}

function PlayfairMatrix({ keyStr }: { keyStr: string }) {
  const used = new Set<string>(); const chars: string[] = []
  for (const c of (keyStr.toUpperCase() + "ABCDEFGHIKLMNOPQRSTUVWXYZ").replace(/J/g,"I"))
    if (c >= "A" && c <= "Z" && !used.has(c)) { used.add(c); chars.push(c) }
  return (
    <div className="mt-3 inline-grid grid-cols-5 gap-1">
      {chars.slice(0,25).map((c,i) => (
        <div key={i} className="w-8 h-8 bg-gray-800/80 border border-gray-700/60 rounded-lg flex items-center justify-center text-[12px] font-mono text-gray-300">{c}</div>
      ))}
    </div>
  )
}

function StepsPanel({ steps }: { steps: CipherStep[] }) {
  return (
    <div className="mt-4 bg-gray-900/40 border border-gray-800/60 rounded-xl p-4 max-h-72 overflow-y-auto space-y-3">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3">
          <div className="w-5 h-5 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[9px] font-mono text-gray-500 shrink-0 mt-0.5">{i+1}</div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">{step.label}</p>
            <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">{step.description}</p>
            {step.state && <p className="text-[12px] font-mono text-emerald-400 mt-1 break-all">{step.state}</p>}
            {step.matrix && (
              <div className="mt-1.5 inline-grid gap-0.5" style={{ gridTemplateColumns: `repeat(${step.matrix[0].length}, auto)` }}>
                {step.matrix.flat().map((cell, ci) => (
                  <span key={ci} className="text-[11px] font-mono bg-gray-800/60 border border-gray-700/40 px-1.5 py-0.5 text-gray-400 rounded">{cell}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}