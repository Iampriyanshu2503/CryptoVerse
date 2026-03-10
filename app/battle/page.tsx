"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/lib/AuthContext"
import AuthModal from "@/components/AuthModal"
import { addCoins, getCoins, getOwned } from "@/lib/inventory"
import { checkAndUnlock, buildStats } from "@/lib/achievements"
import { triggerAchievementToast } from "@/components/AchievementToast"

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
  // ── Easy: Caesar ──────────────────────────────────────────────────────────
  { id:"e1", cipher:"Caesar", difficulty:"Easy",
    plaintext:"HELLO WORLD", ciphertext:"KHOOR ZRUOG", keyInfo:"Shift: 3",
    hint1:"This cipher shifts each letter by the same fixed amount.",
    hint2:"The shift value is between 1 and 5.",
    hint3:"Shift = 3. K→H, H→E, L→L, L→I, O→O" },
  { id:"e2", cipher:"Caesar", difficulty:"Easy",
    plaintext:"CRYPTOGRAPHY", ciphertext:"FUBSWRJUDSKB", keyInfo:"Shift: 3",
    hint1:"Caesar cipher — each letter shifted by a fixed amount.",
    hint2:"Try brute forcing all 26 shifts.",
    hint3:"Shift = 3. F→C, U→R, B→Y..." },
  { id:"e3", cipher:"Caesar", difficulty:"Easy",
    plaintext:"THE QUICK BROWN FOX", ciphertext:"QEB NRFZH YOLTK CLU", keyInfo:"Shift: 23",
    hint1:"Caesar cipher with an unusual shift direction.",
    hint2:"The shift wraps around — try shift 23 or -3.",
    hint3:"Shift = 23 (or -3). Q→T, E→H, B→E..." },
  { id:"e4", cipher:"Caesar", difficulty:"Easy",
    plaintext:"KEEP IT SECRET", ciphertext:"OIIT MX WIGVIX", keyInfo:"Shift: 4",
    hint1:"Single-digit shift.", hint2:"Shift between 3–6.",
    hint3:"Shift = 4. O→K, I→E, I→E..." },
  { id:"e5", cipher:"Caesar", difficulty:"Easy",
    plaintext:"SPY GAME", ciphertext:"URA ICOG", keyInfo:"Shift: 2",
    hint1:"Very small shift.", hint2:"Shift < 3.",
    hint3:"Shift = 2. U→S, R→P, A→Y..." },
  { id:"e6", cipher:"Caesar", difficulty:"Easy",
    plaintext:"FIND THE KEY", ciphertext:"LOTJ ZNK QKE", keyInfo:"Shift: 6",
    hint1:"Caesar cipher.", hint2:"Shift < 8.",
    hint3:"Shift = 6. L→F, O→I, T→N..." },
  { id:"e7", cipher:"Caesar", difficulty:"Easy",
    plaintext:"NEVER GIVE UP", ciphertext:"ARIRE TVIR HC", keyInfo:"Shift: 13",
    hint1:"ROT-13 is a special case of Caesar.", hint2:"Shift = 13.",
    hint3:"Self-inverse: apply ROT13 again to decode." },
  { id:"e8", cipher:"ROT13", difficulty:"Easy",
    plaintext:"SECRET MESSAGE", ciphertext:"FRPERG ZRFFNTR", keyInfo:"Shift: 13",
    hint1:"ROT13 cipher.", hint2:"Each letter shifts by exactly 13.",
    hint3:"Apply ROT13 again to decode — it's self-inverse." },
  { id:"e9", cipher:"Caesar", difficulty:"Easy",
    plaintext:"CODE BREAKER", ciphertext:"HTIJ GWTFPJW", keyInfo:"Shift: 5",
    hint1:"Caesar cipher.", hint2:"Single digit shift.",
    hint3:"Shift = 5. H→C, T→O, I→D..." },
  { id:"e10", cipher:"Caesar", difficulty:"Easy",
    plaintext:"MEET ME AT NOON", ciphertext:"NFFU NF BU OPPO", keyInfo:"Shift: 1",
    hint1:"Smallest possible shift.", hint2:"Shift = 1.",
    hint3:"N→M, F→E, U→T..." },

  // ── Easy: Rail Fence ──────────────────────────────────────────────────────
  { id:"e11", cipher:"Rail Fence", difficulty:"Easy",
    plaintext:"HELLO WORLD", ciphertext:"HLOOLELWRD", keyInfo:"Rails: 2",
    hint1:"Letters are rearranged in a zigzag pattern, not substituted.",
    hint2:"2 rails — alternate letters go on each rail.",
    hint3:"Top rail: H,L,O,W,R,D — Bottom rail: E,L,O,L. Read top then bottom." },
  { id:"e12", cipher:"Rail Fence", difficulty:"Easy",
    plaintext:"STRIKE FIRST", ciphertext:"SIEFRTRKITS", keyInfo:"Rails: 2",
    hint1:"2-rail zigzag.", hint2:"Odd-positioned letters on top, even on bottom.",
    hint3:"Read top rail then bottom rail." },

  // ── Medium: Vigenère ─────────────────────────────────────────────────────
  { id:"m1", cipher:"Vigenère", difficulty:"Medium",
    plaintext:"ATTACK AT DAWN", ciphertext:"LXFOPV EF RNHR", keyInfo:"Key: LEMON",
    hint1:"This cipher uses a repeating keyword, not a fixed shift.",
    hint2:"The keyword is a common fruit with 5 letters.",
    hint3:"Key = LEMON. A+L=L, T+E=X, T+M=F..." },
  { id:"m2", cipher:"Vigenère", difficulty:"Medium",
    plaintext:"SEND REINFORCEMENTS", ciphertext:"AMLX KOBVAXKMOXBAP", keyInfo:"Key: HAL",
    hint1:"Vigenère — each letter uses a different shift from a repeating key.",
    hint2:"Short 3-letter key.",
    hint3:"Key = HAL. S+H=A, E+A=F, N+L=Z..." },
  { id:"m3", cipher:"Vigenère", difficulty:"Medium",
    plaintext:"HIDE AND SEEK", ciphertext:"JMLG CPF UGGM", keyInfo:"Key: CAT",
    hint1:"Short repeating keyword.", hint2:"3-letter animal keyword.",
    hint3:"Key = CAT. H+C=J, I+A=J, D+T=W..." },
  { id:"m4", cipher:"Vigenère", difficulty:"Medium",
    plaintext:"WINTER IS COMING", ciphertext:"XMPXIW MW GOQQVO", keyInfo:"Key: BEAM",
    hint1:"4-letter keyword.", hint2:"Repeating key.",
    hint3:"Key = BEAM. W+B=X, I+E=M, N+A=N..." },
  { id:"m5", cipher:"Vigenère", difficulty:"Medium",
    plaintext:"HOWL AT THE MOON", ciphertext:"DCKW WT XPM ACFF", keyInfo:"Key: WOLF",
    hint1:"4-letter keyword.", hint2:"Animal-themed key.",
    hint3:"Key = WOLF. H+W=D, O+O=C, W+L=H..." },
  { id:"m6", cipher:"Vigenère", difficulty:"Medium",
    plaintext:"DARK SIDE", ciphertext:"PORY WMLM", keyInfo:"Key: MOON",
    hint1:"4-letter celestial keyword.", hint2:"Key = MOON.",
    hint3:"D+M=P, A+O=O, R+O=F..." },
  { id:"m7", cipher:"Vigenère", difficulty:"Medium",
    plaintext:"BURN IT DOWN", ciphertext:"GZIP WX HVAP", keyInfo:"Key: FIRE",
    hint1:"4-letter element keyword.", hint2:"Key = FIRE.",
    hint3:"B+F=G, U+I=C, R+R=I..." },

  // ── Medium: Rail Fence ───────────────────────────────────────────────────
  { id:"m8", cipher:"Rail Fence", difficulty:"Medium",
    plaintext:"WE ARE DISCOVERED FLEE AT ONCE", ciphertext:"WECRLTEERDSOEEFEAABORADICVNE", keyInfo:"Rails: 3",
    hint1:"This cipher rearranges letters in a zigzag pattern.",
    hint2:"Imagine writing the text diagonally across 3 rows.",
    hint3:"3 rails. Read each rail top to bottom." },
  { id:"m9", cipher:"Rail Fence", difficulty:"Medium",
    plaintext:"THE QUICK BROWN FOX", ciphertext:"TCWNHUKRWOFEOIBX", keyInfo:"Rails: 3",
    hint1:"Rail fence with 3 rails.", hint2:"Classic pangram — all letters used.",
    hint3:"Read rail 1, then rail 2, then rail 3." },
  { id:"m10", cipher:"Rail Fence", difficulty:"Medium",
    plaintext:"MEET AT MIDNIGHT", ciphertext:"MAMTMDETETIIGH", keyInfo:"Rails: 4",
    hint1:"4-rail zigzag.", hint2:"More rails = wider zigzag pattern.",
    hint3:"Read each of the 4 rails left to right, top to bottom." },

  // ── Medium: Caesar (harder shifts) ──────────────────────────────────────
  { id:"m11", cipher:"Caesar", difficulty:"Medium",
    plaintext:"DEFEND THE CASTLE", ciphertext:"WXOXWM MAX VTLMAX", keyInfo:"Shift: 19",
    hint1:"Large shift value.", hint2:"Shift > 15.",
    hint3:"Shift = 19. W→D, X→E, O→D..." },
  { id:"m12", cipher:"Caesar", difficulty:"Medium",
    plaintext:"TRUST NO ONE", ciphertext:"OMJNO IJ JIZ", keyInfo:"Shift: 21",
    hint1:"Shift near end of alphabet.", hint2:"Shift > 18.",
    hint3:"Shift = 21. O→T, M→R, J→O..." },
  { id:"m13", cipher:"Caesar", difficulty:"Medium",
    plaintext:"SOUND THE ALARM", ciphertext:"JLFEU KYV RCRIT", keyInfo:"Shift: 17",
    hint1:"Caesar cipher.", hint2:"Shift > 14.",
    hint3:"Shift = 17. J→S, L→O, F→U..." },
  { id:"m14", cipher:"Caesar", difficulty:"Medium",
    plaintext:"LOCK AND KEY", ciphertext:"ADLT PCR ZTN", keyInfo:"Shift: 15",
    hint1:"Medium shift.", hint2:"Shift > 12.",
    hint3:"Shift = 15. A→L, D→O, L→A..." },

  // ── Hard: Playfair ───────────────────────────────────────────────────────
  { id:"h1", cipher:"Playfair", difficulty:"Hard",
    plaintext:"HIDE THE GOLD", ciphertext:"BMNDZBXDKYBEJV", keyInfo:"Key: PLAYFAIR",
    hint1:"This cipher encrypts pairs of letters using a 5×5 grid.",
    hint2:"The keyword fills the grid first, remaining letters follow.",
    hint3:"Key = PLAYFAIR. Each digraph follows row/col/box rules." },
  { id:"h2", cipher:"Playfair", difficulty:"Hard",
    plaintext:"BALLOON", ciphertext:"IBSUPMNA", keyInfo:"Key: MONARCHY",
    hint1:"5×5 Playfair grid.", hint2:"Double letters are split with X.",
    hint3:"Key = MONARCHY. BA·LX·LO·ON after padding." },
  { id:"h3", cipher:"Playfair", difficulty:"Hard",
    plaintext:"MEET ME LATER", ciphertext:"OIQZOQNIKOB", keyInfo:"Key: SECRET",
    hint1:"Digraph substitution cipher.", hint2:"I and J share a cell in the grid.",
    hint3:"Key = SECRET. ME·ET·ME·LA·TE·R as digraphs." },

  // ── Hard: Vigenère ───────────────────────────────────────────────────────
  { id:"h4", cipher:"Vigenère", difficulty:"Hard",
    plaintext:"RENDEZVOUS AT MIDNIGHT", ciphertext:"LIVSTQCWI LD QSMHRMKOD", keyInfo:"Key: CRYPTOS",
    hint1:"Polyalphabetic substitution with a long keyword.",
    hint2:"The key length is 7 characters.",
    hint3:"Key = CRYPTOS. Index of Coincidence ≈ 0.065" },
  { id:"h5", cipher:"Vigenère", difficulty:"Hard",
    plaintext:"HACK THE SYSTEM", ciphertext:"WOCZ FVM HLFXMZ", keyInfo:"Key: PYTHON",
    hint1:"6-letter keyword.", hint2:"Programming language keyword.",
    hint3:"Key = PYTHON. H+P=W, A+Y=Z, C+T=V..." },
  { id:"h6", cipher:"Vigenère", difficulty:"Hard",
    plaintext:"EXECUTE ORDER NOW", ciphertext:"JXIYWXI SHEIV RBD", keyInfo:"Key: FALCON",
    hint1:"6-letter keyword.", hint2:"Bird of prey keyword.",
    hint3:"Key = FALCON. E+F=J, X+A=X, E+L=P..." },
  { id:"h7", cipher:"Vigenère", difficulty:"Hard",
    plaintext:"STORM THE FORTRESS", ciphertext:"HWGVQ XLM JSKLVIWW", keyInfo:"Key: BLAZE",
    hint1:"5-letter keyword.", hint2:"Fire-themed key.",
    hint3:"Key = BLAZE. S+B=T, T+L=E, O+A=O..." },
  { id:"h8", cipher:"Vigenère", difficulty:"Hard",
    plaintext:"VANISH INTO THIN AIR", ciphertext:"BCFZLN ZHBH ALHU AZF", keyInfo:"Key: GHOST",
    hint1:"5-letter keyword.", hint2:"Spooky themed key.",
    hint3:"Key = GHOST. V+G=B, A+H=I, N+O=A..." },
  { id:"h9", cipher:"Vigenère", difficulty:"Hard",
    plaintext:"FOLLOW THE WHITE RABBIT", ciphertext:"RZYBZD XPM DBGXM VEHZAL", keyInfo:"Key: MATRIX",
    hint1:"6-letter keyword.", hint2:"Famous sci-fi movie keyword.",
    hint3:"Key = MATRIX. F+M=R, O+A=O, L+T=E..." },

  // ── Hard: Monoalphabetic ─────────────────────────────────────────────────
  { id:"h10", cipher:"Monoalphabetic", difficulty:"Hard",
    plaintext:"THE ENEMY ADVANCES AT DAWN", ciphertext:"XYZ ZQZBS CFCQJKZP CX FCIQ", keyInfo:"Key: Custom",
    hint1:"Each letter maps to exactly one other — the mapping is scrambled.",
    hint2:"Use frequency analysis. E is the most common English letter.",
    hint3:"Substitution: A→C, B→F, C→J... Z→X" },
  { id:"h11", cipher:"Monoalphabetic", difficulty:"Hard",
    plaintext:"HELLO WORLD", ciphertext:"SVOOL DLIOW", keyInfo:"Atbash",
    hint1:"Mirror substitution cipher.", hint2:"A maps to Z, B to Y, etc.",
    hint3:"Atbash: reverse alphabet. S→H, V→E, O→L..." },
  { id:"h12", cipher:"Monoalphabetic", difficulty:"Hard",
    plaintext:"CRYPTOGRAPHY", ciphertext:"XIBKGLTIZKSB", keyInfo:"Atbash",
    hint1:"Each letter is mirrored in the alphabet.", hint2:"A↔Z, B↔Y, C↔X...",
    hint3:"Atbash cipher — apply it again to decode." },
  { id:"h13", cipher:"Monoalphabetic", difficulty:"Hard",
    plaintext:"VICTORY IS OURS", ciphertext:"LKZQMHY KA MTHA", keyInfo:"Key: DRAGON",
    hint1:"Keyword-based substitution.", hint2:"Keyword starts with a mythical creature.",
    hint3:"Key = DRAGON. D fills position A, R fills B, A fills C..." },
  { id:"h14", cipher:"Monoalphabetic", difficulty:"Hard",
    plaintext:"THE DARK KNIGHT", ciphertext:"GSV WZIP PMRTSG", keyInfo:"Atbash",
    hint1:"Mirror substitution.", hint2:"A↔Z B↔Y C↔X — reverse alphabet.",
    hint3:"Atbash cipher — decode by applying the same cipher again." },
  { id:"h15", cipher:"Monoalphabetic", difficulty:"Hard",
    plaintext:"BREAK THE ENIGMA", ciphertext:"BSAWK TZW WLCPNK", keyInfo:"Key: CIPHER",
    hint1:"Keyword substitution cipher.", hint2:"Keyword is a cryptography term.",
    hint3:"Key = CIPHER. C→A, I→B, P→C, H→D, E→E, R→F..." },

  // ── Hard: Affine ─────────────────────────────────────────────────────────
  { id:"h16", cipher:"Affine", difficulty:"Hard",
    plaintext:"AFFINE CIPHER", ciphertext:"IHHWVC SWFRCP", keyInfo:"a=5, b=8",
    hint1:"Formula: E(x) = (ax + b) mod 26", hint2:"a and b are the two keys.",
    hint3:"a=5, b=8. A→I, F→H, F→H, I→W, N→V, E→C..." },
  { id:"h17", cipher:"Affine", difficulty:"Hard",
    plaintext:"MATHEMATICS", ciphertext:"DXQITDXQTLJ", keyInfo:"a=7, b=3",
    hint1:"Affine cipher: E(x) = (ax+b) mod 26.", hint2:"a must be coprime with 26.",
    hint3:"a=7, b=3. M→D, A→X, T→Q..." },

  // ── Hard: Columnar Transposition ─────────────────────────────────────────
  { id:"h18", cipher:"Columnar", difficulty:"Hard",
    plaintext:"ATTACK AT DAWN", ciphertext:"TAAADAKCTWTN", keyInfo:"Key: ZEBRA (5 cols)",
    hint1:"Transposition cipher — letters are rearranged, not substituted.",
    hint2:"5 columns, reordered alphabetically by key letters.",
    hint3:"Key = ZEBRA → column order 5,2,1,4,3. Read columns in that order." },
  { id:"h19", cipher:"Columnar", difficulty:"Hard",
    plaintext:"MEET ME TOMORROW", ciphertext:"EEMOTEMTMROO WR", keyInfo:"Key: CAT (3 cols)",
    hint1:"Columnar transposition — text filled into rows, read by columns.",
    hint2:"3 columns used.", hint3:"Key = CAT, column order 1-3-2." },

  // ── Hard: Beaufort ───────────────────────────────────────────────────────
  { id:"h20", cipher:"Beaufort", difficulty:"Hard",
    plaintext:"OPEN FIRE", ciphertext:"NDVE HBZS", keyInfo:"Key: NAVY",
    hint1:"Similar to Vigenère but uses subtraction instead of addition.",
    hint2:"Formula: E(x) = (key - plain) mod 26",
    hint3:"Key = NAVY. O→N using N-O mod26..." },
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
  ROT13:          "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Affine:         "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Beaufort:       "bg-teal-500/10 text-teal-400 border-teal-500/20",
  Columnar:       "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
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
  const { user } = useAuth()
  const [showAuth, setShowAuth]     = useState(false)
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
    if (!user) { setShowAuth(true); return }
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
      // Award coins + achievements
      try {
        const bonus = puzzle.difficulty === "Hard" ? 30 : puzzle.difficulty === "Medium" ? 15 : 5
        addCoins(bonus)

        const solved = Number(localStorage.getItem("cv_challenge_solved") ?? "0") + 1
        const hard   = Number(localStorage.getItem("cv_challenge_hard")   ?? "0") + (puzzle.difficulty === "Hard" ? 1 : 0)
        localStorage.setItem("cv_challenge_solved", String(solved))
        localStorage.setItem("cv_challenge_hard",   String(hard))

        const stats = buildStats({
          challengeSolved:  solved,
          challengeHard:    hard,
          coins:            getCoins(),
          itemsBought:      getOwned().length,
          speedBestSolved:  Number(localStorage.getItem("cv_speed_best") ?? "0"),
          battleWins:       Number(localStorage.getItem("cv_battle_wins") ?? "0"),
          battlePlayed:     Number(localStorage.getItem("cv_battle_played") ?? "0"),
        })
        checkAndUnlock(stats).forEach(a => triggerAchievementToast(a))
      } catch {}
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
  if (showAuth) return <AuthModal onClose={() => setShowAuth(false)} defaultTab="login" />

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