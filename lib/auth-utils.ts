// ─── Auth Utilities ───────────────────────────────────────────────────────────
// lib/auth-utils.ts

import { createClient } from "@supabase/supabase-js"

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Email Validation ──────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/

export function validateEmail(email: string): { valid: boolean; reason?: string } {
  if (!email || typeof email !== "string")
    return { valid: false, reason: "Email is required" }

  const trimmed = email.trim().toLowerCase()

  if (trimmed.length > 254)
    return { valid: false, reason: "Email address is too long" }

  if (!EMAIL_REGEX.test(trimmed))
    return { valid: false, reason: "Please enter a valid email address" }

  // Block disposable/temp email domains
  const BLOCKED_DOMAINS = [
    "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
    "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "trashmail.com",
    "10minutemail.com", "temp-mail.org", "dispostable.com", "fakeinbox.com",
    "maildrop.cc", "spamgourmet.com", "trashmail.io", "getnada.com",
  ]
  const domain = trimmed.split("@")[1]
  if (BLOCKED_DOMAINS.includes(domain))
    return { valid: false, reason: "Please use a real email address" }

  return { valid: true }
}

export function validatePassword(password: string): { valid: boolean; reason?: string } {
  if (!password || password.length < 8)
    return { valid: false, reason: "Password must be at least 8 characters" }
  if (password.length > 128)
    return { valid: false, reason: "Password is too long" }
  if (!/[A-Z]/.test(password))
    return { valid: false, reason: "Password must contain at least one uppercase letter" }
  if (!/[0-9]/.test(password))
    return { valid: false, reason: "Password must contain at least one number" }
  return { valid: true }
}

export function validateUsername(username: string): { valid: boolean; reason?: string } {
  if (!username || username.length < 3)
    return { valid: false, reason: "Username must be at least 3 characters" }
  if (username.length > 20)
    return { valid: false, reason: "Username must be under 20 characters" }
  if (!/^[a-zA-Z0-9_]+$/.test(username))
    return { valid: false, reason: "Username can only contain letters, numbers, and underscores" }
  return { valid: true }
}

export function sanitizeInput(str: string): string {
  return str.trim().replace(/[<>]/g, "")
}

// ── Token Generation ──────────────────────────────────────────────────────────
export function generateToken(length = 64): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let token = ""
  // Use crypto.getRandomValues for secure randomness
  const array = new Uint8Array(length)
  if (typeof globalThis.crypto !== "undefined") {
    globalThis.crypto.getRandomValues(array)
    for (const byte of array) token += chars[byte % chars.length]
  } else {
    // Node.js fallback
    const { randomBytes } = require("crypto")
    const bytes = randomBytes(length)
    for (const byte of bytes) token += chars[byte % chars.length]
  }
  return token
}

export function generateOTP(length = 6): string {
  const digits = "0123456789"
  let otp = ""
  const array = new Uint8Array(length)
  if (typeof globalThis.crypto !== "undefined") {
    globalThis.crypto.getRandomValues(array)
    for (const byte of array) otp += digits[byte % 10]
  } else {
    const { randomBytes } = require("crypto")
    const bytes = randomBytes(length)
    for (const byte of bytes) otp += digits[byte % 10]
  }
  return otp
}

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const RATE_LIMITS: Record<string, { max: number; windowMs: number; blockMs: number }> = {
  login:           { max: 5,  windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 },
  register:        { max: 3,  windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 },
  resend_otp:      { max: 3,  windowMs: 60 * 1000,       blockMs: 60 * 1000      },
  resend_verify:   { max: 3,  windowMs: 60 * 1000,       blockMs: 60 * 1000      },
  verify_otp:      { max: 5,  windowMs: 10 * 60 * 1000, blockMs: 10 * 60 * 1000 },
}

export async function checkRateLimit(identifier: string, action: string): Promise<{
  allowed: boolean; retryAfter?: number; remaining?: number
}> {
  const db = admin()
  const limit = RATE_LIMITS[action]
  if (!limit) return { allowed: true }

  const now = new Date()

  const { data } = await db.from("auth_rate_limits")
    .select("*").eq("identifier", identifier).eq("action", action).maybeSingle()

  if (data) {
    // Check if currently blocked
    if (data.blocked_until && new Date(data.blocked_until) > now) {
      const retryAfter = Math.ceil((new Date(data.blocked_until).getTime() - now.getTime()) / 1000)
      return { allowed: false, retryAfter }
    }

    // Check if window has expired — reset
    const windowStart = new Date(now.getTime() - limit.windowMs)
    if (new Date(data.last_attempt) < windowStart) {
      await db.from("auth_rate_limits").update({
        attempts: 1, last_attempt: now.toISOString(), blocked_until: null
      }).eq("id", data.id)
      return { allowed: true, remaining: limit.max - 1 }
    }

    // Increment attempts
    const newAttempts = data.attempts + 1
    const blocked = newAttempts > limit.max
    const blockedUntil = blocked ? new Date(now.getTime() + limit.blockMs).toISOString() : null

    await db.from("auth_rate_limits").update({
      attempts: newAttempts,
      last_attempt: now.toISOString(),
      blocked_until: blockedUntil,
    }).eq("id", data.id)

    if (blocked) {
      return { allowed: false, retryAfter: Math.ceil(limit.blockMs / 1000) }
    }
    return { allowed: true, remaining: limit.max - newAttempts }
  }

  // First attempt — upsert to handle race conditions
  await db.from("auth_rate_limits").upsert({
    identifier, action, attempts: 1, last_attempt: now.toISOString(), blocked_until: null
  }, { onConflict: "identifier,action", ignoreDuplicates: false })

  return { allowed: true, remaining: limit.max - 1 }
}

// ── Token DB Operations ───────────────────────────────────────────────────────
export async function createVerificationToken(userId: string, email: string): Promise<string> {
  const db = admin()
  const token     = generateToken(64)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min

  // Invalidate old tokens for this user
  await db.from("email_verification_tokens")
    .update({ used: true }).eq("user_id", userId).eq("used", false)

  await db.from("email_verification_tokens").insert({
    user_id: userId, email, token, expires_at: expiresAt
  })
  return token
}

export async function verifyEmailToken(token: string): Promise<{
  valid: boolean; userId?: string; email?: string; reason?: string
}> {
  const db = admin()
  const { data } = await db.from("email_verification_tokens")
    .select("*").eq("token", token).eq("used", false).maybeSingle()

  if (!data) return { valid: false, reason: "Invalid or already used verification link" }
  if (new Date(data.expires_at) < new Date()) return { valid: false, reason: "Verification link has expired. Please request a new one." }

  // Mark as used
  await db.from("email_verification_tokens").update({ used: true }).eq("id", data.id)
  // Mark user as verified
  await db.from("profiles").update({ is_verified: true }).eq("id", data.user_id)

  return { valid: true, userId: data.user_id, email: data.email }
}

export async function createOTP(userId: string, email: string, purpose: "mfa" | "verify" = "mfa"): Promise<string> {
  const db = admin()
  const code      = generateOTP(6)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min

  // Invalidate old OTPs for this user+purpose
  await db.from("otp_codes").update({ used: true })
    .eq("user_id", userId).eq("purpose", purpose).eq("used", false)

  await db.from("otp_codes").insert({
    user_id: userId, email, code, purpose, expires_at: expiresAt
  })
  return code
}

export async function verifyOTP(userId: string, code: string, purpose: "mfa" | "verify" = "mfa"): Promise<{
  valid: boolean; reason?: string
}> {
  const db = admin()
  const { data } = await db.from("otp_codes")
    .select("*").eq("user_id", userId).eq("purpose", purpose)
    .eq("used", false).order("created_at", { ascending: false }).limit(1).maybeSingle()

  if (!data) return { valid: false, reason: "No active verification code found" }

  // Increment attempts
  await db.from("otp_codes").update({ attempts: data.attempts + 1 }).eq("id", data.id)

  if (data.attempts >= 5) {
    await db.from("otp_codes").update({ used: true }).eq("id", data.id)
    return { valid: false, reason: "Too many incorrect attempts. Please request a new code." }
  }
  if (new Date(data.expires_at) < new Date()) {
    return { valid: false, reason: "Code has expired. Please request a new one." }
  }
  if (data.code !== code.trim()) {
    return { valid: false, reason: "Incorrect code. Please try again." }
  }

  await db.from("otp_codes").update({ used: true }).eq("id", data.id)
  return { valid: true }
}

export async function canResend(userId: string, purpose: "mfa" | "verify"): Promise<{
  allowed: boolean; secondsLeft?: number
}> {
  const db = admin()
  const { data } = await db.from("otp_codes")
    .select("created_at").eq("user_id", userId).eq("purpose", purpose)
    .order("created_at", { ascending: false }).limit(1).maybeSingle()

  if (!data) return { allowed: true }
  const secondsLeft = 60 - Math.floor((Date.now() - new Date(data.created_at).getTime()) / 1000)
  if (secondsLeft > 0) return { allowed: false, secondsLeft }
  return { allowed: true }
}