import { NextRequest, NextResponse } from "next/server"
import { verifyEmailToken } from "@/lib/auth-utils"

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token")
    if (!token) {
      return NextResponse.redirect(new URL("/auth/error?reason=missing_token", req.url))
    }

    const result = await verifyEmailToken(token)
    if (!result.valid) {
      const reason = encodeURIComponent(result.reason ?? "invalid_token")
      return NextResponse.redirect(new URL(`/auth/error?reason=${reason}`, req.url))
    }

    return NextResponse.redirect(new URL("/auth/verified", req.url))
  } catch (e: any) {
    console.error("[VerifyEmail]", e.message)
    return NextResponse.redirect(new URL("/auth/error?reason=server_error", req.url))
  }
}