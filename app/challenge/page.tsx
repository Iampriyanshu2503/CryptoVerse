"use client"

import { useState, useEffect, useRef, useCallback } from "react"

// ── Puzzle Data ────────────────────────────────────────────────────────────────
interface Puzzle {
  id: string
  cipher: string
  plaintext: string
  ciphertext: string
  hint1: string
  hint2: string
  hint3: string
  difficulty: "Easy" | "Medium" | "Hard"
  keyInfo: string
}

const PUZZLES: Puzzle[] = [
  // Easy
  {
    id: "e1", cipher: "Caesar", difficulty: "Easy",
    plaintext:  "HELLO WORLD",
    ciphertext: "KHOOR ZRUOG",
    hint1: "This cipher shifts each letter by the same amount.",
    hint2: "The shift value is between 1 and 5.",
    hint3: "Shift = 3. K→H, H→E, L→L, L→I, O→O",
    keyInfo: "Shift: 3",
  },
  {
    id: "e2", cipher: "Caesar", difficulty: "Easy",
    plaintext:  "CRYPTOGRAPHY",
    ciphertext: "FUBSWRJUDSKB",
    hint1: "Caesar cipher — each letter is shifted by a fixed amount.",
    hint2: "Try brute forcing all 26 shifts.",
    hint3: "Shift = 3. F→C, U→R, B→Y...",
    keyInfo: "Shift: 3",
  },
  {
    id: "e3", cipher: "Caesar", difficulty: "Easy",
    plaintext:  "THE QUICK BROWN FOX",
    ciphertext: "QEB NRFZH YOLTK CLU",
    hint1: "Caesar cipher with an unusual shift direction.",
    hint2: "The shift wraps around the alphabet.",
    hint3: "Shift = 23 (or -3). Q→T, E→H, B→E...",
    keyInfo: "Shift: 23",
  },
  // Medium
  {
    id: "m1", cipher: "Vigenère", difficulty: "Medium",
    plaintext:  "ATTACK AT DAWN",
    ciphertext: "LXFOPV EF RNHR",
    hint1: "This cipher uses a repeating keyword, not a fixed shift.",
    hint2: "The keyword is a common English word with 5 letters.",
    hint3: "Key = LEMON. A+L=L, T+E=X, T+M=F...",
    keyInfo: "Key: LEMON",
  },
  {
    id: "m2", cipher: "Vigenère", difficulty: "Medium",
    plaintext:  "SEND REINFORCEMENTS",
    ciphertext: "AMLX KOBVAXKMOXBAP",
    hint1: "Vigenère cipher — each letter uses a different shift from a key.",
    hint2: "The key repeats. Count the letter frequencies.",
    hint3: "Key = HAL. S+H=A, E+A=F, N+L=Z...",
    keyInfo: "Key: HAL",
  },
  {
    id: "m3", cipher: "Rail Fence", difficulty: "Medium",
    plaintext:  "WE ARE DISCOVERED FLEE AT ONCE",
    ciphertext: "WECRLTEERDSOEEFEAABORADICVNE",
    hint1: "This cipher rearranges letters in a pattern, not substitution.",
    hint2: "Imagine writing the text in a zigzag across rows.",
    hint3: "3 rails. Read each rail top to bottom.",
    keyInfo: "Rails: 3",
  },
  // Hard
  {
    id: "h1", cipher: "Playfair", difficulty: "Hard",
    plaintext:  "HIDE THE GOLD",
    ciphertext: "BMNDZBXDKYBEJV",
    hint1: "This cipher encrypts pairs of letters using a 5×5 grid.",
    hint2: "The keyword fills the grid first, then remaining letters follow.",
    hint3: "Key = PLAYFAIR. Each digraph follows row/col/box rules.",
    keyInfo: "Key: PLAYFAIR",
  },
  {
    id: "h2", cipher: "Vigenère", difficulty: "Hard",
    plaintext:  "RENDEZVOUS AT MIDNIGHT",
    ciphertext: "LIVSTQCWI LD QSMHRMKOD",
    hint1: "Polyalphabetic substitution with a long keyword.",
    hint2: "The key length is 7 characters.",
    hint3: "Key = CRYPTOS. Index of Coincidence ≈ 0.065",
    keyInfo: "Key: CRYPTOS",
  },
  {
    id: "h3", cipher: "Monoalphabetic", difficulty: "Hard",
    plaintext:  "THE ENEMY ADVANCES AT DAWN",
    ciphertext: "XYZ ZQZBS CFCQJKZP CX FCIQ",
    hint1: "Each letter maps to exactly one other letter — but the mapping is scrambled.",
    hint2: "Frequency analysis helps. E is the most common letter in English.",
    hint3: "Substitution: A→C, B→F, C→J... Z→X",
    keyInfo: "Key: CFJAKLBZQPWYRXIMNHDEVGTOUS",
  },
]

const DIFF_COLORS = {
  Easy:   { badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400", ring: "ring-emerald-500/30" },
  Medium: { badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",       dot: "bg-amber-400",   ring: "ring-amber-500/30"   },
  Hard:   { badge: "bg-red-500/10 text-red-400 border-red-500/20",             dot: "bg-red-400",     ring: "ring-red-500/30"     },
}

const CIPHER_COLORS: Record<string, string> = {
  Caesar:         "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Vigenère:       "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Playfair:       "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Rail Fence":   "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  Monoalphabetic: "bg-pink-500/10 text-pink-400 border-pink-500/20",
}

// Score calculation
function calcScore(difficulty: string, timeSeconds: number, hintsUsed: number): number {
  const base = difficulty === "Easy" ? 100 : difficulty === "Medium" ? 250 : 500
  const timePenalty = Math.min(timeSeconds * 0.5, base * 0.5)
  const hintPenalty = hintsUsed * (difficulty === "Easy" ? 10 : difficulty === "Medium" ? 25 : 50)
  return Math.max(10, Math.round(base - timePenalty - hintPenalty))
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}m ${sec.toString().padStart(2,"0")}s` : `${sec}s`
}

// ── Leaderboard Storage ────────────────────────────────────────────────────────
interface LeaderEntry { name: string; score: number; time: number; puzzle: string; difficulty: string; date: string }

function loadLeaderboard(): LeaderEntry[] {
  try {
    if (typeof window === "undefined") return []
    return JSON.parse(localStorage.getItem("cv_leaderboard") ?? "[]")
  } catch { return [] }
}

function saveLeaderboard(entries: LeaderEntry[]) {
  try { localStorage.setItem("cv_leaderboard", JSON.stringify(entries.slice(0, 20))) } catch {}
}

// ── Timer Hook ────────────────────────────────────────────────────────────────
function useTimer(active: boolean) {
  const [seconds, setSeconds] = useState(0)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (active) {
      ref.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } else {
      clearInterval(ref.current!)
    }
    return () => clearInterval(ref.current!)
  }, [active])

  const reset = () => setSeconds(0)
  return { seconds, reset }
}

// ── Main Page ─────────────────────────────────────────────────────────────────
type Screen = "select" | "playing" | "solved" | "leaderboard"

export default function ChallengePage() {
  const [screen, setScreen]         = useState<Screen>("select")
  const [puzzle, setPuzzle]         = useState<Puzzle | null>(null)
  const [attempt, setAttempt]       = useState("")
  const [hintsRevealed, setHintsRevealed] = useState(0)
  const [wrong, setWrong]           = useState(false)
  const [score, setScore]           = useState(0)
  const [playerName, setPlayerName] = useState("")
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([])
  const [diffFilter, setDiffFilter] = useState<"All" | "Easy" | "Medium" | "Hard">("All")
  const [shake, setShake]           = useState(false)
  const [solved, setSolved]         = useState<Set<string>>(new Set())

  const timerActive = screen === "playing"
  const { seconds, reset: resetTimer } = useTimer(timerActive)

  useEffect(() => { setLeaderboard(loadLeaderboard()) }, [])

  const startPuzzle = (p: Puzzle) => {
    setPuzzle(p); setAttempt(""); setHintsRevealed(0)
    setWrong(false); resetTimer(); setScreen("playing")
  }

  const checkAnswer = () => {
    if (!puzzle) return
    const clean = (s: string) => s.toUpperCase().replace(/\s+/g, " ").trim()
    if (clean(attempt) === clean(puzzle.plaintext)) {
      const s = calcScore(puzzle.difficulty, seconds, hintsRevealed)
      setScore(s)
      setSolved(prev => new Set([...prev, puzzle.id]))
      setScreen("solved")
    } else {
      setWrong(true); setShake(true)
      setTimeout(() => { setWrong(false); setShake(false) }, 600)
    }
  }

  const submitScore = () => {
    if (!puzzle || !playerName.trim()) return
    const entry: LeaderEntry = {
      name: playerName.trim(), score, time: seconds,
      puzzle: `${puzzle.cipher} — ${puzzle.difficulty}`,
      difficulty: puzzle.difficulty,
      date: new Date().toLocaleDateString(),
    }
    const updated = [...leaderboard, entry].sort((a, b) => b.score - a.score)
    setLeaderboard(updated)
    saveLeaderboard(updated)
    setScreen("leaderboard")
  }

  const hints = puzzle ? [puzzle.hint1, puzzle.hint2, puzzle.hint3] : []
  const filtered = diffFilter === "All" ? PUZZLES : PUZZLES.filter(p => p.difficulty === diffFilter)

  // ── Select Screen ────────────────────────────────────────────────────────────
  if (screen === "select") return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-7 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold text-white tracking-tight">Cipher Challenge</h1>
            <span className="text-[10px] font-semibold uppercase tracking-widest border px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border-violet-500/20">
              Puzzle Mode
            </span>
          </div>
          <p className="text-[13px] text-gray-500">Decrypt the ciphertext using your knowledge of cryptographic algorithms. Use hints if you're stuck.</p>
        </div>
        <button onClick={() => setScreen("leaderboard")}
          className="flex items-center gap-2 border border-gray-700/60 text-gray-400 hover:text-white hover:border-gray-500 px-4 py-1.5 rounded-lg text-[12px] transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5 4.5 4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
          Leaderboard
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        {[
          { label: "Total Puzzles", value: PUZZLES.length.toString() },
          { label: "Solved",        value: solved.size.toString(), color: "text-emerald-400" },
          { label: "Remaining",     value: (PUZZLES.length - solved.size).toString() },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${color ?? "text-white"}`}>{value}</p>
            <p className="text-[11px] text-gray-600 uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Difficulty filter */}
      <div className="flex gap-1.5 mb-5">
        {(["All","Easy","Medium","Hard"] as const).map(d => (
          <button key={d} onClick={() => setDiffFilter(d)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${
              diffFilter === d ? "bg-white text-black border-white" : "bg-gray-900/40 border-gray-800/60 text-gray-500 hover:text-gray-300"
            }`}>{d}</button>
        ))}
      </div>

      {/* Puzzle grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((p) => {
          const dc = DIFF_COLORS[p.difficulty]
          const isSolved = solved.has(p.id)
          return (
            <button key={p.id} onClick={() => startPuzzle(p)}
              className={`group text-left bg-[#0d0d0d] border rounded-xl p-5 transition-all duration-200 hover:border-gray-600 relative overflow-hidden ${
                isSolved ? "border-emerald-700/40" : "border-gray-800/60"
              }`}>
              {isSolved && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <span className="text-emerald-400 text-[11px]">✓</span>
                </div>
              )}
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full ${dc.badge}`}>
                  {p.difficulty}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full ${CIPHER_COLORS[p.cipher] ?? ""}`}>
                  {p.cipher}
                </span>
              </div>
              <p className="text-[13px] font-mono text-gray-300 mb-2 tracking-wider">{p.ciphertext}</p>
              <p className="text-[11px] text-gray-600">
                {p.plaintext.length} characters · {p.cipher} cipher
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-600 group-hover:text-gray-400 transition-colors">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M1.5 5.5h8m0 0L6 2m3.5 3.5L6 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Attempt challenge
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )

  // ── Playing Screen ────────────────────────────────────────────────────────────
  if (screen === "playing" && puzzle) {
    const dc = DIFF_COLORS[puzzle.difficulty]
    return (
      <div className="p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setScreen("select")}
            className="flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-gray-300 transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M9.5 6H2.5m0 0L6 2.5M2.5 6L6 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to puzzles
          </button>
          <div className="flex items-center gap-3">
            {/* Timer */}
            <div className="flex items-center gap-1.5 bg-gray-900/60 border border-gray-800/60 rounded-lg px-3 py-1.5">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="text-gray-500">
                <circle cx="5.5" cy="6" r="4" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M5.5 3.5V1.5M4 1.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M5.5 6V4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <span className="text-[12px] font-mono text-white">{formatTime(seconds)}</span>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full ${dc.badge}`}>
              {puzzle.difficulty}
            </span>
          </div>
        </div>

        {/* Cipher badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full ${CIPHER_COLORS[puzzle.cipher] ?? ""}`}>
            {puzzle.cipher}
          </span>
          <span className="text-[11px] text-gray-600">{puzzle.keyInfo}</span>
        </div>

        {/* Ciphertext */}
        <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-5 mb-6">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Ciphertext to Decrypt</p>
          <p className="text-2xl font-mono text-white tracking-widest leading-relaxed">{puzzle.ciphertext}</p>
          <p className="text-[11px] text-gray-600 mt-2">{puzzle.plaintext.replace(/[^ ]/g, "·")} ({puzzle.plaintext.replace(/ /g, "").length} letters)</p>
        </div>

        {/* Answer input */}
        <div className="mb-5">
          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Your Answer</label>
          <div className={`flex gap-2 transition-all ${shake ? "animate-bounce" : ""}`}>
            <input
              value={attempt}
              onChange={(e) => setAttempt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && checkAnswer()}
              placeholder="Type the decrypted plaintext..."
              className={`flex-1 bg-gray-900/60 border rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-gray-700 focus:outline-none transition-colors ${
                wrong ? "border-red-500/60 bg-red-900/10" : "border-gray-800 focus:border-gray-600"
              }`}
            />
            <button onClick={checkAnswer}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[13px] font-semibold transition-colors">
              Check
            </button>
          </div>
          {wrong && <p className="text-red-400 text-[12px] mt-1.5">✗ Incorrect — try again or use a hint</p>}
        </div>

        {/* Hints */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] text-gray-600 uppercase tracking-wider">Hints</p>
            <p className="text-[10px] text-gray-700">{hintsRevealed}/3 used · -{hintsRevealed * (puzzle.difficulty === "Easy" ? 10 : puzzle.difficulty === "Medium" ? 25 : 50)} pts</p>
          </div>
          {hints.map((hint, i) => {
            const revealed = i < hintsRevealed
            return (
              <div key={i} className={`border rounded-xl p-3 transition-all ${revealed ? "bg-amber-900/10 border-amber-700/30" : "bg-gray-900/30 border-gray-800/30"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">Hint {i + 1}</span>
                  {!revealed && (
                    <button onClick={() => setHintsRevealed(i + 1)}
                      className="text-[11px] text-gray-500 hover:text-amber-400 transition-colors">
                      Reveal (−{puzzle.difficulty === "Easy" ? 10 : puzzle.difficulty === "Medium" ? 25 : 50} pts)
                    </button>
                  )}
                </div>
                {revealed && <p className="text-[12px] text-gray-300 mt-1 leading-relaxed">{hint}</p>}
              </div>
            )
          })}
        </div>

        {/* Score preview */}
        <div className="mt-5 bg-gray-900/40 border border-gray-800/40 rounded-xl p-3 flex items-center justify-between">
          <span className="text-[11px] text-gray-600">Current score if solved now</span>
          <span className="text-[14px] font-bold text-white">{calcScore(puzzle.difficulty, seconds, hintsRevealed)} pts</span>
        </div>
      </div>
    )
  }

  // ── Solved Screen ─────────────────────────────────────────────────────────────
  if (screen === "solved" && puzzle) {
    const dc = DIFF_COLORS[puzzle.difficulty]
    return (
      <div className="p-8 max-w-2xl mx-auto">
        {/* Celebration */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-4 text-3xl">
            🔓
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Decrypted!</h2>
          <p className="text-[13px] text-gray-500">You cracked the {puzzle.cipher} cipher</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Score",       value: `${score}`,              color: "text-emerald-400" },
            { label: "Time",        value: formatTime(seconds),     color: "text-blue-400"    },
            { label: "Hints Used",  value: `${hintsRevealed}/3`,    color: hintsRevealed === 0 ? "text-emerald-400" : "text-amber-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4 text-center">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Answer reveal */}
        <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl p-4 mb-6">
          <p className="text-[10px] text-emerald-600 uppercase tracking-widest mb-1">Plaintext</p>
          <p className="text-lg font-mono font-bold text-emerald-400">{puzzle.plaintext}</p>
          <p className="text-[11px] text-gray-600 mt-1">{puzzle.keyInfo}</p>
        </div>

        {/* Submit to leaderboard */}
        <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4 mb-4">
          <p className="text-[12px] font-semibold text-white mb-3">Submit to Leaderboard</p>
          <div className="flex gap-2">
            <input value={playerName} onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitScore()}
              placeholder="Enter your name..."
              className="flex-1 bg-gray-900/60 border border-gray-800 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-gray-700 focus:outline-none focus:border-gray-600" />
            <button onClick={submitScore} disabled={!playerName.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-5 py-2 rounded-lg text-[12px] font-semibold transition-colors">
              Submit
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setScreen("select")}
            className="flex-1 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 py-2 rounded-xl text-[13px] font-medium transition-colors">
            More Puzzles
          </button>
          <button onClick={() => setScreen("leaderboard")}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-xl text-[13px] font-medium transition-colors">
            View Leaderboard
          </button>
        </div>
      </div>
    )
  }

  // ── Leaderboard Screen ────────────────────────────────────────────────────────
  if (screen === "leaderboard") return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight mb-0.5">Leaderboard</h1>
          <p className="text-[13px] text-gray-500">Top scores across all cipher challenges.</p>
        </div>
        <button onClick={() => setScreen("select")}
          className="flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-gray-300 transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M9.5 6H2.5m0 0L6 2.5M2.5 6L6 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to puzzles
        </button>
      </div>

      {leaderboard.length === 0 ? (
        <div className="text-center py-20 border border-gray-800/40 rounded-2xl">
          <p className="text-4xl mb-3">🏆</p>
          <p className="text-[14px] text-gray-500">No scores yet. Solve a puzzle to get on the board!</p>
          <button onClick={() => setScreen("select")}
            className="mt-4 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[13px] font-medium transition-colors">
            Start a Challenge
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[40px_1fr_100px_80px_80px_80px] gap-3 px-4 py-2">
            {["#", "Player", "Puzzle", "Score", "Time", "Date"].map(h => (
              <p key={h} className="text-[10px] text-gray-600 uppercase tracking-wider">{h}</p>
            ))}
          </div>

          {leaderboard.map((entry, i) => {
            const dc = DIFF_COLORS[entry.difficulty as keyof typeof DIFF_COLORS] ?? DIFF_COLORS.Easy
            return (
              <div key={i}
                className={`grid grid-cols-[40px_1fr_100px_80px_80px_80px] gap-3 items-center px-4 py-3 rounded-xl border transition-all ${
                  i === 0 ? "bg-amber-900/10 border-amber-700/20" :
                  i === 1 ? "bg-gray-400/5 border-gray-600/20" :
                  i === 2 ? "bg-orange-900/10 border-orange-700/20" :
                  "bg-gray-900/30 border-gray-800/30"
                }`}>
                <span className={`text-[13px] font-bold ${i === 0 ? "text-amber-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-gray-600"}`}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}
                </span>
                <span className="text-[13px] font-semibold text-white truncate">{entry.name}</span>
                <span className="text-[11px] text-gray-500 font-mono truncate">{entry.puzzle}</span>
                <span className="text-[13px] font-bold text-emerald-400">{entry.score}</span>
                <span className="text-[12px] font-mono text-blue-400">{formatTime(entry.time)}</span>
                <span className="text-[11px] text-gray-600">{entry.date}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  return null
}