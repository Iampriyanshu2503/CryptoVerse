"use client"

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react"

interface GameContextType {
  isGameActive: boolean
  gameName: string
  setGameActive: (active: boolean, name?: string) => void
  requestLeave: () => Promise<boolean>
}

const GameContext = createContext<GameContextType>({
  isGameActive: false,
  gameName: "",
  setGameActive: () => {},
  requestLeave: async () => true,
})

export function GameProvider({ children }: { children: ReactNode }) {
  const [isGameActive, setIsGameActive] = useState(false)
  const [gameName, setGameName]         = useState("")
  const [showModal, setShowModal]       = useState(false)
  const resolveRef = useRef<((val: boolean) => void) | null>(null)

  const setGameActive = useCallback((active: boolean, name = "") => {
    setIsGameActive(active)
    setGameName(name)
  }, [])

  const requestLeave = useCallback((): Promise<boolean> => {
    if (!isGameActive) return Promise.resolve(true)
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setShowModal(true)
    })
  }, [isGameActive])

  const handleConfirm = () => { setShowModal(false); resolveRef.current?.(true) }
  const handleCancel  = () => { setShowModal(false); resolveRef.current?.(false) }

  return (
    <GameContext.Provider value={{ isGameActive, gameName, setGameActive, requestLeave }}>
      {children}

      {/* Custom leave confirmation modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleCancel} />

          {/* Modal */}
          <div className="relative w-full max-w-sm bg-[#0f0f0f] border border-gray-800 rounded-2xl p-6 shadow-2xl"
            style={{ boxShadow: "0 0 60px rgba(239,68,68,0.1)" }}>
            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M11 7v5m0 3.5v.5" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M9.172 3.172a2.828 2.828 0 0 1 3.656 0l6 5.5a2.828 2.828 0 0 1 0 4.656l-6 5.5a2.828 2.828 0 0 1-3.656 0l-6-5.5a2.828 2.828 0 0 1 0-4.656z" stroke="#f87171" strokeWidth="1.5"/>
              </svg>
            </div>

            <h3 className="text-[16px] font-bold text-white text-center mb-1">Leave {gameName}?</h3>
            <p className="text-[13px] text-gray-500 text-center mb-6">
              Your current progress won't be saved if you leave now.
            </p>

            <div className="flex gap-3">
              <button onClick={handleCancel}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border border-gray-700 text-gray-300 hover:bg-gray-800/60 transition-colors">
                Keep Playing
              </button>
              <button onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors">
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </GameContext.Provider>
  )
}

export function useGame() {
  return useContext(GameContext)
}