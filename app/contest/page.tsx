"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/lib/AuthContext"
import { supabase, type LeaderboardRow, type AllTimeRow } from "@/lib/supabase"
import AuthModal from "@/components/AuthModal"

// ─── Puzzle pool ───────────────────────────────────────────────────────────────
interface Puzzle {
  id: string; cipher: string; plaintext: string; ciphertext: string
  hints: string[]; difficulty: "Easy" | "Medium" | "Hard"; keyInfo: string; points: number
}

const ALL_PUZZLES: Puzzle[] = [
  { id:"d1",  cipher:"Caesar",         difficulty:"Easy",   points:100, keyInfo:"Shift: 3",
    plaintext:"HELLO WORLD",           ciphertext:"KHOOR ZRUOG",
    hints:["Caesar cipher — fixed shift","Shift is between 1–5","Shift = 3"] },
  { id:"d2",  cipher:"Caesar",         difficulty:"Easy",   points:100, keyInfo:"Shift: 7",
    plaintext:"CRYPTOGRAPHY",          ciphertext:"JYFWAVNYHWOF",
    hints:["Caesar cipher","Shift is between 5–10","Shift = 7"] },
  { id:"d3",  cipher:"Vigenère",       difficulty:"Medium", points:250, keyInfo:"Key: LEMON",
    plaintext:"ATTACK AT DAWN",        ciphertext:"LXFOPV EF RNHR",
    hints:["Polyalphabetic substitution","5-letter keyword","Key = LEMON"] },
  { id:"d4",  cipher:"Vigenère",       difficulty:"Medium", points:250, keyInfo:"Key: KEY",
    plaintext:"SEND HELP NOW",         ciphertext:"COXY RITP XGD",
    hints:["Vigenère cipher","3-letter keyword","Key = KEY"] },
  { id:"d5",  cipher:"Rail Fence",     difficulty:"Medium", points:250, keyInfo:"Rails: 3",
    plaintext:"WE ARE DISCOVERED",     ciphertext:"WAREISERDECOVD",
    hints:["Transposition cipher","Text written in zigzag","3 rails"] },
  { id:"d6",  cipher:"Playfair",       difficulty:"Hard",   points:500, keyInfo:"Key: PLAYFAIR",
    plaintext:"HIDE THE GOLD",         ciphertext:"BMNDZBXDKYBEJV",
    hints:["Digraph cipher with 5×5 grid","Keyword fills the grid first","Key = PLAYFAIR"] },
  { id:"d7",  cipher:"Monoalphabetic", difficulty:"Hard",   points:500, keyInfo:"Key: QWERTY...",
    plaintext:"THE ENEMY ADVANCES",    ciphertext:"ZIT TCTPA QBVQCMTS",
    hints:["Each letter maps to exactly one other","Frequency analysis helps","A→Q, B→W, C→E..."] },
  { id:"d8",  cipher:"Caesar",         difficulty:"Easy",   points:100, keyInfo:"Shift: 13",
    plaintext:"NEVER GIVE UP",         ciphertext:"ARIRE TVIR HC",
    hints:["ROT-13 is a special case","Shift = 13","Each letter shifts halfway"] },
  { id:"d9",  cipher:"Vigenère",       difficulty:"Hard",   points:400, keyInfo:"Key: CRYPTO",
    plaintext:"RENDEZVOUS AT MIDNIGHT",ciphertext:"TIVHZBCCL LD EIFPVZOYP",
    hints:["Long polyalphabetic key","6-letter keyword","Key = CRYPTO"] },
  { id:"d10", cipher:"Rail Fence",     difficulty:"Easy",   points:100, keyInfo:"Rails: 2",
    plaintext:"HELLO WORLD",           ciphertext:"HLOOLELWRD",
    hints:["2-rail zigzag","Read odd then even positions","H_L_O → E_L_W_R_D"] },
  { id:"d11", cipher:"Caesar",         difficulty:"Medium", points:200, keyInfo:"Shift: 19",
    plaintext:"DEFEND THE CASTLE",     ciphertext:"WXOXWM MAX VTLMAX",
    hints:["Large shift value","Shift > 15","Shift = 19"] },
  { id:"d12", cipher:"Vigenère",       difficulty:"Medium", points:300, keyInfo:"Key: BEAM",
    plaintext:"WINTER IS COMING",      ciphertext:"XMPXIW MW GOQQVO",
    hints:["4-letter keyword","Repeating key","Key = BEAM"] },
  { id:"d13", cipher:"Monoalphabetic", difficulty:"Hard",   points:500, keyInfo:"Key: ZEBRAS...",
    plaintext:"ATTACK AT DAWN",        ciphertext:"ZFFZPM ZF YZON",
    hints:["Keyword-based substitution","Keyword = ZEBRAS","Z→A, E→B, B→C..."] },
  { id:"d14", cipher:"Caesar",         difficulty:"Easy",   points:100, keyInfo:"Shift: 1",
    plaintext:"MEET ME AT NOON",       ciphertext:"NFFU NF BU OPPO",
    hints:["Very small shift","Shift = 1","N→M, F→E..."] },
]

function getDailyPuzzle(): Puzzle {
  const d = new Date()
  const seed = d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate()
  return ALL_PUZZLES[seed % ALL_PUZZLES.length]
}

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}

function getCountdown() {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate()+1); tomorrow.setHours(0,0,0,0)
  const diff = tomorrow.getTime() - now.getTime()
  const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000), s = Math.floor((diff%60000)/1000)
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
}

function formatTime(s: number) {
  const m = Math.floor(s/60), sec = s%60
  return m > 0 ? `${m}m ${String(sec).padStart(2,"0")}s` : `${sec}s`
}

function calcScore(difficulty: string, time: number, hints: number) {
  const base = difficulty==="Easy"?100:difficulty==="Medium"?250:500
  const hp = difficulty==="Easy"?10:difficulty==="Medium"?25:50
  return Math.max(10, Math.round(base - time*0.5 - hints*hp))
}

function calcRatingDelta(difficulty: string, time: number, hints: number) {
  const base = difficulty==="Easy"?20:difficulty==="Medium"?35:60
  return Math.max(5, Math.round(base - Math.min(time*0.05,20) - hints*5))
}

// ─── Rating tiers ──────────────────────────────────────────────────────────────
const TIERS = [
  { name:"Novice",       min:0,    color:"text-gray-400",   bg:"bg-gray-500/10 border-gray-500/20",    icon:"🔰" },
  { name:"Apprentice",   min:500,  color:"text-green-400",  bg:"bg-green-500/10 border-green-500/20",  icon:"⚡" },
  { name:"Cryptanalyst", min:1000, color:"text-blue-400",   bg:"bg-blue-500/10 border-blue-500/20",    icon:"🔍" },
  { name:"Specialist",   min:1500, color:"text-violet-400", bg:"bg-violet-500/10 border-violet-500/20",icon:"💎" },
  { name:"Expert",       min:2000, color:"text-amber-400",  bg:"bg-amber-500/10 border-amber-500/20",  icon:"🏆" },
  { name:"Master",       min:2500, color:"text-red-400",    bg:"bg-red-500/10 border-red-500/20",      icon:"👑" },
]
function getTier(r: number) { return [...TIERS].reverse().find(t => r >= t.min) ?? TIERS[0] }

const DIFF = {
  Easy:   { badge:"bg-emerald-500/10 text-emerald-400 border-emerald-500/20", text:"text-emerald-400" },
  Medium: { badge:"bg-amber-500/10 text-amber-400 border-amber-500/20",       text:"text-amber-400"   },
  Hard:   { badge:"bg-red-500/10 text-red-400 border-red-500/20",             text:"text-red-400"     },
}

// ─── Persistent timer hook (survives re-renders, resets only on startPuzzle) ──
function usePersistentTimer(key: string) {
  const startRef = useRef<number | null>(null)
  const rafRef   = useRef<number | undefined>(undefined)
  // Initialise elapsed directly from sessionStorage so it never flashes 0 on remount
  const [elapsed, setElapsed] = useState(() => {
    if (typeof window === "undefined") return 0
    const saved = sessionStorage.getItem(key)
    if (!saved) return 0
    return Math.floor((Date.now() - Number(saved)) / 1000)
  })
  const [active, setActive] = useState(() => {
    if (typeof window === "undefined") return false
    return !!sessionStorage.getItem(key)
  })

  const tick = useCallback(() => {
    if (startRef.current !== null) {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
      rafRef.current = requestAnimationFrame(tick)
    }
  }, [])

  // Auto-resume on mount if a saved timestamp exists
  useEffect(() => {
    const saved = sessionStorage.getItem(key)
    if (saved) {
      startRef.current = Number(saved)
      setElapsed(Math.floor((Date.now() - Number(saved)) / 1000))
      setActive(true)
      cancelAnimationFrame(rafRef.current!)
      rafRef.current = requestAnimationFrame(tick)
    }
    return () => cancelAnimationFrame(rafRef.current!)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = useCallback(() => {
    const saved = sessionStorage.getItem(key)
    if (saved) {
      // Already running — just resume the RAF, never overwrite the timestamp
      startRef.current = Number(saved)
    } else {
      startRef.current = Date.now()
      sessionStorage.setItem(key, String(startRef.current))
    }
    setActive(true)
    cancelAnimationFrame(rafRef.current!)
    rafRef.current = requestAnimationFrame(tick)
  }, [key, tick])

  const stop = useCallback(() => {
    setActive(false)
    cancelAnimationFrame(rafRef.current!)
    sessionStorage.removeItem(key)
    startRef.current = null
  }, [key])

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current!)
    sessionStorage.removeItem(key)
    startRef.current = null
    setActive(false)
    setElapsed(0)
  }, [key])

  return { elapsed, active, start, stop, reset }
}

// ─── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown() {
  const [cd, setCd] = useState(getCountdown())
  useEffect(() => { const t = setInterval(() => setCd(getCountdown()), 1000); return () => clearInterval(t) }, [])
  return cd
}

// ─── Main page ─────────────────────────────────────────────────────────────────
type Screen = "lobby" | "playing" | "result"

export default function ContestPage() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const [showAuth, setShowAuth]       = useState(false)
  const [authTab, setAuthTab]         = useState<"login"|"register">("login")
  const [screen, setScreen]           = useState<Screen>("lobby")
  const [puzzle]                      = useState<Puzzle>(getDailyPuzzle)
  const [attempt, setAttempt]         = useState("")
  const [hintsRevealed, setHintsRevealed] = useState(0)
  const [wrong, setWrong]             = useState(false)
  const [shake, setShake]             = useState(false)
  const [score, setScore]             = useState(0)
  const [ratingDelta, setRatingDelta] = useState(0)
  const [boardTab, setBoardTab]       = useState<"today"|"alltime">("today")
  const [todayBoard, setTodayBoard]   = useState<LeaderboardRow[]>([])
  const [allTimeBoard, setAllTimeBoard] = useState<AllTimeRow[]>([])
  const [alreadyPlayed, setAlreadyPlayed] = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [submitted, setSubmitted]     = useState(false)
  const [boardLoading, setBoardLoading] = useState(true)
  const countdown = useCountdown()

  // ── Timer — persists across navigation ──────────────────────────────────────
  const timerKey = `cv_timer_${getTodayStr()}`
  const { elapsed: seconds, start: startTimer, stop: stopTimer, reset: resetTimer } = usePersistentTimer(timerKey)

  // ── Load leaderboard ────────────────────────────────────────────────────────
  const loadBoard = useCallback(async () => {
    setBoardLoading(true)
    const today = getTodayStr()
    const [{ data: td }, { data: at }] = await Promise.all([
      supabase.from("daily_leaderboard").select("*").eq("puzzle_date", today).order("score", { ascending: false }).limit(20),
      supabase.from("alltime_leaderboard").select("*").limit(20),
    ])
    setTodayBoard((td ?? []) as LeaderboardRow[])
    setAllTimeBoard((at ?? []) as AllTimeRow[])
    setBoardLoading(false)
  }, [])

  useEffect(() => { loadBoard() }, [loadBoard])

  // ── Check if user already played today ─────────────────────────────────────
  useEffect(() => {
    if (!user) return
    supabase.from("contest_entries").select("id").eq("user_id", user.id).eq("puzzle_date", getTodayStr()).maybeSingle()
      .then(({ data }) => setAlreadyPlayed(!!data))
  }, [user])

  // ── Restore screen state if timer is running (navigated away mid-game) ─────
  useEffect(() => {
    const saved = sessionStorage.getItem(timerKey)
    if (saved) setScreen("playing")
  }, [timerKey])

  const startContest = () => {
    if (!user) { setAuthTab("login"); setShowAuth(true); return }
    const alreadyRunning = !!sessionStorage.getItem(timerKey)
    if (!alreadyRunning) {
      resetTimer()
      setAttempt(""); setHintsRevealed(0); setWrong(false)
    }
    setScreen("playing")
    startTimer() // call directly — no setTimeout delay
  }

  const checkAnswer = () => {
    const clean = (s: string) => s.toUpperCase().replace(/\s+/g," ").trim()
    if (clean(attempt) === clean(puzzle.plaintext)) {
      stopTimer()
      const s     = calcScore(puzzle.difficulty, seconds, hintsRevealed)
      const delta = calcRatingDelta(puzzle.difficulty, seconds, hintsRevealed)
      setScore(s)
      setRatingDelta(delta)
      setScreen("result")
      // Pass values directly — don't rely on state which may not be set yet
      submitResult(s, delta)
    } else {
      setWrong(true); setShake(true)
      setTimeout(() => { setWrong(false); setShake(false) }, 600)
    }
  }

  const [saveError, setSaveError] = useState<string | null>(null)

  const submitResult = async (finalScore: number, finalDelta: number) => {
    if (!user || !profile || submitting) {
      console.warn("submitResult blocked — user:", !!user, "profile:", !!profile, "submitting:", submitting)
      return
    }
    setSaveError(null)
    setSubmitting(true)

    // Helper: wrap any promise with a timeout
    const withTimeout = <T,>(promise: Promise<T>, ms = 8000): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms))
      ])

    try {
      const today        = getTodayStr()
      const ratingBefore = profile.rating
      const ratingAfter  = ratingBefore + finalDelta
      const yesterday    = new Date(); yesterday.setDate(yesterday.getDate() - 1)
      const yStr         = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,"0")}-${String(yesterday.getDate()).padStart(2,"0")}`
      const newStreak    = profile.last_played === yStr ? profile.streak + 1 : 1

      console.log("Inserting entry…", { user_id: user.id, score: finalScore, ratingAfter })

      const { error: insertErr } = await withTimeout(
        Promise.resolve(supabase.from("contest_entries").insert({
          user_id:       user.id,
          username:      profile.username,
          puzzle_date:   today,
          puzzle_id:     puzzle.id,
          score:         finalScore,
          time_seconds:  seconds,
          hints_used:    hintsRevealed,
          difficulty:    puzzle.difficulty,
          rating_before: ratingBefore,
          rating_after:  ratingAfter,
        }))
      )

      if (insertErr) {
        // 23505 = already submitted today — treat as success
        if (insertErr.code === "23505") {
          console.log("Already submitted today — skipping insert")
        } else {
          console.error("INSERT ERROR:", insertErr)
          setSaveError(`${insertErr.message} [${insertErr.code}]`)
          return
        }
      } else {
        console.log("Insert OK")
      }

      const { error: updateErr } = await withTimeout(
        Promise.resolve(supabase.from("profiles").update({
          rating:          ratingAfter,
          contests_played: profile.contests_played + 1,
          best_score:      Math.max(profile.best_score, finalScore),
          streak:          newStreak,
          last_played:     today,
        }).eq("id", user.id))
      )

      if (updateErr) {
        console.error("UPDATE ERROR:", updateErr)
        setSaveError(`${updateErr.message} [${updateErr.code}]`)
        return
      }
      console.log("Update OK")

      await withTimeout(refreshProfile())
      await withTimeout(loadBoard())
      setAlreadyPlayed(true)
      setSubmitted(true)
    } catch (e: any) {
      console.error("submitResult exception:", e)
      setSaveError(e?.message ?? "Unknown error — check console")
    } finally {
      setSubmitting(false)
    }
  }

  const userTodayRank = todayBoard.findIndex(e => e.username === profile?.username) + 1

  // ─── Lobby ──────────────────────────────────────────────────────────────────
  if (screen === "lobby") return (
    <div className="p-8 max-w-5xl mx-auto">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} defaultTab={authTab} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold text-white tracking-tight">Daily Contest</h1>
            <span className="text-[10px] font-semibold uppercase tracking-widest border px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border-amber-500/20">
              Live
            </span>
          </div>
          <p className="text-[13px] text-gray-500">One cipher puzzle every day. Compete globally, earn rating, climb the ranks.</p>
        </div>

        {/* Auth bar */}
        {user && profile ? (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[13px] font-semibold text-white">{profile.username}</p>
              <div className="flex items-center gap-1.5 justify-end">
                {(() => { const t = getTier(profile.rating); return (
                  <span className={`text-[9px] font-bold uppercase tracking-widest border px-1.5 py-0.5 rounded-full ${t.bg} ${t.color}`}>
                    {t.icon} {t.name}
                  </span>
                )})()}
                <span className="text-[11px] font-mono text-gray-400">{profile.rating}</span>
              </div>
            </div>
            <button onClick={signOut} className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors border border-gray-800 px-3 py-1.5 rounded-lg">
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => { setAuthTab("login"); setShowAuth(true) }}
              className="text-[12px] text-gray-400 hover:text-white border border-gray-700 px-4 py-1.5 rounded-lg transition-colors">
              Sign In
            </button>
            <button onClick={() => { setAuthTab("register"); setShowAuth(true) }}
              className="text-[12px] bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg transition-colors">
              Register
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Today's puzzle */}
        <div className="col-span-2 bg-[#0d0d0d] border border-gray-800/60 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
            </span>
            <span className="text-[11px] text-blue-400 font-medium tracking-widest uppercase">Today — {getTodayStr()}</span>
          </div>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full ${DIFF[puzzle.difficulty].badge}`}>
                  {puzzle.difficulty}
                </span>
                <span className="text-[10px] text-gray-600 border border-gray-800/60 px-2 py-0.5 rounded-full">{puzzle.cipher}</span>
              </div>
              <p className="text-[11px] text-gray-600 mb-2 font-mono">{puzzle.keyInfo}</p>
              <p className="text-xl font-mono text-white tracking-widest">{puzzle.ciphertext}</p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className={`text-2xl font-bold ${DIFF[puzzle.difficulty].text}`}>{puzzle.points}</p>
              <p className="text-[10px] text-gray-600">max pts</p>
            </div>
          </div>

          {alreadyPlayed ? (
            <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-[12px] text-emerald-400 font-medium">You've completed today's challenge!</span>
              {userTodayRank > 0 && <span className="text-[11px] text-gray-500 ml-auto">Rank #{userTodayRank}</span>}
            </div>
          ) : (
            <button onClick={startContest}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-[13px] font-semibold transition-colors flex items-center justify-center gap-2">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 2l9 4.5-9 4.5V2z" fill="currentColor"/></svg>
              {user ? "Start Challenge" : "Sign in to Compete"}
            </button>
          )}
        </div>

        {/* Sidebar: countdown + profile */}
        <div className="space-y-3">
          <div className="bg-[#0d0d0d] border border-gray-800/60 rounded-2xl p-4 text-center">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Next puzzle in</p>
            <p className="text-2xl font-mono font-bold text-white tracking-wider">{countdown}</p>
          </div>

          {profile ? (
            <div className="bg-[#0d0d0d] border border-gray-800/60 rounded-2xl p-4">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">Your Stats</p>
              {(() => { const t = getTier(profile.rating); return (
                <div className="mb-3">
                  <span className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full ${t.bg} ${t.color}`}>
                    {t.icon} {t.name}
                  </span>
                </div>
              )})()}
              <p className="text-2xl font-bold text-white mb-0.5">{profile.rating}</p>
              <p className="text-[10px] text-gray-600 mb-3">Contest Rating</p>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                {[
                  { label:"Played",  val: profile.contests_played },
                  { label:"Streak",  val: `${profile.streak}🔥` },
                  { label:"Best",    val: profile.best_score },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-gray-900/40 rounded-lg py-2">
                    <p className="text-[12px] font-bold text-white">{val}</p>
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-[#0d0d0d] border border-gray-800/40 rounded-2xl p-4 text-center">
              <p className="text-3xl mb-2">🎯</p>
              <p className="text-[11px] text-gray-500 mb-3">Sign in to track your rating and appear on the leaderboard</p>
              <button onClick={() => { setAuthTab("register"); setShowAuth(true) }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded-lg text-[12px] font-medium transition-colors">
                Create Account
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-[#0d0d0d] border border-gray-800/60 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] font-semibold text-white">Leaderboard</p>
          <div className="flex gap-1 bg-gray-900/60 border border-gray-800/60 rounded-lg p-0.5">
            {(["today","alltime"] as const).map(t => (
              <button key={t} onClick={() => setBoardTab(t)}
                className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${boardTab===t?"bg-white text-black":"text-gray-500 hover:text-gray-300"}`}>
                {t==="today"?"Today":"All Time"}
              </button>
            ))}
          </div>
        </div>

        {boardLoading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin w-5 h-5 text-blue-500" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeDasharray="30 20"/>
            </svg>
          </div>
        ) : boardTab === "today" ? (
          todayBoard.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">🏆</p>
              <p className="text-[12px] text-gray-600">No entries yet today — be the first!</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="grid grid-cols-[36px_1fr_80px_70px_55px_80px] gap-3 px-3 py-1">
                {["#","Player","Score","Time","Hints","Rating"].map(h => (
                  <p key={h} className="text-[10px] text-gray-600 uppercase tracking-wider">{h}</p>
                ))}
              </div>
              {todayBoard.map((e, i) => {
                const isMe = e.username === profile?.username
                const tier = getTier(e.rating)
                return (
                  <div key={i} className={`grid grid-cols-[36px_1fr_80px_70px_55px_80px] gap-3 items-center px-3 py-2.5 rounded-xl border ${
                    isMe ? "bg-blue-900/20 border-blue-700/30" :
                    i===0 ? "bg-amber-900/10 border-amber-700/20" :
                    "bg-gray-900/30 border-gray-800/30"
                  }`}>
                    <span className={`text-[12px] font-bold ${i===0?"text-amber-400":i===1?"text-gray-300":i===2?"text-orange-400":"text-gray-600"}`}>
                      {i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[12px] font-medium text-white truncate">{e.username}</span>
                      {isMe && <span className="text-[9px] text-blue-400 shrink-0 border border-blue-700/40 px-1 rounded">you</span>}
                    </div>
                    <span className="text-[12px] font-bold text-emerald-400">{e.score}</span>
                    <span className="text-[11px] font-mono text-blue-400">{formatTime(e.time_seconds)}</span>
                    <span className="text-[11px] text-gray-500">{e.hints_used}/3</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px]">{tier.icon}</span>
                      <span className="text-[11px] font-mono text-white">{e.rating}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          allTimeBoard.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">📊</p>
              <p className="text-[12px] text-gray-600">No all-time data yet.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="grid grid-cols-[36px_1fr_90px_90px_70px_60px] gap-3 px-3 py-1">
                {["#","Player","Rating","Best Score","Played","Streak"].map(h => (
                  <p key={h} className="text-[10px] text-gray-600 uppercase tracking-wider">{h}</p>
                ))}
              </div>
              {allTimeBoard.map((e, i) => {
                const isMe = e.username === profile?.username
                const tier = getTier(e.rating)
                return (
                  <div key={i} className={`grid grid-cols-[36px_1fr_90px_90px_70px_60px] gap-3 items-center px-3 py-2.5 rounded-xl border ${
                    isMe ? "bg-blue-900/20 border-blue-700/30" :
                    i===0 ? "bg-amber-900/10 border-amber-700/20" :
                    "bg-gray-900/30 border-gray-800/30"
                  }`}>
                    <span className={`text-[12px] font-bold ${i===0?"text-amber-400":i===1?"text-gray-300":i===2?"text-orange-400":"text-gray-600"}`}>
                      {i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[12px] font-medium text-white truncate">{e.username}</span>
                      {isMe && <span className="text-[9px] text-blue-400 shrink-0 border border-blue-700/40 px-1 rounded">you</span>}
                      <span className={`text-[9px] border px-1.5 py-0.5 rounded-full shrink-0 ${tier.bg} ${tier.color}`}>{tier.icon}</span>
                    </div>
                    <span className={`text-[12px] font-bold ${tier.color}`}>{e.rating}</span>
                    <span className="text-[12px] text-emerald-400">{e.best_score}</span>
                    <span className="text-[11px] text-gray-500">{e.contests_played}</span>
                    <span className="text-[11px] text-white">{e.streak}🔥</span>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>
    </div>
  )

  // ─── Playing ────────────────────────────────────────────────────────────────
  if (screen === "playing") return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setScreen("lobby")}
          className="flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-gray-300 transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M9.5 6H2.5m0 0L6 2.5M2.5 6L6 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back (timer keeps running)
        </button>
        <div className="flex items-center gap-2 bg-gray-900/60 border border-gray-800/60 rounded-lg px-3 py-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
          </span>
          <span className="text-[13px] font-mono font-bold text-white">{formatTime(seconds)}</span>
        </div>
      </div>

      <div className="bg-gray-900/60 border border-gray-800/60 rounded-2xl p-6 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full ${DIFF[puzzle.difficulty].badge}`}>
              {puzzle.difficulty}
            </span>
            <span className="text-[10px] text-gray-600 font-mono border border-gray-800 px-2 py-0.5 rounded-full">{puzzle.cipher}</span>
          </div>
          <span className={`text-lg font-bold ${DIFF[puzzle.difficulty].text}`}>
            {calcScore(puzzle.difficulty, seconds, hintsRevealed)} pts
          </span>
        </div>
        <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Decrypt this ciphertext</p>
        <p className="text-2xl font-mono text-white tracking-widest leading-relaxed mb-2">{puzzle.ciphertext}</p>
        <p className="text-[11px] text-gray-700 font-mono">{puzzle.plaintext.replace(/[^ ]/g,"·")}</p>
      </div>

      <div className="mb-5">
        <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Your Answer</label>
        <div className={shake ? "animate-bounce" : ""}>
          <div className="flex gap-2">
            <input value={attempt} onChange={e => setAttempt(e.target.value)}
              onKeyDown={e => e.key === "Enter" && checkAnswer()}
              placeholder="Type the plaintext..."
              className={`flex-1 bg-gray-900/60 border rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-gray-700 focus:outline-none transition-colors ${
                wrong ? "border-red-500/60 bg-red-900/10" : "border-gray-800 focus:border-gray-600"
              }`} />
            <button onClick={checkAnswer}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[13px] font-semibold transition-colors">
              Submit
            </button>
          </div>
        </div>
        {wrong && <p className="text-red-400 text-[12px] mt-1.5">✗ Incorrect — try again</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-gray-600 uppercase tracking-wider">Hints</p>
          <p className="text-[10px] text-gray-700">{hintsRevealed}/3 used</p>
        </div>
        {puzzle.hints.map((hint, i) => {
          const revealed = i < hintsRevealed
          return (
            <div key={i} className={`border rounded-xl p-3 transition-all ${revealed ? "bg-amber-900/10 border-amber-700/30" : "bg-gray-900/30 border-gray-800/30"}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">Hint {i+1}</span>
                {!revealed && i === hintsRevealed && (
                  <button onClick={() => setHintsRevealed(i+1)}
                    className="text-[11px] text-gray-500 hover:text-amber-400 transition-colors">
                    Reveal (−{puzzle.difficulty==="Easy"?10:puzzle.difficulty==="Medium"?25:50} pts)
                  </button>
                )}
                {!revealed && i > hintsRevealed && <span className="text-[10px] text-gray-700">Unlock hint {i} first</span>}
              </div>
              {revealed && <p className="text-[12px] text-gray-300 mt-1 leading-relaxed">{hint}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )

  // ─── Result ──────────────────────────────────────────────────────────────────
  if (screen === "result") {
    const currentRating = profile?.rating ?? 1000
    const newRating = currentRating + ratingDelta
    const oldTier = getTier(currentRating), newTier = getTier(newRating)
    const tierUp = newTier.name !== oldTier.name && newRating > currentRating

    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-4 text-4xl">🔓</div>
          <h2 className="text-2xl font-bold text-white mb-1">Challenge Complete!</h2>
          <p className="text-[13px] text-gray-500">You cracked today's {puzzle.cipher} cipher</p>
          {tierUp && (
            <div className="mt-3 inline-flex items-center gap-2 bg-amber-900/20 border border-amber-700/30 rounded-full px-4 py-1.5">
              <span className="text-amber-400">🎉</span>
              <span className="text-[12px] text-amber-400 font-semibold">Tier Up! {oldTier.name} → {newTier.name}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label:"Score",  value: score.toString(),     color:"text-emerald-400" },
            { label:"Time",   value: formatTime(seconds),  color:"text-blue-400"    },
            { label:"Hints",  value: `${hintsRevealed}/3`, color: hintsRevealed===0?"text-emerald-400":"text-amber-400" },
            { label:"Rating", value: `+${ratingDelta}`,    color:"text-violet-400"  },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Rating bar */}
        <div className="bg-gray-900/60 border border-gray-800/60 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-semibold text-white">Contest Rating</p>
            <span className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full ${newTier.bg} ${newTier.color}`}>
              {newTier.icon} {newTier.name}
            </span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[11px] font-mono text-gray-600">{currentRating}</span>
            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-600 to-violet-500 rounded-full transition-all duration-1000"
                style={{ width:`${Math.min((newRating/2500)*100,100)}%` }} />
            </div>
            <span className="text-[12px] font-mono font-bold text-white">{newRating}</span>
          </div>
          <div className="flex justify-between">
            {TIERS.map(t => <span key={t.name} className={`text-[8px] ${t.color}`}>{t.icon}</span>)}
          </div>
        </div>

        {submitting ? (
          <div className="bg-gray-900/60 border border-gray-800/60 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <svg className="animate-spin w-4 h-4 text-blue-400 shrink-0" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" strokeDasharray="20 10"/>
            </svg>
            <div>
              <p className="text-[12px] font-semibold text-white">Saving to leaderboard…</p>
              <p className="text-[11px] text-gray-600">Updating your rating automatically</p>
            </div>
          </div>
        ) : saveError ? (
          <div className="bg-red-900/20 border border-red-700/30 rounded-2xl p-4 mb-4">
            <p className="text-[12px] font-semibold text-red-400 mb-1">⚠ Save failed</p>
            <p className="text-[11px] text-red-400/70 font-mono mb-3 break-all">{saveError}</p>
            <button onClick={() => submitResult(score, ratingDelta)}
              className="w-full bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-red-400 py-2 rounded-xl text-[12px] font-semibold transition-colors">
              Retry Save
            </button>
          </div>
        ) : submitted ? (
          <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 6.5l3.5 3.5 5.5-6" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-emerald-400">Saved to global leaderboard!</p>
              {userTodayRank > 0 && <p className="text-[11px] text-gray-500 mt-0.5">You ranked #{userTodayRank} today</p>}
            </div>
          </div>
        ) : null}

        <button onClick={() => setScreen("lobby")}
          className="w-full border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 py-2.5 rounded-xl text-[13px] font-medium transition-colors">
          Back to Lobby
        </button>
      </div>
    )
  }

  return null
}