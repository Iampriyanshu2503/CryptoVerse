"use client"

import { useState, useEffect } from "react"

const BOOT_LINES = [
  { t: "CRYPTOVERSE OS v2.0.1 — INITIALIZING...", d: 0    },
  { t: "► Loading cipher engines................OK", d: 320  },
  { t: "► Connecting to contest server..........OK", d: 640  },
  { t: "► Generating RSA-2048 keypair............OK", d: 960  },
  { t: "► All systems nominal. Welcome.",            d: 1260 },
]

const BOOT_KEY = "cv_booted"

export default function BootOverlay() {
  const [visible, setVisible] = useState(false)
  const [lines,   setLines]   = useState<string[]>([])
  const [fading,  setFading]  = useState(false)

  useEffect(() => {
    // Already booted this session — don't show
    if (sessionStorage.getItem(BOOT_KEY)) return

    setVisible(true)
    // Hide app shell during boot
    document.getElementById("app-shell")!.style.opacity = "0"

    BOOT_LINES.forEach(({ t, d }) =>
      setTimeout(() => setLines(l => [...l, t]), d)
    )

    setTimeout(() => setFading(true), 1900)
    setTimeout(() => {
      sessionStorage.setItem(BOOT_KEY, "1")
      setVisible(false)
      const shell = document.getElementById("app-shell")
      if (shell) {
        shell.style.transition = "opacity 0.5s ease"
        shell.style.opacity = "1"
      }
    }, 2400)
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col"
      style={{
        background: "#030303",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.5s ease",
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      {/* Top chrome bar */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-800/60">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-amber-500/80" />
        <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
        <span className="ml-3 font-mono text-[12px] text-gray-600 tracking-widest">
          cryptoverse — boot
        </span>
      </div>

      {/* Terminal body */}
      <div className="relative flex-1 flex flex-col justify-center px-10 sm:px-20 md:px-32 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.05) 0%, transparent 70%)" }} />
        <div className="relative space-y-4">
          {lines.map((l, i) => (
            <div key={i} className="flex gap-3 font-mono text-[15px] sm:text-[17px]">
              <span className="text-blue-500 shrink-0">$</span>
              <span className={i === lines.length - 1 ? "text-emerald-400" : "text-gray-400"}>{l}</span>
            </div>
          ))}
          <div className="flex gap-3 items-center">
            <span className="text-blue-500 font-mono text-[15px]">$</span>
            <span className="w-2.5 h-5 bg-blue-400 animate-pulse inline-block" />
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-10 py-4 border-t border-gray-800/40 flex items-center justify-between">
        <span className="font-mono text-[10px] text-gray-700 tracking-[0.2em] uppercase">CryptoVerse v2.0.1</span>
        <span className="font-mono text-[10px] text-gray-700 tracking-[0.2em] uppercase">Educational Platform</span>
      </div>
    </div>
  )
}