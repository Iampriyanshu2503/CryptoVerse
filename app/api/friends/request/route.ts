// app/api/friends/request/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { sender_id, receiver_id } = await req.json()
    if (!sender_id || !receiver_id) return NextResponse.json({ error:"Missing fields" }, { status:400 })
    if (sender_id === receiver_id) return NextResponse.json({ error:"Cannot add yourself" }, { status:400 })

    // Check if already exists in either direction
    const { data: existing } = await admin.from("friendships").select("id,status")
      .or(`and(sender_id.eq.${sender_id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${sender_id})`)
      .maybeSingle()

    if (existing) {
      if (existing.status === "accepted") return NextResponse.json({ error:"Already friends" }, { status:409 })
      if (existing.status === "pending")  return NextResponse.json({ error:"Request already sent" }, { status:409 })
    }

    const { error } = await admin.from("friendships").insert({ sender_id, receiver_id, status:"pending" })
    if (error) throw new Error(error.message)
    return NextResponse.json({ success:true })
  } catch(e:any) { return NextResponse.json({ error:e.message }, { status:500 }) }
}