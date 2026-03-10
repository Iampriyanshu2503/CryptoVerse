// ─── /api/auth/coins — sync coins + inventory to DB (service role) ─────────────
import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const { user_id, coins, inventory } = await req.json()
    if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 })

    const payload: Record<string, any> = {}
    if (typeof coins === "number")  payload.coins     = coins
    if (inventory !== undefined)    payload.inventory = inventory

    if (Object.keys(payload).length === 0)
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })

    const { error } = await admin.from("profiles").update(payload).eq("id", user_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 })
  }
}