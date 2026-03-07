"use client"

import { useEffect, useState } from "react"

interface Props {
  state: number[][]
  operation: string
  prevState?: number[][]
  animating?: boolean
}

const OP_CONFIG: Record<string, {
  label: string
  cellBase: string
  cellChanged: string
  description: string
  highlightPattern?: (r: number, c: number) => boolean
}> = {
  SubBytes: {
    label: "SubBytes — S-box substitution",
    cellBase:    "bg-blue-900/30 border-blue-700/30 text-blue-300",
    cellChanged: "bg-blue-500/50 border-blue-400/70 text-blue-100 scale-105",
    description: "Each byte is replaced using the AES S-box lookup table.",
    highlightPattern: () => true,
  },
  ShiftRows: {
    label: "ShiftRows — row rotation",
    cellBase:    "bg-emerald-900/30 border-emerald-700/30 text-emerald-300",
    cellChanged: "bg-emerald-500/50 border-emerald-400/70 text-emerald-100 scale-105",
    description: "Row 0 unchanged, Row 1 shifts left by 1, Row 2 by 2, Row 3 by 3.",
    highlightPattern: (r) => r > 0,
  },
  MixColumns: {
    label: "MixColumns — column mixing",
    cellBase:    "bg-purple-900/30 border-purple-700/30 text-purple-300",
    cellChanged: "bg-purple-500/50 border-purple-400/70 text-purple-100 scale-105",
    description: "Each column is multiplied by a fixed polynomial in GF(2⁸).",
    highlightPattern: () => true,
  },
  AddRoundKey: {
    label: "AddRoundKey — XOR with key",
    cellBase:    "bg-yellow-900/30 border-yellow-700/30 text-yellow-300",
    cellChanged: "bg-yellow-500/50 border-yellow-400/70 text-yellow-100 scale-105",
    description: "Each byte is XORed with the corresponding byte of the round key.",
    highlightPattern: () => true,
  },
  Feistel: {
    label: "Feistel Round — S-box + P-box",
    cellBase:    "bg-pink-900/30 border-pink-700/30 text-pink-300",
    cellChanged: "bg-pink-500/50 border-pink-400/70 text-pink-100 scale-105",
    description: "Right half expanded, XORed with subkey, S-boxes applied, P-permutation.",
    highlightPattern: (r) => r === 1,
  },
  Initial: {
    label: "Initial State",
    cellBase:    "bg-gray-800/40 border-gray-700/30 text-gray-400",
    cellChanged: "bg-gray-700/50 border-gray-500/50 text-gray-200 scale-105",
    description: "The plaintext is arranged into a 4×4 byte state matrix.",
  },
  KeySchedule: {
    label: "Key Schedule",
    cellBase:    "bg-orange-900/30 border-orange-700/30 text-orange-300",
    cellChanged: "bg-orange-500/50 border-orange-400/70 text-orange-100 scale-105",
    description: "Round keys are derived from the original cipher key.",
  },
}

export default function AESMatrix({ state, operation, prevState, animating = false }: Props) {
  const [flashCells, setFlashCells] = useState<Set<string>>(new Set())
  const cfg = OP_CONFIG[operation] ?? OP_CONFIG.Initial
  const cols = state[0]?.length ?? 4

  useEffect(() => {
    if (!animating || !prevState) return
    const changed = new Set<string>()
    state.forEach((row, r) => {
      row.forEach((val, c) => {
        if (prevState[r]?.[c] !== val) changed.add(`${r}-${c}`)
      })
    })
    setFlashCells(changed)
    const t = setTimeout(() => setFlashCells(new Set()), 600)
    return () => clearTimeout(t)
  }, [state, prevState, animating])

  return (
    <div className="space-y-3">
      {/* Operation label */}
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
          cfg.cellBase.includes("blue")   ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
          cfg.cellBase.includes("emerald")? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
          cfg.cellBase.includes("purple") ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
          cfg.cellBase.includes("yellow") ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
          cfg.cellBase.includes("pink")   ? "bg-pink-500/10 text-pink-400 border-pink-500/20" :
          cfg.cellBase.includes("orange") ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
          "bg-gray-500/10 text-gray-400 border-gray-500/20"
        }`}>{operation}</span>
      </div>

      {/* Matrix grid */}
      <div
        className="inline-grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {state.map((row, r) =>
          row.map((val, c) => {
            const key = `${r}-${c}`
            const isFlashing = flashCells.has(key)
            const shouldHighlight = cfg.highlightPattern?.(r, c) ?? false

            return (
              <div
                key={key}
                className={`w-12 h-12 border rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all duration-300 ${
                  isFlashing ? cfg.cellChanged
                  : shouldHighlight ? cfg.cellBase
                  : "bg-gray-800/30 border-gray-700/20 text-gray-500"
                }`}
              >
                <span className="text-[11px] font-mono font-bold leading-none">
                  {val.toString(16).padStart(2, "0").toUpperCase()}
                </span>
                <span className="text-[8px] font-mono opacity-40 leading-none">{val}</span>
              </div>
            )
          })
        )}
      </div>

      {/* Row labels */}
      <div className="flex gap-1 items-center">
        <span className="text-[9px] text-gray-700 w-12 text-center font-mono">R0</span>
        <span className="text-[9px] text-gray-700 w-12 text-center font-mono">R1</span>
        <span className="text-[9px] text-gray-700 w-12 text-center font-mono">R2</span>
        <span className="text-[9px] text-gray-700 w-12 text-center font-mono">R3</span>
      </div>

      {/* Description */}
      <p className="text-[11px] text-gray-500 leading-relaxed">{cfg.description}</p>

      {/* Changed cells count */}
      {prevState && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-700">
            {(() => {
              let count = 0
              state.forEach((row, r) => row.forEach((val, c) => { if (prevState[r]?.[c] !== val) count++ }))
              return count > 0 ? `${count} byte${count > 1 ? "s" : ""} changed` : "No changes"
            })()}
          </span>
        </div>
      )}
    </div>
  )
}