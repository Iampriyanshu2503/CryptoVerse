import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// This route uses the SERVICE ROLE key (server-only, never sent to browser)
// which lets us create + immediately confirm a user in one step.
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,   // ← add this to .env.local
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: Request) {
  try {
    const { email, password, username } = await req.json()

    // ── Basic server-side validation ──────────────────────────────────────────
    if (!email || !password || !username) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ error: "Username must be 3–20 characters" }, { status: 400 })
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: "Username: letters, numbers, underscores only" }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    // ── Check username taken ──────────────────────────────────────────────────
    const { data: existing } = await adminClient
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 })
    }

    // ── Create user with email_confirm: true — skips confirmation email ───────
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,          // ← confirms immediately, no email needed
      user_metadata: { username },
    })

    if (error) {
      // Supabase returns "already registered" for duplicate emails
      const msg = error.message.toLowerCase().includes("already registered")
        ? "An account with this email already exists"
        : error.message
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    return NextResponse.json({ success: true, userId: data.user.id })
  } catch (err: any) {
    console.error("Register route error:", err)
    return NextResponse.json({ error: "Server error — please try again" }, { status: 500 })
  }
}