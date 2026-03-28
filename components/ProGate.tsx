"use client"
// ─── Pro Gate ─────────────────────────────────────────────────────────────────
// Wrap any premium feature. Shows upgrade prompt if user isn't Pro.
import { useRouter } from "next/navigation"
import { getProStatus } from "@/lib/pro"
import { useAuth } from "@/lib/AuthContext"

interface Props {
  children:    React.ReactNode
  feature?:    string
  fallback?:   React.ReactNode
}

export default function ProGate({ children, feature, fallback }: Props) {
  const { profile } = useAuth()
  const router      = useRouter()
  const { isPro }   = getProStatus(profile)

  if (isPro) return <>{children}</>

  if (fallback) return <>{fallback}</>

  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center rounded-2xl"
      style={{ background:"rgba(251,191,36,0.04)", border:"1px dashed rgba(251,191,36,0.2)" }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-3"
        style={{ background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.25)" }}>
        💎
      </div>
      <p className="text-[14px] font-bold text-white mb-1">Pro Feature</p>
      <p className="text-[12px] text-gray-500 mb-4">
        {feature ?? "This feature"} requires a Pro subscription.
      </p>
      <button onClick={() => router.push("/pricing")}
        className="px-5 py-2 rounded-xl text-[12px] font-bold text-white transition-all hover:scale-105"
        style={{ background:"linear-gradient(135deg,#d97706,#b45309)", boxShadow:"0 0 20px rgba(217,119,6,0.3)" }}>
        Upgrade to Pro — ₹99/mo
      </button>
    </div>
  )
}