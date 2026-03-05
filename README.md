# CryptoVerse — Interactive Cryptography Simulation Lab

A modern, interactive web application for learning and visualizing cryptographic algorithms — from ancient classical ciphers to modern asymmetric encryption — with step-by-step breakdowns, live visualizations, and real Web Crypto API implementations.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## Features

### 🔐 Classical Ciphers (`/classical`)
Six historical ciphers with full encrypt/decrypt and step-by-step visualization:
- **Caesar Cipher** — shift-based substitution with brute-force (all 26 shifts)
- **Vigenère Cipher** — polyalphabetic substitution with keyword
- **Playfair Cipher** — digraph cipher with live 5×5 matrix preview
- **Hill Cipher** — matrix multiplication mod 26 with 2×2 key
- **Rail Fence Cipher** — transposition cipher with configurable rails
- **Monoalphabetic Substitution** — full 26-character alphabet mapping

### 🔑 Symmetric Key (`/symmetric`)
Block cipher visualizations with animated round-by-round breakdowns:
- **AES-128** — all 10 rounds: SubBytes, ShiftRows, MixColumns, AddRoundKey with color-coded state matrix
- **DES** — 16 Feistel rounds with Initial/Final Permutation and key schedule
- Animated playthrough with step scrubber and progress bar

### #️⃣ Hashing & Digital Signatures (`/hashing`)
- **Hash Generator** — SHA-1, SHA-256, SHA-384, SHA-512 with binary output visualization
- **Avalanche Effect** — bit-level diff between two inputs, % changed bits
- **Hash Comparison** — all algorithms side-by-side with performance benchmarks
- **Digital Signatures** — real RSA-SHA256 sign & verify using Web Crypto API

### 🔓 Asymmetric Encryption (`/asymmetric`)
- **RSA-OAEP** — generate RSA-2048 key pairs, encrypt with public key, decrypt with private key
- **ECDH Key Exchange** — Diffie-Hellman simulation: Alice & Bob derive the same shared secret
- Full PEM key export (SPKI public, PKCS8 private)
- All operations powered by the native Web Crypto API (no external libraries)

### 📊 Performance Dashboard (`/dashboard`)
Three views for algorithm analysis:
- **Overview** — sortable table with security, speed, memory, and simplicity ratings for 9 algorithms
- **Radar Chart** — multi-axis comparison of up to 4 algorithms simultaneously
- **Timeline** — chronological history from 50 BC (Caesar) to modern algorithms with security scores

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Framework  | Next.js 15 (App Router)           |
| Language   | TypeScript                        |
| Styling    | Tailwind CSS                      |
| Crypto     | Web Crypto API (native browser)   |
| Fonts      | Geist Sans + Geist Mono           |

No external crypto libraries — all cryptographic operations use either the native Web Crypto API or custom implementations for educational visualization.

---

## Project Structure

```
my-app/
├── app/
│   ├── page.tsx              # Home page (animated landing)
│   ├── layout.tsx            # Root layout with sidebar + page transitions
│   ├── classical/page.tsx    # Classical ciphers
│   ├── symmetric/page.tsx    # Symmetric key (AES, DES)
│   ├── hashing/page.tsx      # Hashing & digital signatures
│   ├── asymmetric/page.tsx   # Asymmetric encryption (RSA, ECDH)
│   └── dashboard/page.tsx    # Performance dashboard
├── components/
│   ├── Sidebar.tsx           # Responsive sidebar (desktop + mobile drawer)
│   └── PageTransition.tsx    # Fade + slide transition between routes
├── lib/
│   └── crypto/
│       ├── classical.ts      # Caesar, Vigenère, Playfair, Hill, Rail Fence, Mono
│       ├── symmetric.ts      # AES-128 step-by-step implementation
│       ├── hashing.ts        # SHA hashing, avalanche, benchmarking
│       └── utils.ts          # mod, matMul, charToNum, bytesToHex, etc.
└── styles/
    └── globals.css
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/cryptoverse.git
cd cryptoverse

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

---

## Deployment

The easiest way to deploy is with [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Vercel auto-detects Next.js — click **Deploy**
4. Every `git push` triggers an automatic redeploy

---

## Roadmap

- [ ] ECC Encryption (Elliptic Curve)
- [ ] RSA key size selector (1024 / 2048 / 4096)
- [ ] Key import — paste your own PEM key
- [ ] Blowfish & 3DES full implementations
- [ ] Mobile-responsive inner pages
- [ ] Dark/light theme toggle
- [ ] Export encryption results as JSON

---

## Educational Purpose

CryptoVerse is built purely for **learning and visualization**. The custom cipher implementations (AES, classical ciphers) are designed to be readable and educational, not production-grade. For real-world cryptographic needs, always use battle-tested libraries.

---

## License

MIT — free to use, modify, and distribute.