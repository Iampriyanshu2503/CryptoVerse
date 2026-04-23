import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { checkRateLimit, verifyOTP } from "@/lib/auth-utils"

const admin  = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { user_id, code, purpose = "mfa" } = await req.json()
    if (!user_id || !code) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

    // Rate limit OTP attempts
    const rateCheck = await checkRateLimit(user_id, "verify_otp")
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Please wait ${rateCheck.retryAfter} seconds.` },
        { status: 429 }
      )
    }

    const result = await verifyOTP(user_id, code, purpose)
    if (!result.valid) {
      return NextResponse.json({ error: result.reason }, { status: 401 })
    }

    // OTP verified — get user email and create a real session
    const { data: profile } = await admin.from("profiles")
      .select("email").eq("id", user_id).single()
    if (!profile?.email) return NextResponse.json({ error: "User not found" }, { status: 404 })

    // Generate a session using admin
    const { data: linkData } = await admin.auth.admin.generateLink({
      type:  "magiclink",
      email: profile.email,
    })

    return NextResponse.json({
      success:      true,
      session_link: linkData?.properties?.action_link,
      user_id,
      message: "OTP verified successfully.",
    })
  } catch (e: any) {
    console.error("[VerifyOTP]", e.message)
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 500 })
  }
}