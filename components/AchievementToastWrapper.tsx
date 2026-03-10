"use client"

import dynamic from "next/dynamic"

const AchievementToast = dynamic(() => import("@/components/AchievementToast"), { ssr: false })

export default function AchievementToastWrapper() {
  return <AchievementToast />
}