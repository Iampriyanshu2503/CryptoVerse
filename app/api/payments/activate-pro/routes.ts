import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
export async function POST(req: NextRequest) {
  try {
    const { user_id, plan, payment_id } = await req.json()
    if (!user_id || !plan) return NextResponse.json({ error:"Missing fields" }, { status:400 })
    const days      = plan === "pro_annual" ? 365 : 30
    const expiresAt = new Date(Date.now() + days * 86400000).toISOString()
    await admin.from("profiles").update({ is_pro:true, pro_expires_at:expiresAt }).eq("id", user_id)
    await admin.from("user_subscriptions").insert({ user_id, plan, status:"active", expires_at:expiresAt, payment_id })
    return NextResponse.json({ success:true, expires_at:expiresAt })
  } catch(e:any) { return NextResponse.json({ error:e.message }, { status:500 }) }
}