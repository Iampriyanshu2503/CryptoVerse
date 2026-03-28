"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/AuthContext"
import { supabase } from "@/lib/supabase"
import { getCoins, getOwned } from "@/lib/inventory"
import { checkAndUnlock, buildStats } from "@/lib/achievements"
import { triggerAchievementToast } from "@/components/AchievementToast"
import AuthModal from "@/components/AuthModal"
import { BATTLE_PUZZLES } from "@/lib/puzzles-battle"

// ── Puzzle pool ───────────────────────────────────────────────────────────────

function getPuzzle(seed: number) {
  return BATTLE_PUZZLES[seed % BATTLE_PUZZLES.length]
}

type BattleStatus = "idle" | "waiting" | "ready" | "playing" | "waiting_result" | "won" | "lost" | "draw"

interface Room {
  id:           string
  puzzle_seed:  number
  player1:      string
  player2:      string | null
  p1_done:      boolean
  p2_done:      boolean
  p1_time:      number | null
  p2_time:      number | null
  winner:       string | null
  created_at:   string
}

export default function BattlePage() {
  const { user, profile } = useAuth()
  const [showAuth,  setShowAuth]  = useState(false)
  const [status,    setStatus]    = useState<BattleStatus>("idle")
  const [copied,    setCopied]    = useState(false)
  const [joinErr,   setJoinErr]   = useState<string | null>(null)
  const [createErr, setCreateErr] = useState<string | null>(null)
  const [creating,  setCreating]  = useState(false)
  const [roomId,    setRoomId]    = useState<string | null>(null)
  const [room,      setRoom]      = useState<Room | null>(null)
  const [answer,    setAnswer]    = useState("")
  const [wrong,     setWrong]     = useState(false)
  const [shake,     setShake]     = useState(false)
  const [elapsed,   setElapsed]   = useState(0)
  const [opStatus,  setOpStatus]  = useState<"thinking" | "done">("thinking")
  const startRef  = useRef<number>(0)
  const timerRef  = useRef<NodeJS.Timeout>()
  const inputRef  = useRef<HTMLInputElement>(null)

  const puzzle = room ? getPuzzle(room.puzzle_seed) : null

  // ── Subscribe to room changes ───────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return
    const channel = supabase
      .channel(`battle:${roomId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "battle_rooms",
        filter: `id=eq.${roomId}`,
      }, payload => {
        const r = payload.new as Room
        setRoom(r)

        // Opponent joined → start game
        if (r.player2 && status === "waiting") {
          setStatus("playing")
          startRef.current = Date.now()
          timerRef.current = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
          }, 1000)
          setTimeout(() => inputRef.current?.focus(), 100)
        }

        // Opponent finished
        const isP1 = r.player1 === profile?.username
        const opDone = isP1 ? r.p2_done : r.p1_done
        if (opDone) setOpStatus("done")

        // Both done → resolve winner (handles waiting_result state too)
        if (r.winner) {
          clearInterval(timerRef.current)
          if (r.winner === "draw") setStatus("draw")
          else if (r.winner === profile?.username) setStatus("won")
          else setStatus("lost")
        }
        // Opponent just finished while we're waiting_result → check winner
        const weAreDone = isP1 ? r.p1_done : r.p2_done
        if (weAreDone && opDone && !r.winner) {
          // Both done but winner not set yet — set it now
          const myTime  = isP1 ? r.p1_time : r.p2_time
          const theirTime = isP1 ? r.p2_time : r.p1_time
          let winner = "draw"
          if (theirTime === null || (myTime !== null && myTime < theirTime)) winner = profile?.username ?? "draw"
          else if (myTime === null || myTime > theirTime) winner = isP1 ? (r.player2 ?? "draw") : r.player1
          supabase.from("battle_rooms").update({ winner }).eq("id", r.id)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId, status, profile])

  // ── Create room ─────────────────────────────────────────────────────────────
  const createRoom = async () => {
    if (!user || !profile) { setShowAuth(true); return }
    setCreateErr(null)
    setCreating(true)
    try {
      const seed = Math.floor(Math.random() * BATTLE_PUZZLES.length)
      const res  = await fetch("/api/auth/battle", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "create", player1: profile.username, puzzle_seed: seed }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setCreateErr(json.error ?? "Failed to create room"); return }
      setRoom(json.room as Room); setRoomId(json.room.id); setStatus("waiting")
    } catch (e: any) {
      setCreateErr(e?.message ?? "Network error")
    } finally {
      setCreating(false)
    }
  }

  // ── Join room ───────────────────────────────────────────────────────────────
  const [joinCode, setJoinCode] = useState("")
  const [showSql,  setShowSql]  = useState(false)
  const [joining,  setJoining]  = useState(false)

  const joinRoom = async () => {
    if (!user || !profile) { setShowAuth(true); return }
    const code = joinCode.trim().toUpperCase().replace(/-/g, "")
    setJoinErr(null)
    if (code.length < 6) { setJoinErr("Please enter a valid room code."); return }
    setJoining(true)
    try {
      const res  = await fetch("/api/auth/battle", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "join", player2: profile.username, code }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setJoinErr(json.error ?? "Failed to join room"); return }
      setRoom(json.room as Room); setRoomId(json.room.id)
      setStatus("playing")
      startRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
      }, 1000)
      setTimeout(() => inputRef.current?.focus(), 100)
    } catch (e: any) {
      setJoinErr(e?.message ?? "Unknown error")
    } finally {
      setJoining(false)
    }
  }

  // ── Submit answer ───────────────────────────────────────────────────────────
  // Use refs so values are always fresh (no stale closure)
  const answerRef  = useRef(answer)
  const elapsedRef = useRef(elapsed)
  const roomRef    = useRef(room)
  const profileRef = useRef(profile)
  answerRef.current  = answer
  elapsedRef.current = elapsed
  roomRef.current    = room
  profileRef.current = profile

  const handleSubmit = async () => {
    const currentAnswer  = answerRef.current
    const currentElapsed = elapsedRef.current
    const currentRoom    = roomRef.current
    const currentProfile = profileRef.current
    if (!puzzle || !currentRoom || !currentProfile) return
    if (currentAnswer.trim().toUpperCase() !== puzzle.plaintext.toUpperCase()) {
      setWrong(true); setShake(true)
      setTimeout(() => { setWrong(false); setShake(false) }, 500)
      return
    }
    clearInterval(timerRef.current)
    const time = currentElapsed
    const isP1 = currentRoom.player1 === currentProfile.username

    // Mark self as done
    const update = isP1
      ? { p1_done: true, p1_time: time }
      : { p2_done: true, p2_time: time }

    // Route through API to avoid RLS hanging
    const res = await fetch("/api/auth/battle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit", roomId: currentRoom.id, update }),
    })

    // Check if both done → determine winner immediately
    const opDone = isP1 ? currentRoom.p2_done : currentRoom.p1_done
    if (opDone) {
      const opTime = isP1 ? currentRoom.p2_time : currentRoom.p1_time
      let winner = "draw"
      if (opTime === null || time < opTime) winner = currentProfile.username
      else if (time > opTime) winner = isP1 ? currentRoom.player2! : currentRoom.player1
      await fetch("/api/auth/battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "winner", roomId: currentRoom.id, winner }),
      })
      if (winner === "draw") setStatus("draw")
      else if (winner === currentProfile.username) {
        setStatus("won")
        // Save battle stats + check achievements
        try {
          const wins   = Number(localStorage.getItem("cv_battle_wins") ?? "0") + 1
          const played = Number(localStorage.getItem("cv_battle_played") ?? "0") + 1
          localStorage.setItem("cv_battle_wins",   String(wins))
          localStorage.setItem("cv_battle_played", String(played))
          const stats = buildStats({
            contests_played: currentProfile?.contests_played ?? 0,
            rating:          currentProfile?.rating ?? 1000,
            streak:          currentProfile?.streak ?? 0,
            battleWins:      wins,
            battlePlayed:    played,
            speedBestSolved: Number(localStorage.getItem("cv_speed_best") ?? "0"),
            coins:           getCoins(),
            itemsBought:     getOwned().length,
          })
          checkAndUnlock(stats).forEach(a => triggerAchievementToast(a))
        } catch {}
      } else {
        setStatus("lost")
        // Track played even on loss
        try {
          const played = Number(localStorage.getItem("cv_battle_played") ?? "0") + 1
          localStorage.setItem("cv_battle_played", String(played))
        } catch {}
      }
    } else {
      setStatus("waiting_result" as any)
    }
  }

  const cleanup = () => {
    clearInterval(timerRef.current)
    setStatus("idle"); setRoom(null); setRoomId(null)
    setAnswer(""); setElapsed(0); setOpStatus("thinking")
  }

  const fallbackCopy = (text: string) => {
    const ta = document.createElement("textarea")
    ta.value = text
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none"
    document.body.appendChild(ta)
    ta.focus(); ta.select()
    try { document.execCommand("copy") } catch {}
    document.body.removeChild(ta)
  }

  // ── SQL reminder ─────────────────────────────────────────────────────────────
  const SQL_NOTE = `-- Run in Supabase SQL Editor:
create table public.battle_rooms (
  id uuid default gen_random_uuid() primary key,
  puzzle_seed integer not null,
  player1 text not null,
  player2 text,
  p1_done boolean default false,
  p2_done boolean default false,
  p1_time integer,
  p2_time integer,
  winner text,
  created_at timestamptz default now()
);
alter table public.battle_rooms enable row level security;
create policy "anyone can read battle rooms" on public.battle_rooms for select using (true);
create policy "authenticated can insert" on public.battle_rooms for insert with check (true);
create policy "authenticated can update" on public.battle_rooms for update using (true);
grant all on public.battle_rooms to authenticated, anon;`

  // ── Render ────────────────────────────────────────────────────────────────────
  if (status === "idle") return (
    <div className="p-8 max-w-2xl mx-auto">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} defaultTab="login" />}

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-xl font-semibold text-white tracking-tight">Cipher Battle</h1>
          <span className="text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border-red-500/20">
            ⚔️ 1v1 Live
          </span>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[13px] text-gray-500">Race a friend to decrypt the same cipher. Fastest correct answer wins.</p>
          <button onClick={() => setShowSql(v => !v)} className="text-[10px] text-gray-700 hover:text-gray-500 border border-gray-800 px-2 py-1 rounded-lg transition-colors shrink-0">⚙️ Setup</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-900/60 border border-gray-800/60 rounded-2xl p-5 text-center">
          <div className="text-3xl mb-2">⚔️</div>
          <p className="text-[14px] font-bold text-white mb-1">Create Room</p>
          <p className="text-[11px] text-gray-600 mb-4">Get a room code to share with a friend</p>
          {createErr && <p className="text-[11px] text-red-400 mb-2 text-center break-all">{createErr}</p>}
          <button onClick={createRoom} disabled={creating}
            className="w-full py-2.5 rounded-xl text-[12px] font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors flex items-center justify-center gap-2">
            {creating ? (
              <><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="white" strokeWidth="2" strokeDasharray="20 10"/></svg>Creating...</>
            ) : "Create Battle"}
          </button>
        </div>

        <div className="bg-gray-900/60 border border-gray-800/60 rounded-2xl p-5 text-center">
          <div className="text-3xl mb-2">🚪</div>
          <p className="text-[14px] font-bold text-white mb-1">Join Room</p>
          <p className="text-[11px] text-gray-600 mb-3">Enter a room code from your friend</p>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value)}
            placeholder="Room code..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-[12px] font-mono text-white placeholder-gray-700 outline-none focus:border-blue-500/60 mb-2" />
          {joinErr && (
            <p className="text-[11px] text-red-400 mb-2 text-center">{joinErr}</p>
          )}
          <button onClick={joinRoom} disabled={joining}
            className="w-full py-2.5 rounded-xl text-[12px] font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors flex items-center justify-center gap-2">
            {joining ? (
              <><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="white" strokeWidth="2" strokeDasharray="20 10"/></svg>Joining...</>
            ) : "Join Battle"}
          </button>
        </div>
      </div>

      {showSql && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-semibold text-amber-400">⚙️ Supabase Setup (first time only)</p>
            <button onClick={() => setShowSql(false)} className="text-gray-600 hover:text-gray-400 text-[11px] transition-colors">✕ dismiss</button>
          </div>
          <p className="text-[11px] text-gray-500 mb-3">Run this SQL once in your Supabase SQL Editor:</p>
          <pre className="bg-gray-950 rounded-xl p-3 text-[10px] font-mono text-gray-400 overflow-x-auto whitespace-pre-wrap">{SQL_NOTE}</pre>
        </div>
      )}
    </div>
  )

  if (status === "waiting") return (
    <div className="p-8 max-w-lg mx-auto text-center">
      <div className="text-5xl mb-4 animate-pulse">⏳</div>
      <h2 className="text-xl font-bold text-white mb-2">Waiting for opponent...</h2>
      <p className="text-[13px] text-gray-500 mb-6">Share this room code with your friend:</p>
      <div className="bg-gray-900/80 border border-blue-500/30 rounded-2xl px-6 py-4 mb-6 flex items-center justify-between">
        <span className="font-mono text-[20px] font-black text-blue-400 tracking-widest">{roomId?.replace(/-/g,"").slice(0, 8).toUpperCase()}</span>
        <button onClick={() => {
            const code = roomId?.replace(/-/g,"").slice(0, 8).toUpperCase() ?? ""
            if (navigator.clipboard && window.isSecureContext) {
              navigator.clipboard.writeText(code).catch(() => fallbackCopy(code))
            } else {
              fallbackCopy(code)
            }
            setCopied(true); setTimeout(() => setCopied(false), 2000)
          }}
          className={`text-[11px] transition-colors font-medium ${copied ? "text-emerald-400" : "text-gray-600 hover:text-white"}`}>
          {copied ? "✓ Copied!" : "Copy"}
        </button>
      </div>
      <button onClick={cleanup} className="text-[12px] text-gray-600 hover:text-red-400 transition-colors">Cancel</button>
    </div>
  )

  if (status === "playing" && puzzle) return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[12px] font-mono text-gray-400">vs {room?.player2 ?? room?.player1}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-mono text-gray-600">YOUR TIME</span>
          <span className="font-mono text-[18px] font-black text-white">{elapsed}s</span>
        </div>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-[12px] text-blue-400">{profile?.username} — solving...</span>
        </div>
        <div className={`flex-1 rounded-xl px-4 py-3 flex items-center gap-2 ${opStatus === "done" ? "bg-red-500/10 border border-red-500/20" : "bg-gray-900/60 border border-gray-800/60"}`}>
          <div className={`w-2 h-2 rounded-full ${opStatus === "done" ? "bg-red-400" : "bg-amber-400 animate-pulse"}`} />
          <span className={`text-[12px] ${opStatus === "done" ? "text-red-400" : "text-amber-400"}`}>
            Opponent — {opStatus === "done" ? "finished!" : "solving..."}
          </span>
        </div>
      </div>

      <div className="bg-gray-900/80 border border-gray-800/60 rounded-2xl p-6 mb-4"
        style={{ animation: shake ? "cv-shake 0.4s ease" : undefined }}>
        <style>{`@keyframes cv-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}`}</style>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border-blue-500/20">{puzzle.cipher}</span>
        </div>
        <p className="text-[11px] font-mono text-gray-600 uppercase tracking-widest mb-2">Decrypt this</p>
        <p className="text-[28px] font-black font-mono tracking-wider" style={{ color: wrong ? "#ef4444" : "#f8fafc" }}>
          {puzzle.ciphertext}
        </p>
      </div>

      <div className="flex gap-2">
        <input ref={inputRef} value={answer}
          onChange={e => setAnswer(e.target.value.toUpperCase())}
          onKeyDown={e => { if (e.key === "Enter") handleSubmit() }}
          placeholder="Type plaintext and press Enter..."
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 font-mono text-[15px] text-white placeholder-gray-700 outline-none focus:border-blue-500/60"
          style={{ borderColor: wrong ? "rgba(239,68,68,0.5)" : undefined }} />
        <button onClick={handleSubmit}
          className="px-5 py-3 rounded-xl font-bold text-[13px] bg-blue-600 hover:bg-blue-500 text-white transition-colors">✓</button>
      </div>
    </div>
  )

  // ── Waiting for opponent to finish ─────────────────────────────────────────
  if (status === "waiting_result") return (
    <div className="p-8 max-w-lg mx-auto text-center">
      <div className="text-5xl mb-4 animate-pulse">⏳</div>
      <h2 className="text-xl font-bold text-white mb-2">Answer submitted!</h2>
      <p className="text-[13px] text-gray-500 mb-2">Waiting for your opponent to finish...</p>
      <p className="text-[12px] text-emerald-400">Your time: {elapsed}s ✓</p>
    </div>
  )

  const resultMap = {
    won:  { emoji:"🏆", title:"You Win!",   msg:"Fastest correct answer — well done.", color:"text-emerald-400", bg:"bg-emerald-500/10 border-emerald-500/20" },
    lost: { emoji:"💀", title:"You Lost",   msg:"Opponent was faster this time.",       color:"text-red-400",     bg:"bg-red-500/10 border-red-500/20"         },
    draw: { emoji:"🤝", title:"It's a Draw",msg:"Both answered at the same time!",      color:"text-amber-400",   bg:"bg-amber-500/10 border-amber-500/20"     },
  }
  const r = resultMap[status as keyof typeof resultMap]

  return (
    <div className="p-8 max-w-lg mx-auto text-center">
      <div className="text-6xl mb-4">{r?.emoji}</div>
      <h2 className={`text-2xl font-black mb-2 ${r?.color}`}>{r?.title}</h2>
      <p className="text-[13px] text-gray-500 mb-6">{r?.msg}</p>
      {puzzle && (
        <div className={`border rounded-2xl p-4 mb-6 ${r?.bg}`}>
          <p className="text-[11px] text-gray-600 mb-1">The answer was</p>
          <p className="text-[20px] font-black font-mono text-white">{puzzle.plaintext}</p>
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={cleanup}
          className="flex-1 py-3 rounded-xl font-bold text-[13px] bg-blue-600 hover:bg-blue-500 text-white transition-colors">
          Play Again
        </button>
        <button onClick={cleanup}
          className="flex-1 py-3 rounded-xl font-bold text-[13px] border border-gray-700 text-gray-400 hover:text-white transition-colors">
          Back
        </button>
      </div>
    </div>
  )
}