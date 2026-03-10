"use client"
// ─── Achievement unlock toast notification ────────────────────────────────────
import { useState, useEffect, useRef } from "react"
import { RARITY, type Achievement } from "@/lib/achievements"

interface ToastItem { achievement: Achievement; id: number }

export default function AchievementToast() {
  const [queue, setQueue] = useState<ToastItem[]>([])
  const counterRef = useRef(0)

  useEffect(() => {
    const handler = (e: Event) => {
      const a = (e as CustomEvent).detail as Achievement
      const item: ToastItem = { achievement: a, id: counterRef.current++ }
      setQueue(q => [...q, item])
      setTimeout(() => setQueue(q => q.filter(t => t.id !== item.id)), 4500)
    }
    window.addEventListener("cv_achievement", handler)
    return () => window.removeEventListener("cv_achievement", handler)
  }, [])

  if (queue.length === 0) return null

  return (
    <div className="fixed top-5 right-5 z-[999] flex flex-col gap-2 pointer-events-none">
      {queue.map(({ achievement: a, id }) => {
        const r = RARITY[a.rarity]
        return (
          <div key={id}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl pointer-events-auto"
            style={{
              background: "rgba(6,8,16,0.97)",
              border: `1px solid ${r.border}`,
              boxShadow: `0 0 30px ${r.glow}, 0 8px 32px rgba(0,0,0,0.6)`,
              animation: "cv-ach-in 0.4s cubic-bezier(0.23,1,0.32,1) both",
              minWidth: "260px",
            }}>
            <style>{`
              @keyframes cv-ach-in {
                from { opacity:0; transform:translateX(60px) scale(0.9) }
                to   { opacity:1; transform:translateX(0) scale(1) }
              }
            `}</style>

            {/* Icon with glow */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
              style={{ background: r.bg, border: `1px solid ${r.border}`, boxShadow: `0 0 16px ${r.glow}` }}>
              {a.icon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: r.color }}>
                  {r.label} Unlocked
                </p>
              </div>
              <p className="text-[13px] font-bold text-white truncate">{a.label}</p>
              <p className="text-[10px] text-gray-500 truncate">{a.secret && !a.desc.startsWith("???") ? a.desc : a.desc}</p>
            </div>

            {/* Animated border shimmer */}
            <div className="shrink-0">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke={r.color} strokeWidth="1.5" opacity="0.4"/>
                <path d="M6 10l3 3 5-5" stroke={r.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Helper to fire from anywhere
export function triggerAchievementToast(a: Achievement) {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("cv_achievement", { detail: a }))
}