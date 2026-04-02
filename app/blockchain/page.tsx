"use client"

import { useState, useEffect, useRef } from "react"
import {
  sha256, calculateHash, mineBlock, isChainValid, createGenesisBlock,
  generateWallet, signTransaction, verifySignature, createTransaction,
  loadChain, saveChain, loadWallets, saveWallets,
  loadMempool, saveMempool, loadConfirmed, saveConfirmed,
  loadTokens, saveTokens, loadTransfers, saveTransfers, resetBlockchain,
  type Block, type Wallet, type Transaction, type Token, type TokenTransfer
} from "@/lib/blockchain"

// ─── Chapter config ───────────────────────────────────────────────────────────
const CHAPTERS = [
  {
    id: "hash",
    num: "01",
    icon: "🔢",
    title: "The Magic Fingerprint",
    subtitle: "What is a Hash?",
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.25)",
    analogy: "Imagine a blender that turns any text into a unique 64-character code. Change even one letter — the code is completely different. You can never reverse it.",
    goal: "Type anything below and watch your unique fingerprint appear instantly.",
    takeaway: "Hashes are the foundation of blockchain — they make tampering impossible to hide.",
  },
  {
    id: "block",
    num: "02",
    icon: "📦",
    title: "Building a Block",
    subtitle: "What is Mining?",
    color: "#60a5fa",
    glow: "rgba(96,165,250,0.25)",
    analogy: "Think of mining like solving a puzzle. You keep guessing a number until the fingerprint of your data starts with enough zeros. The more zeros required, the harder the puzzle.",
    goal: "Pick a difficulty and mine your first block. Watch the computer try thousands of combinations.",
    takeaway: "Mining costs real effort — that's what makes adding fake blocks to the chain so expensive.",
  },
  {
    id: "chain",
    num: "03",
    icon: "🔗",
    title: "Chaining Blocks Together",
    subtitle: "Why Can't You Cheat?",
    color: "#4ade80",
    glow: "rgba(74,222,128,0.25)",
    analogy: "Each block contains the fingerprint of the block before it. Change block 3 and its fingerprint changes — which breaks block 4, which breaks block 5... the whole chain collapses.",
    goal: "Click on any block and change its data. Then hit 'Check Chain' to see it break.",
    takeaway: "This chain reaction is why blockchain records are permanent — you'd need to redo all the work from that point forward.",
  },
  {
    id: "wallet",
    num: "04",
    icon: "🔑",
    title: "Your Digital Identity",
    subtitle: "What is a Wallet?",
    color: "#a78bfa",
    glow: "rgba(167,139,250,0.25)",
    analogy: "A wallet has two keys: a public key (like your bank account number — share it freely) and a private key (like your PIN — never share it). You sign transactions with your private key to prove they're from you.",
    goal: "Create your wallet, then sign a message. Change the message and watch verification fail.",
    takeaway: "Nobody can fake your signature without your private key — even if they know your public address.",
  },
  {
    id: "transaction",
    num: "05",
    icon: "💸",
    title: "Sending Money",
    subtitle: "How Do Transactions Work?",
    color: "#f472b6",
    glow: "rgba(244,114,182,0.25)",
    analogy: "When you send coins, your transaction sits in a waiting room (the mempool) until a miner picks it up, adds it to a block, and mines it into the chain. Only then is it confirmed.",
    goal: "Create two wallets, send coins between them, then mine the block to confirm.",
    takeaway: "Until a transaction is in a mined block, it hasn't really happened yet.",
  },
  {
    id: "token",
    num: "06",
    icon: "🪙",
    title: "Creating Your Own Coin",
    subtitle: "What is a Token?",
    color: "#fb923c",
    glow: "rgba(251,146,60,0.25)",
    analogy: "Anyone can create a token on a blockchain — it's just a record saying 'there are X of these and wallet Y owns them'. This is how USDT, Shiba Inu, and millions of tokens were created.",
    goal: "Mint your own token with a name and supply, then transfer some to another wallet.",
    takeaway: "Tokens are just entries in a shared spreadsheet — the blockchain is that spreadsheet.",
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function short(s: string) { return s.slice(0, 6) + "…" + s.slice(-4) }
function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  return `${Math.floor(s/3600)}h ago`
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ current, total, color }: { current: number; total: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex-1 h-1 rounded-full transition-all duration-500"
          style={{ background: i <= current ? color : "rgba(255,255,255,0.08)" }}/>
      ))}
    </div>
  )
}

// ─── Chapter wrapper ──────────────────────────────────────────────────────────
function ChapterShell({ chapter, children, onNext, onPrev, isFirst, isLast, completed }: {
  chapter: typeof CHAPTERS[0]
  children: React.ReactNode
  onNext: () => void
  onPrev: () => void
  isFirst: boolean
  isLast: boolean
  completed: boolean
}) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Chapter hero */}
      <div className="relative rounded-2xl p-6 md:p-8 mb-5 overflow-hidden"
        style={{ background:`radial-gradient(ellipse at 20% 50%, ${chapter.glow} 0%, rgba(5,5,10,0.95) 60%)`, border:`1px solid ${chapter.color}25` }}>
        {/* Background number */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[120px] font-black opacity-[0.04] select-none pointer-events-none"
          style={{ color: chapter.color, lineHeight:1 }}>{chapter.num}</div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-2xl shrink-0"
              style={{ background:`${chapter.color}18`, border:`1px solid ${chapter.color}35` }}>
              {chapter.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5" style={{ color:`${chapter.color}90` }}>
                Chapter {chapter.num}
              </p>
              <p className="text-[11px] font-semibold" style={{ color:`${chapter.color}70` }}>{chapter.subtitle}</p>
            </div>
          </div>
          <h2 className="text-[28px] font-black text-white mb-4 leading-tight">{chapter.title}</h2>
          <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-lg shrink-0 mt-0.5">💡</span>
            <p className="text-[13px] text-gray-300 leading-relaxed">{chapter.analogy}</p>
          </div>
        </div>
      </div>

      {/* Goal banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-5"
        style={{ background:`${chapter.color}0D`, border:`1px solid ${chapter.color}25` }}>
        <span className="text-base shrink-0">🎯</span>
        <p className="text-[13px] font-semibold" style={{ color: chapter.color }}>{chapter.goal}</p>
      </div>

      {/* Content */}
      <div className="mb-6">{children}</div>

      {/* Takeaway */}
      {completed && (
        <div className="flex items-start gap-3 p-4 rounded-2xl mb-5 cv-pop"
          style={{ background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.25)" }}>
          <span className="text-xl shrink-0">✅</span>
          <div>
            <p className="text-[12px] font-bold text-emerald-400 mb-0.5">Chapter complete!</p>
            <p className="text-[13px] text-gray-400 leading-relaxed">{chapter.takeaway}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 mt-2" style={{ borderTop:"1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onPrev} disabled={isFirst}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:bg-white/5"
          style={{ border:"1px solid rgba(255,255,255,0.1)", color:"#9ca3af" }}>
          ← Previous
        </button>
        <div className="flex items-center gap-3">
          
          <button onClick={onNext}
            className="flex items-center gap-2 px-8 py-3 rounded-xl text-[14px] font-black text-white transition-all"
            style={{ background:`linear-gradient(135deg, ${chapter.color}, ${chapter.color}99)`, boxShadow:`0 0 24px ${chapter.glow}` }}>
            {isLast ? "🎉 Finish!" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function BlockchainPage() {
  const [step,      setStep]      = useState(0)
  const [chain,     setChain]     = useState<Block[]>([])
  const [wallets,   setWallets]   = useState<Wallet[]>([])
  const [mempool,   setMempool]   = useState<Transaction[]>([])
  const [confirmed, setConfirmed] = useState<Transaction[]>([])
  const [tokens,    setTokens]    = useState<Token[]>([])
  const [transfers, setTransfers] = useState<TokenTransfer[]>([])
  const [done,      setDone]      = useState(false)
  const [completed, setCompleted] = useState<Set<number>>(new Set())
  const [ready,     setReady]     = useState(false)

  useEffect(() => {
    const init = async () => {
      let c = loadChain()
      if (c.length === 0) { c = [await createGenesisBlock()]; saveChain(c) }
      setChain(c); setWallets(loadWallets())
      setMempool(loadMempool()); setConfirmed(loadConfirmed())
      setTokens(loadTokens()); setTransfers(loadTransfers())
      setReady(true)
    }
    init()
  }, [])

  const markComplete = (i: number) => setCompleted(p => new Set([...p, i]))

  const updateChain     = (c: Block[])       => { setChain(c);     saveChain(c)     }
  const updateWallets   = (w: Wallet[])      => { setWallets(w);   saveWallets(w)   }
  const updateMempool   = (m: Transaction[]) => { setMempool(m);   saveMempool(m)   }
  const updateConfirmed = (c: Transaction[]) => { setConfirmed(c); saveConfirmed(c) }
  const updateTokens    = (t: Token[])       => { setTokens(t);    saveTokens(t)    }
  const updateTransfers = (t: TokenTransfer[]) => { setTransfers(t); saveTransfers(t) }

  const ch = CHAPTERS[step]

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:"#050508" }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor:"rgba(96,165,250,0.3)", borderTopColor:"#60a5fa" }}/>
    </div>
  )

  if (done) return <CompletionScreen onRestart={() => { setStep(0); setDone(false); setCompleted(new Set()) }}/>

  return (
    <div className="min-h-screen w-full" style={{ background:"#050508" }}>
      <style>{`
        @keyframes cv-up  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cv-pop { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        @keyframes hash-change { 0%{color:#fbbf24;transform:scale(1.02)} 100%{color:#6b7280;transform:scale(1)} }
        @keyframes mine-tick { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes chain-link { from{stroke-dashoffset:40} to{stroke-dashoffset:0} }
        .cv-up  { animation: cv-up  0.4s cubic-bezier(0.23,1,0.32,1) both }
        .cv-pop { animation: cv-pop 0.35s cubic-bezier(0.23,1,0.32,1) both }
        .hash-flash { animation: hash-change 0.3s ease both }
      `}</style>

      {/* Top nav */}
      <div className="px-4 md:px-10 py-5"
        style={{ background:"rgba(5,5,10,0.98)", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">{ch.icon}</span>
              <div>
                <p className="text-[13px] font-bold text-white">{ch.subtitle}</p>
                <p className="text-[10px] text-gray-600">Chapter {ch.num} of {CHAPTERS.length}</p>
              </div>
            </div>
            <button onClick={() => { if(confirm("Reset everything and start over?")) { resetBlockchain(); window.location.reload() }}}
              className="text-[11px] text-gray-700 hover:text-gray-400 transition-colors">
              Reset
            </button>
          </div>
          <ProgressBar current={step} total={CHAPTERS.length} color={ch.color}/>
        </div>
      </div>

      <div className="px-4 md:px-10 py-6 cv-up" key={step}>
        <ChapterShell
          chapter={ch}
          onNext={() => { if (step < CHAPTERS.length - 1) setStep(s => s+1); else setDone(true) }}
          onPrev={() => setStep(s => Math.max(0, s-1))}
          isFirst={step === 0}
          isLast={step === CHAPTERS.length - 1}
          completed={completed.has(step)}
        >
          {step === 0 && <HashChapter     onComplete={() => markComplete(0)}/>}
          {step === 1 && <MiningChapter   chain={chain} onMined={updateChain} onComplete={() => markComplete(1)}/>}
          {step === 2 && <ChainChapter    chain={chain} onUpdate={updateChain} onComplete={() => markComplete(2)}/>}
          {step === 3 && <WalletChapter   wallets={wallets} onUpdate={updateWallets} onComplete={() => markComplete(3)}/>}
          {step === 4 && <TxChapter       wallets={wallets} mempool={mempool} confirmed={confirmed} chain={chain} onUpdateWallets={updateWallets} onUpdateMempool={updateMempool} onUpdateConfirmed={updateConfirmed} onUpdateChain={updateChain} onComplete={() => markComplete(4)}/>}
          {step === 5 && <TokenChapter    wallets={wallets} tokens={tokens} transfers={transfers} onUpdateTokens={updateTokens} onUpdateTransfers={updateTransfers} onComplete={() => markComplete(5)}/>}
        </ChapterShell>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CH 1 — HASH
// ═══════════════════════════════════════════════════════════════════════════════
function HashChapter({ onComplete }: { onComplete: () => void }) {
  const [input,      setInput]      = useState("Hello, Blockchain!")
  const [hash,       setHash]       = useState("")
  const [prevHash,   setPrevHash]   = useState("")
  const [flashing,   setFlashing]   = useState(false)
  const [tried,      setTried]      = useState(false)

  useEffect(() => {
    sha256(input).then(h => {
      setPrevHash(hash)
      setHash(h)
      if (hash && h !== hash) { setFlashing(true); setTimeout(()=>setFlashing(false), 400) }
    })
  }, [input])

  useEffect(() => { if (tried) onComplete() }, [tried])

  const changed = prevHash && hash !== prevHash

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="rounded-2xl p-5" style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.08)" }}>
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Your Message</label>
        <textarea
          value={input}
          onChange={e => { setInput(e.target.value); setTried(true) }}
          rows={3}
          className="w-full px-4 py-3 rounded-xl text-[15px] text-white outline-none resize-none font-mono"
          style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)" }}
          placeholder="Type anything here…"
        />
      </div>

      {/* Arrow */}
      <div className="flex justify-center">
        <div className="flex flex-col items-center gap-1">
          <div className="w-px h-6 bg-gradient-to-b from-transparent to-amber-500/40"/>
          <div className="text-amber-500 text-xs font-bold uppercase tracking-widest">SHA-256</div>
          <div className="w-px h-6 bg-gradient-to-b from-amber-500/40 to-transparent"/>
        </div>
      </div>

      {/* Hash output */}
      <div className="rounded-2xl p-5" style={{ background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.2)" }}>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color:"#f59e0b" }}>Your Unique Fingerprint</label>
          <span className="text-[10px] text-gray-600">64 characters · always the same length</span>
        </div>
        <p className={`font-mono text-[14px] break-all leading-relaxed text-white ${flashing ? "hash-flash" : ""}`}>
          <span style={{ color:"#f59e0b" }}>{hash.slice(0,8)}</span>
          <span style={{ color:"#60a5fa" }}>{hash.slice(8,16)}</span>
          <span style={{ color:"#4ade80" }}>{hash.slice(16,24)}</span>
          <span style={{ color:"#a78bfa" }}>{hash.slice(24,32)}</span>
          <span style={{ color:"#f472b6" }}>{hash.slice(32,40)}</span>
          <span style={{ color:"#fb923c" }}>{hash.slice(40,48)}</span>
          <span className="text-gray-500">{hash.slice(48)}</span>
        </p>
      </div>

      {/* Properties demo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
        {[
          { icon:"🎯", title:"Always same length", desc:"64 chars whether your input is 1 word or a whole book" },
          { icon:"🌊", title:"Avalanche effect",   desc:"Change ONE letter — the entire hash is completely different" },
          { icon:"🚫", title:"One-way only",       desc:"You can't work backwards from the hash to find the input" },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="rounded-2xl p-4" style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-xl block mb-2">{icon}</span>
            <p className="text-[12px] font-bold text-white mb-1">{title}</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {!tried && (
        <p className="text-center text-[12px] text-gray-600 italic">👆 Edit the message above to see the hash change</p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CH 2 — MINING
// ═══════════════════════════════════════════════════════════════════════════════
function MiningChapter({ chain, onMined, onComplete }: {
  chain: Block[]; onMined: (c: Block[]) => void; onComplete: () => void
}) {
  const [data,       setData]       = useState("My first block 🎉")
  const [difficulty, setDifficulty] = useState(2)
  const [mining,     setMining]     = useState(false)
  const [nonce,      setNonce]      = useState(0)
  const [liveHash,   setLiveHash]   = useState("")
  const [mined,      setMined]      = useState<Block|null>(null)
  const [elapsed,    setElapsed]    = useState(0)
  const timerRef = useRef<any>(null)

  const difficultyInfo = [
    { label:"Very Easy", expected:"~10 tries",    color:"#4ade80" },
    { label:"Easy",      expected:"~100 tries",   color:"#fbbf24" },
    { label:"Medium",    expected:"~1,000 tries", color:"#f97316" },
    { label:"Hard",      expected:"~16,000 tries",color:"#f87171" },
    { label:"Very Hard", expected:"~256,000 tries",color:"#e879f9" },
  ]
  const di = difficultyInfo[difficulty - 1]

  const handleMine = async () => {
    setMining(true); setMined(null); setNonce(0); setLiveHash("")
    const start = Date.now()
    timerRef.current = setInterval(() => setElapsed(Math.round((Date.now()-start)/100)/10), 100)
    const prev = chain[chain.length - 1]
    const block = await mineBlock(chain.length, data, prev.hash, difficulty,
      undefined, (n, h) => { setNonce(n); setLiveHash(h) })
    clearInterval(timerRef.current)
    setMined(block)
    onMined([...chain, block])
    onComplete()
    setMining(false); setElapsed(0)
  }

  const target = "0".repeat(difficulty)

  return (
    <div className="space-y-4">
      {/* Explanation visual */}
      <div className="rounded-2xl p-5" style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)" }}>
        <p className="text-[13px] font-bold text-white mb-3">How mining works, step by step:</p>
        <div className="space-y-2">
          {[
            { n:"1", text:`Take your data: "${data.slice(0,20)}…"`, color:"#60a5fa" },
            { n:"2", text:"Add a random number (nonce) to it", color:"#a78bfa" },
            { n:"3", text:"Run SHA-256 on the combination", color:"#f59e0b" },
            { n:"4", text:`If the hash starts with ${target}, you're done! If not, try the next number.`, color:"#4ade80" },
          ].map(({ n, text, color }) => (
            <div key={n} className="flex items-center gap-3 py-2" style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0"
                style={{ background:`${color}20`, color, border:`1px solid ${color}40` }}>{n}</div>
              <p className="text-[12px] text-gray-300">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-2xl p-5" style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.08)" }}>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest block mb-2">What data to put in this block?</label>
            <input value={data} onChange={e=>setData(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-[14px] text-white outline-none font-mono"
              style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)" }}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">How hard should the puzzle be?</label>
              <span className="text-[12px] font-bold px-2.5 py-1 rounded-lg" style={{ color:di.color, background:`${di.color}15` }}>
                {di.label} · {di.expected}
              </span>
            </div>
            <input type="range" min={1} max={4} value={difficulty} onChange={e=>setDifficulty(Number(e.target.value))}
              className="w-full accent-blue-400"/>
            <p className="text-[11px] text-gray-600 mt-1">
              Hash must start with: <span className="font-mono" style={{ color:di.color }}>{"0".repeat(difficulty)}{"x".repeat(8-difficulty)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Mine button + live display */}
      <button onClick={handleMine} disabled={mining}
        className="w-full py-4 rounded-2xl text-[15px] font-black text-white disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: mining ? "rgba(96,165,250,0.25)" : "linear-gradient(135deg,#1d4ed8,#1e40af)", border:`1px solid ${mining?"rgba(96,165,250,0.4)":"transparent"}`, boxShadow: mining ? "none" : "0 0 32px rgba(37,99,235,0.4)", cursor: mining ? "not-allowed" : "pointer" }}>
        {mining ? `Mining... nonce #${nonce.toLocaleString()} (${elapsed}s)` : "Start Mining!"}
      </button>

      {mining && liveHash && (
        <div className="rounded-2xl p-4" style={{ background:"rgba(96,165,250,0.06)", border:"1px solid rgba(96,165,250,0.2)" }}>
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Current attempt</p>
          <p className="font-mono text-[13px] break-all">
            <span className="text-red-400">{liveHash.slice(0, difficulty)}</span>
            <span className="text-gray-600">{liveHash.slice(difficulty, 16)}</span>
            <span className="text-gray-800">{liveHash.slice(16)}</span>
          </p>
          <p className="text-[11px] text-gray-600 mt-1">
            Looking for: <span className="font-mono text-blue-400">{target}…</span> — first {difficulty} character{difficulty>1?"s":""} must be zero
          </p>
        </div>
      )}

      {mined && (
        <div className="rounded-2xl p-5 cv-pop" style={{ background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.3)", boxShadow:"0 0 32px rgba(74,222,128,0.1)" }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">🎉</span>
            <div>
              <p className="text-[15px] font-black text-white">Block #{mined.index} Mined!</p>
              <p className="text-[12px] text-gray-400">Took {mined.nonce.toLocaleString()} attempts</p>
            </div>
          </div>
          <div className="rounded-xl p-3" style={{ background:"rgba(0,0,0,0.3)" }}>
            <p className="text-[10px] text-gray-600 mb-1">Winning hash — starts with {difficulty} zero{difficulty>1?"s":""}:</p>
            <p className="font-mono text-[13px] break-all">
              <span className="text-emerald-400 font-black">{mined.hash.slice(0,difficulty)}</span>
              <span className="text-gray-400">{mined.hash.slice(difficulty)}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CH 3 — CHAIN
// ═══════════════════════════════════════════════════════════════════════════════
function ChainChapter({ chain, onUpdate, onComplete }: {
  chain: Block[]; onUpdate: (c: Block[]) => void; onComplete: () => void
}) {
  const [edits,    setEdits]    = useState<Record<number,string>>({})
  const [valid,    setValid]    = useState<boolean|null>(null)
  const [checking, setChecking] = useState(false)
  const [selected, setSelected] = useState<number|null>(null)

  const edited = (i: number) => edits[i] !== undefined && edits[i] !== chain[i]?.data

  const check = async () => {
    setChecking(true)
    const testChain = await Promise.all(chain.map(async (b, i) => {
      if (edits[i] !== undefined) {
        const newHash = await calculateHash({ ...b, data: edits[i] })
        return { ...b, data: edits[i], hash: newHash }
      }
      return b
    }))
    const v = await isChainValid(testChain)
    setValid(v)
    setChecking(false)
    onComplete()
  }

  const displayData = (i: number) => edits[i] !== undefined ? edits[i] : (chain[i]?.data ?? "")

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-gray-400 leading-relaxed">
        Below is your blockchain. Each block stores the <span className="text-white font-semibold">fingerprint (hash)</span> of the block before it.
        Try editing the data in any block — then click <span className="text-white font-semibold">Check Chain</span> to see what happens.
      </p>

      {chain.length < 3 && (
        <div className="rounded-2xl p-4 text-center" style={{ background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.2)" }}>
          <p className="text-[13px] text-amber-400">⚠ Mine at least 2 more blocks in Chapter 2 first to see the chain effect!</p>
        </div>
      )}

      {/* Chain visual */}
      <div className="overflow-x-auto pb-4" style={{ scrollbarWidth:"thin" }}>
        <div className="flex items-stretch gap-0 min-w-max">
          {chain.map((block, i) => (
            <div key={block.index} className="flex items-center">
              {/* Block card */}
              <div className="rounded-2xl p-4 w-[200px] transition-all duration-300 cursor-pointer"
                style={{
                  background: edited(i) ? "rgba(239,68,68,0.08)" : selected===i ? "rgba(96,165,250,0.08)" : "rgba(255,255,255,0.025)",
                  border:`1.5px solid ${edited(i) ? "rgba(239,68,68,0.5)" : selected===i ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.08)"}`,
                  boxShadow: edited(i) ? "0 0 24px rgba(239,68,68,0.2)" : "none",
                }}
                onClick={() => setSelected(selected===i ? null : i)}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-gray-600 uppercase">Block #{block.index}</span>
                  {i === 0 && <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">GENESIS</span>}
                  {i === chain.length-1 && i>0 && <span className="text-[8px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full">LATEST</span>}
                  {edited(i) && <span className="text-[8px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">CHANGED!</span>}
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-[9px] text-gray-700 mb-1">Data</p>
                    <input
                      value={displayData(i)}
                      onChange={e => { setEdits(p=>({...p,[i]:e.target.value})); setValid(null) }}
                      onClick={e => e.stopPropagation()}
                      className="w-full px-2 py-1 rounded-lg text-[11px] text-white font-mono outline-none"
                      style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }}/>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-700 mb-0.5">Fingerprint (hash)</p>
                    <p className="font-mono text-[9px] truncate" style={{ color: edited(i) ? "#f87171" : "#6b7280" }}>
                      {block.hash.slice(0,24)}…
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-700 mb-0.5">Previous block's hash</p>
                    <p className="font-mono text-[9px] truncate text-gray-700">
                      {block.previousHash.slice(0,24)}…
                    </p>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              {i < chain.length - 1 && (
                <div className="flex flex-col items-center px-1 shrink-0">
                  <div className="text-[10px] text-gray-700 font-mono leading-none mb-0.5">prev</div>
                  <div className="flex items-center">
                    <div className="h-px w-6" style={{ background: edited(i) ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.15)" }}/>
                    <div className="w-0 h-0" style={{
                      borderTop:"4px solid transparent", borderBottom:"4px solid transparent",
                      borderLeft:`6px solid ${edited(i) ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.15)"}`
                    }}/>
                  </div>
                  <div className="text-[10px] text-gray-700 font-mono leading-none mt-0.5">hash</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Edit hint */}
      {Object.keys(edits).length === 0 && (
        <p className="text-center text-[12px] text-gray-600 italic">
          👆 Click on any block above, then edit its Data field to see what happens
        </p>
      )}

      {/* Check button */}
      <button onClick={check} disabled={checking}
        className="w-full py-3.5 rounded-2xl text-[14px] font-black text-white transition-all disabled:opacity-60"
        style={{ background:"linear-gradient(135deg,#059669,#047857)", boxShadow:"0 0 24px rgba(5,150,105,0.3)" }}>
        {checking ? "Checking…" : "🔍 Check Chain Validity"}
      </button>

      {valid !== null && (
        <div className="rounded-2xl p-5 cv-pop" style={{
          background: valid ? "rgba(74,222,128,0.06)" : "rgba(239,68,68,0.06)",
          border:`1px solid ${valid ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}`,
        }}>
          <div className="flex items-start gap-3">
            <span className="text-3xl">{valid ? "✅" : "💥"}</span>
            <div>
              <p className="text-[15px] font-black mb-1" style={{ color: valid ? "#4ade80" : "#f87171" }}>
                {valid ? "Chain is valid! Every block checks out." : "Chain is broken!"}
              </p>
              <p className="text-[13px] text-gray-400 leading-relaxed">
                {valid
                  ? "Every block's fingerprint matches and the links are intact."
                  : "You changed data in a block — its fingerprint changed, which broke the link to the next block. This is exactly why blockchain records can't be altered secretly."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CH 4 — WALLET
// ═══════════════════════════════════════════════════════════════════════════════
function WalletChapter({ wallets, onUpdate, onComplete }: {
  wallets: Wallet[]; onUpdate: (w: Wallet[]) => void; onComplete: () => void
}) {
  const [name,      setName]      = useState("")
  const [making,    setMaking]    = useState(false)
  const [selected,  setSelected]  = useState<Wallet|null>(null)
  const [message,   setMessage]   = useState("I am sending 10 coins to Alice")
  const [signature, setSignature] = useState("")
  const [signing,   setSigning]   = useState(false)
  const [verifyMsg, setVerifyMsg] = useState("")
  const [verified,  setVerified]  = useState<boolean|null>(null)
  const [showKeys,  setShowKeys]  = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return
    setMaking(true)
    const w = await generateWallet(name.trim())
    const updated = [...wallets, w]
    onUpdate(updated)
    setSelected(w)
    setName("")
    setMaking(false)
  }

  const handleSign = async () => {
    if (!selected) return
    setSigning(true)
    setVerified(null)
    const sig = await signTransaction(selected.privateKey, message)
    setSignature(sig)
    setVerifyMsg(message)
    setSigning(false)
    onComplete()
  }

  const handleVerify = async () => {
    if (!selected || !signature) return
    const v = await verifySignature(selected.publicKey, verifyMsg, signature)
    setVerified(v)
  }

  return (
    <div className="space-y-4">
      {/* Key pair explainer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={{ background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.2)" }}>
          <p className="text-2xl mb-2">🔓</p>
          <p className="text-[13px] font-bold text-white mb-1">Public Key = Your Address</p>
          <p className="text-[12px] text-gray-400 leading-relaxed">Share this freely. It's like your bank account number — people use it to send you coins.</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.2)" }}>
          <p className="text-2xl mb-2">🔒</p>
          <p className="text-[13px] font-bold text-white mb-1">Private Key = Your Password</p>
          <p className="text-[12px] text-gray-400 leading-relaxed">Never share this. It's used to sign transactions, proving they came from you.</p>
        </div>
      </div>

      {/* Create wallet */}
      <div className="rounded-2xl p-5" style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-[13px] font-bold text-white mb-3">Step 1 — Create your wallet</p>
        <div className="flex gap-2">
          <input value={name} onChange={e=>setName(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&handleCreate()}
            placeholder="Your name (e.g. Alice, Bob...)"
            className="flex-1 px-4 py-2.5 rounded-xl text-[13px] text-white placeholder-gray-700 outline-none"
            style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)" }}/>
          <button onClick={handleCreate} disabled={making||!name.trim()}
            className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all disabled:opacity-60"
            style={{ background:"linear-gradient(135deg,#7c3aed,#6d28d9)" }}>
            {making ? "…" : "Create"}
          </button>
        </div>

        {wallets.length > 0 && (
          <div className="mt-3 space-y-2">
            {wallets.map(w => (
              <div key={w.address} onClick={() => setSelected(w)}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-white/5"
                style={{ border:`1px solid ${selected?.address===w.address?"rgba(167,139,250,0.4)":"rgba(255,255,255,0.06)"}` }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
                  style={{ background:"rgba(167,139,250,0.12)", border:"1px solid rgba(167,139,250,0.2)" }}>
                  👤
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-white">{w.label}</p>
                  <p className="font-mono text-[10px] text-gray-600">{w.address}</p>
                </div>
                <span className="text-[13px] font-black text-amber-400">🪙 {w.balance}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sign */}
      {selected && (
        <div className="rounded-2xl p-5 cv-pop" style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-[13px] font-bold text-white mb-3">Step 2 — Sign a message as <span style={{ color:"#a78bfa" }}>{selected.label}</span></p>
          <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={2}
            className="w-full px-4 py-2.5 rounded-xl text-[13px] text-white outline-none resize-none font-mono mb-3"
            style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)" }}/>
          <button onClick={handleSign} disabled={signing}
            className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white transition-all disabled:opacity-60 mb-3"
            style={{ background:"linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow:"0 0 16px rgba(124,58,237,0.3)" }}>
            {signing ? "Signing…" : `✍️ Sign with ${selected.label}'s private key`}
          </button>

          {signature && (
            <div className="rounded-xl p-3 mb-3" style={{ background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.2)" }}>
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Signature generated ✓</p>
              <p className="font-mono text-[9px] text-gray-500 break-all">{signature.slice(0,64)}…</p>
              <p className="text-[11px] text-gray-600 mt-2">This signature is mathematically tied to both the message AND {selected.label}'s private key.</p>
            </div>
          )}

          {/* Verify */}
          {signature && (
            <>
              <p className="text-[13px] font-bold text-white mb-2">Step 3 — Try to verify (or tamper!)</p>
              <p className="text-[12px] text-gray-500 mb-2">Change the message below — verification will fail because the signature no longer matches.</p>
              <textarea value={verifyMsg} onChange={e=>{ setVerifyMsg(e.target.value); setVerified(null) }} rows={2}
                className="w-full px-4 py-2.5 rounded-xl text-[13px] text-white outline-none resize-none font-mono mb-2"
                style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)" }}/>
              <button onClick={handleVerify}
                className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white transition-all mb-2"
                style={{ background:"linear-gradient(135deg,#0369a1,#075985)" }}>
                🔍 Verify Signature
              </button>
              {verified !== null && (
                <div className="rounded-xl p-3 cv-pop" style={{
                  background: verified?"rgba(74,222,128,0.06)":"rgba(239,68,68,0.06)",
                  border:`1px solid ${verified?"rgba(74,222,128,0.3)":"rgba(239,68,68,0.3)"}`
                }}>
                  <p className="text-[13px] font-bold" style={{ color:verified?"#4ade80":"#f87171" }}>
                    {verified ? `✅ Valid! This message was signed by ${selected.label}.` : `❌ Invalid! The message was tampered with — signature doesn't match.`}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CH 5 — TRANSACTION
// ═══════════════════════════════════════════════════════════════════════════════
function TxChapter({ wallets, mempool, confirmed, chain, onUpdateWallets, onUpdateMempool, onUpdateConfirmed, onUpdateChain, onComplete }: {
  wallets: Wallet[]; mempool: Transaction[]; confirmed: Transaction[]
  chain: Block[]; onUpdateWallets:(w:Wallet[])=>void
  onUpdateMempool:(m:Transaction[])=>void; onUpdateConfirmed:(c:Transaction[])=>void
  onUpdateChain:(c:Block[])=>void; onComplete:()=>void
}) {
  const [step,    setStep]    = useState<"setup"|"send"|"mine"|"done">("setup")
  const [from,    setFrom]    = useState("")
  const [to,      setTo]      = useState("")
  const [amount,  setAmount]  = useState(20)
  const [sending, setSending] = useState(false)
  const [mining,  setMining]  = useState(false)
  const [msg,     setMsg]     = useState<string|null>(null)

  // Auto-setup two wallets
  const setupWallets = async () => {
    let w = [...wallets]
    if (w.length < 1) { w = [...w, await generateWallet("Alice")]; }
    if (w.length < 2) { w = [...w, await generateWallet("Bob")] }
    onUpdateWallets(w)
    setFrom(w[0].address)
    setTo(w[1].address)
    setStep("send")
  }

  useEffect(() => {
    if (wallets.length >= 2) { setFrom(wallets[0].address); setTo(wallets[1].address); setStep("send") }
  }, [wallets.length])

  const sender   = wallets.find(w=>w.address===from)
  const receiver = wallets.find(w=>w.address===to)

  const handleSend = async () => {
    if (!sender) return
    setSending(true)
    const tx = await createTransaction(sender, to, amount, 1)
    if (!tx) { setMsg("Not enough coins!"); setSending(false); return }
    onUpdateMempool([...mempool, tx])
    setStep("mine")
    setMsg(null)
    setSending(false)
  }

  const handleMine = async () => {
    setMining(true)
    const txData = JSON.stringify(mempool.map(t=>({from:t.from.slice(0,8),to:t.to.slice(0,8),amount:t.amount})))
    const prev = chain[chain.length-1]
    const block = await mineBlock(chain.length, txData, prev.hash, 2)
    const updatedWallets = wallets.map(w => {
      let bal = w.balance
      mempool.forEach(tx => {
        if (tx.from===w.address) bal -= (tx.amount+tx.fee)
        if (tx.to===w.address)   bal += tx.amount
      })
      return { ...w, balance: Math.max(0, bal) }
    })
    onUpdateChain([...chain, block])
    onUpdateConfirmed([...confirmed, ...mempool.map(tx=>({...tx,status:"confirmed" as const,blockIndex:block.index}))])
    onUpdateMempool([])
    onUpdateWallets(updatedWallets)
    setStep("done")
    setMining(false)
    onComplete()
  }

  const STEPS = [
    { id:"setup", label:"Set up wallets" },
    { id:"send",  label:"Send coins" },
    { id:"mine",  label:"Confirm with mining" },
    { id:"done",  label:"Done!" },
  ]

  return (
    <div className="space-y-4">
      {/* Step progress */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all"
                style={{
                  background: step===s.id ? "#3b82f6" : STEPS.indexOf(STEPS.find(x=>x.id===step)!) > i ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.06)",
                  border: `2px solid ${step===s.id ? "#3b82f6" : STEPS.indexOf(STEPS.find(x=>x.id===step)!) > i ? "rgba(74,222,128,0.5)" : "rgba(255,255,255,0.1)"}`,
                  color: step===s.id ? "#fff" : STEPS.indexOf(STEPS.find(x=>x.id===step)!) > i ? "#4ade80" : "#4b5563"
                }}>
                {STEPS.indexOf(STEPS.find(x=>x.id===step)!) > i ? "✓" : i+1}
              </div>
              <p className="text-[9px] text-gray-600 text-center whitespace-nowrap">{s.label}</p>
            </div>
            {i < STEPS.length-1 && (
              <div className="flex-1 h-px mx-1 mb-4" style={{ background: STEPS.indexOf(STEPS.find(x=>x.id===step)!) > i ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.08)" }}/>
            )}
          </div>
        ))}
      </div>

      {step === "setup" && (
        <div className="rounded-2xl p-6 text-center" style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-3xl mb-3">👥</p>
          <p className="text-[14px] font-bold text-white mb-2">First, we need two wallets</p>
          <p className="text-[13px] text-gray-500 mb-5">We'll create Alice and Bob automatically — two wallets to send coins between.</p>
          <button onClick={setupWallets}
            className="px-8 py-3 rounded-xl text-[13px] font-bold text-white transition-all"
            style={{ background:"linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow:"0 0 20px rgba(124,58,237,0.3)" }}>
            Create Alice & Bob
          </button>
        </div>
      )}

      {step === "send" && sender && receiver && (
        <div className="space-y-3">
          {/* Visual flow */}
          <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex-1 text-center">
              <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-2xl mb-2"
                style={{ background:"rgba(244,114,182,0.12)", border:"1px solid rgba(244,114,182,0.25)" }}>👤</div>
              <p className="text-[13px] font-bold text-white">{sender.label}</p>
              <p className="text-[12px] text-amber-400 font-bold">🪙 {sender.balance}</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-[11px] font-bold text-pink-400">{amount} coins</p>
              <div className="text-gray-500">→→→</div>
              <p className="text-[9px] text-gray-700">+ 1 fee</p>
            </div>
            <div className="flex-1 text-center">
              <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-2xl mb-2"
                style={{ background:"rgba(74,222,128,0.12)", border:"1px solid rgba(74,222,128,0.25)" }}>👤</div>
              <p className="text-[13px] font-bold text-white">{receiver.label}</p>
              <p className="text-[12px] text-amber-400 font-bold">🪙 {receiver.balance}</p>
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.08)" }}>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Amount to send</label>
            <input type="range" min={1} max={Math.min(50, sender.balance-1)} value={amount}
              onChange={e=>setAmount(Number(e.target.value))} className="w-full accent-pink-400 mb-1"/>
            <div className="flex justify-between text-[11px] text-gray-600">
              <span>1 coin</span>
              <span className="font-bold text-white">{amount} coins selected</span>
              <span>{sender.balance-1} coins (max)</span>
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ background:"rgba(244,114,182,0.06)", border:"1px solid rgba(244,114,182,0.2)" }}>
            <p className="text-[12px] text-pink-300">⏳ After you click send, the transaction goes to the <strong>mempool</strong> (waiting room). It's not confirmed yet!</p>
          </div>

          {msg && <p className="text-[12px] text-red-400">{msg}</p>}

          <button onClick={handleSend} disabled={sending}
            className="w-full py-3.5 rounded-2xl text-[14px] font-black text-white transition-all disabled:opacity-60"
            style={{ background:"linear-gradient(135deg,#be185d,#9d174d)", boxShadow:"0 0 24px rgba(190,24,93,0.3)" }}>
            {sending ? "Signing & broadcasting…" : `💸 Send ${amount} coins to ${receiver.label}`}
          </button>
        </div>
      )}

      {step === "mine" && (
        <div className="space-y-3">
          <div className="rounded-2xl p-5 text-center" style={{ background:"rgba(167,139,250,0.06)", border:"1px solid rgba(167,139,250,0.25)" }}>
            <p className="text-3xl mb-2">⏳</p>
            <p className="text-[14px] font-bold text-white mb-1">Transaction is waiting in the mempool</p>
            <p className="text-[13px] text-gray-400 mb-2">It's been broadcast but not confirmed yet. To confirm it, someone needs to mine it into a block.</p>
            {mempool.map(tx => (
              <div key={tx.id} className="rounded-xl p-3 text-left mt-3" style={{ background:"rgba(0,0,0,0.3)" }}>
                <p className="text-[11px] text-gray-500 font-mono">
                  {short(tx.from)} → {short(tx.to)} · <span className="text-amber-400 font-bold">{tx.amount} coins</span> · fee: 1
                </p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl p-4" style={{ background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.2)" }}>
            <p className="text-[12px] text-amber-300">⛏ Mining this block will confirm the transaction and update both wallets' balances permanently.</p>
          </div>
          <button onClick={handleMine} disabled={mining}
            className="w-full py-3.5 rounded-2xl text-[14px] font-black text-white transition-all disabled:opacity-60"
            style={{ background:"linear-gradient(135deg,#d97706,#b45309)", boxShadow:"0 0 24px rgba(217,119,6,0.3)" }}>
            {mining ? "Mining block…" : "Mine this block to confirm ✓"}
          </button>
        </div>
      )}

      {step === "done" && (
        <div className="rounded-2xl p-6 text-center cv-pop" style={{ background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.3)", boxShadow:"0 0 32px rgba(74,222,128,0.1)" }}>
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-[16px] font-black text-white mb-2">Transaction Confirmed!</p>
          <p className="text-[13px] text-gray-400 mb-4">The coins have moved — this is now permanently recorded in the blockchain.</p>
          <div className="flex items-center justify-center gap-8">
            {wallets.slice(0,2).map(w => (
              <div key={w.address} className="text-center">
                <p className="text-[13px] font-bold text-white">{w.label}</p>
                <p className="text-[18px] font-black text-amber-400">🪙 {w.balance}</p>
                <p className="text-[10px] text-gray-600">new balance</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CH 6 — TOKEN
// ═══════════════════════════════════════════════════════════════════════════════
function TokenChapter({ wallets, tokens, transfers, onUpdateTokens, onUpdateTransfers, onComplete }: {
  wallets: Wallet[]; tokens: Token[]; transfers: TokenTransfer[]
  onUpdateTokens:(t:Token[])=>void; onUpdateTransfers:(t:TokenTransfer[])=>void
  onComplete:()=>void
}) {
  const [symbol,   setSymbol]   = useState("")
  const [name,     setName]     = useState("")
  const [supply,   setSupply]   = useState(1000000)
  const [minting,  setMinting]  = useState(false)
  const [selected, setSelected] = useState<Token|null>(null)
  const [tfTo,     setTfTo]     = useState("")
  const [tfAmt,    setTfAmt]    = useState(1000)
  const [msg,      setMsg]      = useState<string|null>(null)

  const COLORS = ["#60a5fa","#4ade80","#f472b6","#fbbf24","#a78bfa","#f87171","#fb923c","#22d3ee"]
  const ownerWallet = wallets[0]

  const handleMint = async () => {
    if (!symbol||!name||!ownerWallet) return
    setMinting(true)
    const color = COLORS[tokens.length % COLORS.length]
    const token: Token = {
      symbol: symbol.toUpperCase().slice(0,6), name,
      totalSupply: supply, decimals: 18,
      owner: ownerWallet.address,
      balances: { [ownerWallet.address]: supply },
      createdAt: Date.now(), color,
    }
    onUpdateTokens([...tokens, token])
    setSelected(token)
    setSymbol(""); setName("")
    onComplete()
    setMinting(false)
  }

  const handleTransfer = async () => {
    if (!selected||!tfTo||tfAmt<=0||!ownerWallet) return
    const fromBal = selected.balances[ownerWallet.address] ?? 0
    if (fromBal < tfAmt) { setMsg("Not enough tokens"); return }
    const updated = { ...selected, balances: {
      ...selected.balances,
      [ownerWallet.address]: fromBal - tfAmt,
      [tfTo]: (selected.balances[tfTo]??0) + tfAmt,
    }}
    onUpdateTokens(tokens.map(t=>t.symbol===selected.symbol?updated:t))
    const txHash = await sha256(`${ownerWallet.address}${tfTo}${tfAmt}${Date.now()}`)
    onUpdateTransfers([...transfers, { from:ownerWallet.address, to:tfTo, amount:tfAmt, token:selected.symbol, timestamp:Date.now(), txHash:txHash.slice(0,16) }])
    setSelected(updated)
    setMsg(`✅ Transferred ${tfAmt.toLocaleString()} ${selected.symbol}`)
  }

  if (!ownerWallet) return (
    <div className="rounded-2xl p-6 text-center" style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.08)" }}>
      <p className="text-[13px] text-gray-500">⚠ Please create a wallet in Chapter 4 first</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Concept */}
      <div className="rounded-2xl p-4" style={{ background:"rgba(251,146,60,0.06)", border:"1px solid rgba(251,146,60,0.2)" }}>
        <p className="text-[13px] text-orange-200 leading-relaxed">
          🏦 Think of this like a company issuing shares. You decide the name, symbol (like a stock ticker), and total supply. All tokens start in the creator's wallet.
        </p>
      </div>

      {/* Mint form */}
      {!selected && (
        <div className="rounded-2xl p-5" style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-[13px] font-bold text-white mb-4">Create your token</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Symbol (max 6 chars)</label>
                <input value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())} maxLength={6} placeholder="e.g. CVRS"
                  className="w-full px-3.5 py-2.5 rounded-xl text-[14px] text-white outline-none font-mono"
                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)" }}/>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Total Supply</label>
                <input type="number" value={supply} onChange={e=>setSupply(Number(e.target.value))} min={1}
                  className="w-full px-3.5 py-2.5 rounded-xl text-[13px] text-white outline-none"
                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)" }}/>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Full Name</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. CryptoVerse Coin"
                className="w-full px-3.5 py-2.5 rounded-xl text-[13px] text-white outline-none"
                style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)" }}/>
            </div>
            <p className="text-[11px] text-gray-600">All {supply.toLocaleString()} tokens will go to: <span className="text-white font-semibold">{ownerWallet.label}</span></p>
          </div>
          <button onClick={handleMint} disabled={minting||!symbol||!name}
            className="w-full py-3 rounded-2xl text-[14px] font-black text-white mt-4 transition-all disabled:opacity-60"
            style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)", boxShadow:"0 0 24px rgba(245,158,11,0.3)" }}>
            {minting ? "Deploying…" : "🚀 Deploy Token"}
          </button>
        </div>
      )}

      {/* Token deployed */}
      {tokens.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {tokens.map(t => (
              <button key={t.symbol} onClick={()=>setSelected(t===selected?null:t)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
                style={{
                  background: selected?.symbol===t.symbol ? `${t.color}20` : "rgba(255,255,255,0.03)",
                  border:`1px solid ${selected?.symbol===t.symbol ? t.color+"50" : "rgba(255,255,255,0.08)"}`,
                }}>
                <span className="text-sm font-black" style={{ color:t.color }}>{t.symbol}</span>
                <span className="text-[10px] text-gray-600">{t.totalSupply.toLocaleString()}</span>
              </button>
            ))}
            {!selected && <button onClick={()=>{ setSelected(null); setSymbol(""); setName("") }}
              className="px-3 py-1.5 rounded-xl text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
              style={{ border:"1px dashed rgba(255,255,255,0.1)" }}>+ Create another</button>}
          </div>

          {selected && (
            <div className="rounded-2xl p-5 cv-pop" style={{ background:`${selected.color}08`, border:`1px solid ${selected.color}25` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black"
                  style={{ background:`${selected.color}20`, color:selected.color, border:`1px solid ${selected.color}40` }}>
                  {selected.symbol.slice(0,2)}
                </div>
                <div>
                  <p className="text-[15px] font-black text-white">{selected.name}</p>
                  <p className="text-[11px] text-gray-500">{selected.symbol} · {selected.totalSupply.toLocaleString()} total supply</p>
                </div>
              </div>

              {/* Holders */}
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Who holds {selected.symbol}?</p>
              {Object.entries(selected.balances).filter(([,v])=>v>0).map(([addr, bal]) => {
                const w = wallets.find(x=>x.address===addr)
                const pct = Math.round((bal/selected.totalSupply)*100)
                return (
                  <div key={addr} className="mb-2">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-gray-300 font-semibold">{w?.label ?? short(addr)}</span>
                      <span style={{ color:selected.color }}>{bal.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width:`${pct}%`, background:selected.color }}/>
                    </div>
                  </div>
                )
              })}

              {/* Transfer */}
              {wallets.length >= 2 && (
                <div className="mt-4 pt-4" style={{ borderTop:`1px solid ${selected.color}20` }}>
                  <p className="text-[12px] font-bold text-white mb-3">Send {selected.symbol} to someone</p>
                  <div className="flex gap-2 mb-2">
                    <select value={tfTo} onChange={e=>setTfTo(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl text-[12px] text-white outline-none"
                      style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }}>
                      <option value="">Choose recipient</option>
                      {wallets.filter(w=>w.address!==ownerWallet.address).map(w=>(
                        <option key={w.address} value={w.address}>{w.label}</option>
                      ))}
                    </select>
                    <input type="number" value={tfAmt} onChange={e=>setTfAmt(Number(e.target.value))} min={1} placeholder="Amount"
                      className="w-24 px-3 py-2 rounded-xl text-[12px] text-white outline-none"
                      style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }}/>
                  </div>
                  <button onClick={handleTransfer} disabled={!tfTo||tfAmt<=0}
                    className="w-full py-2 rounded-xl text-[12px] font-bold text-white transition-all disabled:opacity-60"
                    style={{ background:`linear-gradient(135deg,${selected.color}90,${selected.color}60)` }}>
                    Transfer
                  </button>
                  {msg && <p className="text-[11px] text-emerald-400 mt-2">{msg}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETION SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function CompletionScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 py-12" style={{ background:"#050508" }}>
      <div className="max-w-lg w-full text-center cv-pop">
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center text-5xl"
            style={{ background:"rgba(251,191,36,0.12)", border:"2px solid rgba(251,191,36,0.3)", boxShadow:"0 0 60px rgba(251,191,36,0.2)" }}>
            🏆
          </div>
          <div className="absolute -inset-4 rounded-[2.5rem] border border-amber-500/10 animate-ping" style={{ animationDuration:"3s" }}/>
        </div>

        <h1 className="text-[32px] font-black text-white mb-3 tracking-tight">You understand blockchain!</h1>
        <p className="text-[15px] text-gray-400 leading-relaxed mb-8">
          You've built a real blockchain, mined blocks with SHA-256, created wallets with ECDSA signatures, sent transactions, and deployed your own token. That's more than most people ever learn.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {[
            { icon:"🔢", label:"Hashing" },
            { icon:"⛏", label:"Mining" },
            { icon:"🔗", label:"Chaining" },
            { icon:"🔑", label:"Wallets" },
            { icon:"💸", label:"Transactions" },
            { icon:"🪙", label:"Tokens" },
          ].map(({ icon, label }) => (
            <div key={label} className="rounded-2xl py-3 flex flex-col items-center gap-1"
              style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)" }}>
              <span className="text-2xl">{icon}</span>
              <span className="text-[11px] font-bold text-gray-400">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-center">
          <button onClick={onRestart}
            className="px-6 py-2.5 rounded-xl text-[13px] font-semibold text-gray-400 hover:text-white transition-all"
            style={{ border:"1px solid rgba(255,255,255,0.1)" }}>
            Start over
          </button>
          <a href="/classical"
            className="px-8 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all"
            style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow:"0 0 20px rgba(37,99,235,0.35)" }}>
            Explore Ciphers →
          </a>
        </div>
      </div>
    </div>
  )
}