# 🔐 CryptoVerse — Interactive Cryptography Simulation Lab

A premium, interactive web application for learning and visualizing cryptographic algorithms — from ancient classical ciphers to modern asymmetric encryption. Compete daily, battle friends, earn coins, and climb the global leaderboard.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square&logo=supabase)
![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)

---

## ⚠️ Important: License

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
- **Caesar, Vigenère, Playfair, Hill, Rail Fence, and Monoalphabetic.**

### 🔑 Symmetric Key (`/symmetric`)
Animated round-by-round breakdowns of block ciphers:
- **AES-128** — 10 rounds with color-coded state matrix visualizations.
- **DES** — 16 Feistel rounds with key schedule tracking.

### #️⃣ Hashing & Digital Signatures (`/hashing`)
- **Avalanche Effect** — Visual bit-level diff between two inputs.
- **Digital Signatures** — RSA-SHA256 sign & verify using native Web Crypto API.

### 🔓 Asymmetric Encryption (`/asymmetric`)
- **RSA-OAEP** — 2048-bit key pair generation and PEM export.
- **ECDH Key Exchange** — Interactive Alice & Bob shared secret derivation.

### 📅 Daily Contest (`/contest`)
- One cipher puzzle every day, globally synchronized.
- Timed scoring — faster solves earn more points.
- Global leaderboard (today + all-time).
- Rating system with 6 tiers: Novice → Apprentice → Cryptanalyst → Specialist → Expert → Master.
- Streak tracking with bonus coins for consecutive days.

### 🧩 Cipher Challenge (`/challenge`)
- 40 handcrafted puzzles across Easy / Medium / Hard difficulties.
- Hint system with score penalties.
- Local leaderboard with persistent high scores.

### ⚡ Speed Round (`/speed`)
- 60-second burst mode — solve as many ciphers as possible.
- Streak multipliers and hint penalties.
- High score tracking per user.

### ⚔️ Cipher Battle (`/battle`)
- Real-time 1v1 cipher battles via Supabase Realtime.
- Create a room → share the code → race to decrypt first.
- Live opponent status tracking.

### 🛒 Hint Marketplace (`/marketplace`)
- Earn coins by completing activities across all game modes.
- Spend coins on power-ups usable during Contest and Challenge.

| Power-up | Effect |
|---|---|
| ❄️ Time Freeze | Pauses contest timer for 15 seconds |
| 🔍 Letter Reveal | Pre-fills the first letter of the answer |
| 🏷 Cipher ID | Reveals the cipher type (Hint 1) |
| 🗝 Key Fragment | Reveals the key info (Hint 2) |
| 📊 Freq Map | Shows letter frequency analysis of ciphertext |
| 🛡 Wrong Shield | Absorbs one wrong answer penalty |
| ✨ Double Points | Doubles score + rating on next correct answer |
| ⏭ Skip Pass | Skip a puzzle without losing points |

### 👤 Profile (`/profile`)
- Contest rating history with sparkline chart.
- Stats: contests played, best score, avg time, streak, coins, hard solves.
- Achievement badges.
- Full contest history table.

---

## Coin System

Coins are earned automatically and stored in `localStorage`:

| Activity | Coins |
|---|---|
| Complete Daily Contest (base) | 🪙 50 |
| Contest score ≥ 900 | 🪙 +150 |
| Contest score ≥ 700 | 🪙 +75 |
| No hints used in Contest | 🪙 +50 |
| 3-day streak | 🪙 +50 |
| 7-day streak | 🪙 +150 |
| Speed Round per puzzle | 🪙 10 |
| Speed Round 10+ solved | 🪙 +100 |
| Speed Round 15+ solved | 🪙 +150 |
| Challenge Easy / Medium / Hard | 🪙 5 / 15 / 30 |

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5
- **Database:** Supabase (PostgreSQL + Realtime)
- **Auth:** Supabase Auth (email/password + OTP forgot password)
- **Crypto:** Native Web Crypto API
- **UI:** Tailwind CSS + custom animations

---

## Quick Start

```bash
git clone https://github.com/Iampriyanshu2503/CryptoVerse.git
cd CryptoVerse/my-app
npm install
# create .env.local (see below)
npm run dev
```

### Environment Variables

Create `my-app/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ltilrnvyxivkxofzkflo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # anon key from Supabase dashboard
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # service role key (server-only)
```

### Supabase Setup

Run these SQL files in order in Supabase SQL Editor:

| # | File | Purpose |
|---|---|---|
| 1 | `supabase_schema.sql` | profiles, contest_entries tables |
| 2 | `supabase_rls_fix.sql` | RLS policies |
| 3 | `supabase_battle.sql` | battle_rooms table |
| 4 | `supabase_battle_rls_fix.sql` | Disable RLS on battle_rooms |

---

## Project Structure

```
my-app/
├── app/
│   ├── page.tsx                    Homepage
│   ├── classical/page.tsx          6 classical ciphers
│   ├── symmetric/page.tsx          AES-128, DES
│   ├── hashing/page.tsx            SHA, MD5, bcrypt, HMAC
│   ├── asymmetric/page.tsx         RSA, ECDH
│   ├── dashboard/page.tsx          Radar chart + learning timeline
│   ├── contest/page.tsx            Daily cipher contest
│   ├── challenge/page.tsx          40 puzzles
│   ├── speed/page.tsx              60-second speed round
│   ├── battle/page.tsx             1v1 live battle
│   ├── marketplace/page.tsx        Hint marketplace
│   ├── profile/page.tsx            User profile + history
│   └── api/auth/
│       ├── register/route.ts       Register (service role)
│       ├── contest/route.ts        Save contest result (service role)
│       └── battle/route.ts         Create/join battle rooms (service role)
├── components/
│   ├── Sidebar.tsx                 Navigation + sign out
│   ├── AuthModal.tsx               Login · Register · Forgot password (OTP)
│   └── BootOverlay.tsx             Loading screen
└── lib/
    ├── AuthContext.tsx             Auth state management
    ├── GameContext.tsx             Active game navigation guard
    ├── inventory.ts                Coins + owned items utilities
    └── supabase.ts                 Supabase client
```

---

## Architecture Notes

All DB writes use `/api/auth/*` routes with the **service role key** to bypass RLS, preventing the silent hangs that occur with direct client calls.

---

## Roadmap

- [ ] **Pro Feature:** ECC Encryption (Elliptic Curve)
- [ ] **Pro Feature:** Export encryption results as JSON/PDF
- [ ] RSA key size selector (1024 / 2048 / 4096)
- [ ] Mobile-responsive optimization
- [ ] Dark/light theme toggle
- [ ] Multiplayer tournament mode

---

## Educational Disclaimer

CryptoVerse is built for **visualization and learning**. While it uses the native Web Crypto API for modern algorithms, the custom step-by-step implementations (AES/Classical) are for educational clarity and should not be used for securing sensitive production data.