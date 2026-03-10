"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/AuthContext"
import AuthModal from "@/components/AuthModal"
import { getCoins, spendCoins, getOwned, saveOwned, getTxHistory, addTx, useItem, hasItem, type OwnedHint, type Tx } from "@/lib/inventory"

// ── Shop items ────────────────────────────────────────────────────────────────
const SHOP_ITEMS = [
  {
    id: "hint_skip",      name: "Skip Pass",       cost: 50,  uses: 3,  icon: "⏭",
    desc: "Skip a puzzle without losing points. Use in Challenge or Contest.",
    color: "blue",
  },
  {
    id: "hint_reveal",    name: "Letter Reveal",    cost: 75,  uses: 3,  icon: "🔍",
    desc: "Reveals the first letter of the plaintext answer.",
    color: "violet",
  },
  {
    id: "hint_cipher",    name: "Cipher ID",        cost: 40,  uses: 5,  icon: "🏷",
    desc: "Tells you the exact cipher type used in the puzzle.",
    color: "amber",
  },
  {
    id: "hint_freeze",    name: "Time Freeze",      cost: 100, uses: 2,  icon: "❄️",
    desc: "Pauses the contest timer for 15 seconds. Use wisely.",
    color: "cyan",
  },
  {
    id: "hint_key",       name: "Key Fragment",     cost: 120, uses: 2,  icon: "🗝",
    desc: "Reveals part of the cipher key (e.g. Shift = ? or Key starts with...).",
    color: "emerald",
  },
  {
    id: "hint_freq",      name: "Frequency Map",    cost: 60,  uses: 4,  icon: "📊",
    desc: "Shows letter frequency analysis of the ciphertext to aid decryption.",
    color: "pink",
  },
  {
    id: "hint_double",    name: "Double Points",    cost: 200, uses: 1,  icon: "✨",
    desc: "Your next solved puzzle awards double rating points.",
    color: "red",
  },
  {
    id: "hint_shield",    name: "Wrong Shield",     cost: 80,  uses: 3,  icon: "🛡",
    desc: "One wrong answer won't count against you. Blocks one penalty.",
    color: "orange",
  },
]

// ── Earning ways ──────────────────────────────────────────────────────────────
const EARN_WAYS = [
  { icon: "📅", label: "Complete Daily Contest (base)",   coins: 50  },
  { icon: "💯", label: "Contest score 900+",              coins: 150 },
  { icon: "⭐", label: "Contest score 700+",              coins: 75  },
  { icon: "💡", label: "No hints used in Contest",        coins: 50  },
  { icon: "🔥", label: "3-day streak bonus",              coins: 50  },
  { icon: "🔥", label: "7-day streak bonus",              coins: 150 },
  { icon: "⚡", label: "Speed Round — per puzzle solved", coins: 10  },
  { icon: "⚡", label: "Speed Round — 10+ solved bonus",  coins: 100 },
  { icon: "⚡", label: "Speed Round — 15+ solved bonus",  coins: 150 },
  { icon: "🎯", label: "Challenge — Easy puzzle",         coins: 5   },
  { icon: "🎯", label: "Challenge — Medium puzzle",       coins: 15  },
  { icon: "🎯", label: "Challenge — Hard puzzle",         coins: 30  },
]

const COLOR_MAP: Record<string, string> = {
  blue:   "border-blue-500/30 bg-blue-500/5",
  violet: "border-violet-500/30 bg-violet-500/5",
  amber:  "border-amber-500/30 bg-amber-500/5",
  cyan:   "border-cyan-500/30 bg-cyan-500/5",
  emerald:"border-emerald-500/30 bg-emerald-500/5",
  pink:   "border-pink-500/30 bg-pink-500/5",
  red:    "border-red-500/30 bg-red-500/5",
  orange: "border-orange-500/30 bg-orange-500/5",
}
const TEXT_MAP: Record<string, string> = {
  blue:   "text-blue-400",   violet: "text-violet-400",
  amber:  "text-amber-400",  cyan:   "text-cyan-400",
  emerald:"text-emerald-400",pink:   "text-pink-400",
  red:    "text-red-400",    orange: "text-orange-400",
}

export default function MarketplacePage() {
  const { user, profile } = useAuth()
  const [showAuth,  setShowAuth]  = useState(false)
  const [coins,     setCoins]     = useState(0)
  const [owned,     setOwned]     = useState<OwnedHint[]>([])
  const [history,   setHistory]   = useState<Tx[]>([])
  const [tab,       setTab]       = useState<"shop"|"inventory"|"earn">("shop")
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null)

  const syncFromStorage = () => {
    setCoins(getCoins())
    setOwned(getOwned())
    setHistory(getTxHistory())
  }

  // On mount: if profile has higher coins from another device, sync down
  useEffect(() => {
    if (profile && typeof (profile as any).coins === "number") {
      const dbCoins   = (profile as any).coins as number
      const dbInv     = (profile as any).inventory as OwnedHint[] | undefined
      const localCoins = getCoins()
      if (dbCoins > localCoins) {
        try { localStorage.setItem("cv_coins", String(dbCoins)) } catch {}
      }
      if (dbInv && Array.isArray(dbInv) && dbInv.length > getOwned().length) {
        try { localStorage.setItem("cv_owned_hints", JSON.stringify(dbInv)) } catch {}
      }
    }
  }, [profile])

  useEffect(() => {
    syncFromStorage()
    window.addEventListener("focus", syncFromStorage)
    window.addEventListener("storage", syncFromStorage)
    // Same-tab coin updates from contest/challenge/speed
    window.addEventListener("cv_coins_changed", syncFromStorage)
    return () => {
      window.removeEventListener("focus", syncFromStorage)
      window.removeEventListener("storage", syncFromStorage)
      window.removeEventListener("cv_coins_changed", syncFromStorage)
    }
  }, [])

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 2500)
  }

  const handleBuy = (item: typeof SHOP_ITEMS[0]) => {
    if (!user) { setShowAuth(true); return }

    // Always re-read fresh coins from localStorage (never trust stale state)
    const freshCoins = getCoins()
    if (freshCoins < item.cost) {
      setCoins(freshCoins) // sync state
      showToast(`Not enough coins! You have 🪙${freshCoins}`, false)
      return
    }

    const success = spendCoins(item.cost)
    if (!success) { showToast("Purchase failed — try again", false); return }

    // Update inventory
    const currentOwned = getOwned() // fresh read
    const existing = currentOwned.find(o => o.id === item.id)
    let updated: OwnedHint[]
    if (existing) {
      updated = currentOwned.map(o => o.id === item.id ? { ...o, uses: o.uses + item.uses } : o)
    } else {
      updated = [...currentOwned, { id: item.id, name: item.name, uses: item.uses, purchasedAt: new Date().toLocaleDateString() }]
    }
    saveOwned(updated)
    setOwned(updated)
    setCoins(getCoins())
    addTx({ label: `Bought ${item.name}`, amount: -item.cost, date: new Date().toLocaleDateString() })
    setHistory(getTxHistory())
    showToast(`✓ ${item.name} added to inventory! (${item.uses} uses)`, true)

    // Sync to DB in background (non-blocking)
    if (user?.id) {
      fetch("/api/auth/coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id:   user.id,
          coins:     getCoins(),
          inventory: getOwned(),
        }),
      }).catch(() => {}) // silent fail — localStorage is source of truth
    }
  }

  const handleUse = (item: OwnedHint) => {
    const shopItem = SHOP_ITEMS.find(s => s.id === item.id)
    if (!shopItem) return
    // Items that need to be used in-game show instructions
    const inGameItems = ["hint_skip","hint_freeze","hint_double","hint_shield"]
    if (inGameItems.includes(item.id)) {
      showToast(`Use ${item.name} while playing Contest or Challenge`, false)
      return
    }
    // Items that can show info immediately
    if (!hasItem(item.id)) { showToast("No uses remaining!", false); return }
    useItem(item.id)
    setOwned(getOwned())
    setHistory(getTxHistory())
    showToast(`${item.name} used! Check the result.`, true)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} defaultTab="login" />}

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-[13px] font-semibold"
          style={{
            background: toast.ok ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
            border: `1px solid ${toast.ok ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
            color: toast.ok ? "#34d399" : "#f87171",
            animation: "cv-in 0.3s ease",
          }}>
          <style>{`@keyframes cv-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>
          {toast.ok ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight mb-1">Hint Marketplace</h1>
          <p className="text-[13px] text-gray-500">Spend coins on power-ups to help crack tough ciphers.</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5">
          <span className="text-xl">🪙</span>
          <div>
            <p className="text-[18px] font-black text-amber-400 leading-none">{coins}</p>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest">Coins</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-900/60 border border-gray-800/60 rounded-xl mb-6">
        {(["shop", "inventory", "earn"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-[9px] text-[11px] font-bold uppercase tracking-widest transition-all duration-200"
            style={{ background: tab === t ? "#1d4ed8" : "transparent", color: tab === t ? "#fff" : "#4b5563" }}>
            {t === "shop" ? "🛒 Shop" : t === "inventory" ? "🎒 Inventory" : "💰 Earn"}
          </button>
        ))}
      </div>

      {/* Shop */}
      {tab === "shop" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SHOP_ITEMS.map(item => (
            <div key={item.id}
              className={`border rounded-2xl p-5 flex flex-col gap-3 ${COLOR_MAP[item.color]}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{item.icon}</span>
                  <div>
                    <p className={`text-[14px] font-bold ${TEXT_MAP[item.color]}`}>{item.name}</p>
                    <p className="text-[10px] text-gray-600">{item.uses} uses per purchase</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1">
                  <span className="text-[12px]">🪙</span>
                  <span className="text-[13px] font-black text-amber-400">{item.cost}</span>
                </div>
              </div>
              <p className="text-[12px] text-gray-500 leading-relaxed">{item.desc}</p>
              {(() => {
                const canBuy = coins >= item.cost
                return (
                  <button onClick={() => handleBuy(item)}
                    className="w-full py-2.5 rounded-xl text-[12px] font-bold transition-all duration-200 active:scale-95"
                    style={{
                      background: canBuy ? "rgba(29,78,216,0.5)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${canBuy ? "rgba(59,130,246,0.6)" : "rgba(255,255,255,0.07)"}`,
                      color: canBuy ? "#93c5fd" : "#374151",
                      cursor: "pointer",
                    }}>
                    {canBuy ? `Buy — 🪙 ${item.cost}` : `Need ${item.cost - coins} more coins`}
                  </button>
                )
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Inventory */}
      {tab === "inventory" && (
        <div>
          {owned.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <p className="text-4xl mb-3">🎒</p>
              <p className="text-[14px]">Your inventory is empty.</p>
              <p className="text-[12px] mt-1">Buy items from the Shop to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {owned.map(item => {
                const shopItem = SHOP_ITEMS.find(s => s.id === item.id)
                return (
                  <div key={item.id} className="bg-gray-900/60 border border-gray-800/60 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{shopItem?.icon ?? "📦"}</span>
                      <div>
                        <p className="text-[14px] font-bold text-white">{item.name}</p>
                        <p className="text-[11px] text-gray-600">Purchased {item.purchasedAt}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: Math.min(item.uses, 5) }).map((_, i) => (
                          <div key={i} className="w-2 h-2 rounded-full bg-emerald-500" />
                        ))}
                        {item.uses > 5 && <span className="text-[10px] text-gray-600">+{item.uses - 5}</span>}
                        <span className="text-[11px] text-gray-500 ml-1">{item.uses} left</span>
                      </div>
                      <button onClick={() => handleUse(item)}
                        className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 border border-blue-700/30 hover:border-blue-500/50 px-3 py-1 rounded-lg transition-colors">
                        Use
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Transaction history */}
          {history.length > 0 && (
            <div className="mt-6">
              <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Transaction History</p>
              <div className="bg-gray-900/60 border border-gray-800/60 rounded-2xl divide-y divide-gray-800/60">
                {history.slice(0, 8).map((tx, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <span className="text-[13px] text-gray-400">{tx.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[13px] font-bold ${tx.amount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                      </span>
                      <span className="text-[12px]">🪙</span>
                      <span className="text-[10px] text-gray-700 ml-2">{tx.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Earn */}
      {tab === "earn" && (
        <div>
          <p className="text-[13px] text-gray-500 mb-5">Complete these activities to earn coins:</p>
          <div className="space-y-3 mb-8">
            {EARN_WAYS.map(way => (
              <div key={way.label} className="flex items-center justify-between bg-gray-900/60 border border-gray-800/60 rounded-xl px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{way.icon}</span>
                  <span className="text-[13px] text-white">{way.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-black text-amber-400">+{way.coins}</span>
                  <span className="text-[13px]">🪙</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-900/60 border border-gray-800/60 rounded-2xl p-5">
            <p className="text-[12px] font-semibold text-white mb-1">💡 How coins work</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">Coins are earned automatically when you complete activities. They are stored locally in your browser. Purchased items are usable directly in Daily Contest and Cipher Challenge.</p>
          </div>
        </div>
      )}
    </div>
  )
}