// ─── CryptoVerse Achievement System ──────────────────────────────────────────
// lib/achievements.ts

export type Rarity = "common" | "rare" | "epic" | "legendary"

export interface Achievement {
  id:       string
  icon:     string
  label:    string
  desc:     string
  rarity:   Rarity
  secret?:  boolean   // hidden until unlocked
  check:    (stats: AchievementStats) => boolean
}

export interface AchievementStats {
  // Contest
  contests_played:  number
  best_score:       number
  rating:           number
  streak:           number
  noHintSolves:     number
  hardSolves:       number
  bestTime:         number   // seconds
  perfectScores:    number   // score >= 950
  // Speed
  speedBestSolved:  number
  speedRoundsPlayed:number
  // Challenge
  challengeSolved:  number
  challengeHard:    number
  // Battle
  battleWins:       number
  battlePlayed:     number
  // General
  coins:            number
  itemsBought:      number
}

// ── Rarity config ─────────────────────────────────────────────────────────────
export const RARITY: Record<Rarity, { label: string; color: string; glow: string; border: string; bg: string }> = {
  common:    { label: "Common",    color: "#9ca3af", glow: "rgba(156,163,175,0.2)", border: "rgba(156,163,175,0.25)", bg: "rgba(156,163,175,0.05)" },
  rare:      { label: "Rare",      color: "#60a5fa", glow: "rgba(96,165,250,0.25)", border: "rgba(96,165,250,0.35)",  bg: "rgba(96,165,250,0.07)"  },
  epic:      { label: "Epic",      color: "#a78bfa", glow: "rgba(167,139,250,0.3)", border: "rgba(167,139,250,0.4)",  bg: "rgba(167,139,250,0.08)" },
  legendary: { label: "Legendary", color: "#fbbf24", glow: "rgba(251,191,36,0.35)", border: "rgba(251,191,36,0.45)", bg: "rgba(251,191,36,0.08)"  },
}

// ── All achievements ──────────────────────────────────────────────────────────
export const ACHIEVEMENTS: Achievement[] = [
  // ── Contest ───────────────────────────────────────────────────────────────
  {
    id: "first_blood",  icon: "🎯",  rarity: "common",
    label: "First Blood",
    desc: "Complete your first Daily Contest",
    check: s => s.contests_played >= 1,
  },
  {
    id: "on_a_roll",    icon: "🔥",  rarity: "common",
    label: "On a Roll",
    desc: "Maintain a 2-day contest streak",
    check: s => s.streak >= 2,
  },
  {
    id: "hot_streak",   icon: "🌋",  rarity: "rare",
    label: "Hot Streak",
    desc: "Maintain a 7-day contest streak",
    check: s => s.streak >= 7,
  },
  {
    id: "unstoppable",  icon: "⚡",  rarity: "epic",
    label: "Unstoppable",
    desc: "Maintain a 30-day contest streak",
    check: s => s.streak >= 30,
  },
  {
    id: "puzzle_vet",   icon: "🧩",  rarity: "common",
    label: "Puzzle Veteran",
    desc: "Play 10 Daily Contests",
    check: s => s.contests_played >= 10,
  },
  {
    id: "contest_100",  icon: "💯",  rarity: "epic",
    label: "Century",
    desc: "Play 100 Daily Contests",
    check: s => s.contests_played >= 100,
  },
  {
    id: "pure_intellect", icon: "💡", rarity: "rare",
    label: "Pure Intellect",
    desc: "Solve a contest without using any hints",
    check: s => s.noHintSolves >= 1,
  },
  {
    id: "no_hints_master", icon: "🧠", rarity: "epic",
    label: "Hint-Free Master",
    desc: "Solve 10 contests without hints",
    check: s => s.noHintSolves >= 10,
  },
  {
    id: "hard_mode",    icon: "🏔️",  rarity: "rare",
    label: "Hard Mode",
    desc: "Solve 5 hard-difficulty puzzles",
    check: s => s.hardSolves >= 5,
  },
  {
    id: "perfectionist", icon: "🎓", rarity: "epic",
    label: "Perfectionist",
    desc: "Score 950+ on a contest puzzle",
    check: s => s.perfectScores >= 1,
  },
  {
    id: "perfect_10",   icon: "🌟",  rarity: "legendary",
    label: "Flawless 10",
    desc: "Score 950+ ten times",
    check: s => s.perfectScores >= 10,
  },

  // ── Speed ─────────────────────────────────────────────────────────────────
  {
    id: "speed_demon",  icon: "⚡",  rarity: "rare",
    label: "Speed Demon",
    desc: "Solve 10+ puzzles in a single Speed Round",
    check: s => s.speedBestSolved >= 10,
  },
  {
    id: "lightning",    icon: "🌩️", rarity: "epic",
    label: "Lightning",
    desc: "Solve 15+ puzzles in a single Speed Round",
    check: s => s.speedBestSolved >= 15,
  },
  {
    id: "speed_legend", icon: "🚀",  rarity: "legendary",
    label: "Speed Legend",
    desc: "Solve 20+ puzzles in a single Speed Round",
    check: s => s.speedBestSolved >= 20,
  },

  // ── Battle ────────────────────────────────────────────────────────────────
  {
    id: "battle_born",  icon: "⚔️",  rarity: "common",
    label: "Battle Born",
    desc: "Win your first Cipher Battle",
    check: s => s.battleWins >= 1,
  },
  {
    id: "gladiator",    icon: "🛡",  rarity: "rare",
    label: "Gladiator",
    desc: "Win 10 Cipher Battles",
    check: s => s.battleWins >= 10,
  },
  {
    id: "undefeated",   icon: "👑",  rarity: "epic",
    label: "Undefeated",
    desc: "Win 5 battles in a row",
    check: s => s.battleWins >= 5 && s.battlePlayed >= 5 && s.battleWins === s.battlePlayed,
  },
  {
    id: "warlord",      icon: "🏆",  rarity: "legendary",
    label: "Warlord",
    desc: "Win 50 Cipher Battles",
    check: s => s.battleWins >= 50,
  },

  // ── Rating ────────────────────────────────────────────────────────────────
  {
    id: "rising_star",  icon: "🌠",  rarity: "common",
    label: "Rising Star",
    desc: "Reach 1200 rating",
    check: s => s.rating >= 1200,
  },
  {
    id: "specialist",   icon: "💎",  rarity: "rare",
    label: "Specialist",
    desc: "Reach 1500 rating",
    check: s => s.rating >= 1500,
  },
  {
    id: "expert",       icon: "🔮",  rarity: "epic",
    label: "Expert",
    desc: "Reach 2000 rating",
    check: s => s.rating >= 2000,
  },
  {
    id: "master",       icon: "👑",  rarity: "legendary",
    label: "Master Cryptanalyst",
    desc: "Reach 2500 rating",
    check: s => s.rating >= 2500,
  },

  // ── Coins & Marketplace ───────────────────────────────────────────────────
  {
    id: "coin_collector", icon: "🪙", rarity: "common",
    label: "Coin Collector",
    desc: "Accumulate 500 coins",
    check: s => s.coins >= 500,
  },
  {
    id: "crypto_rich",  icon: "💰",  rarity: "rare",
    label: "Crypto Rich",
    desc: "Accumulate 2000 coins",
    check: s => s.coins >= 2000,
  },
  {
    id: "shopaholic",   icon: "🛒",  rarity: "common",
    label: "Shopaholic",
    desc: "Buy your first item from the Marketplace",
    check: s => s.itemsBought >= 1,
  },

  // ── Secret / Easter Egg ───────────────────────────────────────────────────
  {
    id: "night_owl",    icon: "🦉",  rarity: "legendary", secret: true,
    label: "Night Owl",
    desc: "???",
    check: s => s.contests_played >= 1 && new Date().getHours() >= 0 && new Date().getHours() < 4,
  },
  {
    id: "cryptomaster", icon: "🔐",  rarity: "legendary", secret: true,
    label: "CryptoMaster",
    desc: "Unlock every other achievement",
    check: s => s.contests_played >= 10 && s.battleWins >= 1 && s.speedBestSolved >= 10 && s.rating >= 1500 && s.noHintSolves >= 5,
  },
]

// ── localStorage helpers ──────────────────────────────────────────────────────
const STORAGE_KEY = "cv_achievements"

export function getUnlocked(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") } catch { return [] }
}

function saveUnlocked(ids: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)) } catch {}
}

// Check stats → unlock new achievements → return newly unlocked ones
export function checkAndUnlock(stats: AchievementStats): Achievement[] {
  const already = new Set(getUnlocked())
  const newlyUnlocked: Achievement[] = []
  for (const a of ACHIEVEMENTS) {
    if (already.has(a.id)) continue
    if (a.check(stats)) {
      already.add(a.id)
      newlyUnlocked.push(a)
    }
  }
  if (newlyUnlocked.length > 0) saveUnlocked([...already])
  return newlyUnlocked
}

export function buildStats(overrides: Partial<AchievementStats> = {}): AchievementStats {
  const def: AchievementStats = {
    contests_played: 0, best_score: 0, rating: 1000, streak: 0,
    noHintSolves: 0, hardSolves: 0, bestTime: 0, perfectScores: 0,
    speedBestSolved: 0, speedRoundsPlayed: 0,
    challengeSolved: 0, challengeHard: 0,
    battleWins: 0, battlePlayed: 0,
    coins: 0, itemsBought: 0,
  }
  return { ...def, ...overrides }
}