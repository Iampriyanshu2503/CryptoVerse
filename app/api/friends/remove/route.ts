// app/api/friends/remove/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { user_id, friend_id } = await req.json()
    if (!user_id || !friend_id) return NextResponse.json({ error:"Missing fields" }, { status:400 })
    await admin.from("friendships").delete()
      .or(`and(sender_id.eq.${user_id},receiver_id.eq.${friend_id}),and(sender_id.eq.${friend_id},receiver_id.eq.${user_id})`)
    return NextResponse.json({ success:true })
  } catch(e:any) { return NextResponse.json({ error:e.message }, { status:500 }) }
}