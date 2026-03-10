# 🔐 CryptoVerse — Interactive Cryptography Simulation Lab

A premium, interactive web application for learning and visualizing cryptographic algorithms — from ancient classical ciphers to modern asymmetric encryption. Compete daily, battle friends, earn coins, unlock achievements, and climb the global leaderboard.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square&logo=supabase)
![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)

---

## ⚠️ License

**Copyright © 2026 Priyanshu Roy. All Rights Reserved.**

As of March 2026, CryptoVerse operates under a **Proprietary License**.

- **Legacy Versions:** Versions prior to v1.0.0 remain under the MIT license.
- **Current Version (v2.0.0+):** All rights reserved. Commercial use, redistribution, or modification is strictly prohibited without a valid commercial license.

This software is provided for **educational evaluation only**. You may download and run this project locally, but you are strictly prohibited from:
1. Using this code in a production environment.
2. Selling or sub-licensing the software or its derivatives.
3. Hosting a public version without written consent.

**For Commercial Licensing:** `priyanshu712204@gmail.com`

---

## Features

### 🔐 Classical Ciphers (`/classical`)
Six historical ciphers with full encrypt/decrypt and step-by-step visualization:
- **Caesar, Vigenère, Playfair, Hill, Rail Fence, Monoalphabetic**

### 🔑 Symmetric Key (`/symmetric`)
Animated round-by-round breakdowns of block ciphers:
- **AES-128** — 10 rounds with color-coded state matrix visualizations
- **DES** — 16 Feistel rounds with key schedule tracking

### #️⃣ Hashing & Digital Signatures (`/hashing`)
- **Avalanche Effect** — Visual bit-level diff between two inputs
- **Digital Signatures** — RSA-SHA256 sign & verify using native Web Crypto API

### 🔓 Asymmetric Encryption (`/asymmetric`)
- **RSA-OAEP** — 2048-bit key pair generation and PEM export
- **ECDH Key Exchange** — Interactive Alice & Bob shared secret derivation

### 📅 Daily Contest (`/contest`)
- One cipher puzzle every day, globally synchronized
- Timed scoring — faster solves earn more points
- Global leaderboard (today + all-time)
- Rating system with 6 tiers: Novice → Apprentice → Cryptanalyst → Specialist → Expert → Master
- Streak tracking with bonus coins for consecutive days
- Power-up items usable during play (see Marketplace)

### 🧩 Cipher Challenge (`/challenge`)
- 40 handcrafted puzzles across Easy / Medium / Hard
- Hint system with score penalties
- Local high score tracking per puzzle

### ⚡ Speed Round (`/speed`)
- 60-second burst mode — solve as many ciphers as possible
- Bonus coins for hitting 10+ and 15+ solve milestones
- Personal best tracking

### ⚔️ Cipher Battle (`/battle`)
- Real-time 1v1 battles via Supabase Realtime
- Create a room → share the code → race to decrypt first
- Live opponent status, winner determined by speed

### 🛒 Hint Marketplace (`/marketplace`)
- Earn coins by completing activities across all game modes
- Purchases sync to your account across devices

| Power-up | Effect |
|---|---|
| ❄️ Time Freeze | Pauses contest timer for 15 seconds |
| 🔍 Letter Reveal | Pre-fills the first letter of the answer |
| 🏷 Cipher ID | Reveals the cipher type (Hint 1) free |
| 🗝 Key Fragment | Reveals the key info (Hint 2) free |
| 📊 Freq Map | Shows letter frequency analysis |
| 🛡 Wrong Shield | Absorbs one wrong answer penalty |
| ✨ Double Points | Doubles score + rating on next correct answer |
| ⏭ Skip Pass | Skip a puzzle without penalty |

### 🏆 Achievement System
27 unlockable badges across 4 rarity tiers, tracked automatically across all game modes.

| Rarity | Color | Examples |
|---|---|---|
| Common | Gray | First Blood, Battle Born, Shopaholic |
| Rare | Blue | Speed Demon, Pure Intellect, Gladiator |
| Epic | Purple | Lightning, Hint-Free Master, Undefeated |
| Legendary | Gold | Speed Legend, Warlord, CryptoMaster, Night Owl |

2 secret achievements hidden until unlocked. Toast notifications appear on screen when a new badge is earned mid-game.

### 👤 Profile (`/profile`)
- Avatar upload (drag & drop or browse, max 2MB, stored in Supabase Storage)
- Display name, bio, location
- Social links: GitHub, LinkedIn, Twitter/X, Discord, Website
- Rating history chart with hover tooltips and animated pulse on latest point
- Stats grid: contests played, best score, avg score, avg time, best time, no-hint solves, hard solved, streak
- Difficulty & score breakdown charts
- Full achievement gallery with rarity filters
- Complete contest history table (desktop) + card layout (mobile)

---

## Coin System

Coins are earned automatically across all game modes and synced to your account:

| Activity | Coins |
|---|---|
| Complete Daily Contest (base) | 🪙 50 |
| Contest score ≥ 900 | 🪙 +150 |
| Contest score ≥ 700 | 🪙 +75 |
| No hints used in Contest | 🪙 +50 |
| 3-day streak bonus | 🪙 +50 |
| 7-day streak bonus | 🪙 +150 |
| Speed Round per puzzle solved | 🪙 10 |
| Speed Round 10+ solved bonus | 🪙 +100 |
| Speed Round 15+ solved bonus | 🪙 +150 |
| Challenge Easy / Medium / Hard | 🪙 5 / 15 / 30 |

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5
- **Database:** Supabase (PostgreSQL + Realtime + Storage)
- **Auth:** Supabase Auth (email/password + OTP forgot password)
- **Crypto:** Native Web Crypto API
- **UI:** Tailwind CSS + custom CSS animations

---

## Quick Start

```bash
git clone https://github.com/Iampriyanshu2503/CryptoVerse.git
cd CryptoVerse/my-app
npm install
# create .env.local (see below)
npm run dev
```

> **Note:** Always use `npm run dev` for development. Run `npm run build` then `npm run start` for production only.

### Environment Variables

Create `my-app/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

All three keys are available in your Supabase dashboard under **Settings → API**.

### Supabase Setup

Run these SQL files **in order** in the Supabase SQL Editor:

| # | File | Purpose |
|---|---|---|
| 1 | `supabase_schema.sql` | Core tables: profiles, contest_entries |
| 2 | `supabase_rls_fix.sql` | RLS policies for profiles |
| 3 | `supabase_battle.sql` | battle_rooms table |
| 4 | `supabase_battle_rls_fix.sql` | Disable RLS on battle_rooms |
| 5 | `supabase_coins_inventory.sql` | Adds coins + inventory columns to profiles |
| 6 | `supabase_profile_extended.sql` | Adds avatar, bio, social links, storage bucket |

Optional — run only if you need to fix existing data:

| File | Purpose |
|---|---|
| `fix_streak_coins.sql` | Manually repair streak / coin data for existing users |

---

## Project Structure

```
my-app/
├── app/
│   ├── page.tsx                       Homepage
│   ├── layout.tsx                     Root layout (AchievementToast mounted here)
│   ├── classical/page.tsx             6 classical ciphers
│   ├── symmetric/page.tsx             AES-128, DES
│   ├── hashing/page.tsx               SHA, MD5, bcrypt, HMAC, avalanche effect
│   ├── asymmetric/page.tsx            RSA, ECDH
│   ├── dashboard/page.tsx             Radar chart + learning timeline
│   ├── contest/page.tsx               Daily cipher contest + power-ups
│   ├── challenge/page.tsx             40 handcrafted puzzles
│   ├── speed/page.tsx                 60-second speed round
│   ├── battle/page.tsx                Real-time 1v1 cipher battle
│   ├── marketplace/page.tsx           Hint marketplace + cross-device sync
│   ├── profile/page.tsx               Full profile page with avatar + social links
│   └── api/auth/
│       ├── register/route.ts          Create + confirm user (service role)
│       ├── contest/route.ts           Save contest result + update profile
│       ├── battle/route.ts            Create / join / submit / winner actions
│       └── coins/route.ts             Sync coins + inventory to DB
├── components/
│   ├── Sidebar.tsx                    Navigation sidebar
│   ├── AuthModal.tsx                  Login · Register · Forgot password (OTP)
│   ├── BootOverlay.tsx                Animated loading screen
│   ├── PageTransition.tsx             Page-to-page animation wrapper
│   ├── AchievementToast.tsx           In-game unlock notification (SSR-safe)
│   └── EditProfileModal.tsx           Avatar upload + bio + social links editor
├── lib/
│   ├── AuthContext.tsx                Auth state, fetchProfile, updateProfileLocal
│   ├── GameContext.tsx                Active game navigation guard
│   ├── inventory.ts                   Coins + items utilities (setCoinsVal, addCoins…)
│   ├── achievements.ts                27 achievements, rarity system, checkAndUnlock
│   └── supabase.ts                    Supabase client + Profile / ContestEntry types
└── SQL files (run in Supabase)
    ├── supabase_schema.sql
    ├── supabase_rls_fix.sql
    ├── supabase_battle.sql
    ├── supabase_battle_rls_fix.sql
    ├── supabase_coins_inventory.sql
    ├── supabase_profile_extended.sql
    └── fix_streak_coins.sql
```

---

## Architecture Notes

### API Routes (service role)
All database writes use `/api/auth/*` routes with the **service role key** to bypass RLS. Direct client writes to most tables will silently hang due to RLS — always route mutations through these endpoints.

### Coins & Inventory Sync
`lib/inventory.ts` is the single source of truth for coins and owned items. `setCoinsVal()` dispatches a `cv_coins_changed` CustomEvent so all open tabs/pages update instantly without needing `storage` events (which only fire cross-tab).

### Achievement System
`lib/achievements.ts` defines all 27 achievements with `check()` functions against a `AchievementStats` object. Call `checkAndUnlock(stats)` after any game-completing action — it diffs against `localStorage("cv_achievements")` and returns newly unlocked badges. Fire `triggerAchievementToast(achievement)` to show the animated notification. `AchievementToast` is loaded with `dynamic(..., { ssr: false })` in layout to avoid SSR `window` access errors.

### Login & Auth Timeout
`AuthModal` uses a 30-second timeout with a `timedOut` flag to prevent race conditions. `AuthContext.fetchProfile` uses `Promise.race()` with an 8-second timeout and falls back to `localStorage("cv_profile_cache")` on cold starts, so the UI is never blank on slow Supabase connections.

### Battle Realtime
Battle state is driven by Supabase Realtime channel subscriptions on `battle_rooms`. All room mutations (submit answer, set winner) are routed through `/api/auth/battle` with `action` payloads to avoid RLS issues on direct client updates.

---

## Rating Tiers

| Tier | Min Rating | Color |
|---|---|---|
| 🔰 Novice | 0 | Gray |
| ⚡ Apprentice | 500 | Green |
| 🔍 Cryptanalyst | 1000 | Blue |
| 💎 Specialist | 1500 | Purple |
| 🏆 Expert | 2000 | Gold |
| 👑 Master | 2500 | Red |

---

## Roadmap

- [ ] Tournaments & Leagues
- [ ] Friends & Social System
- [ ] Daily Quests
- [ ] Ranked Seasons
- [ ] ECC Encryption (Elliptic Curve)
- [ ] Export encryption results as JSON / PDF
- [ ] RSA key size selector (1024 / 2048 / 4096)
- [ ] Mobile-responsive optimization
- [ ] Dark / light theme toggle

---

## Educational Disclaimer

CryptoVerse is built for **visualization and learning**. While it uses the native Web Crypto API for modern algorithms (RSA-OAEP, ECDH, SHA-256), the custom step-by-step implementations (AES round visualization, classical ciphers) are for educational clarity and should not be used for securing sensitive production data.