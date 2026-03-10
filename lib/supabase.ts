import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
  )
}

// True singleton — stored on globalThis so Next.js hot-reload never creates a duplicate.
// A single instance = one localStorage key = session survives page close/refresh.
const createSupabaseClient = () =>
  createClient(supabaseUrl!, supabaseKey!, {
    auth: {
      persistSession:     true,
      autoRefreshToken:   true,
      detectSessionInUrl: true,
      storageKey:         "cryptoverse-auth",
      storage:            typeof window !== "undefined" ? window.localStorage : undefined,
    },
  })

declare global {
  // eslint-disable-next-line no-var
  var __cryptoverse_supabase__: ReturnType<typeof createSupabaseClient> | undefined
}

export const supabase =
  globalThis.__cryptoverse_supabase__ ??
  (globalThis.__cryptoverse_supabase__ = createSupabaseClient())

// ── Database types ─────────────────────────────────────────────────────────────

export interface Profile {
  id:              string
  username:        string
  rating:          number
  contests_played: number
  best_score:      number
  streak:          number
  last_played:     string | null
  created_at:      string
  // Extended profile fields
  avatar_url:      string | null
  bio:             string | null
  location:        string | null
  website:         string | null
  github:          string | null
  linkedin:        string | null
  twitter:         string | null
  discord:         string | null
  display_name:    string | null
}

export interface ContestEntry {
  id:            string
  user_id:       string
  username:      string
  puzzle_date:   string
  puzzle_id:     string
  score:         number
  time_seconds:  number
  hints_used:    number
  difficulty:    string
  rating_before: number
  rating_after:  number
  created_at:    string
}

export interface LeaderboardRow {
  username:     string
  score:        number
  time_seconds: number
  hints_used:   number
  difficulty:   string
  rating:       number
  streak:       number
  puzzle_date:  string
  rank:         number
}

export interface AllTimeRow {
  username:        string
  rating:          number
  contests_played: number
  best_score:      number
  streak:          number
}