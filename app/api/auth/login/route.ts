import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  validateEmail, sanitizeInput, checkRateLimit, createOTP, canResend
} from "@/lib/auth-utils"
import { sendOTPEmail } from "@/lib/email"

const admin  = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(req: NextRequest) {
  try {
    const body     = await req.json()
    const email    = sanitizeInput(body.email    ?? "").toLowerCase()
    const password = body.password ?? ""

    // ── Validate email format ──
    const emailCheck = validateEmail(email)
    if (!emailCheck.valid) return NextResponse.json({ error: emailCheck.reason }, { status: 400 })

    // ── Rate limit ──
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"
    const rateCheck = await checkRateLimit(`${ip}:${email}`, "login")
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please wait ${rateCheck.retryAfter} seconds before trying again.` },
        { status: 429 }
      )
    }

    // ── Attempt login with Supabase Auth ──
    const { data: authData, error: authError } = await client.auth.signInWithPassword({ email, password })
    if (authError || !authData.user) {
      // Generic message — don't reveal if email exists
      return NextResponse.json(
        { error: "Incorrect email or password." },
        { status: 401 }
      )
    }

    // ── Check email verification ──
    const { data: profile } = await admin.from("profiles")
      .select("id,username,is_verified,mfa_enabled,email")
      .eq("id", authData.user.id).single()

    if (!profile) return NextResponse.json({ error: "Account not found." }, { status: 404 })

    if (!profile.is_verified) {
      // Sign them out immediately
      await client.auth.signOut()
      return NextResponse.json({
        error: "Please verify your email before logging in.",
        code:  "EMAIL_NOT_VERIFIED",
        email: profile.email,
      }, { status: 403 })
    }

    // ── MFA check ──
    if (profile.mfa_enabled) {
      // Sign out the Supabase session — issue it only after OTP
      await client.auth.signOut()

      // Send OTP
      const resendCheck = await canResend(profile.id, "mfa")
      if (!resendCheck.allowed) {
        return NextResponse.json({
          code: "MFA_REQUIRED",
          user_id: profile.id,
          message: `Code already sent. Wait ${resendCheck.secondsLeft}s to resend.`,
        })
      }

      const otp = await createOTP(profile.id, profile.email ?? email, "mfa")
      await sendOTPEmail(profile.email ?? email, profile.username, otp, "mfa")

      return NextResponse.json({
        code:    "MFA_REQUIRED",
        user_id: profile.id,
        message: "A verification code has been sent to your email.",
      })
    }

    // ── No MFA — return session ──
    return NextResponse.json({
      success: true,
      session: authData.session,
      user:    { id: authData.user.id, email: authData.user.email },
    })
  } catch (e: any) {
    console.error("[Login]", e.message)
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 })
  }
}