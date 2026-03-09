"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/lib/AuthContext"
import { useGame } from "@/lib/GameContext"
import { supabase, type LeaderboardRow, type AllTimeRow } from "@/lib/supabase"
import AuthModal from "@/components/AuthModal"

// ─── Puzzle pool ───────────────────────────────────────────────────────────────
interface Puzzle {
  id: string; cipher: string; plaintext: string; ciphertext: string
  hints: string[]; difficulty: "Easy" | "Medium" | "Hard"; keyInfo: string; points: number
}

const ALL_PUZZLES: Puzzle[] = [
  // ── Caesar ──────────────────────────────────────────────────────────────────
  { id:"d1",  cipher:"Caesar", difficulty:"Easy",   points:100, keyInfo:"Shift: 3",
    plaintext:"HELLO WORLD",           ciphertext:"KHOOR ZRUOG",
    hints:["Caesar cipher — fixed shift","Shift is between 1–5","Shift = 3"] },
  { id:"d2",  cipher:"Caesar", difficulty:"Easy",   points:100, keyInfo:"Shift: 7",
    plaintext:"CRYPTOGRAPHY",          ciphertext:"JYFWAVNYHWOF",
    hints:["Caesar cipher","Shift is between 5–10","Shift = 7"] },
  { id:"d3",  cipher:"Caesar", difficulty:"Easy",   points:100, keyInfo:"Shift: 13",
    plaintext:"NEVER GIVE UP",         ciphertext:"ARIRE TVIR HC",
    hints:["ROT-13 is a special case","Shift = 13","Each letter shifts halfway"] },
  { id:"d4",  cipher:"Caesar", difficulty:"Easy",   points:100, keyInfo:"Shift: 1",
    plaintext:"MEET ME AT NOON",       ciphertext:"NFFU NF BU OPPO",
    hints:["Very small shift","Shift = 1","N→M, F→E"] },
  { id:"d5",  cipher:"Caesar", difficulty:"Easy",   points:100, keyInfo:"Shift: 4",
    plaintext:"KEEP IT SECRET",        ciphertext:"OIIT MX WIGVIX",
    hints:["Caesar cipher","Shift is between 3–6","Shift = 4"] },
  { id:"d6",  cipher:"Caesar", difficulty:"Easy",   points:100, keyInfo:"Shift: 10",
    plaintext:"BREAK THE CODE",        ciphertext:"LBOKU DRO MYNO",
    hints:["Caesar cipher","Shift is between 8–12","Shift = 10"] },
  { id:"d7",  cipher:"Caesar", difficulty:"Medium", points:200, keyInfo:"Shift: 19",
    plaintext:"DEFEND THE CASTLE",     ciphertext:"WXOXWM MAX VTLMAX",
    hints:["Large shift value","Shift > 15","Shift = 19"] },
  { id:"d8",  cipher:"Caesar", difficulty:"Medium", points:200, keyInfo:"Shift: 17",
    plaintext:"SOUND THE ALARM",       ciphertext:"JLFEU KYV RCRIT",
    hints:["Caesar cipher","Shift > 14","Shift = 17"] },
  { id:"d9",  cipher:"Caesar", difficulty:"Medium", points:200, keyInfo:"Shift: 21",
    plaintext:"TRUST NO ONE",          ciphertext:"OMJNO IJ JIZ",
    hints:["Shift is close to the end of the alphabet","Shift > 18","Shift = 21"] },
  { id:"d10", cipher:"Caesar", difficulty:"Medium", points:200, keyInfo:"Shift: 23",
    plaintext:"THE QUICK BROWN FOX",   ciphertext:"QEB NRFZH YOLTK CLU",
    hints:["Unusual shift — try reverse direction","Shift = 23 or -3","Q→T, E→H, B→E"] },

  // ── Vigenère ────────────────────────────────────────────────────────────────
  { id:"d11", cipher:"Vigenère", difficulty:"Medium", points:250, keyInfo:"Key: LEMON",
    plaintext:"ATTACK AT DAWN",        ciphertext:"LXFOPV EF RNHR",
    hints:["Polyalphabetic substitution","5-letter keyword","Key = LEMON"] },
  { id:"d12", cipher:"Vigenère", difficulty:"Medium", points:250, keyInfo:"Key: KEY",
    plaintext:"SEND HELP NOW",         ciphertext:"COXY RITP XGD",
    hints:["Vigenère cipher","3-letter keyword","Key = KEY"] },
  { id:"d13", cipher:"Vigenère", difficulty:"Medium", points:300, keyInfo:"Key: BEAM",
    plaintext:"WINTER IS COMING",      ciphertext:"XMPXIW MW GOQQVO",
    hints:["4-letter keyword","Repeating key","Key = BEAM"] },
  { id:"d14", cipher:"Vigenère", difficulty:"Medium", points:250, keyInfo:"Key: CAT",
    plaintext:"HIDE AND SEEK",         ciphertext:"JMLG CPF UGGM",
    hints:["Short 3-letter key","Animal keyword","Key = CAT"] },
  { id:"d15", cipher:"Vigenère", difficulty:"Medium", points:250, keyInfo:"Key: SUN",
    plaintext:"DARKNESS FALLS",        ciphertext:"VFEYBLVL XSPWV",
    hints:["3-letter keyword","Nature-themed key","Key = SUN"] },
  { id:"d16", cipher:"Vigenère", difficulty:"Hard",   points:400, keyInfo:"Key: CRYPTO",
    plaintext:"RENDEZVOUS AT MIDNIGHT",ciphertext:"TIVHZBCCL LD EIFPVZOYP",
    hints:["Long polyalphabetic key","6-letter keyword","Key = CRYPTO"] },
  { id:"d17", cipher:"Vigenère", difficulty:"Hard",   points:400, keyInfo:"Key: SHADOW",
    plaintext:"THE MISSION IS COMPLETE",ciphertext:"LYM FEJWBHB PK UHIBEMLM",
    hints:["6-letter keyword","Dark-themed key","Key = SHADOW"] },
  { id:"d18", cipher:"Vigenère", difficulty:"Hard",   points:450, keyInfo:"Key: ENIGMA",
    plaintext:"BREAK ALL BARRIERS",    ciphertext:"FSIET ERL BGVVMIVW",
    hints:["6-letter keyword","Famous cipher machine name","Key = ENIGMA"] },
  { id:"d19", cipher:"Vigenère", difficulty:"Hard",   points:400, keyInfo:"Key: BLAZE",
    plaintext:"STORM THE FORTRESS",    ciphertext:"HWGVQ XLM JSKLVIWW",
    hints:["5-letter keyword","Fire-themed key","Key = BLAZE"] },
  { id:"d20", cipher:"Vigenère", difficulty:"Hard",   points:500, keyInfo:"Key: QUANTUM",
    plaintext:"SECURE THE PERIMETER",  ciphertext:"IUYNYC XLM DMVQQMXMV",
    hints:["7-letter keyword","Physics-themed key","Key = QUANTUM"] },

  // ── Rail Fence ──────────────────────────────────────────────────────────────
  { id:"d21", cipher:"Rail Fence", difficulty:"Easy",   points:100, keyInfo:"Rails: 2",
    plaintext:"HELLO WORLD",           ciphertext:"HLOOLELWRD",
    hints:["2-rail zigzag","Alternate letters on each rail","Read top rail then bottom"] },
  { id:"d22", cipher:"Rail Fence", difficulty:"Medium", points:250, keyInfo:"Rails: 3",
    plaintext:"WE ARE DISCOVERED",     ciphertext:"WAREISERDECOVD",
    hints:["Transposition cipher","Text written in zigzag","3 rails"] },
  { id:"d23", cipher:"Rail Fence", difficulty:"Medium", points:250, keyInfo:"Rails: 3",
    plaintext:"FLEE AT ONCE",          ciphertext:"FLATEOEC",
    hints:["Rail fence — 3 rails","No substitution, only rearrangement","Read each rail in order"] },
  { id:"d24", cipher:"Rail Fence", difficulty:"Medium", points:250, keyInfo:"Rails: 4",
    plaintext:"MEET AT MIDNIGHT",      ciphertext:"MAMTMDETETIIGH",
    hints:["4-rail zigzag","More rails = harder to crack","Read rail by rail top to bottom"] },
  { id:"d25", cipher:"Rail Fence", difficulty:"Hard",   points:400, keyInfo:"Rails: 5",
    plaintext:"CRYPTOGRAPHY IS AN ART",ciphertext:"CPAYOHAIRGRNRTSAANT",
    hints:["5-rail zigzag","Count positions carefully","Each rail is read left to right"] },

  // ── Playfair ────────────────────────────────────────────────────────────────
  { id:"d26", cipher:"Playfair", difficulty:"Hard", points:500, keyInfo:"Key: PLAYFAIR",
    plaintext:"HIDE THE GOLD",         ciphertext:"BMNDZBXDKYBEJV",
    hints:["Digraph cipher with 5×5 grid","Keyword fills the grid first","Key = PLAYFAIR"] },
  { id:"d27", cipher:"Playfair", difficulty:"Hard", points:500, keyInfo:"Key: MONARCHY",
    plaintext:"BALLOON",               ciphertext:"IBSUPMNA",
    hints:["5×5 Playfair grid","Double letters are split with X","Key = MONARCHY"] },
  { id:"d28", cipher:"Playfair", difficulty:"Hard", points:500, keyInfo:"Key: SECRET",
    plaintext:"MEET ME LATER",         ciphertext:"OIQZOQNIKOB",
    hints:["Digraph substitution cipher","I and J share a cell in the grid","Key = SECRET"] },

  // ── Monoalphabetic ──────────────────────────────────────────────────────────
  { id:"d29", cipher:"Monoalphabetic", difficulty:"Hard", points:500, keyInfo:"Key: QWERTY...",
    plaintext:"THE ENEMY ADVANCES",    ciphertext:"ZIT TCTPA QBVQCMTS",
    hints:["Each letter maps to exactly one other","Frequency analysis helps","A→Q, B→W, C→E..."] },
  { id:"d30", cipher:"Monoalphabetic", difficulty:"Hard", points:500, keyInfo:"Key: ZEBRAS...",
    plaintext:"ATTACK AT DAWN",        ciphertext:"ZFFZPM ZF YZON",
    hints:["Keyword-based substitution","Keyword = ZEBRAS","Z→A, E→B, B→C..."] },
  { id:"d31", cipher:"Monoalphabetic", difficulty:"Hard", points:500, keyInfo:"Atbash",
    plaintext:"HELLO WORLD",           ciphertext:"SVOOL DLIOW",
    hints:["Mirror substitution","A maps to Z, B to Y...","Atbash: reverse alphabet"] },
  { id:"d32", cipher:"Monoalphabetic", difficulty:"Hard", points:500, keyInfo:"Atbash",
    plaintext:"CRYPTOGRAPHY",          ciphertext:"XIBKGLTIZKSB",
    hints:["Each letter is mirrored","A↔Z, B↔Y, C↔X...","Atbash cipher — reverse alphabet"] },
  { id:"d33", cipher:"Monoalphabetic", difficulty:"Hard", points:500, keyInfo:"Key: DRAGON...",
    plaintext:"VICTORY IS OURS",       ciphertext:"LKZQMHY KA MTHA",
    hints:["Substitution cipher","Keyword starts with an animal","Key = DRAGON"] },

  // ── Columnar Transposition ───────────────────────────────────────────────────
  { id:"d34", cipher:"Columnar", difficulty:"Medium", points:300, keyInfo:"Key: CAT (3 cols)",
    plaintext:"MEET ME TOMORROW",      ciphertext:"EEMOTEMTMROO WR",
    hints:["Letters are rearranged by column order","3 columns used","Key = CAT, column order 1-3-2"] },
  { id:"d35", cipher:"Columnar", difficulty:"Hard",   points:450, keyInfo:"Key: ZEBRA (5 cols)",
    plaintext:"ATTACK AT DAWN",        ciphertext:"TAAADAKCTWTN",
    hints:["Transposition cipher","5 columns, reordered by alphabetical key","Key = ZEBRA"] },

  // ── Affine ──────────────────────────────────────────────────────────────────
  { id:"d36", cipher:"Affine", difficulty:"Medium", points:300, keyInfo:"a=5, b=8",
    plaintext:"AFFINE CIPHER",         ciphertext:"IHHWVC SWFRCP",
    hints:["Formula: E(x) = (ax + b) mod 26","a and b are the keys","a=5, b=8"] },
  { id:"d37", cipher:"Affine", difficulty:"Hard",   points:400, keyInfo:"a=7, b=3",
    plaintext:"MATHEMATICS",           ciphertext:"DXQITDXQTLJ",
    hints:["Affine cipher: E(x) = (ax+b) mod 26","a must be coprime with 26","a=7, b=3"] },

  // ── Beaufort ─────────────────────────────────────────────────────────────────
  { id:"d38", cipher:"Beaufort", difficulty:"Hard", points:450, keyInfo:"Key: NAVY",
    plaintext:"OPEN FIRE",             ciphertext:"NDVE HBZS",
    hints:["Similar to Vigenère but uses subtraction","E(x) = (key - plain) mod 26","Key = NAVY"] },
  { id:"d39", cipher:"Beaufort", difficulty:"Hard", points:450, keyInfo:"Key: OCEAN",
    plaintext:"STRIKE NOW",            ciphertext:"CMKBOS DJK",
    hints:["Beaufort cipher — naval origin","Key letter minus plaintext letter","Key = OCEAN"] },

  // ── ROT13 / ROT47 ────────────────────────────────────────────────────────────
  { id:"d40", cipher:"ROT13", difficulty:"Easy", points:80, keyInfo:"Shift: 13",
    plaintext:"HELLO",                 ciphertext:"URYYB",
    hints:["Special case of Caesar","Shift = 13","Self-inverse: ROT13(ROT13(x)) = x"] },
  { id:"d41", cipher:"ROT13", difficulty:"Easy", points:80, keyInfo:"Shift: 13",
    plaintext:"SECRET MESSAGE",        ciphertext:"FRPERG ZRFFNTR",
    hints:["ROT13 cipher","Each letter shifts by 13","Apply ROT13 again to decode"] },

  // ── Mixed difficulty extras ──────────────────────────────────────────────────
  { id:"d42", cipher:"Caesar", difficulty:"Easy",   points:100, keyInfo:"Shift: 5",
    plaintext:"CODE BREAKER",          ciphertext:"HTIJ GWTFPJW",
    hints:["Caesar cipher","Single digit shift","Shift = 5"] },
  { id:"d43", cipher:"Caesar", difficulty:"Easy",   points:100, keyInfo:"Shift: 8",
    plaintext:"DANGER AHEAD",          ciphertext:"LIVOMZ IPMIL",
    hints:["Caesar cipher","Shift < 10","Shift = 8"] },
  { id:"d44", cipher:"Vigenère", difficulty:"Medium", points:250, keyInfo:"Key: WOLF",
    plaintext:"HOWL AT THE MOON",      ciphertext:"DCKW WT XPM ACFF",
    hints:["4-letter keyword","Animal keyword","Key = WOLF"] },
  { id:"d45", cipher:"Vigenère", difficulty:"Medium", points:250, keyInfo:"Key: FIRE",
    plaintext:"BURN IT DOWN",          ciphertext:"GZIP WX HVAP",
    hints:["4-letter keyword","Element keyword","Key = FIRE"] },
  { id:"d46", cipher:"Rail Fence", difficulty:"Easy", points:100, keyInfo:"Rails: 2",
    plaintext:"STRIKE FIRST",          ciphertext:"SIEFRTRKITS",
    hints:["2-rail zigzag","Alternate odd and even positioned letters","Read top then bottom"] },
  { id:"d47", cipher:"Caesar", difficulty:"Hard",   points:300, keyInfo:"Shift: 25",
    plaintext:"YIELD TO NONE",         ciphertext:"XHDKC SN MNMD",
    hints:["Almost full rotation","Shift = 25 or -1","Y→X, I→H, E→D..."] },
  { id:"d48", cipher:"Vigenère", difficulty:"Hard",   points:400, keyInfo:"Key: PYTHON",
    plaintext:"HACK THE SYSTEM",       ciphertext:"WOCZ FVM HLFXMZ",
    hints:["6-letter keyword","Programming language keyword","Key = PYTHON"] },
  { id:"d49", cipher:"Monoalphabetic", difficulty:"Hard", points:500, keyInfo:"ROT5 digits",
    plaintext:"ZERO ONE TWO",          ciphertext:"ETGF FET KBF",
    hints:["Each letter has a unique mapping","Look for short words first","Z→E, E→T, R→G..."] },
  { id:"d50", cipher:"Vigenère", difficulty:"Hard",   points:500, keyInfo:"Key: MATRIX",
    plaintext:"FOLLOW THE WHITE RABBIT",ciphertext:"RZYBZD XPM DBGXM VEHZAL",
    hints:["6-letter keyword","Famous movie keyword","Key = MATRIX"] },
  { id:"d51", cipher:"Caesar", difficulty:"Easy",   points:100, keyInfo:"Shift: 2",
    plaintext:"SPY GAME",              ciphertext:"URA ICOG",
    hints:["Very small shift","Shift < 3","Shift = 2"] },
  { id:"d52", cipher:"Caesar", difficulty:"Medium", points:200, keyInfo:"Shift: 15",
    plaintext:"LOCK AND KEY",          ciphertext:"ADLT PCR ZTN",
    hints:["Medium shift","Shift > 12","Shift = 15"] },
  { id:"d53", cipher:"Vigenère", difficulty:"Medium", points:250, keyInfo:"Key: MOON",
    plaintext:"DARK SIDE",             ciphertext:"PORY WMLM",
    hints:["4-letter keyword","Celestial body keyword","Key = MOON"] },
  { id:"d54", cipher:"Rail Fence", difficulty:"Medium", points:250, keyInfo:"Rails: 3",
    plaintext:"THE QUICK BROWN FOX",   ciphertext:"TCWNHUKRWOFEOIBX",
    hints:["3-rail zigzag","Classic pangram","Read each rail top to bottom"] },
  { id:"d55", cipher:"Monoalphabetic", difficulty:"Hard", points:500, keyInfo:"Key: CIPHER...",
    plaintext:"BREAK THE ENIGMA",      ciphertext:"BSAWK TZW WLCPNK",
    hints:["Keyword substitution","Keyword starts with a cryptography term","Key = CIPHER"] },
  { id:"d56", cipher:"Caesar", difficulty:"Easy",   points:100, keyInfo:"Shift: 6",
    plaintext:"FIND THE KEY",          ciphertext:"LOTJ ZNK QKE",
    hints:["Caesar cipher","Shift < 8","Shift = 6"] },
  { id:"d57", cipher:"Vigenère", difficulty:"Hard",   points:450, keyInfo:"Key: GHOST",
    plaintext:"VANISH INTO THIN AIR",  ciphertext:"BCFZLN ZHBH ALHU AZF",
    hints:["5-letter keyword","Spooky keyword","Key = GHOST"] },
  { id:"d58", cipher:"Caesar", difficulty:"Medium", points:200, keyInfo:"Shift: 12",
    plaintext:"HIDE YOUR TRACKS",      ciphertext:"TQPQ KAGd FDMOUA",
    hints:["Medium shift","Shift > 10","Shift = 12"] },
  { id:"d59", cipher:"Monoalphabetic", difficulty:"Hard", points:500, keyInfo:"Atbash",
    plaintext:"THE DARK KNIGHT",       ciphertext:"GSV WZIP PMRTSG",
    hints:["Mirror substitution","A↔Z B↔Y C↔X...","Atbash — decode by applying again"] },
  { id:"d60", cipher:"Vigenère", difficulty:"Hard",   points:500, keyInfo:"Key: FALCON",
    plaintext:"EXECUTE ORDER NOW",     ciphertext:"JXIYWXI SHEIV RBD",
    hints:["6-letter keyword","Bird of prey keyword","Key = FALCON"] },
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
  const { user, profile, signOut, refreshProfile } = useAuth()
  const { setGameActive, requestLeave } = useGame()
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
  const { elapsed: seconds, start: startTimer, stop: stopTimer, reset: resetTimer, resumeRAF, pauseRAF } = usePersistentTimer(timerKey)

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

  // Always clear game lock on unmount
  useEffect(() => {
    return () => { setGameActive(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Check if user already played today ─────────────────────────────────────
  useEffect(() => {
    if (!user) return
    supabase.from("contest_entries").select("id").eq("user_id", user.id).eq("puzzle_date", getTodayStr()).maybeSingle()
      .then(({ data }) => setAlreadyPlayed(!!data))
  }, [user])

  // ── Restore screen state if timer is running (navigated away mid-game) ─────
  useEffect(() => {
    const saved = sessionStorage.getItem(timerKey)
    if (saved) {
      setScreen("playing")
      setGameActive(true, "Daily Contest")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerKey])

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
    const alreadyRunning = !!sessionStorage.getItem(timerKey)
    if (!alreadyRunning) {
      resetTimer()
      setAttempt(""); setHintsRevealed(0); setWrong(false)
    }
    setScreen("playing")
    startTimer() // call directly — no setTimeout delay
    setGameActive(true, "Daily Contest")
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
      setGameActive(false)
      submitResult(s, delta)
    } else {
      setWrong(true); setShake(true)
      setTimeout(() => { setWrong(false); setShake(false) }, 600)
    }
  }

  const [saveError, setSaveError] = useState<string | null>(null)
  // Hard-cap: if submitting is still true after 12s, force-reset it
  const submittingTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const submitResult = async (finalScore: number, finalDelta: number) => {
    // If user/profile not ready yet, show retry instead of silent hang
    if (!user || !profile) {
      setSaveError("Not signed in — please log in and retry.")
      return
    }
    if (submitting) return
    setSaveError(null)
    setSubmitting(true)

    // Safety net: always unblock spinner after 12s no matter what
    clearTimeout(submittingTimerRef.current)
    submittingTimerRef.current = setTimeout(() => {
      setSubmitting(false)
      setSaveError("Request timed out. Check your connection and retry.")
    }, 12000)

    try {
      const today        = getTodayStr()
      const ratingBefore = profile.rating
      const ratingAfter  = ratingBefore + finalDelta
      const yesterday    = new Date(); yesterday.setDate(yesterday.getDate() - 1)
      const yStr         = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,"0")}-${String(yesterday.getDate()).padStart(2,"0")}`
      const newStreak    = profile.last_played === yStr ? profile.streak + 1 : 1

      const { error: insertErr } = await supabase.from("contest_entries").insert({
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
      })

      if (insertErr && insertErr.code !== "23505") {
        setSaveError(`${insertErr.message} [${insertErr.code}]`)
        return
      }

      const { error: updateErr } = await supabase.from("profiles").update({
        rating:          ratingAfter,
        contests_played: profile.contests_played + 1,
        best_score:      Math.max(profile.best_score, finalScore),
        streak:          newStreak,
        last_played:     today,
      }).eq("id", user.id)

      if (updateErr) {
        setSaveError(`${updateErr.message} [${updateErr.code}]`)
        return
      }

      await Promise.allSettled([refreshProfile(), loadBoard()])
      setAlreadyPlayed(true)
      setSubmitted(true)
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
                  { label:"Streak",  val: profile.streak > 1 ? `${profile.streak} 🔥` : `—` },
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
                    <span className="text-[11px] text-white">{e.streak > 1 ? `${e.streak}🔥` : e.streak}</span>
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
        <button onClick={() => { setGameActive(false); setScreen("lobby") }}
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

        {/* Save status */}
        {!user ? (
          <div className="bg-gray-900/60 border border-gray-800/60 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <span className="text-gray-500 text-[12px]">🔒 Sign in to save your score to the leaderboard.</span>
          </div>
        ) : submitting ? (
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