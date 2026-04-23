"use client"
import Link from "next/link"
export default function VerifiedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background:"#050508" }}>
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center text-4xl"
          style={{ background:"rgba(74,222,128,0.1)", border:"2px solid rgba(74,222,128,0.3)", boxShadow:"0 0 40px rgba(74,222,128,0.15)" }}>
          ✅
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Email Verified!</h1>
        <p className="text-[13px] text-gray-500 mb-6 leading-relaxed">
          Your account is now active. You can log in and start solving ciphers.
        </p>
        <Link href="/"
          className="inline-block px-8 py-3 rounded-xl text-[13px] font-bold text-white transition-all"
          style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow:"0 0 24px rgba(37,99,235,0.35)" }}>
          Go to CryptoVerse →
        </Link>
      </div>
    </div>
  )
}