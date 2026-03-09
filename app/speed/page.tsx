"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/lib/AuthContext"
import { useGame } from "@/lib/GameContext"
import AuthModal from "@/components/AuthModal"

// ── Puzzle Pool ───────────────────────────────────────────────────────────────
const SPEED_PUZZLES = [
  { cipher:"Caesar",   plaintext:"HELLO",      ciphertext:"KHOOR",      hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"WORLD",      ciphertext:"ZRUOG",      hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"SECRET",     ciphertext:"FRPERG",     hint:"Shift 13" },
  { cipher:"Caesar",   plaintext:"ATTACK",     ciphertext:"DWWDFN",     hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"DEFEND",     ciphertext:"GHIHQG",     hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"CIPHER",     ciphertext:"FLSKHU",     hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"CRYPTO",     ciphertext:"FUBSWR",     hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"PYTHON",     ciphertext:"SBWKRQ",     hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"MATRIX",     ciphertext:"PDWULA",     hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"ENIGMA",     ciphertext:"HQLJPD",     hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"SHIELD",     ciphertext:"VKHLOG",     hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"DECODE",     ciphertext:"GHFRGH",     hint:"Shift 3"  },
  { cipher:"ROT13",    plaintext:"HELLO",      ciphertext:"URYYB",      hint:"ROT13"    },
  { cipher:"ROT13",    plaintext:"WORLD",      ciphertext:"JBEYQ",      hint:"ROT13"    },
  { cipher:"ROT13",    plaintext:"SECRET",     ciphertext:"FRPERG",     hint:"ROT13"    },
  { cipher:"ROT13",    plaintext:"PYTHON",     ciphertext:"CLGUBA",     hint:"ROT13"    },
  { cipher:"Atbash",   plaintext:"HELLO",      ciphertext:"SVOOL",      hint:"Reverse A↔Z" },
  { cipher:"Atbash",   plaintext:"WORLD",      ciphertext:"DLIOW",      hint:"Reverse A↔Z" },
  { cipher:"Atbash",   plaintext:"CRYPTO",     ciphertext:"XIBKGL",     hint:"Reverse A↔Z" },
  { cipher:"Atbash",   plaintext:"MATRIX",     ciphertext:"NZGIRK",     hint:"Reverse A↔Z" },
  { cipher:"Caesar",   plaintext:"FIRE",       ciphertext:"ILUH",       hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"WATER",      ciphertext:"ZDWHU",      hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"EARTH",      ciphertext:"HDUWK",      hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"STORM",      ciphertext:"VWRUP",      hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"NIGHT",      ciphertext:"QLJKW",      hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"LIGHT",      ciphertext:"OLJKW",      hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"POWER",      ciphertext:"SRZHU",      hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"FORCE",      ciphertext:"IRUFH",      hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"BLADE",      ciphertext:"EODGH",      hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"GHOST",      ciphertext:"JKRVW",      hint:"Shift 3"  },
  { cipher:"ROT13",    plaintext:"CIPHER",     ciphertext:"PVCURE",     hint:"ROT13"    },
  { cipher:"ROT13",    plaintext:"ENIGMA",     ciphertext:"RAVTZN",     hint:"ROT13"    },
  { cipher:"Atbash",   plaintext:"ALPHA",      ciphertext:"ZOKSC",      hint:"Reverse A↔Z" },
  { cipher:"Atbash",   plaintext:"OMEGA",      ciphertext:"LNVTZ",      hint:"Reverse A↔Z" },
  { cipher:"Caesar",   plaintext:"SYSTEM",     ciphertext:"VBVWHP",     hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"SIGNAL",     ciphertext:"VLJQDO",     hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"AGENT",      ciphertext:"DJHQW",      hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"VAULT",      ciphertext:"YDXOW",      hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"TOWER",      ciphertext:"WRZOHU",     hint:"Shift 3"  },
  { cipher:"Caesar",   plaintext:"OMEGA",      ciphertext:"RPHJD",      hint:"Shift 3"  },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const DURATION = 60

// ── High scores ───────────────────────────────────────────────────────────────
interface HighScore { username: string; solved: number; date: string }
function loadHighScores(): HighScore[] {
  try { return JSON.parse(localStorage.getItem("cv_speed_hs") ?? "[]") } catch { return [] }
}
function saveHighScore(entry: HighScore) {
  const list = loadHighScores()
  list.push(entry)
  list.sort((a, b) => b.solved - a.solved)
  localStorage.setItem("cv_speed_hs", JSON.stringify(list.slice(0, 10)))
}

// ── Streak bonus ──────────────────────────────────────────────────────────────
function getStreakKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}
function getStreak(): number {
  try { return Number(localStorage.getItem("cv_speed_streak") ?? "0") } catch { return 0 }
}
function updateStreak() {
  const today = getStreakKey()
  const last  = localStorage.getItem("cv_speed_last") ?? ""
  const d     = new Date(); d.setDate(d.getDate() - 1)
  const yesterday = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  const streak = last === yesterday ? getStreak() + 1 : last === today ? getStreak() : 1
  localStorage.setItem("cv_speed_streak", String(streak))
  localStorage.setItem("cv_speed_last", today)
  return streak
}

type Phase = "idle" | "playing" | "done"

export default function SpeedRoundPage() {
  const { user, profile } = useAuth()
  const { setGameActive, requestLeave } = useGame()
  const [showAuth, setShowAuth] = useState(false)
  const [phase,    setPhase]    = useState<Phase>("idle")
  const [puzzles,  setPuzzles]  = useState(shuffle(SPEED_PUZZLES))
  const [idx,      setIdx]      = useState(0)
  const [answer,   setAnswer]   = useState("")
  const [solved,   setSolved]   = useState(0)
  const [skipped,  setSkipped]  = useState(0)
  const [wrong,    setWrong]    = useState(false)
  const [shake,    setShake]    = useState(false)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [showHint, setShowHint] = useState(false)
  const [hintsUsed,setHintsUsed]= useState(0)
  const [streak,   setStreak]   = useState(0)
  const [highScores,setHighScores]=useState<HighScore[]>([])
  const inputRef  = useRef<HTMLInputElement>(null)
  const timerRef  = useRef<NodeJS.Timeout>()

  useEffect(() => {
    setHighScores(loadHighScores())
  }, [])

  const endGame = useCallback((finalSolved: number) => {
    clearInterval(timerRef.current)
    setPhase("done")
    setGameActive(false)
    const s = updateStreak()
    setStreak(s)
    if (user || profile) {
      saveHighScore({
        username: profile?.username ?? "Anonymous",
        solved:   finalSolved,
        date:     new Date().toLocaleDateString(),
      })
      setHighScores(loadHighScores())
    }
  }, [user, profile])

  const startGame = () => {
    if (!user) { setShowAuth(true); return }
    const p = shuffle(SPEED_PUZZLES)
    setPuzzles(p); setIdx(0); setAnswer(""); setSolved(0)
    setSkipped(0); setTimeLeft(DURATION); setShowHint(false); setHintsUsed(0)
    setPhase("playing")
    setGameActive(true, "Speed Round")
    let t = DURATION
    timerRef.current = setInterval(() => {
      t--
      setTimeLeft(t)
      if (t <= 0) endGame(solved)
    }, 1000)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // Always reset game lock when this page unmounts
  useEffect(() => {
    return () => {
      setGameActive(false)
      clearInterval(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Block browser tab close/refresh during game
  useEffect(() => {
    if (phase !== "playing") return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [phase])

  const nextPuzzle = useCallback((didSolve: boolean) => {
    setSolved(s => {
      const next = didSolve ? s + 1 : s
      if (idx + 1 >= puzzles.length) { endGame(next); return next }
      return next
    })
    setIdx(i => i + 1)
    setAnswer(""); setShowHint(false); setWrong(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [idx, puzzles.length, endGame])

  const handleSubmit = () => {
    const p = puzzles[idx]
    if (!p) return
    if (answer.trim().toUpperCase() === p.plaintext.toUpperCase()) {
      nextPuzzle(true)
    } else {
      setWrong(true); setShake(true)
      setTimeout(() => { setWrong(false); setShake(false) }, 500)
    }
  }

  const handleSkip = () => { setSkipped(s => s + 1); nextPuzzle(false) }
  const handleHint = () => { setShowHint(true); setHintsUsed(h => h + 1) }

  const timerColor = timeLeft > 20 ? "#10b981" : timeLeft > 10 ? "#f59e0b" : "#ef4444"
  const timerPct   = (timeLeft / DURATION) * 100
  const p          = puzzles[idx]
  const bonusPoints = solved * 50 + (hintsUsed === 0 ? 100 : 0)

  // ── Idle ─────────────────────────────────────────────────────────────────────
  if (phase === "idle") return (
    <div className="p-8 max-w-3xl mx-auto">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} defaultTab="login" />}

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-xl font-semibold text-white tracking-tight">Speed Round</h1>
          <span className="text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border-red-500/20">
            ⚡ 60 Seconds
          </span>
        </div>
        <p className="text-[13px] text-gray-500">Decrypt as many ciphers as possible before time runs out. Every second counts.</p>
      </div>

      {/* Rules */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { icon:"⚡", label:"60 seconds", sub:"Total time" },
          { icon:"🎯", label:"+50 pts",    sub:"Per solve"  },
          { icon:"💡", label:"−10 pts",    sub:"Per hint"   },
          { icon:"🔥", label:"+100 pts",   sub:"No hints bonus" },
        ].map(({ icon, label, sub }) => (
          <div key={label} className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <p className="text-[13px] font-bold text-white">{label}</p>
            <p className="text-[11px] text-gray-600">{sub}</p>
          </div>
        ))}
      </div>

      {/* High scores */}
      {highScores.length > 0 && (
        <div className="bg-gray-900/60 border border-gray-800/60 rounded-2xl p-5 mb-6">
          <p className="text-[12px] font-semibold text-white mb-3">🏆 Top Scores</p>
          <div className="space-y-2">
            {highScores.slice(0, 5).map((hs, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-gray-600 w-5">#{i + 1}</span>
                  <span className="text-[13px] text-white">{hs.username}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-bold text-emerald-400">{hs.solved} solved</span>
                  <span className="text-[10px] text-gray-600">{hs.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={startGame}
        className="w-full py-4 rounded-2xl font-bold text-[15px] tracking-wide transition-all duration-200 flex items-center justify-center gap-2"
        style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)", color: "#fff", boxShadow: "0 0 30px rgba(220,38,38,0.3)" }}>
        ⚡ Start Speed Round
      </button>
    </div>
  )

  // ── Playing ───────────────────────────────────────────────────────────────────
  if (phase === "playing" && p) return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Timer bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-mono text-gray-500">SOLVED</span>
            <span className="text-[18px] font-black text-emerald-400">{solved}</span>
            <span className="text-[12px] font-mono text-gray-700">SKIPPED {skipped}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: timerColor }} />
              <span className="font-mono text-[20px] font-black" style={{ color: timerColor }}>{timeLeft}s</span>
            </div>
            <button onClick={() => {
              requestLeave().then((confirmed) => {
                if (confirmed) {
                  clearInterval(timerRef.current)
                  setGameActive(false)
                  setPhase("idle")
                  setSolved(0); setSkipped(0); setIdx(0); setAnswer("")
                }
              })
            }} className="text-[11px] font-mono text-gray-700 hover:text-red-400 transition-colors border border-gray-800 hover:border-red-500/30 rounded-lg px-2 py-1">
              ✕ Quit
            </button>
          </div>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${timerPct}%`, background: timerColor, boxShadow: `0 0 8px ${timerColor}` }} />
        </div>
      </div>

      {/* Puzzle card */}
      <div className="bg-gray-900/80 border border-gray-800/60 rounded-2xl p-6 mb-4"
        style={{ animation: shake ? "cv-shake 0.4s ease" : undefined }}>
        <style>{`@keyframes cv-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}`}</style>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border-blue-500/20">
            {p.cipher}
          </span>
          <span className="text-[10px] font-mono text-gray-600">Puzzle {idx + 1} of {puzzles.length}</span>
        </div>

        <p className="text-[11px] font-mono text-gray-600 uppercase tracking-widest mb-2">Decrypt this</p>
        <p className="text-[28px] sm:text-[32px] font-black font-mono tracking-wider mb-4"
          style={{ color: wrong ? "#ef4444" : "#f8fafc" }}>
          {p.ciphertext}
        </p>

        {showHint && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mb-3">
            <span className="text-amber-400 text-[12px]">💡 {p.hint}</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2 mb-3">
        <input
          ref={inputRef}
          value={answer}
          onChange={e => setAnswer(e.target.value.toUpperCase())}
          onKeyDown={e => { if (e.key === "Enter") handleSubmit() }}
          placeholder="Type plaintext..."
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 font-mono text-[15px] text-white placeholder-gray-700 outline-none focus:border-blue-500/60"
          style={{ borderColor: wrong ? "rgba(239,68,68,0.5)" : undefined }}
          autoFocus
        />
        <button onClick={handleSubmit}
          className="px-5 py-3 rounded-xl font-bold text-[13px] bg-blue-600 hover:bg-blue-500 text-white transition-colors">
          ✓
        </button>
      </div>

      <div className="flex gap-2">
        {!showHint && (
          <button onClick={handleHint}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold border border-amber-500/20 text-amber-400 hover:bg-amber-500/10 transition-colors">
            💡 Hint (−10 pts)
          </button>
        )}
        <button onClick={handleSkip}
          className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white transition-colors">
          Skip →
        </button>
      </div>
    </div>
  )

  // ── Done ──────────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">{solved >= 15 ? "🏆" : solved >= 8 ? "⚡" : solved >= 3 ? "🎯" : "💪"}</div>
        <h2 className="text-2xl font-black text-white mb-1">
          {solved >= 15 ? "Legendary!" : solved >= 8 ? "Blazing Fast!" : solved >= 3 ? "Nice Work!" : "Keep Practicing!"}
        </h2>
        <p className="text-gray-500 text-[13px]">Time's up — here's how you did</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label:"Solved",  value: solved,      color:"text-emerald-400" },
          { label:"Skipped", value: skipped,     color:"text-amber-400"   },
          { label:"Points",  value: bonusPoints, color:"text-blue-400"    },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900/60 border border-gray-800/60 rounded-2xl p-4 text-center">
            <p className={`text-[28px] font-black ${color}`}>{value}</p>
            <p className="text-[11px] text-gray-600 uppercase tracking-widest">{label}</p>
          </div>
        ))}
      </div>

      {streak > 1 && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-[13px] font-bold text-orange-400">{streak}-Day Streak!</p>
            <p className="text-[11px] text-gray-600">Keep playing daily to extend your streak</p>
          </div>
        </div>
      )}

      {/* Updated high scores */}
      {highScores.length > 0 && (
        <div className="bg-gray-900/60 border border-gray-800/60 rounded-2xl p-5 mb-6">
          <p className="text-[12px] font-semibold text-white mb-3">🏆 Leaderboard</p>
          <div className="space-y-2">
            {highScores.slice(0, 5).map((hs, i) => (
              <div key={i} className={`flex items-center justify-between rounded-xl px-3 py-2 ${hs.username === profile?.username && hs.solved === solved ? "bg-blue-500/10 border border-blue-500/20" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-gray-600 w-5">#{i + 1}</span>
                  <span className="text-[13px] text-white">{hs.username}</span>
                </div>
                <span className="text-[12px] font-bold text-emerald-400">{hs.solved} solved</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={startGame}
        className="w-full py-3.5 rounded-2xl font-bold text-[14px] bg-red-600 hover:bg-red-500 text-white transition-colors">
        ⚡ Play Again
      </button>
    </div>
  )
}