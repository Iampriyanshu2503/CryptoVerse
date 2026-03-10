"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react"
import type { User, Session } from "@supabase/supabase-js"
import { supabase, type Profile } from "@/lib/supabase"

// ── Context shape ─────────────────────────────────────────────────────────────
interface AuthCtx {
  user:            User | null
  profile:         Profile | null
  session:         Session | null
  loading:         boolean
  signUp:          (email: string, password: string, username: string) => Promise<string | null>
  signIn:          (email: string, password: string) => Promise<string | null>
  signOut:         () => Promise<void>
  refreshProfile:       () => Promise<void>
  updateProfileLocal:   (updates: Record<string, any>) => void
  resetPassword:   (email: string) => Promise<string | null>
  updatePassword:  (newPassword: string) => Promise<string | null>
}

const AuthContext = createContext<AuthCtx | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const userRef = useRef<User | null>(null)
  userRef.current = user

  // ── fetchProfile ──────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single()
      if (error) {
        if (error.code !== "PGRST116") console.error("fetchProfile error:", error.message)
        setProfile(null)
      } else {
        setProfile(data as Profile)
      }
    } catch (err) {
      console.error("fetchProfile unexpected error:", err)
      setProfile(null)
    }
  }, [])

  // ── Bootstrap session on mount ────────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    let initialized = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, sess) => {
        if (!mounted) return
        if (event === "SIGNED_OUT" && !initialized) return
        initialized = true
        setSession(sess)
        setUser(sess?.user ?? null)
        if (sess?.user) {
          if (event === "SIGNED_IN") await new Promise(r => setTimeout(r, 400))
          await fetchProfile(sess.user.id)
        } else if (event === "SIGNED_OUT") {
          setProfile(null)
        }
      }
    )

    const init = async () => {
      try {
        const { data: { session: sess }, error } = await supabase.auth.getSession()
        if (!mounted) return
        if (error) { console.error("getSession error:", error.message); return }
        setSession(sess)
        setUser(sess?.user ?? null)
        if (sess?.user) await fetchProfile(sess.user.id)
      } catch (err) {
        console.error("init error:", err)
      } finally {
        if (mounted) setLoading(false)
        initialized = true
      }
    }

    init()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  // ── signUp ────────────────────────────────────────────────────────────────
  const signUp = useCallback(
    async (email: string, password: string, username: string): Promise<string | null> => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, username }),
        })
        const json = await res.json()
        if (!res.ok) return json.error ?? "Registration failed"
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        return signInErr?.message ?? null
      } catch (err: any) {
        return err?.message ?? "An unexpected error occurred"
      }
    },
    []
  )

  // ── signIn ────────────────────────────────────────────────────────────────
  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return error?.message ?? null
      } catch (err: any) {
        return err?.message ?? "An unexpected error occurred"
      }
    },
    []
  )

  // ── signOut ───────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    try { await supabase.auth.signOut() } catch (err) { console.error("signOut error:", err) }
    setUser(null)
    setProfile(null)
    setSession(null)
    // Force full reload so all page state is cleared
    if (typeof window !== "undefined") window.location.href = "/"
  }, [])

  // ── refreshProfile ────────────────────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    const uid = userRef.current?.id
    if (uid) await fetchProfile(uid)
  }, [fetchProfile])

  // ── updateProfileLocal — update profile state without DB round-trip ───────
  const updateProfileLocal = useCallback((updates: Partial<typeof profile>) => {
    setProfile(prev => prev ? { ...prev, ...updates } : prev)
  }, [])

  // ── resetPassword — sends OTP/magic link to email ─────────────────────────
  const resetPassword = useCallback(async (email: string): Promise<string | null> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      return error?.message ?? null
    } catch (err: any) {
      return err?.message ?? "Failed to send reset email"
    }
  }, [])

  // ── updatePassword — called after user clicks link in email ───────────────
  const updatePassword = useCallback(async (newPassword: string): Promise<string | null> => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      return error?.message ?? null
    } catch (err: any) {
      return err?.message ?? "Failed to update password"
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signUp, signIn, signOut, refreshProfile, updateProfileLocal, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}