import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { user_id, enabled } = await req.json()
    if (!user_id || typeof enabled !== "boolean")
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })

    await admin.from("profiles").update({ mfa_enabled: enabled }).eq("id", user_id)
    return NextResponse.json({ success: true, mfa_enabled: enabled })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}