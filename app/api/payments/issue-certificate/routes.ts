import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
export async function POST(req: NextRequest) {
  try {
    const { user_id, username, display_name, path_completed, score, payment_id } = await req.json()
    if (!user_id || !path_completed) return NextResponse.json({ error:"Missing fields" }, { status:400 })
    const { data:existing } = await admin.from("certificates").select("id").eq("user_id", user_id).eq("path_completed", path_completed).maybeSingle()
    if (existing) return NextResponse.json({ error:"Already issued" }, { status:409 })
    const { data, error } = await admin.from("certificates").insert({ user_id, username, display_name, path_completed, score, payment_id:payment_id??"free" }).select().single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ success:true, certificate:data })
  } catch(e:any) { return NextResponse.json({ error:e.message }, { status:500 }) }
}