// app/api/friends/respond/route.ts — accept or reject
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { friendship_id, action, user_id } = await req.json()
    // action: "accept" | "reject"
    if (!friendship_id || !action || !user_id) return NextResponse.json({ error:"Missing fields" }, { status:400 })

    if (action === "accept") {
      await admin.from("friendships").update({ status:"accepted", updated_at: new Date().toISOString() })
        .eq("id", friendship_id).eq("receiver_id", user_id)
    } else {
      await admin.from("friendships").delete()
        .eq("id", friendship_id).eq("receiver_id", user_id)
    }
    return NextResponse.json({ success:true })
  } catch(e:any) { return NextResponse.json({ error:e.message }, { status:500 }) }
}