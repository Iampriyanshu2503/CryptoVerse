import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { validateEmail, sanitizeInput, checkRateLimit, createVerificationToken } from "@/lib/auth-utils"
import { sendVerificationEmail } from "@/lib/email"

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail } = await req.json()
    const email = sanitizeInput(rawEmail ?? "").toLowerCase()

    const emailCheck = validateEmail(email)
    if (!emailCheck.valid) return NextResponse.json({ error: emailCheck.reason }, { status: 400 })

    // Rate limit
    const rateCheck = await checkRateLimit(email, "resend_verify")
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Please wait ${rateCheck.retryAfter} seconds before requesting another verification email.` },
        { status: 429 }
      )
    }

    // Find unverified user — but don't reveal if email doesn't exist
    const { data: profile } = await admin.from("profiles")
      .select("id,username,is_verified").eq("email", email).maybeSingle()

    if (!profile || profile.is_verified) {
      // Return success regardless — don't reveal account status
      return NextResponse.json({ success: true, message: "If an unverified account exists, a new email has been sent." })
    }

    const token = await createVerificationToken(profile.id, email)
    await sendVerificationEmail(email, profile.username, token)

    return NextResponse.json({ success: true, message: "Verification email sent. Please check your inbox." })
  } catch (e: any) {
    console.error("[ResendVerification]", e.message)
    return NextResponse.json({ error: "Failed to resend. Please try again." }, { status: 500 })
  }
}