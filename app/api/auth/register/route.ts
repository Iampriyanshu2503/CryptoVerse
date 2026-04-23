import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  validateEmail, validatePassword, validateUsername,
  sanitizeInput, checkRateLimit, createVerificationToken
} from "@/lib/auth-utils"
import { sendVerificationEmail } from "@/lib/email"

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email    = sanitizeInput(body.email    ?? "").toLowerCase()
    const password = body.password ?? ""
    const username = sanitizeInput(body.username ?? "").toLowerCase()

    // ── Validate inputs ──
    const emailCheck = validateEmail(email)
    if (!emailCheck.valid) return NextResponse.json({ error: emailCheck.reason }, { status: 400 })

    const passCheck = validatePassword(password)
    if (!passCheck.valid) return NextResponse.json({ error: passCheck.reason }, { status: 400 })

    const userCheck = validateUsername(username)
    if (!userCheck.valid) return NextResponse.json({ error: userCheck.reason }, { status: 400 })

    // ── Rate limit by IP ──
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"
    const rateCheck = await checkRateLimit(ip, "register")
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please wait ${rateCheck.retryAfter} seconds.` },
        { status: 429 }
      )
    }

    // ── Check username uniqueness ──
    const { data: existingUsername } = await admin.from("profiles")
      .select("id").eq("username", username).maybeSingle()
    if (existingUsername) return NextResponse.json({ error: "Username is already taken" }, { status: 409 })

    // ── Create Supabase user ──
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email, password,
      email_confirm: true,   // bypass Supabase's own confirmation — we handle it
      user_metadata: { username },
    })
    if (authError) {
      // Don't reveal if email exists
      if (authError.message.includes("already registered") || authError.message.includes("already exists")) {
        return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
      }
      throw new Error(authError.message)
    }

    // ── Insert profile ──
    await admin.from("profiles").insert({
      id:          authData.user.id,
      username,
      email,
      is_verified: false,
    })

    // ── Send verification email ──
    const token = await createVerificationToken(authData.user.id, email)
    const sent  = await sendVerificationEmail(email, username, token)
    if (!sent) console.error("[Register] Verification email failed for", email)

    return NextResponse.json({
      success: true,
      message: "Account created. Please check your email to verify your account.",
      user_id: authData.user.id,
    })
  } catch (e: any) {
    console.error("[Register]", e.message)
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 })
  }
}