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
  {
    id: "consensus",
    num: "07",
    icon: "🌐",
    title: "How Everyone Agrees",
    subtitle: "Proof of Work vs Proof of Stake",
    color: "#22d3ee",
    glow: "rgba(34,211,238,0.25)",
    analogy: "With thousands of computers on a network, how do they all agree on which blocks are valid? Two main methods: Proof of Work (burn energy to earn the right) and Proof of Stake (lock up coins to earn the right).",
    goal: "Run a PoW round and a PoS round. See which miner/validator wins based on hash rate or stake.",
    takeaway: "Consensus mechanisms are what make blockchain trustless — no single authority decides what's true.",
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
          {step === 6 && <ConsensusChapter onComplete={() => markComplete(6)}/>}
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
// CH 2 — MINING (fully upgraded)
// ═══════════════════════════════════════════════════════════════════════════════
function MiningChapter({ chain, onMined, onComplete }: {
  chain: Block[]; onMined: (c: Block[]) => void; onComplete: () => void
}) {
  const [data,        setData]        = useState("My first block!")
  const [difficulty,  setDifficulty]  = useState(2)
  const [mining,      setMining]      = useState(false)
  const [nonce,       setNonce]       = useState(0)
  const [liveHash,    setLiveHash]    = useState("")
  const [mined,       setMined]       = useState<Block|null>(null)
  const [elapsed,     setElapsed]     = useState(0)
  const [hashLog,     setHashLog]     = useState<{h:string,ok:boolean}[]>([])
  const [hashRate,    setHashRate]    = useState(0)
  const timerRef  = useRef<any>(null)
  const hrRef     = useRef<number[]>([])

  const DIFF_INFO = [
    { label:"Very Easy", expected:"~16 tries",    color:"#4ade80", tries:16   },
    { label:"Easy",      expected:"~256 tries",   color:"#fbbf24", tries:256  },
    { label:"Medium",    expected:"~4,096 tries", color:"#f97316", tries:4096 },
    { label:"Hard",      expected:"~65k tries",   color:"#f87171", tries:65536},
  ]
  const di     = DIFF_INFO[difficulty-1]
  const target = "0".repeat(difficulty)

  const handleMine = async () => {
    setMining(true); setMined(null); setNonce(0); setLiveHash(""); setHashLog([]); setHashRate(0)
    hrRef.current = []
    const start = Date.now()
    timerRef.current = setInterval(() => setElapsed(Math.round((Date.now()-start)/100)/10), 100)
    const prev = chain[chain.length-1]
    const block = await mineBlock(chain.length, data, prev.hash, difficulty, undefined, (n,h) => {
      setNonce(n); setLiveHash(h)
      setHashLog(p => {
        const ok = h.startsWith(target)
        const entry = { h, ok }
        return [...p.slice(-6), entry]
      })
      // calc hash rate every 200 nonces
      hrRef.current.push(Date.now())
      if (hrRef.current.length > 50) hrRef.current.shift()
      if (hrRef.current.length > 1) {
        const span = (hrRef.current[hrRef.current.length-1] - hrRef.current[0]) / 1000
        setHashRate(Math.round(hrRef.current.length / span))
      }
    })
    clearInterval(timerRef.current)
    setMined(block); onMined([...chain, block]); onComplete()
    setMining(false); setElapsed(0)
  }

  const pct = Math.min((nonce / di.tries) * 100, 99)

  return (
    <div className="space-y-4">
      {/* How mining works */}
      <div className="rounded-2xl overflow-hidden" style={{ border:"1px solid rgba(255,255,255,0.07)" }}>
        <div className="px-5 py-3 flex items-center gap-2" style={{ background:"rgba(255,255,255,0.03)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">How it works</span>
        </div>
        <div className="p-4 grid grid-cols-4 gap-2">
          {[
            { n:"1", icon:"📝", label:"Your data",      sub:`"${data.slice(0,10)}…"`, color:"#60a5fa" },
            { n:"2", icon:"🎲", label:"+ Nonce",         sub:"Try 1,2,3,4…",          color:"#a78bfa" },
            { n:"3", icon:"⚙️", label:"SHA-256",         sub:"Hash function",          color:"#f59e0b" },
            { n:"4", icon:"🎯", label:`Starts ${target}?`, sub:"Yes → block mined!",  color:"#4ade80" },
          ].map(({ n, icon, label, sub, color }, i) => (
            <div key={n} className="relative">
              {i < 3 && <div className="absolute -right-1 top-1/2 -translate-y-1/2 text-gray-700 text-sm z-10">→</div>}
              <div className="rounded-xl p-3 text-center" style={{ background:`${color}08`, border:`1px solid ${color}20` }}>
                <div className="w-6 h-6 rounded-lg mx-auto flex items-center justify-center text-[10px] font-black mb-1.5"
                  style={{ background:`${color}20`, color, border:`1px solid ${color}40` }}>{n}</div>
                <p className="text-base mb-1">{icon}</p>
                <p className="text-[10px] font-bold text-white leading-tight">{label}</p>
                <p className="text-[9px] text-gray-600 mt-0.5 font-mono">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.08)" }}>
        <div>
          <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-2">Block data</label>
          <input value={data} onChange={e=>setData(e.target.value)} disabled={mining}
            className="w-full px-4 py-3 rounded-xl text-[14px] text-white outline-none font-mono disabled:opacity-50"
            style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)" }}/>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Difficulty</label>
            <span className="text-[11px] font-black px-2.5 py-1 rounded-lg" style={{ color:di.color, background:`${di.color}15`, border:`1px solid ${di.color}30` }}>
              {di.label} · {di.expected}
            </span>
          </div>
          <div className="flex gap-1.5 mb-2">
            {DIFF_INFO.map((d,i) => (
              <button key={d.label} onClick={() => !mining && setDifficulty(i+1)}
                className="flex-1 py-2.5 rounded-xl text-[11px] font-black transition-all"
                style={{
                  background: difficulty===i+1 ? `${d.color}18` : "rgba(255,255,255,0.03)",
                  border: `1.5px solid ${difficulty===i+1 ? d.color+"60" : "rgba(255,255,255,0.06)"}`,
                  color: difficulty===i+1 ? d.color : "#374151",
                }}>
                {"0".repeat(i+1)}{"x".repeat(4-i-1)}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-600">
            Hash must start with <span className="font-mono font-black" style={{ color:di.color }}>{target}</span>
            <span className="font-mono text-gray-800">{"x".repeat(8-difficulty)}</span>
          </p>
        </div>
      </div>

      {/* Mine button */}
      <button onClick={handleMine} disabled={mining}
        className="w-full py-4 rounded-2xl text-[15px] font-black text-white disabled:cursor-not-allowed"
        style={{
          background: mining ? "rgba(96,165,250,0.1)" : "linear-gradient(135deg,#1d4ed8,#1e40af)",
          border: `1px solid ${mining ? "rgba(96,165,250,0.25)" : "transparent"}`,
          boxShadow: mining ? "none" : "0 0 32px rgba(37,99,235,0.4)",
        }}>
        {mining ? `Searching… nonce #${nonce.toLocaleString()} · ${elapsed}s` : "Start Mining!"}
      </button>

      {/* Live mining terminal */}
      {mining && (
        <div className="rounded-2xl overflow-hidden" style={{ background:"#080810", border:"1px solid rgba(96,165,250,0.2)", boxShadow:"0 0 24px rgba(37,99,235,0.1)" }}>
          {/* Terminal titlebar */}
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ background:"rgba(255,255,255,0.03)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex gap-1.5">
              {["#f87171","#fbbf24","#4ade80"].map(c=><div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background:c }}/>)}
            </div>
            <span className="text-[10px] font-mono text-gray-600 ml-2">sha256_miner — running</span>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"/>
              <span className="text-[10px] font-mono text-blue-400">{hashRate > 0 ? `${hashRate} H/s` : "…"}</span>
            </div>
          </div>

          {/* Hash log */}
          <div className="p-4 space-y-1 font-mono text-[11px] min-h-[120px]">
            {hashLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 transition-all" style={{ opacity: 0.3 + (i/hashLog.length)*0.7 }}>
                <span style={{ color: entry.ok ? "#4ade80" : "#f87171" }}>{entry.ok ? "✓" : "✗"}</span>
                <span style={{ color: entry.ok ? "#4ade80" : di.color }}>{entry.h.slice(0,difficulty)}</span>
                <span className="text-gray-700">{entry.h.slice(difficulty,20)}</span>
                <span className="text-gray-800">{entry.h.slice(20,32)}</span>
              </div>
            ))}
            {/* Blinking cursor */}
            <div className="flex items-center gap-2">
              <span className="text-gray-700">›</span>
              <span className="text-gray-700 font-mono">{liveHash.slice(0,8)}</span>
              <span className="inline-block w-1.5 h-3.5 bg-blue-400 animate-pulse" style={{ animationDuration:"0.7s" }}/>
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-4 pb-4">
            <div className="flex justify-between text-[10px] text-gray-700 mb-1.5">
              <span>Nonce: {nonce.toLocaleString()}</span>
              <span>~{pct.toFixed(0)}% expected progress</span>
              <span>Target: <span style={{ color:di.color }}>{target}…</span></span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width:`${pct}%`, background:`linear-gradient(90deg,#1d4ed8,${di.color})` }}/>
            </div>
            <p className="text-[9px] text-gray-700 mt-1.5 text-center">
              Mining is probabilistic — you might find it before or after the expected number of tries
            </p>
          </div>
        </div>
      )}

      {/* Success */}
      {mined && (
        <div className="rounded-2xl p-5 cv-pop" style={{ background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.3)", boxShadow:"0 0 40px rgba(74,222,128,0.1)" }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
              style={{ background:"rgba(74,222,128,0.15)", border:"1px solid rgba(74,222,128,0.4)" }}>⛏</div>
            <div>
              <p className="text-[16px] font-black text-white">Block #{mined.index} Mined!</p>
              <p className="text-[12px] text-gray-400">Found after <span className="text-emerald-400 font-bold">{mined.nonce.toLocaleString()}</span> attempts</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label:"Nonce",     value:mined.nonce.toLocaleString(), color:"#60a5fa" },
              { label:"Difficulty",value:`${difficulty} zero${difficulty>1?"s":""}`,   color:"#fbbf24" },
              { label:"Chain size",value:`${chain.length} blocks`,                     color:"#a78bfa" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background:"rgba(0,0,0,0.3)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[14px] font-black" style={{ color }}>{value}</p>
                <p className="text-[9px] text-gray-600 uppercase tracking-wider mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl p-3" style={{ background:"rgba(0,0,0,0.4)" }}>
            <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1.5">Winning hash — starts with {difficulty} zero{difficulty>1?"s":""}</p>
            <p className="font-mono text-[12px] break-all">
              <span className="text-emerald-400 font-black text-[15px]">{mined.hash.slice(0,difficulty)}</span>
              <span className="text-gray-400">{mined.hash.slice(difficulty,32)}</span>
              <span className="text-gray-600">{mined.hash.slice(32)}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CH 3 — CHAIN (upgraded)
// ═══════════════════════════════════════════════════════════════════════════════
function ChainChapter({ chain, onUpdate, onComplete }: {
  chain: Block[]; onUpdate: (c: Block[]) => void; onComplete: () => void
}) {
  const [edits,           setEdits]           = useState<Record<number,string>>({})
  const [valid,           setValid]           = useState<boolean|null>(null)
  const [checking,        setChecking]        = useState(false)
  const [selected,        setSelected]        = useState<number|null>(null)
  const [highlightBroken, setHighlightBroken] = useState<number[]>([])

  const edited    = (i: number) => edits[i] !== undefined && edits[i] !== chain[i]?.data
  const anyEdited = chain.some((_, i) => edited(i))
  const isBroken  = (i: number) => highlightBroken.includes(i)

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
    if (!v) {
      const broken: number[] = []
      for (let i = 1; i < testChain.length; i++) {
        if (testChain[i].previousHash !== testChain[i-1].hash) broken.push(i)
        if (edited(i-1)) broken.push(i)
      }
      setHighlightBroken([...new Set(broken)])
    } else {
      setHighlightBroken([])
    }
    setChecking(false)
    onComplete()
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={{ background:"rgba(74,222,128,0.04)", border:"1px solid rgba(74,222,128,0.15)" }}>
        <p className="text-[12px] text-gray-400 leading-relaxed">
          Each block stores a <span className="text-emerald-400 font-bold">fingerprint (hash)</span> of the block before it.
          Edit any block's data below, then click <span className="text-white font-bold">Check Chain</span> — watch the cascade break everything after it.
        </p>
      </div>
      {chain.length < 3 && (
        <div className="rounded-2xl p-4 text-center" style={{ background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.2)" }}>
          <p className="text-[12px] text-amber-400">Mine at least 2 more blocks in Chapter 2 to see the chain effect properly.</p>
        </div>
      )}
      <div className="overflow-x-auto pb-3" style={{ scrollbarWidth:"thin", scrollbarColor:"rgba(255,255,255,0.1) transparent" }}>
        <div className="flex items-stretch gap-0 min-w-max px-1">
          {chain.map((block, i) => {
            const isEdited = edited(i), isBrokenBlock = isBroken(i), isSelected = selected === i
            const borderColor = isBrokenBlock ? "rgba(239,68,68,0.6)" : isEdited ? "rgba(251,191,36,0.5)" : isSelected ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.07)"
            const bg = isBrokenBlock ? "rgba(239,68,68,0.06)" : isEdited ? "rgba(251,191,36,0.04)" : "rgba(255,255,255,0.025)"
            return (
              <div key={block.index} className="flex items-center">
                <div className="w-[185px] rounded-2xl p-4 cursor-pointer transition-all duration-300"
                  style={{ background:bg, border:`1.5px solid ${borderColor}`, boxShadow: isBrokenBlock ? "0 0 24px rgba(239,68,68,0.15)" : isEdited ? "0 0 20px rgba(251,191,36,0.1)" : "none" }}
                  onClick={() => setSelected(selected===i ? null : i)}>
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
                    <span className="text-[9px] font-black text-gray-600 uppercase">#{block.index}</span>
                    <div className="flex gap-1 flex-wrap">
                      {i === 0 && <span className="text-[7px] font-black text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded-full">GENESIS</span>}
                      {i === chain.length-1 && i>0 && <span className="text-[7px] font-black text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded-full">LATEST</span>}
                      {isEdited && <span className="text-[7px] font-black text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded-full">CHANGED</span>}
                      {isBrokenBlock && <span className="text-[7px] font-black text-red-400 bg-red-500/10 px-1 py-0.5 rounded-full">BROKEN</span>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[8px] text-gray-700 mb-1">Data — edit to tamper</p>
                      <input value={edits[i] !== undefined ? edits[i] : block.data}
                        onChange={e => { setEdits(p=>({...p,[i]:e.target.value})); setValid(null); setHighlightBroken([]) }}
                        onClick={e => e.stopPropagation()}
                        className="w-full px-2 py-1.5 rounded-lg text-[11px] text-white font-mono outline-none"
                        style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${isEdited?"rgba(251,191,36,0.4)":"rgba(255,255,255,0.08)"}` }}/>
                    </div>
                    <div>
                      <p className="text-[8px] text-gray-700 mb-0.5">Hash</p>
                      <p className="font-mono text-[9px] truncate" style={{ color: isEdited||isBrokenBlock ? "#f87171" : "#374151" }}>{block.hash.slice(0,26)}…</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-gray-700 mb-0.5">Prev Hash</p>
                      <p className="font-mono text-[9px] truncate text-gray-700">{block.previousHash.slice(0,26)}…</p>
                    </div>
                  </div>
                </div>
                {i < chain.length - 1 && (
                  <div className="flex flex-col items-center px-0.5 shrink-0 gap-0.5">
                    <p className="text-[7px] text-gray-800 font-mono">prev</p>
                    <div className="flex items-center">
                      <div className="h-px w-4" style={{ background: isBroken(i+1)||isEdited ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)" }}/>
                      <div className="w-0 h-0" style={{ borderTop:"3px solid transparent", borderBottom:"3px solid transparent", borderLeft:`5px solid ${isBroken(i+1)||isEdited ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"}` }}/>
                    </div>
                    <p className="text-[7px] text-gray-800 font-mono">hash</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      {!anyEdited && <p className="text-center text-[12px] text-gray-600 italic">Click on any block and edit its Data field</p>}
      <button onClick={check} disabled={checking || chain.length < 2}
        className="w-full py-3.5 rounded-2xl text-[14px] font-black text-white disabled:opacity-50"
        style={{ background:"linear-gradient(135deg,#059669,#047857)", boxShadow:"0 0 24px rgba(5,150,105,0.3)" }}>
        {checking ? "Checking…" : "Check Chain Validity"}
      </button>
      {valid !== null && (
        <div className="rounded-2xl p-5 cv-pop" style={{ background: valid ? "rgba(74,222,128,0.06)" : "rgba(239,68,68,0.06)", border:`1.5px solid ${valid ? "rgba(74,222,128,0.35)" : "rgba(239,68,68,0.35)"}`, boxShadow: valid ? "0 0 32px rgba(74,222,128,0.08)" : "0 0 32px rgba(239,68,68,0.08)" }}>
          <div className="flex items-start gap-3">
            <span className="text-3xl">{valid ? "✅" : "💥"}</span>
            <div>
              <p className="text-[15px] font-black mb-1.5" style={{ color: valid ? "#4ade80" : "#f87171" }}>
                {valid ? "Chain is valid — all blocks check out!" : `Chain broken! ${highlightBroken.length} block${highlightBroken.length>1?"s":""} affected.`}
              </p>
              <p className="text-[12px] text-gray-400 leading-relaxed">
                {valid ? "Every block's fingerprint matches. The chain is unbroken." : "You changed data in a block — its hash changed, breaking the link to every block after it. This cascading failure is exactly why blockchain is tamper-proof."}
              </p>
              {!valid && highlightBroken.length > 0 && (
                <p className="text-[11px] text-red-400 mt-2 font-mono">Broken at block{highlightBroken.length>1?"s":""}: #{highlightBroken.join(", #")}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CH 4 — WALLET (upgraded)
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
  const [showPub,   setShowPub]   = useState(false)
  const [showPriv,  setShowPriv]  = useState(false)

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
    setSigning(true); setVerified(null)
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
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🔓</span>
            <p className="text-[13px] font-black text-white">Public Key</p>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">Like your bank account number — share it freely. Others use it to send you coins and verify your signatures.</p>
          <p className="text-[10px] font-bold text-emerald-400 mt-2">✓ Safe to share</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.2)" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🔒</span>
            <p className="text-[13px] font-black text-white">Private Key</p>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">Like your PIN — never share it. Used to sign transactions, proving they came from you. Lose it = lose everything.</p>
          <p className="text-[10px] font-bold text-red-400 mt-2">✗ Never share</p>
        </div>
      </div>

      {/* Step 1: Create wallet */}
      <div className="rounded-2xl p-5" style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background:"rgba(167,139,250,0.2)", color:"#a78bfa", border:"1px solid rgba(167,139,250,0.4)" }}>1</div>
          <p className="text-[13px] font-bold text-white">Create your wallet</p>
        </div>
        <div className="flex gap-2 mb-3">
          <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleCreate()}
            placeholder="Your name (e.g. Alice, Bob…)"
            className="flex-1 px-4 py-2.5 rounded-xl text-[13px] text-white placeholder-gray-700 outline-none"
            style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)" }}/>
          <button onClick={handleCreate} disabled={making||!name.trim()}
            className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50"
            style={{ background:"linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow:"0 0 16px rgba(124,58,237,0.3)" }}>
            {making ? "…" : "Create"}
          </button>
        </div>
        {wallets.length > 0 && (
          <div className="space-y-2">
            {wallets.map(w => (
              <div key={w.address} onClick={() => { setSelected(w); setSignature(""); setVerified(null) }}
                className="rounded-xl p-3 cursor-pointer transition-all"
                style={{ background: selected?.address===w.address ? "rgba(167,139,250,0.08)" : "rgba(255,255,255,0.03)", border:`1px solid ${selected?.address===w.address ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.06)"}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                    style={{ background:"rgba(167,139,250,0.12)", border:"1px solid rgba(167,139,250,0.25)" }}>
                    {w.label.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-white">{w.label}</p>
                    <p className="font-mono text-[9px] text-gray-600 truncate">{w.address}</p>
                  </div>
                  <span className="text-[13px] font-black text-amber-400 shrink-0">🪙 {w.balance}</span>
                </div>
                {selected?.address===w.address && (
                  <div className="mt-3 pt-3 space-y-2" style={{ borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[9px] text-gray-700 uppercase tracking-widest">Public Key (P-256)</p>
                        <button onClick={e=>{e.stopPropagation();setShowPub(p=>!p)}} className="text-[9px] text-gray-600 hover:text-gray-400">
                          {showPub?"hide":"show"}
                        </button>
                      </div>
                      <p className="font-mono text-[9px] text-gray-500 break-all leading-relaxed">
                        {showPub ? w.publicKey : w.publicKey.slice(0,32)+"…"}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[9px] text-red-800 uppercase tracking-widest">Private Key (SECRET)</p>
                        <button onClick={e=>{e.stopPropagation();setShowPriv(p=>!p)}} className="text-[9px] text-red-800 hover:text-red-600">
                          {showPriv?"hide":"reveal"}
                        </button>
                      </div>
                      <p className="font-mono text-[9px] text-red-900 break-all">
                        {showPriv ? w.privateKey : "••••••••••••••••••••••••••••••••••••••••••••••••"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Sign */}
      {selected && (
        <div className="rounded-2xl p-5 cv-pop" style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background:"rgba(167,139,250,0.2)", color:"#a78bfa", border:"1px solid rgba(167,139,250,0.4)" }}>2</div>
            <p className="text-[13px] font-bold text-white">Sign a message as <span style={{ color:"#a78bfa" }}>{selected.label}</span></p>
          </div>
          <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={2}
            className="w-full px-4 py-2.5 rounded-xl text-[13px] text-white outline-none resize-none font-mono mb-3"
            style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)" }}/>
          <button onClick={handleSign} disabled={signing}
            className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50 mb-3"
            style={{ background:"linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow:"0 0 16px rgba(124,58,237,0.3)" }}>
            {signing ? "Signing with private key…" : `Sign with ${selected.label}'s private key`}
          </button>
          {signature && (
            <div className="rounded-xl p-3 mb-4" style={{ background:"rgba(167,139,250,0.06)", border:"1px solid rgba(167,139,250,0.2)" }}>
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Signature (ECDSA)</p>
                <span className="text-emerald-400 text-xs">✓ Generated</span>
              </div>
              <p className="font-mono text-[9px] text-gray-500 break-all leading-relaxed">{signature.slice(0,96)}…</p>
              <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">
                This 96-byte signature is mathematically tied to both the <span className="text-white">message</span> AND <span className="text-purple-400">{selected.label}'s private key</span>. Change either and it breaks.
              </p>
            </div>
          )}

          {/* Step 3: Verify */}
          {signature && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background:"rgba(96,165,250,0.2)", color:"#60a5fa", border:"1px solid rgba(96,165,250,0.4)" }}>3</div>
                <p className="text-[13px] font-bold text-white">Verify — or try to tamper!</p>
              </div>
              <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">Change even one word below — verification will fail because the signature no longer matches.</p>
              <textarea value={verifyMsg} onChange={e=>{ setVerifyMsg(e.target.value); setVerified(null) }} rows={2}
                className="w-full px-4 py-2.5 rounded-xl text-[13px] text-white outline-none resize-none font-mono mb-2"
                style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${verifyMsg!==message?"rgba(239,68,68,0.4)":"rgba(255,255,255,0.1)"}` }}/>
              {verifyMsg !== message && <p className="text-[10px] text-red-400 mb-2">Message changed — verification will fail</p>}
              <button onClick={handleVerify}
                className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white mb-2"
                style={{ background:"linear-gradient(135deg,#0369a1,#075985)" }}>
                Verify Signature
              </button>
              {verified !== null && (
                <div className="rounded-xl p-3 cv-pop" style={{ background: verified?"rgba(74,222,128,0.06)":"rgba(239,68,68,0.06)", border:`1px solid ${verified?"rgba(74,222,128,0.3)":"rgba(239,68,68,0.3)"}` }}>
                  <p className="text-[13px] font-bold" style={{ color:verified?"#4ade80":"#f87171" }}>
                    {verified ? `Valid! Confirmed this message was signed by ${selected.label}.` : `Invalid! The message was tampered — signature doesn't match.`}
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
// CH 7 — CONSENSUS (fully animated)
// ═══════════════════════════════════════════════════════════════════════════════
function ConsensusChapter({ onComplete }: { onComplete: () => void }) {
  const [powRunning,  setPowRunning]  = useState(false)
  const [posRunning,  setPosRunning]  = useState(false)
  const [powProgress, setPowProgress] = useState(0)
  const [posProgress, setPosProgress] = useState(0)
  const [powWinner,   setPowWinner]   = useState<string|null>(null)
  const [posWinner,   setPosWinner]   = useState<string|null>(null)
  const [powRounds,   setPowRounds]   = useState(0)
  const [posRounds,   setPosRounds]   = useState(0)
  const [powTally,    setPowTally]    = useState<Record<string,number>>({})
  const [posTally,    setPosTally]    = useState<Record<string,number>>({})
  const [activeNode,  setActiveNode]  = useState<string|null>(null)

  const MINERS = [
    { name:"Miner A", hashRate:45, color:"#f59e0b", icon:"⛏" },
    { name:"Miner B", hashRate:30, color:"#f87171", icon:"⛏" },
    { name:"Miner C", hashRate:25, color:"#a78bfa", icon:"⛏" },
  ]
  const VALIDATORS = [
    { name:"Alice",  stake:40, color:"#60a5fa", icon:"💰" },
    { name:"Bob",    stake:25, color:"#4ade80", icon:"💰" },
    { name:"Carol",  stake:20, color:"#f472b6", icon:"💰" },
    { name:"Dave",   stake:15, color:"#fbbf24", icon:"💰" },
  ]

  const pickByWeight = (items: {name:string,color:string}[], weights: number[]) => {
    const rand = Math.random() * 100
    let cum = 0
    for (let i = 0; i < items.length; i++) {
      cum += weights[i]
      if (rand < cum) return items[i]
    }
    return items[0]
  }

  const runPoW = async () => {
    if (powRunning) return
    setPowRunning(true); setPowWinner(null); setPowProgress(0)
    for (let i = 0; i <= 100; i += 3) {
      await new Promise(r => setTimeout(r, 35))
      setPowProgress(i)
      if (i % 15 === 0) setActiveNode(MINERS[Math.floor(Math.random()*MINERS.length)].name)
    }
    const winner = pickByWeight(MINERS, MINERS.map(m=>m.hashRate))
    setPowWinner(winner.name)
    setPowRounds(r => r+1)
    setPowTally(t => ({ ...t, [winner.name]: (t[winner.name]??0)+1 }))
    setActiveNode(null)
    onComplete()
    setPowRunning(false)
  }

  const runPoS = async () => {
    if (posRunning) return
    setPosRunning(true); setPosWinner(null); setPosProgress(0)
    for (let i = 0; i <= 100; i += 8) {
      await new Promise(r => setTimeout(r, 18))
      setPosProgress(i)
    }
    const winner = pickByWeight(VALIDATORS, VALIDATORS.map(v=>v.stake))
    setPosWinner(winner.name)
    setPosRounds(r => r+1)
    setPosTally(t => ({ ...t, [winner.name]: (t[winner.name]??0)+1 }))
    onComplete()
    setPosRunning(false)
  }

  return (
    <div className="space-y-5">
      {/* Context */}
      <div className="rounded-2xl p-4" style={{ background:"rgba(34,211,238,0.05)", border:"1px solid rgba(34,211,238,0.15)" }}>
        <p className="text-[13px] text-cyan-200 leading-relaxed">
          🤔 <strong>The Problem:</strong> If thousands of computers all have a copy of the blockchain, how do they agree on which new block to add? Without a central authority, they need a <strong>consensus mechanism</strong> — a set of rules everyone follows.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PoW Panel */}
        <div className="rounded-2xl overflow-hidden" style={{ border:"1px solid rgba(245,158,11,0.25)" }}>
          <div className="px-5 py-3" style={{ background:"rgba(245,158,11,0.08)", borderBottom:"1px solid rgba(245,158,11,0.15)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-black text-white">⛏ Proof of Work</p>
                <p className="text-[10px] text-amber-400 uppercase tracking-widest">Bitcoin · Litecoin</p>
              </div>
              {powRounds > 0 && <span className="text-[10px] text-gray-600">{powRounds} round{powRounds>1?"s":""}</span>}
            </div>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-[12px] text-gray-400 leading-relaxed">
              Miners race to solve a SHA-256 puzzle. More computing power = better chance of winning. Winner gets the block reward.
            </p>

            {/* Hash rate bars */}
            <div className="space-y-2">
              {MINERS.map(m => {
                const wins = powTally[m.name] ?? 0
                const isActive = activeNode === m.name && powRunning
                return (
                  <div key={m.name}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-gray-300 flex items-center gap-1.5">
                        {isActive && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background:m.color }}/>}
                        {m.name}
                        {powWinner===m.name && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background:`${m.color}20`, color:m.color }}>WINNER</span>}
                      </span>
                      <span style={{ color:m.color }}>{m.hashRate}% hash · {wins} win{wins!==1?"s":""}</span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden relative" style={{ background:"rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width:`${powRunning ? (isActive ? m.hashRate + Math.random()*10 : m.hashRate) : m.hashRate}%`, background:m.color, opacity: powWinner && powWinner!==m.name ? 0.3 : 1 }}/>
                    </div>
                  </div>
                )
              })}
            </div>

            {powRunning && (
              <div>
                <div className="flex justify-between text-[10px] text-gray-700 mb-1">
                  <span>Mining in progress…</span><span>{powProgress}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all duration-100"
                    style={{ width:`${powProgress}%`, background:"linear-gradient(90deg,#d97706,#f59e0b)" }}/>
                </div>
              </div>
            )}

            {powWinner && !powRunning && (
              <div className="rounded-xl p-3 cv-pop" style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)" }}>
                <p className="text-[12px] font-black text-amber-400">⛏ {powWinner} mined the block!</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Won by computational power — luck + hash rate</p>
              </div>
            )}

            <button onClick={runPoW} disabled={powRunning}
              className="w-full py-2.5 rounded-xl text-[12px] font-bold text-white disabled:opacity-50"
              style={{ background:"linear-gradient(135deg,#d97706,#b45309)" }}>
              {powRunning ? "Mining…" : powRounds===0 ? "Simulate Mining Round" : "Run Again"}
            </button>
          </div>
        </div>

        {/* PoS Panel */}
        <div className="rounded-2xl overflow-hidden" style={{ border:"1px solid rgba(96,165,250,0.25)" }}>
          <div className="px-5 py-3" style={{ background:"rgba(96,165,250,0.08)", borderBottom:"1px solid rgba(96,165,250,0.15)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-black text-white">🪙 Proof of Stake</p>
                <p className="text-[10px] text-blue-400 uppercase tracking-widest">Ethereum · Cardano</p>
              </div>
              {posRounds > 0 && <span className="text-[10px] text-gray-600">{posRounds} round{posRounds>1?"s":""}</span>}
            </div>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-[12px] text-gray-400 leading-relaxed">
              Validators lock up coins as collateral. More coins staked = better chance to propose the next block. Uses 99% less energy than PoW.
            </p>

            {/* Stake bars */}
            <div className="space-y-2">
              {VALIDATORS.map(v => {
                const wins = posTally[v.name] ?? 0
                return (
                  <div key={v.name}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-gray-300 flex items-center gap-1.5">
                        {v.name}
                        {posWinner===v.name && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background:`${v.color}20`, color:v.color }}>SELECTED</span>}
                      </span>
                      <span style={{ color:v.color }}>{v.stake}% stake · {wins} win{wins!==1?"s":""}</span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width:`${v.stake}%`, background:v.color, opacity: posWinner && posWinner!==v.name ? 0.25 : 1 }}/>
                    </div>
                  </div>
                )
              })}
            </div>

            {posRunning && (
              <div>
                <div className="flex justify-between text-[10px] text-gray-700 mb-1">
                  <span>Selecting validator…</span><span>{posProgress}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all duration-100"
                    style={{ width:`${posProgress}%`, background:"linear-gradient(90deg,#1d4ed8,#60a5fa)" }}/>
                </div>
              </div>
            )}

            {posWinner && !posRunning && (
              <div className="rounded-xl p-3 cv-pop" style={{ background:"rgba(96,165,250,0.08)", border:"1px solid rgba(96,165,250,0.25)" }}>
                <p className="text-[12px] font-black text-blue-400">🗳 {posWinner} selected as validator!</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Won by stake weight — no mining needed</p>
              </div>
            )}

            <button onClick={runPoS} disabled={posRunning}
              className="w-full py-2.5 rounded-xl text-[12px] font-bold text-white disabled:opacity-50"
              style={{ background:"linear-gradient(135deg,#1d4ed8,#1e40af)" }}>
              {posRunning ? "Selecting…" : posRounds===0 ? "Simulate Validator Selection" : "Run Again"}
            </button>
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="rounded-2xl overflow-hidden" style={{ border:"1px solid rgba(255,255,255,0.07)" }}>
        <div className="px-5 py-3" style={{ background:"rgba(255,255,255,0.03)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[12px] font-bold text-white">PoW vs PoS — At a Glance</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <th className="px-4 py-2.5 text-left text-[9px] text-gray-600 uppercase tracking-widest font-semibold">Property</th>
                <th className="px-4 py-2.5 text-left text-[9px] text-amber-600 uppercase tracking-widest font-semibold">Proof of Work</th>
                <th className="px-4 py-2.5 text-left text-[9px] text-blue-600 uppercase tracking-widest font-semibold">Proof of Stake</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["How you win",   "Most computation",           "Most staked coins"],
                ["Energy use",    "Very High (150 TWh/yr)",     "Very Low (~0.01 TWh/yr)"],
                ["Hardware",      "ASICs / GPUs",               "Any computer"],
                ["Attack cost",   "51% of hash rate",           "51% of all staked coins"],
                ["Block time",    "~10 min (Bitcoin)",          "~12 sec (Ethereum)"],
                ["Examples",      "Bitcoin, Litecoin",          "Ethereum, Cardano, Solana"],
              ].map(([prop,pow,pos],i) => (
                <tr key={prop} style={{ borderBottom:i<5?"1px solid rgba(255,255,255,0.04)":"none" }}>
                  <td className="px-4 py-2.5 text-gray-500 font-semibold">{prop}</td>
                  <td className="px-4 py-2.5 text-amber-300/80">{pow}</td>
                  <td className="px-4 py-2.5 text-blue-300/80">{pos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-round insight */}
      {(powRounds > 2 || posRounds > 2) && (
        <div className="rounded-2xl p-4 cv-pop" style={{ background:"rgba(34,211,238,0.05)", border:"1px solid rgba(34,211,238,0.15)" }}>
          <p className="text-[12px] font-bold text-cyan-400 mb-1">💡 Notice something?</p>
          <p className="text-[12px] text-gray-400 leading-relaxed">
            After many rounds, the miner/validator with the most hashrate/stake wins most often — but not always. The randomness prevents any single player from winning every block. This is intentional — it keeps the network decentralized.
          </p>
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
          You've built a real blockchain, mined blocks with SHA-256, created wallets with real ECDSA signatures, sent transactions through a mempool, deployed your own token, and learned how PoW vs PoS consensus works. That's more than most developers ever learn.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { icon:"🔢", label:"Hashing"      },
            { icon:"⛏",  label:"Mining"       },
            { icon:"🔗", label:"Chain"         },
            { icon:"🔑", label:"Wallets"       },
            { icon:"💸", label:"Transactions"  },
            { icon:"🪙", label:"Tokens"        },
            { icon:"🌐", label:"Consensus"     },
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