"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/lib/AuthContext"
import { useGame } from "@/lib/GameContext"
import { supabase, type LeaderboardRow, type AllTimeRow } from "@/lib/supabase"
import { getOwned, useItem, hasItem, ITEM, addCoins, getCoins, setCoinsVal } from "@/lib/inventory"
import { checkAndUnlock, buildStats, getUnlocked } from "@/lib/achievements"
import { triggerAchievementToast } from "@/components/AchievementToast"
import AuthModal from "@/components/AuthModal"
import { CONTEST_PUZZLES, type Puzzle } from "@/lib/puzzles-contest"

function getDailyPuzzle(): Puzzle {
  const d = new Date()
  const seed = d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate()
  return CONTEST_PUZZLES[seed % CONTEST_PUZZLES.length]
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

function calcScore(difficulty: string, _time: number, hints: number) {
  const base = difficulty==="Easy"?100:difficulty==="Medium"?250:500
  const hp   = difficulty==="Easy"?10:difficulty==="Medium"?25:50
  return Math.max(10, Math.round(base - hints*hp))
}

function calcRatingDelta(difficulty: string, _time: number, hints: number) {
  const base = difficulty==="Easy"?20:difficulty==="Medium"?35:60
  return Math.max(5, Math.round(base - hints*5))
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

// ─── Persistent timer hook ────────────────────────────────────────────────────
// Stores elapsed SECONDS in sessionStorage so it pauses on navigation.
// Uses a single source of truth: startRef (wall-clock) + baseRef (saved seconds).
function usePersistentTimer(key: string) {
  const baseRef  = useRef<number>(0)   // seconds saved before current session
  const startRef = useRef<number | null>(null)  // Date.now() when current RAF started
  const rafRef   = useRef<number | undefined>(undefined)

  const [elapsed, setElapsed] = useState(() => {
    if (typeof window === "undefined") return 0
    return Number(sessionStorage.getItem(key) ?? 0)
  })
  const [active, setActive] = useState(() => {
    if (typeof window === "undefined") return false
    return Number(sessionStorage.getItem(key) ?? 0) > 0
  })

  const tick = useCallback(() => {
    if (startRef.current !== null) {
      // total = base seconds + seconds since RAF started
      const total = baseRef.current + Math.floor((Date.now() - startRef.current) / 1000)
      setElapsed(total)
      rafRef.current = requestAnimationFrame(tick)
    }
  }, [])

  // resumeRAF — resume from saved sessionStorage value, no wall-clock jump
  const resumeRAF = useCallback(() => {
    const saved = sessionStorage.getItem(key)
    if (saved === null) return
    baseRef.current  = Number(saved)
    startRef.current = Date.now()
    setElapsed(Number(saved))
    cancelAnimationFrame(rafRef.current!)
    rafRef.current = requestAnimationFrame(tick)
  }, [key, tick])

  // pauseRAF — freeze and persist current elapsed, stop RAF
  const pauseRAF = useCallback(() => {
    if (startRef.current !== null) {
      const total = baseRef.current + Math.floor((Date.now() - startRef.current) / 1000)
      baseRef.current = total
      setElapsed(total)
      sessionStorage.setItem(key, String(total))
    }
    cancelAnimationFrame(rafRef.current!)
    startRef.current = null
  }, [key])

  // On mount: restore saved elapsed only — RAF started by screen effect
  useEffect(() => {
    const saved = sessionStorage.getItem(key)
    if (saved !== null) {
      baseRef.current = Number(saved)
      setElapsed(Number(saved))
      setActive(true)
    }
    return () => {
      cancelAnimationFrame(rafRef.current!)
      startRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = useCallback(() => {
    const saved = sessionStorage.getItem(key)
    const base  = saved !== null ? Number(saved) : 0
    baseRef.current  = base
    startRef.current = Date.now()
    if (saved === null) sessionStorage.setItem(key, "0")
    setElapsed(base)
    setActive(true)
    cancelAnimationFrame(rafRef.current!)
    rafRef.current = requestAnimationFrame(tick)
  }, [key, tick])

  const stop = useCallback(() => {
    if (startRef.current !== null) {
      const total = baseRef.current + Math.floor((Date.now() - startRef.current) / 1000)
      baseRef.current = total
      setElapsed(total)
    }
    setActive(false)
    cancelAnimationFrame(rafRef.current!)
    sessionStorage.removeItem(key)
    startRef.current = null
  }, [key])

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current!)
    sessionStorage.removeItem(key)
    startRef.current = null
    baseRef.current  = 0
    setActive(false)
    setElapsed(0)
  }, [key])

  return { elapsed, active, start, stop, reset, resumeRAF, pauseRAF }
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
  const { user, profile, signOut, refreshProfile, updateProfileLocal } = useAuth()
  const { setGameActive, requestLeave } = useGame()
  const [showAuth, setShowAuth]       = useState(false)
  const [authTab, setAuthTab]         = useState<"login"|"register">("login")
  const [screen, setScreen]           = useState<Screen>("lobby")
  const [puzzle]                      = useState<Puzzle>(getDailyPuzzle)
  const [attempt, setAttempt]         = useState("")
  const [hintsRevealed, setHintsRevealed] = useState(0)
  const [wrong, setWrong]             = useState(false)
  const [shake, setShake]             = useState(false)
  const [frozenSecs, setFrozenSecs]   = useState(0)
  const [shielded,   setShielded]     = useState(false)
  const [doubleNext, setDoubleNext]   = useState(false)
  const [freqMap,    setFreqMap]      = useState<[string,number][]>([])
  const [inventory,  setInventory]    = useState<ReturnType<typeof getOwned>>([])
  const [score, setScore]             = useState(0)
  const [ratingDelta, setRatingDelta] = useState(0)
  const [boardTab, setBoardTab]       = useState<"today"|"alltime">("today")
  const [todayBoard, setTodayBoard]   = useState<LeaderboardRow[]>([])
  const [allTimeBoard, setAllTimeBoard] = useState<AllTimeRow[]>([])
  const [alreadyPlayed, setAlreadyPlayed] = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [submitted, setSubmitted]     = useState(false)
  const [coinsEarned, setCoinsEarned] = useState(0)
  const [boardLoading, setBoardLoading] = useState(true)
  const countdown = useCountdown()

  // ── Timer — persists across navigation ──────────────────────────────────────
  const timerKey = `cv_timer_${getTodayStr()}`
  const { elapsed: seconds, start: startTimer, stop: stopTimer, reset: resetTimer, resumeRAF, pauseRAF } = usePersistentTimer(timerKey)

  // ── Load leaderboard ────────────────────────────────────────────────────────
  const boardLoadedRef = useRef(false)
  const loadBoard = useCallback(async (force = false) => {
    if (boardLoadedRef.current && !force) return
    setBoardLoading(true)
    const today = getTodayStr()
    const [{ data: td }, { data: at }] = await Promise.all([
      supabase.from("daily_leaderboard").select("*").eq("puzzle_date", today).order("score", { ascending: false }).limit(20),
      supabase.from("alltime_leaderboard").select("*").limit(20),
    ])
    setTodayBoard((td ?? []) as LeaderboardRow[])
    setAllTimeBoard((at ?? []) as AllTimeRow[])
    setBoardLoading(false)
    boardLoadedRef.current = true
  }, [])

  useEffect(() => { loadBoard() }, [loadBoard])
  useEffect(() => { setTodayStr(getTodayStr()) }, [])
  useEffect(() => {
    const inv = getOwned(); setInventory(inv)
    if (inv.some(i => i.id === ITEM.DOUBLE && i.uses > 0)) setDoubleNext(true)
    if (inv.some(i => i.id === ITEM.SHIELD && i.uses > 0)) setShielded(true)
  }, [])

  // Always clear game lock on unmount
  useEffect(() => {
    return () => { setGameActive(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Check if user already played today ─────────────────────────────────────
  useEffect(() => {
    if (!user) return
    supabase.from("contest_entries").select("id").eq("user_id", user.id).eq("puzzle_date", getTodayStr()).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAlreadyPlayed(true)
          setScreen("lobby")   // force back to lobby if already solved
          sessionStorage.removeItem(timerKey)  // clear stale timer
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // ── Restore screen state if timer is running (navigated away mid-game) ─────
  useEffect(() => {
    const saved      = sessionStorage.getItem(timerKey)
    const savedHints = sessionStorage.getItem(timerKey + "_hints")
    const hasSession = saved || savedHints   // ← either key means session exists

    if (hasSession && !alreadyPlayed) {
      const hints = Number(savedHints ?? 0)
      setHintsRevealed(hints)
      const savedAttempt = sessionStorage.getItem(timerKey + "_attempt") ?? ""
      setAttempt(savedAttempt)
      setScreen("playing")
      setGameActive(true, "Daily Contest")
    } else if (hasSession && alreadyPlayed) {
      sessionStorage.removeItem(timerKey)
      sessionStorage.removeItem(timerKey + "_hints")
      sessionStorage.removeItem(timerKey + "_attempt")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerKey, alreadyPlayed])

  // ── Persist hints immediately on every change ────────────────────────────────
  useEffect(() => {
    if (screen === "playing")
      sessionStorage.setItem(timerKey + "_hints", String(hintsRevealed))
  }, [hintsRevealed, screen, timerKey])

  useEffect(() => {
    if (screen === "playing")
      sessionStorage.setItem(timerKey + "_attempt", attempt)
  }, [attempt, screen, timerKey])

  // ── Start/stop RAF based on active screen ───────────────────────────────────
  useEffect(() => {
    if (screen === "playing") {
      resumeRAF()
    } else {
      pauseRAF()
    }
  }, [screen, resumeRAF, pauseRAF])

  const startContest = () => {
    if (!user) { setAuthTab("login"); setShowAuth(true); return }
    const alreadyRunning = !!sessionStorage.getItem(timerKey) || !!sessionStorage.getItem(timerKey + "_hints")
    if (!alreadyRunning) {
      resetTimer()
      setAttempt(""); setHintsRevealed(0); setWrong(false)
    }
    setScreen("playing")
    startTimer()
    setGameActive(true, "Daily Contest")
  }

  const refreshInv = () => setInventory(getOwned())

  const activateFreeze = () => {
    if (!hasItem(ITEM.FREEZE)) return
    useItem(ITEM.FREEZE); refreshInv(); setFrozenSecs(15); pauseRAF()
    const iv = setInterval(() => setFrozenSecs(p => { if(p<=1){clearInterval(iv);resumeRAF();return 0} return p-1 }), 1000)
  }
  const activateReveal = () => {
    if (!hasItem(ITEM.REVEAL)) return
    useItem(ITEM.REVEAL); refreshInv(); setAttempt(puzzle.plaintext[0])
  }
  const activateCipherID = () => {
    if (!hasItem(ITEM.CIPHER)) return
    useItem(ITEM.CIPHER); refreshInv()
    setHintsRevealed(p => { const next = Math.max(p, 1); try { sessionStorage.setItem(timerKey + "_hints", String(next)) } catch {}; return next })
  }
  const activateKeyFrag = () => {
    if (!hasItem(ITEM.KEY)) return
    useItem(ITEM.KEY); refreshInv()
    setHintsRevealed(p => { const next = Math.max(p, 2); try { sessionStorage.setItem(timerKey + "_hints", String(next)) } catch {}; return next })
  }
  const activateFreqMap = () => {
    if (!hasItem(ITEM.FREQ)) return
    useItem(ITEM.FREQ); refreshInv()
    const freq: Record<string,number> = {}
    for (const ch of puzzle.ciphertext.replace(/[^A-Za-z]/g,"").toUpperCase()) freq[ch]=(freq[ch]??0)+1
    setFreqMap(Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,10))
  }

  const checkAnswer = () => {
    const clean = (s: string) => s.toUpperCase().replace(/\s+/g," ").trim()
    if (clean(attempt) === clean(puzzle.plaintext)) {
      stopTimer()
      let s     = calcScore(puzzle.difficulty, seconds, hintsRevealed)
      let delta = calcRatingDelta(puzzle.difficulty, seconds, hintsRevealed)
      if (doubleNext && hasItem(ITEM.DOUBLE)) {
        useItem(ITEM.DOUBLE); setDoubleNext(false); refreshInv()
        s = Math.min(s * 2, 1000); delta = delta * 2
      }
      setScore(s)
      setRatingDelta(delta)
      setScreen("result")
      setGameActive(false)

      // ── Save coins & streak IMMEDIATELY to localStorage (no server needed) ──
      try {
        const today     = getTodayStr()
        const lastKey   = "cv_last_played"
        const streakKey = "cv_streak"
        const lastPlayed  = localStorage.getItem(lastKey) ?? ""
        const curStreak   = Number(localStorage.getItem(streakKey) ?? "0")
        const yesterday   = new Date(); yesterday.setDate(yesterday.getDate() - 1)
        const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,"0")}-${String(yesterday.getDate()).padStart(2,"0")}`
        const newStreak = lastPlayed === yStr ? curStreak + 1 : lastPlayed === today ? curStreak : 1
        localStorage.setItem(streakKey, String(newStreak))
        localStorage.setItem(lastKey, today)

        // Coins
        let earned = 50
        if (s >= 900) earned += 150
        else if (s >= 700) earned += 75
        else if (s >= 500) earned += 25
        if (hintsRevealed === 0) earned += 50
        if (newStreak >= 7) earned += 150
        else if (newStreak >= 3) earned += 50
        addCoins(earned)  // dispatches cv_coins_changed event
        setCoinsEarned(earned)

      } catch {}

      submitResult(s, delta)
    } else {
      if (shielded && hasItem(ITEM.SHIELD)) {
        useItem(ITEM.SHIELD); setShielded(false); refreshInv()
      }
      setWrong(true); setShake(true)
      setTimeout(() => { setWrong(false); setShake(false) }, 600)
    }
  }

  const [saveError, setSaveError] = useState<string | null>(null)
  const [todayStr,  setTodayStr]  = useState("")
  // Hard-cap: if submitting is still true after 12s, force-reset it
  const submittingTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const submitResult = async (finalScore: number, finalDelta: number) => {
    // If user not logged in at all
    if (!user) {
      setSaveError("Not signed in — please log in and retry.")
      return
    }
    // Profile may still be loading — wait up to 3s for it
    if (!profile) {
      let waited = 0
      await new Promise<void>(resolve => {
        const iv = setInterval(() => {
          waited += 200
          if (waited >= 3000) { clearInterval(iv); resolve() }
        }, 200)
      })
      // Re-read profile from context won't work directly, so just retry
      if (!profile) {
        setSaveError("Profile not loaded — please retry.")
        return
      }
    }
    if (submitting) return
    setSaveError(null)
    setSubmitting(true)

    // Safety net: always unblock spinner after 12s no matter what
    clearTimeout(submittingTimerRef.current)
    submittingTimerRef.current = setTimeout(() => {
      setSubmitting(false)
      setSaveError("Request timed out. Check your connection and retry.")
    }, 30000)

    try {
      const today        = getTodayStr()
      const ratingBefore = profile.rating
      const ratingAfter  = ratingBefore + finalDelta
      // Streak: increment if last_played was yesterday, reset to 1 otherwise
      // Compare as local date strings to avoid timezone issues
      const todayDate     = new Date()
      const yesterdayDate = new Date(todayDate); yesterdayDate.setDate(todayDate.getDate() - 1)
      const yStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth()+1).padStart(2,"0")}-${String(yesterdayDate.getDate()).padStart(2,"0")}`
      const newStreak = profile.last_played === yStr
        ? profile.streak + 1
        : profile.last_played === today
          ? profile.streak  // already played today, don't reset
          : 1               // missed a day, reset

      const payload = JSON.stringify({
        user_id:         user.id,
        username:        profile.username,
        puzzle_date:     today,
        puzzle_id:       puzzle.id,
        score:           finalScore,
        time_seconds:    seconds,
        hints_used:      hintsRevealed,
        difficulty:      puzzle.difficulty,
        rating_before:   ratingBefore,
        rating_after:    ratingAfter,
        contests_played: profile.contests_played + 1,
        best_score:      Math.max(profile.best_score, finalScore),
        streak:          newStreak,
        last_played:     today,
      })

      // Auto-retry up to 3 times with increasing timeout
      let res: Response | null = null
      let lastErr = ""
      for (let attempt = 1; attempt <= 3; attempt++) {
        const controller = new AbortController()
        const fetchTimeout = setTimeout(() => controller.abort(), attempt * 10000) // 10s, 20s, 30s
        try {
          res = await fetch("/api/auth/contest", {
            method: "POST", headers: { "Content-Type": "application/json" },
            signal: controller.signal, body: payload,
          })
          clearTimeout(fetchTimeout)
          break // success — exit retry loop
        } catch (err: any) {
          clearTimeout(fetchTimeout)
          lastErr = err?.message ?? "Network error"
          if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt)) // wait 1s, 2s between retries
        }
      }
      if (!res) { setSaveError(`Failed after 3 attempts: ${lastErr}`); return }
      const json = await res.json()
      if (!res.ok) { setSaveError(`${json.error} [${json.code ?? res.status}]`); return }

      // Clear safety timer — save succeeded
      clearTimeout(submittingTimerRef.current)

      // Update profile locally right away — no DB round-trip needed
      updateProfileLocal({
        rating:          ratingAfter,
        contests_played: profile.contests_played + 1,
        best_score:      Math.max(profile.best_score, finalScore),
        streak:          newStreak,
        last_played:     today,
      })
      setAlreadyPlayed(true)
      setSubmitted(true)
      // Sync with DB in background
      Promise.allSettled([refreshProfile(), loadBoard(true)])

      // ── Achievement check ─────────────────────────────────────────────────
      try {
        const { data: ents } = await supabase
          .from("contest_entries").select("hints_used,difficulty,score,time_seconds").eq("user_id", user.id)
        const rows = ents ?? []
        const stats = buildStats({
          contests_played: profile.contests_played + 1,
          best_score:      Math.max(profile.best_score, finalScore),
          rating:          ratingAfter,
          streak:          newStreak,
          noHintSolves:    rows.filter((e:any) => e.hints_used === 0).length,
          hardSolves:      rows.filter((e:any) => e.difficulty === "Hard").length,
          bestTime:        rows.length ? Math.min(...rows.map((e:any) => e.time_seconds)) : 0,
          perfectScores:   rows.filter((e:any) => e.score >= 950).length,
          speedBestSolved: Number(localStorage.getItem("cv_speed_best")       ?? "0"),
          battleWins:      Number(localStorage.getItem("cv_battle_wins")      ?? "0"),
          battlePlayed:    Number(localStorage.getItem("cv_battle_played")    ?? "0"),
          challengeSolved: Number(localStorage.getItem("cv_challenge_solved") ?? "0"),
          challengeHard:   Number(localStorage.getItem("cv_challenge_hard")   ?? "0"),
          coins:           getCoins(),
          itemsBought:     getOwned().length,
        })
        checkAndUnlock(stats).forEach(a => triggerAchievementToast(a))
      } catch {}

      // coins awarded in checkAnswer above
    } catch (e: any) {
      setSaveError(e?.message ?? "Unknown error — check console")
    } finally {
      clearTimeout(submittingTimerRef.current)
      setSubmitting(false)
    }
  }

  const userTodayRank = todayBoard.findIndex(e => e.username === profile?.username) + 1

  // ─── Lobby ──────────────────────────────────────────────────────────────────
  if (screen === "lobby") return (
    <div className="min-h-screen" style={{ background:"#050508" }}>
      <style>{`
        @keyframes cv-up   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cv-pop  { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        @keyframes cv-glow { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes cipher-flicker { 0%,100%{opacity:1} 45%{opacity:0.85} 50%{opacity:1} 92%{opacity:0.9} }
        .cv-u { animation: cv-up  0.45s cubic-bezier(0.23,1,0.32,1) both }
        .cv-p { animation: cv-pop 0.35s cubic-bezier(0.23,1,0.32,1) both }
        .glass { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); }
        .cipher-text { animation: cipher-flicker 4s ease-in-out infinite; }
      `}</style>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} defaultTab={authTab} />}

      <div className="px-6 md:px-10 py-8 max-w-5xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-8 cv-u">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-2xl font-black text-white tracking-tight">Daily Contest</h1>
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                style={{ background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.3)", color:"#4ade80" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>LIVE
              </span>
            </div>
            <p className="text-[13px] text-gray-500">One cipher puzzle every day — same for everyone, globally.</p>
          </div>
          {user && profile ? (
            <div className="flex items-center gap-3 shrink-0">
              {(() => { const t = getTier(profile.rating); return (
                <div className="text-right">
                  <p className="text-[13px] font-bold text-white">{profile.username}</p>
                  <p className="text-[11px] font-mono mt-0.5" style={{ color: t.color.replace("text-","") === "gray-400" ? "#9ca3af" : t.color.replace("text-","") }}>
                    {t.icon} {t.name} · {profile.rating}
                  </p>
                </div>
              )})()}
              <button onClick={signOut}
                className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors px-3 py-1.5 rounded-lg"
                style={{ border:"1px solid rgba(255,255,255,0.08)" }}>
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex gap-2 shrink-0">
              <button onClick={() => { setAuthTab("login"); setShowAuth(true) }}
                className="text-[12px] text-gray-400 hover:text-white px-4 py-2 rounded-xl transition-colors"
                style={{ border:"1px solid rgba(255,255,255,0.1)" }}>Sign In</button>
              <button onClick={() => { setAuthTab("register"); setShowAuth(true) }}
                className="text-[12px] font-bold text-white px-4 py-2 rounded-xl transition-all"
                style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow:"0 0 16px rgba(37,99,235,0.35)" }}>
                Register
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* ── Today's Puzzle Card ── */}
          <div className="lg:col-span-2 rounded-2xl p-6 relative overflow-hidden cv-u"
            style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(96,165,250,0.2)", boxShadow:"0 0 40px rgba(37,99,235,0.08)", animationDelay:"0.05s" }}>
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none opacity-30"
              style={{ background:"radial-gradient(circle,#1d4ed8,transparent)" }}/>

            <div className="flex items-center gap-2 mb-5 relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">Today — {todayStr}</span>
              <span className="text-gray-700">·</span>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${DIFF[puzzle.difficulty].badge}`}>
                {puzzle.difficulty}
              </span>
              <span className="text-[10px] font-mono text-gray-600 px-2 py-0.5 rounded-full"
                style={{ border:"1px solid rgba(255,255,255,0.08)" }}>{puzzle.cipher}</span>
            </div>

            <div className="relative z-10 mb-5">
              <p className="text-[10px] text-gray-700 uppercase tracking-widest mb-2">Decrypt this ciphertext</p>
              <p className="text-[22px] md:text-[26px] font-mono text-white tracking-[0.25em] leading-relaxed cipher-text break-all">
                {puzzle.ciphertext}
              </p>
              <p className="text-[11px] text-gray-800 font-mono mt-1 tracking-widest">{puzzle.plaintext.replace(/[^ ]/g,"·")}</p>
            </div>

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="text-center px-3 py-1.5 rounded-xl" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)" }}>
                  <p className={`text-[20px] font-black leading-none ${DIFF[puzzle.difficulty].text}`}>{puzzle.points}</p>
                  <p className="text-[9px] text-gray-600 uppercase tracking-wider mt-0.5">Max pts</p>
                </div>
                <p className="text-[11px] text-gray-600 font-mono">{puzzle.keyInfo}</p>
              </div>

              {alreadyPlayed ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                  style={{ background:"rgba(74,222,128,0.08)", border:"1px solid rgba(74,222,128,0.3)" }}>
                  <span className="text-emerald-400 text-sm">✓</span>
                  <span className="text-[12px] font-bold text-emerald-400">Completed!</span>
                  {userTodayRank > 0 && <span className="text-[11px] text-gray-500">Rank #{userTodayRank}</span>}
                </div>
              ) : (
                <button onClick={startContest}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-black text-white transition-all"
                  style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow:"0 0 24px rgba(37,99,235,0.4)" }}>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 1.5l7 4-7 4V1.5z" fill="currentColor"/></svg>
                  {user ? "Start Challenge" : "Sign in to Play"}
                </button>
              )}
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-3">
            {/* Countdown */}
            <div className="rounded-2xl p-5 text-center cv-u" style={{ animationDelay:"0.1s", background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-2">Next puzzle in</p>
              <p className="text-[28px] font-black text-white font-mono tracking-wider" style={{ letterSpacing:"0.1em" }}>{countdown}</p>
              <div className="flex gap-2 justify-center mt-2">
                {["HH","MM","SS"].map((l,i) => (
                  <span key={l} className="text-[8px] text-gray-700 uppercase tracking-widest w-8 text-center">{l}</span>
                ))}
              </div>
            </div>

            {/* Profile stats */}
            {profile ? (
              <div className="rounded-2xl p-4 cv-u" style={{ animationDelay:"0.15s", background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)" }}>
                {(() => { const t = getTier(profile.rating); return (<>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-black uppercase tracking-widest border px-2 py-0.5 rounded-full ${t.bg} ${t.color}`}>
                      {t.icon} {t.name}
                    </span>
                    <span className="text-[18px] font-black text-white">{profile.rating}</span>
                  </div>
                  {/* Mini rating bar */}
                  <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background:"rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width:`${Math.min((profile.rating/2500)*100,100)}%`, background:"linear-gradient(90deg,#3b82f6,#8b5cf6)" }}/>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    {[
                      { label:"Played", val: profile.contests_played, color:"#60a5fa" },
                      { label:"Streak", val: profile.streak > 0 ? `${profile.streak}🔥` : "—", color:"#fb923c" },
                      { label:"Best",   val: profile.best_score, color:"#4ade80" },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="rounded-xl py-2" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)" }}>
                        <p className="text-[13px] font-black leading-none" style={{ color }}>{val}</p>
                        <p className="text-[9px] text-gray-700 uppercase tracking-wider mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                </>)})()}
              </div>
            ) : (
              <div className="rounded-2xl p-5 text-center cv-u" style={{ animationDelay:"0.15s", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-3xl mb-2">🎯</p>
                <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">Sign in to track rating and appear on the leaderboard</p>
                <button onClick={() => { setAuthTab("register"); setShowAuth(true) }}
                  className="w-full py-2 rounded-xl text-[12px] font-bold text-white"
                  style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)" }}>
                  Create Account
                </button>
              </div>
            )}
          </div>
        </div>

      {/* ── Leaderboard ── */}
      <div className="rounded-2xl overflow-hidden cv-u" style={{ animationDelay:"0.2s", background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[14px] font-bold text-white">Leaderboard</p>
          <div className="flex gap-1 p-0.5 rounded-lg" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)" }}>
            {(["today","alltime"] as const).map(t => (
              <button key={t} onClick={() => setBoardTab(t)}
                className="px-3 py-1 text-[11px] font-bold rounded-md transition-all"
                style={{ background: boardTab===t ? "rgba(255,255,255,0.1)" : "transparent", color: boardTab===t ? "#fff" : "#4b5563" }}>
                {t==="today" ? "Today" : "All Time"}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
        {boardLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor:"rgba(96,165,250,0.3)", borderTopColor:"#60a5fa" }}/>
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
                    <span className="text-[11px] text-white">{e.streak > 1 ? `${e.streak}🔥` : e.streak}</span>
                  </div>
                )
              })}
            </div>
          )
        )}
        </div>
      </div>
      </div>
    </div>
  )

  // ─── Playing ────────────────────────────────────────────────────────────────
  if (screen === "playing") return (
    <div className="min-h-screen px-6 md:px-10 py-8 max-w-2xl mx-auto" style={{ background:"#050508" }}>
      <style>{`
        @keyframes cv-up  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shake  { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
        @keyframes wrong-flash { 0%{background:rgba(239,68,68,0.15)} 100%{background:transparent} }
        .cv-u { animation:cv-up 0.4s cubic-bezier(0.23,1,0.32,1) both }
        .shake-anim { animation:shake 0.35s ease both }
        .glass { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); }
      `}</style>

      {/* Back */}
      <button onClick={() => { setGameActive(false); setScreen("lobby") }}
        className="flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-gray-300 transition-colors mb-6">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M9.5 6H2.5m0 0L6 2.5M2.5 6L6 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back to Lobby
      </button>

      {/* Cipher card */}
      <div className="rounded-2xl p-6 mb-5 relative overflow-hidden cv-u"
        style={{ background:"rgba(255,255,255,0.025)", border:`1px solid ${puzzle.difficulty==="Hard"?"rgba(248,113,113,0.3)":puzzle.difficulty==="Medium"?"rgba(251,191,36,0.3)":"rgba(74,222,128,0.3)"}`, boxShadow:`0 0 40px ${puzzle.difficulty==="Hard"?"rgba(248,113,113,0.06)":puzzle.difficulty==="Medium"?"rgba(251,191,36,0.06)":"rgba(74,222,128,0.06)"}` }}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-[80px] pointer-events-none opacity-20"
          style={{ background: puzzle.difficulty==="Hard"?"#f87171":puzzle.difficulty==="Medium"?"#fbbf24":"#4ade80" }}/>

        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-widest border px-2.5 py-0.5 rounded-full ${DIFF[puzzle.difficulty].badge}`}>
              {puzzle.difficulty}
            </span>
            <span className="text-[10px] font-mono text-gray-600 px-2 py-0.5 rounded-full"
              style={{ border:"1px solid rgba(255,255,255,0.08)" }}>{puzzle.cipher}</span>
          </div>
          <div className="text-right">
            <p className={`text-[22px] font-black leading-none ${DIFF[puzzle.difficulty].text}`}>
              {calcScore(puzzle.difficulty, seconds, hintsRevealed)}
            </p>
            <p className="text-[9px] text-gray-600 uppercase tracking-wider">points</p>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-[9px] font-bold text-gray-700 uppercase tracking-[0.2em] mb-3">Ciphertext</p>
          <p className="text-[24px] md:text-[28px] font-mono text-white tracking-[0.3em] leading-relaxed break-all">
            {puzzle.ciphertext}
          </p>
          <div className="flex items-center gap-1.5 mt-3">
            <p className="text-[11px] font-mono text-gray-800 tracking-[0.2em]">{puzzle.plaintext.replace(/[^ ]/g,"·")}</p>
            <span className="text-[9px] text-gray-700">{puzzle.plaintext.length} chars</span>
          </div>
        </div>
      </div>

      {/* Answer input */}
      <div className="mb-5 cv-u" style={{ animationDelay:"0.08s" }}>
        <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-2">Your Answer</label>
        <div className={shake ? "shake-anim" : ""}>
          <div className="flex gap-2">
            <input value={attempt} onChange={e => setAttempt(e.target.value)}
              onKeyDown={e => e.key === "Enter" && checkAnswer()}
              placeholder="Type the plaintext here…"
              className="flex-1 px-4 py-3.5 rounded-xl text-[14px] font-mono text-white placeholder-gray-800 outline-none transition-all"
              style={{
                background: wrong ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)",
                border: wrong ? "1.5px solid rgba(239,68,68,0.5)" : "1.5px solid rgba(255,255,255,0.1)",
              }}
              autoFocus/>
            <button onClick={checkAnswer}
              className="px-6 py-3.5 rounded-xl text-[13px] font-black text-white transition-all"
              style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow:"0 0 20px rgba(37,99,235,0.3)" }}>
              Submit
            </button>
          </div>
        </div>
        {wrong && (
          <p className="text-red-400 text-[12px] mt-2 flex items-center gap-1.5">
            <span>✗</span> Incorrect — try again
          </p>
        )}
      </div>

      {/* Power-ups */}
      {inventory.some(i => i.uses > 0) && (
        <div className="mb-5 cv-u" style={{ animationDelay:"0.12s" }}>
          <p className="text-[9px] font-bold text-gray-700 uppercase tracking-[0.2em] mb-2">Power-ups</p>
          <div className="flex flex-wrap gap-2">
            {hasItem(ITEM.FREEZE) && (
              <button onClick={activateFreeze} disabled={frozenSecs>0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all disabled:opacity-40"
                style={{ background:"rgba(34,211,238,0.08)", border:"1px solid rgba(34,211,238,0.25)", color:"#22d3ee" }}>
                ❄️ {frozenSecs > 0 ? `Frozen ${frozenSecs}s` : "Time Freeze"}
              </button>
            )}
            {hasItem(ITEM.REVEAL) && (
              <button onClick={activateReveal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                style={{ background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.25)", color:"#a78bfa" }}>
                🔍 Letter Reveal
              </button>
            )}
            {hasItem(ITEM.CIPHER) && (
              <button onClick={activateCipherID}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                style={{ background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.25)", color:"#fbbf24" }}>
                🏷 Cipher ID
              </button>
            )}
            {hasItem(ITEM.KEY) && (
              <button onClick={activateKeyFrag}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                style={{ background:"rgba(74,222,128,0.08)", border:"1px solid rgba(74,222,128,0.25)", color:"#4ade80" }}>
                🗝 Key Fragment
              </button>
            )}
            {hasItem(ITEM.FREQ) && (
              <button onClick={activateFreqMap}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                style={{ background:"rgba(244,114,182,0.08)", border:"1px solid rgba(244,114,182,0.25)", color:"#f472b6" }}>
                📊 Freq Map
              </button>
            )}
            {shielded && <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[11px]">🛡 Shield Active</span>}
            {doubleNext && <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[11px]">✨ 2× Points</span>}
          </div>
        </div>
      )}

      {/* Frequency map display */}
      {freqMap.length > 0 && (
        <div className="mb-4 bg-pink-900/10 border border-pink-700/20 rounded-xl p-3">
          <p className="text-[10px] text-pink-400 uppercase tracking-widest mb-2">Letter Frequency</p>
          <div className="flex gap-2 flex-wrap">
            {freqMap.map(([ch, n]) => (
              <div key={ch} className="text-center">
                <div className="text-[13px] font-mono font-bold text-white">{ch}</div>
                <div className="text-[10px] text-pink-400">{n}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 cv-u" style={{ animationDelay:"0.16s" }}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[9px] font-bold text-gray-700 uppercase tracking-[0.2em]">Hints</p>
          <p className="text-[10px] text-gray-700">{hintsRevealed}/3 used · {hintsRevealed > 0 ? `−${hintsRevealed * (puzzle.difficulty==="Easy"?10:puzzle.difficulty==="Medium"?25:50)} pts` : "no penalty"}</p>
        </div>
        {puzzle.hints.map((hint, i) => {
          const revealed = i < hintsRevealed
          return (
            <div key={i} className="rounded-xl p-3.5 transition-all duration-300"
              style={{
                background: revealed ? "rgba(251,191,36,0.06)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${revealed ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.06)"}`,
              }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: revealed ? "#fbbf24" : "#374151" }}>
                  Hint {i+1}
                </span>
                {!revealed && i === hintsRevealed && (
                  <button onClick={() => {
                    const next = i + 1
                    setHintsRevealed(next)
                    try { sessionStorage.setItem(timerKey + "_hints", String(next)) } catch {}
                  }}
                  className="text-[11px] font-semibold transition-colors"
                  style={{ color:"#6b7280" }}
                  onMouseEnter={e=>(e.currentTarget.style.color="#fbbf24")}
                  onMouseLeave={e=>(e.currentTarget.style.color="#6b7280")}>
                    Reveal (−{puzzle.difficulty==="Easy"?10:puzzle.difficulty==="Medium"?25:50} pts)
                  </button>
                )}
                {!revealed && i > hintsRevealed && (
                  <span className="text-[10px] text-gray-800">Unlock hint {i} first</span>
                )}
              </div>
              {revealed && <p className="text-[12px] text-gray-300 mt-1.5 leading-relaxed">{hint}</p>}
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
    const isPerfect = hintsRevealed === 0

    return (
      <div className="min-h-screen px-6 md:px-10 py-12 max-w-2xl mx-auto" style={{ background:"#050508" }}>
        <style>{`
          @keyframes cv-up  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
          @keyframes cv-pop { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
          @keyframes score-count { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
          @keyframes tier-up { 0%{transform:scale(1)} 50%{transform:scale(1.08)} 100%{transform:scale(1)} }
          .cv-u { animation:cv-up  0.45s cubic-bezier(0.23,1,0.32,1) both }
          .cv-p { animation:cv-pop 0.4s cubic-bezier(0.23,1,0.32,1) both }
          .tier-up { animation:tier-up 0.6s ease both }
        `}</style>

        {/* Hero */}
        <div className="text-center mb-8 cv-u">
          <div className="relative inline-block mb-5">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl mx-auto"
              style={{ background:"rgba(74,222,128,0.1)", border:"2px solid rgba(74,222,128,0.3)", boxShadow:"0 0 48px rgba(74,222,128,0.15)" }}>
              🔓
            </div>
            {isPerfect && (
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center text-base"
                style={{ background:"rgba(251,191,36,0.2)", border:"1px solid rgba(251,191,36,0.4)" }}>
                ⭐
              </div>
            )}
          </div>
          <h2 className="text-[28px] font-black text-white mb-1">
            {isPerfect ? "Perfect Solve!" : "Challenge Complete!"}
          </h2>
          <p className="text-[13px] text-gray-500">
            You cracked today's <span className="text-white font-semibold">{puzzle.cipher}</span> cipher
            {isPerfect && <span className="text-amber-400 ml-1">with no hints</span>}
          </p>
          {tierUp && (
            <div className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-full tier-up"
              style={{ background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.35)" }}>
              <span className="text-amber-400">🎉</span>
              <span className="text-[13px] font-black text-amber-400">Tier Up! {oldTier.name} → {newTier.name}</span>
            </div>
          )}
        </div>

        {/* Score cards */}
        <div className="grid grid-cols-4 gap-3 mb-5 cv-u" style={{ animationDelay:"0.08s" }}>
          {[
            { label:"Score",  value: score.toString(), color:"#4ade80",  big:true },
            { label:"Time",   value: formatTime(seconds), color:"#60a5fa" },
            { label:"Hints",  value: `${hintsRevealed}/3`, color: hintsRevealed===0 ? "#4ade80" : "#fbbf24" },
            { label:"Rating", value: `+${ratingDelta}`, color:"#a78bfa" },
          ].map(({ label, value, color, big }) => (
            <div key={label} className="rounded-2xl p-3.5 text-center"
              style={{ background:"rgba(255,255,255,0.025)", border:`1px solid ${color}25` }}>
              <p className="font-black leading-none mb-1" style={{ fontSize: big ? "26px" : "20px", color }}>{value}</p>
              <p className="text-[9px] text-gray-600 uppercase tracking-widest">{label}</p>
            </div>
          ))}
        </div>

        {/* Rating progress */}
        <div className="rounded-2xl p-5 mb-4 cv-u" style={{ animationDelay:"0.14s", background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-bold text-white">Contest Rating</p>
            <span className={`text-[10px] font-black uppercase tracking-widest border px-2.5 py-0.5 rounded-full ${newTier.bg} ${newTier.color}`}>
              {newTier.icon} {newTier.name}
            </span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[11px] font-mono text-gray-600">{currentRating}</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width:`${Math.min((newRating/2500)*100,100)}%`, background:"linear-gradient(90deg,#3b82f6,#8b5cf6)" }}/>
            </div>
            <span className="text-[13px] font-black text-white">{newRating}</span>
          </div>
          <div className="flex justify-between px-0.5">
            {TIERS.map(t => <span key={t.name} className={`text-[9px] ${t.color}`}>{t.icon}</span>)}
          </div>
        </div>

        {/* Save status */}
        {!user ? (
          <div className="rounded-2xl p-4 mb-4 cv-u" style={{ animationDelay:"0.18s", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-[12px] text-gray-500">🔒 Sign in to save your score to the global leaderboard.</p>
          </div>
        ) : submitting ? (
          <div className="rounded-2xl p-4 mb-4 flex items-center gap-3 cv-u" style={{ animationDelay:"0.18s", background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)" }}>
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin shrink-0"
              style={{ borderColor:"rgba(96,165,250,0.3)", borderTopColor:"#60a5fa" }}/>
            <div>
              <p className="text-[12px] font-bold text-white">Saving to leaderboard…</p>
              <p className="text-[11px] text-gray-600 mt-0.5">This can take up to 10s on first save of the day</p>
            </div>
          </div>
        ) : saveError ? (
          <div className="rounded-2xl p-4 mb-4 cv-u" style={{ animationDelay:"0.18s", background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.3)" }}>
            <p className="text-[12px] font-bold text-red-400 mb-1">Save failed</p>
            <p className="text-[11px] text-red-400/70 font-mono mb-3 break-all">{saveError}</p>
            <button onClick={() => submitResult(score, ratingDelta)}
              className="w-full py-2 rounded-xl text-[12px] font-bold text-red-400 transition-all"
              style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)" }}>
              Retry Save
            </button>
          </div>
        ) : submitted ? (
          <div className="rounded-2xl p-4 mb-4 flex items-center gap-3 cv-u" style={{ animationDelay:"0.18s", background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.3)" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background:"rgba(74,222,128,0.15)", border:"1px solid rgba(74,222,128,0.3)" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7l4 4 6-6" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-bold text-emerald-400">Saved to global leaderboard!</p>
              <div className="flex items-center gap-3 mt-0.5">
                {userTodayRank > 0 && <p className="text-[11px] text-gray-500">Rank #{userTodayRank} today</p>}
                {coinsEarned > 0 && <p className="text-[11px] text-amber-400">🪙 +{coinsEarned} coins</p>}
              </div>
            </div>
          </div>
        ) : null}

        <button onClick={() => setScreen("lobby")}
          className="w-full py-3 rounded-2xl text-[13px] font-bold text-gray-400 transition-all cv-u"
          style={{ animationDelay:"0.22s", border:"1px solid rgba(255,255,255,0.08)" }}
          onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.color="#fff";(e.currentTarget as HTMLButtonElement).style.borderColor="rgba(255,255,255,0.2)"}}
          onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.color="#9ca3af";(e.currentTarget as HTMLButtonElement).style.borderColor="rgba(255,255,255,0.08)"}}>
          Back to Lobby
        </button>
      </div>
    )
  }

  return null
}