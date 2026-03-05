"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [displayChildren, setDisplayChildren] = useState(children)
  const [transitionState, setTransitionState] = useState<"idle" | "out" | "in">("idle")
  const prevPathname = useRef(pathname)

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      // Fade out
      setTransitionState("out")
      const outTimer = setTimeout(() => {
        setDisplayChildren(children)
        prevPathname.current = pathname
        setTransitionState("in")
        // Fade back in
        const inTimer = setTimeout(() => setTransitionState("idle"), 300)
        return () => clearTimeout(inTimer)
      }, 150)
      return () => clearTimeout(outTimer)
    } else {
      setDisplayChildren(children)
    }
  }, [pathname, children])

  return (
    <div
      style={{
        opacity:   transitionState === "out" ? 0 : 1,
        transform: transitionState === "out" ? "translateY(6px)" : "translateY(0px)",
        transition: "opacity 150ms ease, transform 150ms ease",
      }}
      className="h-full"
    >
      {displayChildren}
    </div>
  )
}