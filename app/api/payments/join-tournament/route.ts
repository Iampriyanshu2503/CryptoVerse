import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
export async function POST(req: NextRequest) {
  try {
    const { user_id, username, tournament_id, payment_id, amount_inr } = await req.json()
    if (!user_id || !tournament_id) return NextResponse.json({ error:"Missing fields" }, { status:400 })
    const { data:t } = await admin.from("tournaments").select("*").eq("id", tournament_id).single()
    if (!t) return NextResponse.json({ error:"Not found" }, { status:404 })
    const { count } = await admin.from("tournament_entries").select("*",{count:"exact",head:true}).eq("tournament_id",tournament_id)
    if ((count??0) >= t.max_players) return NextResponse.json({ error:"Full" }, { status:400 })
    const { error } = await admin.from("tournament_entries").insert({ tournament_id, user_id, username, paid:true, payment_id })
    if (error && error.code !== "23505") throw new Error(error.message)
    await admin.from("tournaments").update({ prize_pool_inr: t.prize_pool_inr + Math.round((amount_inr??0)*0.7) }).eq("id",tournament_id)
    await admin.from("transactions").insert({ user_id, type:"tournament_entry", amount_inr:amount_inr??0, status:"completed", payment_id, metadata:{tournament_id,title:t.title} })
    return NextResponse.json({ success:true })
  } catch(e:any) { return NextResponse.json({ error:e.message }, { status:500 }) }
}