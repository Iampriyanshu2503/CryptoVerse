import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (body.action === "create") {
      const { player1, puzzle_seed } = body
      if (!player1) return NextResponse.json({ error: "Missing player1" }, { status: 400 })

      const { error: insErr } = await admin.from("battle_rooms").insert({
        puzzle_seed, player1, player2: null,
        p1_done: false, p2_done: false,
        p1_time: null, p2_time: null, winner: null,
      })
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

      const { data, error: selErr } = await admin
        .from("battle_rooms").select("*")
        .eq("player1", player1).is("player2", null)
        .order("created_at", { ascending: false }).limit(1).single()
      if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 })
      return NextResponse.json({ room: data })
    }

    if (body.action === "join") {
      const { player2, code } = body
      if (!player2 || !code) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

      const { data: rows, error: findErr } = await admin
        .from("battle_rooms").select("*").is("player2", null)
        .order("created_at", { ascending: false }).limit(50)
      if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 })

      const clean = code.toUpperCase().replace(/-/g, "")
      const target = (rows ?? []).find((r: any) =>
        r.id.replace(/-/g, "").toUpperCase().startsWith(clean)
      )
      if (!target) return NextResponse.json({ error: "Room not found or already full." }, { status: 404 })
      if (target.player1 === player2) return NextResponse.json({ error: "You cannot join your own room." }, { status: 400 })

      const { error: updErr } = await admin
        .from("battle_rooms").update({ player2 })
        .eq("id", target.id).is("player2", null)
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

      const { data, error: selErr } = await admin
        .from("battle_rooms").select("*").eq("id", target.id).single()
      if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 })
      return NextResponse.json({ room: data })
    }

    // ── Submit answer (update p1/p2 done + time) ──────────────────────────────
    if (body.action === "submit") {
      const { roomId, update } = body
      if (!roomId) return NextResponse.json({ error: "Missing roomId" }, { status: 400 })
      const { error } = await admin.from("battle_rooms").update(update).eq("id", roomId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    // ── Set winner ─────────────────────────────────────────────────────────────
    if (body.action === "winner") {
      const { roomId, winner } = body
      if (!roomId) return NextResponse.json({ error: "Missing roomId" }, { status: 400 })
      const { error } = await admin.from("battle_rooms").update({ winner }).eq("id", roomId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 })
  }
}