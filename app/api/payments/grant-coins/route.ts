import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
export async function POST(req: NextRequest) {
  try {
    const { user_id, coins, payment_id, bundle_id, amount_inr } = await req.json()
    if (!user_id || !coins) return NextResponse.json({ error:"Missing fields" }, { status:400 })
    const { data:p } = await admin.from("profiles").select("coins_purchased").eq("id", user_id).single()
    await admin.from("profiles").update({ coins_purchased:(p?.coins_purchased??0)+coins }).eq("id", user_id)
    await admin.from("transactions").insert({ user_id, type:"coin_bundle", amount_inr:amount_inr??0, coins_granted:coins, status:"completed", payment_id, metadata:{ bundle_id } })
    return NextResponse.json({ success:true, coins_granted:coins })
  } catch(e:any) { return NextResponse.json({ error:e.message }, { status:500 }) }
}