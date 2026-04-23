import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { checkRateLimit, createOTP, canResend } from "@/lib/auth-utils"
import { sendOTPEmail } from "@/lib/email"

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { user_id, purpose = "mfa" } = await req.json()
    if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 })

    const rateCheck = await checkRateLimit(user_id, "resend_otp")
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Please wait ${rateCheck.retryAfter} seconds before requesting a new code.` },
        { status: 429 }
      )
    }

    const cooldown = await canResend(user_id, purpose)
    if (!cooldown.allowed) {
      return NextResponse.json(
        { error: `Please wait ${cooldown.secondsLeft} seconds before requesting a new code.` },
        { status: 429 }
      )
    }

    const { data: profile } = await admin.from("profiles")
      .select("email,username").eq("id", user_id).single()
    if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const otp = await createOTP(user_id, profile.email, purpose)
    await sendOTPEmail(profile.email, profile.username, otp, purpose as "mfa" | "verify")

    return NextResponse.json({ success: true, message: "New code sent to your email." })
  } catch (e: any) {
    console.error("[ResendOTP]", e.message)
    return NextResponse.json({ error: "Failed to resend code." }, { status: 500 })
  }
}