// ─── /api/auth/contest — service-role contest save (bypasses RLS) ─────────────
import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const {
      user_id, username, puzzle_date, puzzle_id,
      score, time_seconds, hints_used, difficulty,
      rating_before, rating_after, contests_played,
      best_score, streak, last_played,
      coins, inventory,
    } = await req.json()

    if (!user_id || !username) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Insert contest entry (ignore duplicate = already played today)
    const { error: insertErr } = await admin.from("contest_entries").insert({
      user_id, username, puzzle_date, puzzle_id,
      score, time_seconds, hints_used, difficulty,
      rating_before, rating_after,
    })
    if (insertErr && insertErr.code !== "23505") {
      return NextResponse.json({ error: insertErr.message, code: insertErr.code }, { status: 500 })
    }

    // Update profile (include coins + inventory if provided)
    const updatePayload: Record<string, any> = {
      rating:          rating_after,
      contests_played: contests_played,
      best_score:      best_score,
      streak:          streak,
      last_played:     last_played,
    }
    if (typeof coins === "number")  updatePayload.coins     = coins
    if (inventory !== undefined)    updatePayload.inventory = inventory

    const { error: updateErr } = await admin.from("profiles").update(updatePayload).eq("id", user_id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message, code: updateErr.code }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 })
  }
}