"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/AuthContext"
import { supabase } from "@/lib/supabase"
import AuthModal from "@/components/AuthModal"
import { useRouter } from "next/navigation"
import { getProStatus } from "@/lib/pro"

// ── Types ─────────────────────────────────────────────────────────────────────
interface FriendProfile {
  id:              string
  username:        string
  display_name:    string | null
  avatar_url:      string | null
  rating:          number
  contests_played: number
  best_score:      number
  streak:          number
  is_pro:          boolean | null
}

interface Friendship {
  id:          string
  sender_id:   string
  receiver_id: string
  status:      "pending" | "accepted"
  created_at:  string
  friend:      FriendProfile
}

// ── Tier helper ───────────────────────────────────────────────────────────────
const TIERS = [
  { name:"Novice",       min:0,    color:"#9ca3af", icon:"🔰" },
  { name:"Apprentice",   min:500,  color:"#4ade80", icon:"⚡" },
  { name:"Cryptanalyst", min:1000, color:"#60a5fa", icon:"🔍" },
  { name:"Specialist",   min:1500, color:"#a78bfa", icon:"💎" },
  { name:"Expert",       min:2000, color:"#fbbf24", icon:"🏆" },
  { name:"Master",       min:2500, color:"#f87171", icon:"👑" },
]
const getTier = (r: number) => [...TIERS].reverse().find(t => r >= t.min) ?? TIERS[0]

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ profile, size = 40 }: { profile: FriendProfile; size?: number }) {
  const tier  = getTier(profile.rating)
  const label = (profile.display_name ?? profile.username).slice(0,2).toUpperCase()
  return (
    <div className="rounded-2xl overflow-hidden flex items-center justify-center shrink-0 font-black text-white"
      style={{ width:size, height:size, fontSize:size*0.35,
        background: profile.avatar_url ? "transparent" : `${tier.color}20`,
        border: `1.5px solid ${tier.color}40` }}>
      {profile.avatar_url
        ? <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover"/>
        : label
      }
    </div>
  )
}

// ── Friend Card ───────────────────────────────────────────────────────────────
function FriendCard({ friendship, myId, onRemove, onChallenge }: {
  friendship: Friendship
  myId: string
  onRemove: (id: string, friendId: string) => void
  onChallenge: (username: string) => void
}) {
  const p    = friendship.friend
  const tier = getTier(p.rating)
  const { isPro } = getProStatus(p)
  const [removing, setRemoving] = useState(false)

  return (
    <div className="rounded-2xl p-4 transition-all hover:border-white/12 group"
      style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-3 mb-3">
        <Avatar profile={p} size={44}/>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-bold text-white truncate">
              {p.display_name ?? p.username}
            </p>
            {isPro && <span className="text-[9px] font-black text-amber-400">💎PRO</span>}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px]">{tier.icon}</span>
            <span className="text-[10px] font-semibold" style={{ color:tier.color }}>{tier.name}</span>
            <span className="text-gray-700 text-[10px]">·</span>
            <span className="text-[10px] text-gray-600">@{p.username}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[18px] font-black leading-none" style={{ color:tier.color }}>{p.rating}</p>
          <p className="text-[9px] text-gray-700 uppercase tracking-wider mt-0.5">Rating</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label:"Contests", value: p.contests_played, color:"#60a5fa" },
          { label:"Best",     value: p.best_score || "—", color:"#4ade80" },
          { label:"Streak",   value: p.streak > 0 ? `${p.streak}🔥` : "—", color:"#fb923c" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-2 text-center"
            style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[13px] font-black leading-none" style={{ color }}>{value}</p>
            <p className="text-[9px] text-gray-700 uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={() => onChallenge(p.username)}
          className="flex-1 py-2 rounded-xl text-[12px] font-bold text-white transition-all"
          style={{ background:"linear-gradient(135deg,#1d4ed8,#1e40af)", boxShadow:"0 0 12px rgba(37,99,235,0.25)" }}>
          ⚔️ Challenge to Battle
        </button>
        <button
          onClick={async () => {
            setRemoving(true)
            await onRemove(friendship.id, p.id)
            setRemoving(false)
          }}
          disabled={removing}
          className="px-3 py-2 rounded-xl text-[11px] font-semibold text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
          style={{ border:"1px solid rgba(255,255,255,0.08)" }}>
          {removing ? "…" : "Remove"}
        </button>
      </div>
    </div>
  )
}

// ── Leaderboard mini among friends ────────────────────────────────────────────
function FriendsLeaderboard({ friends, myProfile }: { friends: FriendProfile[]; myProfile: any }) {
  const all = [...friends, {
    id: myProfile.id, username: myProfile.username,
    display_name: myProfile.display_name, avatar_url: myProfile.avatar_url,
    rating: myProfile.rating, contests_played: myProfile.contests_played,
    best_score: myProfile.best_score, streak: myProfile.streak,
    is_pro: myProfile.is_pro
  }].sort((a, b) => b.rating - a.rating)

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)" }}>
      <div className="px-5 py-4" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-[14px] font-bold text-white">Friends Leaderboard</p>
        <p className="text-[11px] text-gray-600 mt-0.5">You vs your friends</p>
      </div>
      {all.map((p, i) => {
        const tier  = getTier(p.rating)
        const isMe  = p.id === myProfile.id
        return (
          <div key={p.id}
            className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
            style={{
              borderBottom: i < all.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              background: isMe ? `${tier.color}08` : "transparent",
            }}>
            {/* Rank */}
            <div className="w-7 text-center shrink-0">
              <span className="text-[14px]">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-[12px] font-bold text-gray-600">#{i+1}</span>}
              </span>
            </div>
            <Avatar profile={p} size={34}/>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold truncate" style={{ color: isMe ? tier.color : "#fff" }}>
                {p.display_name ?? p.username} {isMe && <span className="text-[10px] text-gray-600">(you)</span>}
              </p>
              <p className="text-[10px] text-gray-600">{tier.icon} {tier.name} · {p.contests_played} contests</p>
            </div>
            <p className="text-[16px] font-black shrink-0" style={{ color:tier.color }}>{p.rating}</p>
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function FriendsPage() {
  const { user, profile } = useAuth()
  const router = useRouter()

  const [tab,        setTab]        = useState<"friends"|"requests"|"find">("friends")
  const [friends,    setFriends]    = useState<Friendship[]>([])
  const [requests,   setRequests]   = useState<Friendship[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState("")
  const [results,    setResults]    = useState<FriendProfile[]>([])
  const [searching,  setSearching]  = useState(false)
  const [sending,    setSending]    = useState<string|null>(null)
  const [sent,       setSent]       = useState<Set<string>>(new Set())
  const [msg,        setMsg]        = useState<string|null>(null)
  const [showAuth,   setShowAuth]   = useState(false)

  const loadFriends = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // Get all accepted friendships
    const { data: accepted } = await supabase.from("friendships")
      .select("id,sender_id,receiver_id,status,created_at")
      .eq("status", "accepted")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)

    // Get all pending requests where I am receiver
    const { data: pending } = await supabase.from("friendships")
      .select("id,sender_id,receiver_id,status,created_at")
      .eq("status", "pending")
      .eq("receiver_id", user.id)

    // Get friend profile IDs
    const friendIds = (accepted ?? []).map(f =>
      f.sender_id === user.id ? f.receiver_id : f.sender_id
    )
    const requesterIds = (pending ?? []).map(f => f.sender_id)
    const allIds = [...new Set([...friendIds, ...requesterIds])]

    if (allIds.length === 0) { setFriends([]); setRequests([]); setLoading(false); return }

    const { data: profiles } = await supabase.from("profiles")
      .select("id,username,display_name,avatar_url,rating,contests_played,best_score,streak,is_pro")
      .in("id", allIds)

    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

    const enriched = (f: any): Friendship => ({
      ...f,
      friend: profileMap[f.sender_id === user.id ? f.receiver_id : f.sender_id]
    })

    setFriends((accepted ?? []).filter(f => profileMap[f.sender_id === user.id ? f.receiver_id : f.sender_id]).map(enriched))
    setRequests((pending ?? []).filter(f => profileMap[f.sender_id]).map(enriched))
    setLoading(false)
  }, [user])

  useEffect(() => { loadFriends() }, [loadFriends])

  const handleSearch = async () => {
    if (!search.trim()) return
    setSearching(true); setResults([])
    const { data } = await supabase.from("profiles")
      .select("id,username,display_name,avatar_url,rating,contests_played,best_score,streak,is_pro")
      .or(`username.ilike.%${search.trim()}%,display_name.ilike.%${search.trim()}%`)
      .neq("id", user?.id ?? "")
      .limit(10)
    setResults((data ?? []) as FriendProfile[])
    setSearching(false)
  }

  const handleSendRequest = async (targetId: string) => {
    if (!user) { setShowAuth(true); return }
    setSending(targetId)
    const res = await fetch("/api/friends/request", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ sender_id:user.id, receiver_id:targetId })
    })
    const data = await res.json()
    if (data.success) { setSent(s => new Set([...s, targetId])); setMsg("Friend request sent!") }
    else setMsg(data.error ?? "Failed to send request")
    setSending(null)
    setTimeout(() => setMsg(null), 3000)
  }

  const handleRespond = async (friendshipId: string, action: "accept"|"reject") => {
    if (!user) return
    await fetch("/api/friends/respond", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ friendship_id:friendshipId, action, user_id:user.id })
    })
    await loadFriends()
    if (action === "accept") setMsg("Friend added!")
    setTimeout(() => setMsg(null), 3000)
  }

  const handleRemove = async (friendshipId: string, friendId: string) => {
    if (!user) return
    await fetch("/api/friends/remove", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ user_id:user.id, friend_id:friendId })
    })
    await loadFriends()
  }

  const handleChallenge = (username: string) => {
    router.push(`/battle?challenge=${username}`)
  }

  const friendProfiles = friends.map(f => f.friend).filter(Boolean)

  if (!user || !profile) return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background:"#050508" }}>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center text-4xl"
          style={{ background:"rgba(96,165,250,0.08)", border:"1px solid rgba(96,165,250,0.2)" }}>👥</div>
        <h2 className="text-xl font-black text-white mb-2">Sign in to use Friends</h2>
        <p className="text-[13px] text-gray-500 mb-5">Add friends, compare ratings, and challenge them to battles.</p>
        <button onClick={() => setShowAuth(true)}
          className="px-8 py-3 rounded-xl text-[13px] font-bold text-white"
          style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow:"0 0 24px rgba(59,130,246,0.3)" }}>
          Sign In
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen px-6 md:px-10 py-8 max-w-5xl mx-auto" style={{ background:"#050508" }}>
      <style>{`
        @keyframes cv-up { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .cv-u { animation:cv-up 0.4s cubic-bezier(0.23,1,0.32,1) both }
        .glass { background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07); }
      `}</style>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-7 cv-u">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">👥 Friends</h1>
          <p className="text-[12px] text-gray-600 mt-1">
            {friends.length} friend{friends.length !== 1 ? "s" : ""}
            {requests.length > 0 && <span className="text-blue-400 ml-2">· {requests.length} pending request{requests.length !== 1 ? "s" : ""}</span>}
          </p>
        </div>
        <button onClick={() => setTab("find")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all"
          style={{ background:"linear-gradient(135deg,#1d4ed8,#1e40af)", boxShadow:"0 0 16px rgba(37,99,235,0.3)" }}>
          + Add Friend
        </button>
      </div>

      {/* Success message */}
      {msg && (
        <div className="mb-4 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-emerald-400 cv-u"
          style={{ background:"rgba(74,222,128,0.08)", border:"1px solid rgba(74,222,128,0.25)" }}>
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        {([
          { id:"friends",  label:"Friends",          count: friends.length },
          { id:"requests", label:"Requests",         count: requests.length, dot: requests.length > 0 },
          { id:"find",     label:"Find People",      count: null },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-3 text-[12px] font-semibold relative transition-colors"
            style={{ color: tab===t.id ? "#fff" : "#4b5563" }}>
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: t.dot ? "#3b82f6" : "rgba(255,255,255,0.1)", color: t.dot ? "#fff" : "#9ca3af" }}>
                {t.count}
              </span>
            )}
            {tab===t.id && <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-t-full bg-blue-500"/>}
          </button>
        ))}
      </div>

      {/* ── FRIENDS TAB ── */}
      {tab === "friends" && (
        <div className="cv-u">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor:"rgba(96,165,250,0.3)", borderTopColor:"#60a5fa" }}/>
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-4 opacity-20">👥</p>
              <p className="text-[15px] font-bold text-white mb-2">No friends yet</p>
              <p className="text-[13px] text-gray-600 mb-5">Search for other players and send friend requests.</p>
              <button onClick={() => setTab("find")}
                className="px-6 py-2.5 rounded-xl text-[13px] font-bold text-white"
                style={{ background:"linear-gradient(135deg,#1d4ed8,#1e40af)" }}>
                Find Friends
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Friend cards */}
              <div className="space-y-3">
                {friends.map(f => (
                  <FriendCard key={f.id} friendship={f} myId={user.id}
                    onRemove={handleRemove} onChallenge={handleChallenge}/>
                ))}
              </div>
              {/* Leaderboard */}
              {friendProfiles.length > 0 && (
                <div>
                  <FriendsLeaderboard friends={friendProfiles} myProfile={profile}/>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── REQUESTS TAB ── */}
      {tab === "requests" && (
        <div className="cv-u">
          {requests.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3 opacity-20">📭</p>
              <p className="text-[14px] text-gray-600">No pending friend requests</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-lg">
              {requests.map(r => {
                const p    = r.friend
                const tier = getTier(p?.rating ?? 0)
                if (!p) return null
                return (
                  <div key={r.id} className="glass rounded-2xl p-4 flex items-center gap-4">
                    <Avatar profile={p} size={44}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-white truncate">{p.display_name ?? p.username}</p>
                      <p className="text-[11px] mt-0.5" style={{ color:tier.color }}>
                        {tier.icon} {tier.name} · {p.rating} rating
                      </p>
                      <p className="text-[10px] text-gray-600 mt-0.5">{p.contests_played} contests played</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleRespond(r.id, "accept")}
                        className="px-4 py-2 rounded-xl text-[12px] font-bold text-white transition-all"
                        style={{ background:"linear-gradient(135deg,#16a34a,#15803d)", boxShadow:"0 0 12px rgba(22,163,74,0.3)" }}>
                        Accept
                      </button>
                      <button onClick={() => handleRespond(r.id, "reject")}
                        className="px-3 py-2 rounded-xl text-[12px] font-semibold text-gray-500 hover:text-red-400 transition-colors"
                        style={{ border:"1px solid rgba(255,255,255,0.08)" }}>
                        Decline
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── FIND TAB ── */}
      {tab === "find" && (
        <div className="cv-u max-w-xl">
          <div className="glass rounded-2xl p-5 mb-4">
            <p className="text-[13px] font-bold text-white mb-3">Search by username or name</p>
            <div className="flex gap-2">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Search players…"
                className="flex-1 px-4 py-2.5 rounded-xl text-[13px] text-white placeholder-gray-700 outline-none"
                style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)" }}/>
              <button onClick={handleSearch} disabled={searching || !search.trim()}
                className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50"
                style={{ background:"linear-gradient(135deg,#1d4ed8,#1e40af)" }}>
                {searching ? "…" : "Search"}
              </button>
            </div>
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map(p => {
                const tier        = getTier(p.rating)
                const isFriend    = friends.some(f => f.friend?.id === p.id)
                const isPending   = sent.has(p.id)
                const { isPro }   = getProStatus(p)
                return (
                  <div key={p.id} className="glass rounded-2xl p-4 flex items-center gap-3">
                    <Avatar profile={p} size={42}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-bold text-white truncate">{p.display_name ?? p.username}</p>
                        {isPro && <span className="text-[9px] font-black text-amber-400">💎</span>}
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color:tier.color }}>
                        {tier.icon} {tier.name} · {p.rating} rating
                      </p>
                      <p className="text-[10px] text-gray-600">@{p.username} · {p.contests_played} contests</p>
                    </div>
                    <div className="shrink-0">
                      {isFriend ? (
                        <span className="text-[11px] font-bold text-emerald-400 px-3 py-1.5 rounded-xl"
                          style={{ background:"rgba(74,222,128,0.08)", border:"1px solid rgba(74,222,128,0.2)" }}>
                          ✓ Friends
                        </span>
                      ) : isPending ? (
                        <span className="text-[11px] font-semibold text-gray-500 px-3 py-1.5 rounded-xl"
                          style={{ border:"1px solid rgba(255,255,255,0.08)" }}>
                          Sent ✓
                        </span>
                      ) : (
                        <button onClick={() => handleSendRequest(p.id)}
                          disabled={sending === p.id}
                          className="px-4 py-1.5 rounded-xl text-[12px] font-bold text-white disabled:opacity-50 transition-all"
                          style={{ background:"linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow:"0 0 12px rgba(124,58,237,0.25)" }}>
                          {sending === p.id ? "…" : "+ Add"}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {results.length === 0 && search && !searching && (
            <div className="text-center py-10 glass rounded-2xl">
              <p className="text-3xl mb-2 opacity-20">🔍</p>
              <p className="text-[13px] text-gray-600">No players found for "{search}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}