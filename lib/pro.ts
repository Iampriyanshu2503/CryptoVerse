// ─── Pro Status Utilities ─────────────────────────────────────────────────────
// lib/pro.ts

import { supabase } from "@/lib/supabase"

export interface ProStatus {
  isPro:      boolean
  expiresAt:  string | null
  daysLeft:   number | null
}

// Check pro status from profile object (fast, no DB call)
export function getProStatus(profile: { is_pro?: boolean; pro_expires_at?: string | null } | null): ProStatus {
  if (!profile?.is_pro) return { isPro: false, expiresAt: null, daysLeft: null }
  const exp = profile.pro_expires_at
  if (!exp) return { isPro: true, expiresAt: null, daysLeft: null }
  const now  = new Date()
  const ends = new Date(exp)
  if (ends <= now) return { isPro: false, expiresAt: exp, daysLeft: 0 }
  const days = Math.ceil((ends.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return { isPro: true, expiresAt: exp, daysLeft: days }
}

// Plans config
export const PLANS = {
  pro_monthly: {
    id:          "pro_monthly",
    name:        "Pro Monthly",
    price_inr:   99,
    duration_days: 30,
    badge:       "💎",
    perks: [
      "Unlimited Speed Rounds (free: 3/day)",
      "Hard difficulty in Cipher Challenge",
      "Pro badge on profile",
      "Download rating history as PDF",
      "Early access to new cipher types",
      "Ad-free experience",
    ],
  },
  pro_annual: {
    id:          "pro_annual",
    name:        "Pro Annual",
    price_inr:   799,
    duration_days: 365,
    badge:       "👑",
    perks: [
      "Everything in Pro Monthly",
      "2 months free (₹389 savings)",
      "Exclusive Annual badge",
      "Priority support",
      "Beta feature access",
    ],
  },
}

// Coin bundle options
export const COIN_BUNDLES = [
  { id:"coins_200",  coins: 200,  price_inr: 49,  bonus: 0,   label:"Starter",  color:"#60a5fa" },
  { id:"coins_600",  coins: 600,  price_inr: 99,  bonus: 50,  label:"Popular",  color:"#a78bfa", popular: true },
  { id:"coins_1500", coins: 1500, price_inr: 199, bonus: 200, label:"Best Value",color:"#fbbf24" },
]

// Certificate paths
export const CERT_PATHS = [
  { id:"classical",   label:"Classical Ciphers",     icon:"📜", price_inr: 149, modules:["classical"] },
  { id:"symmetric",   label:"Symmetric Encryption",  icon:"🔑", price_inr: 149, modules:["symmetric"] },
  { id:"hashing",     label:"Hashing & Signatures",  icon:"#️⃣", price_inr: 149, modules:["hashing"]   },
  { id:"asymmetric",  label:"Asymmetric Encryption", icon:"🔓", price_inr: 149, modules:["asymmetric"]},
  { id:"full",        label:"Full Cryptography Path", icon:"🏆", price_inr: 399, modules:["classical","symmetric","hashing","asymmetric"] },
]

// Mock payment — returns fake payment_id, swap with real Razorpay later
export async function mockPurchase(params: {
  user_id:      string
  type:         string
  amount_inr:   number
  coins_granted?: number
  metadata?:    Record<string, any>
}): Promise<{ success: boolean; payment_id: string; error?: string }> {
  const payment_id = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const { error } = await supabase.from("transactions").insert({
    user_id:       params.user_id,
    type:          params.type,
    amount_inr:    params.amount_inr,
    coins_granted: params.coins_granted ?? 0,
    status:        "completed",
    payment_id,
    metadata:      params.metadata ?? {},
  })
  if (error) return { success: false, payment_id: "", error: error.message }
  return { success: true, payment_id }
}