"use client"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"

function ErrorContent() {
  const params = useSearchParams()
  const reason = params.get("reason") ?? "Something went wrong"

  const messages: Record<string, { title: string; desc: string; action: string; href: string }> = {
    missing_token:   { title:"Invalid Link",       desc:"This verification link is missing a token.",              action:"Request new link", href:"/" },
    invalid_token:   { title:"Invalid Link",       desc:"This verification link is invalid or already been used.", action:"Request new link", href:"/" },
    server_error:    { title:"Server Error",       desc:"Something went wrong on our end. Please try again.",      action:"Go Home",          href:"/" },
  }

  const info = messages[reason] ?? {
    title:  "Verification Failed",
    desc:   decodeURIComponent(reason),
    action: "Go Home",
    href:   "/",
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background:"#050508" }}>
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center text-4xl"
          style={{ background:"rgba(239,68,68,0.1)", border:"2px solid rgba(239,68,68,0.3)", boxShadow:"0 0 40px rgba(239,68,68,0.15)" }}>
          ❌
        </div>
        <h1 className="text-2xl font-black text-white mb-2">{info.title}</h1>
        <p className="text-[13px] text-gray-500 mb-6 leading-relaxed">{info.desc}</p>
        <Link href={info.href}
          className="inline-block px-8 py-3 rounded-xl text-[13px] font-bold text-white"
          style={{ background:"linear-gradient(135deg,#dc2626,#b91c1c)" }}>
          {info.action}
        </Link>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return <Suspense fallback={null}><ErrorContent /></Suspense>
}