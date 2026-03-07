"use client"

import { useEffect, useState } from "react"

interface LetterPair {
  from: string
  to: string
  key?: string | number
}

interface Props {
  pairs: LetterPair[]
  speed?: number // ms per letter
  active?: boolean
}

export default function LetterTransformViz({ pairs, speed = 80, active = true }: Props) {
  const [revealed, setRevealed] = useState(0)
  const [flash, setFlash] = useState<number | null>(null)

  useEffect(() => {
    if (!active) { setRevealed(0); return }
    setRevealed(0)
    let i = 0
    const interval = setInterval(() => {
      setFlash(i)
      setTimeout(() => setFlash(null), speed * 0.6)
      i++
      setRevealed(i)
      if (i >= pairs.length) clearInterval(interval)
    }, speed)
    return () => clearInterval(interval)
  }, [pairs, speed, active])

  if (!pairs.length) return null

  return (
    <div className="mt-4 bg-gray-900/40 border border-gray-800/40 rounded-xl p-4">
      <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">Letter Transformation</p>
      <div className="flex flex-wrap gap-1.5">
        {pairs.map((pair, i) => {
          const isSpace = pair.from === " "
          const done = i < revealed
          const flashing = flash === i

          if (isSpace) return <div key={i} className="w-3" />

          return (
            <div key={i} className="flex flex-col items-center gap-1">
              {/* Original letter */}
              <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-mono font-bold border transition-all duration-150 ${
                done
                  ? "bg-gray-800/60 border-gray-700/40 text-gray-400"
                  : "bg-gray-900/40 border-gray-800/20 text-gray-700"
              }`}>
                {pair.from.toUpperCase()}
              </div>

              {/* Arrow + key indicator */}
              <div className="flex flex-col items-center gap-0.5">
                {pair.key !== undefined && done && (
                  <span className="text-[8px] font-mono text-blue-500/70">
                    {typeof pair.key === "number" ? `+${pair.key}` : pair.key}
                  </span>
                )}
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none"
                  className={`transition-colors ${done ? "text-gray-600" : "text-gray-800"}`}>
                  <path d="M4 1v6M1.5 4.5L4 7l2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* Transformed letter */}
              <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-mono font-bold border transition-all duration-200 ${
                flashing
                  ? "bg-blue-500/30 border-blue-400/60 text-blue-300 scale-110"
                  : done
                  ? "bg-blue-900/30 border-blue-700/40 text-blue-400"
                  : "bg-gray-900/20 border-gray-800/10 text-gray-800"
              }`}>
                {done ? pair.to.toUpperCase() : "·"}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-800/40">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gray-800/60 border border-gray-700/40" />
          <span className="text-[10px] text-gray-600">Original</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-900/30 border border-blue-700/40" />
          <span className="text-[10px] text-gray-600">Encrypted</span>
        </div>
        {pairs.some(p => p.key !== undefined) && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-blue-500/70 font-mono">+n</span>
            <span className="text-[10px] text-gray-600">Key shift</span>
          </div>
        )}
      </div>
    </div>
  )
}