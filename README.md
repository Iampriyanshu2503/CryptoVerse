# 🔐 CryptoVerse — Interactive Cryptography Simulation Lab

A premium, interactive web application for learning and visualizing cryptographic algorithms — from ancient classical ciphers to modern asymmetric encryption.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss)
![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)

---

## ⚠️ Important: License Change
**Notice:** As of March 2026, CryptoVerse has transitioned from an open-source model to a **Proprietary License**. 

* **Legacy Versions:** Versions prior to v1.0.0 remain under the MIT license.
* **Current Version (v2.0.0+):** All rights reserved. Commercial use, redistribution, or modification of this source code is strictly prohibited without a valid commercial license.

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

---

## ⚖️ Licensing & Terms

**Copyright © 2026 Priyanshu Roy. All Rights Reserved.**

This software is provided for **educational evaluation only**. You may download and run this project locally to inspect the code, but you are strictly prohibited from:
1. Using this code in a production environment.
2. Selling or sub-licensing the software or its derivatives.
3. Hosting a public version of this lab without written consent.

**For Commercial Licensing:**
To obtain a license for corporate training, educational institutions, or integration into your own platform, please contact: `priyanshu712204@gmail.com`

---

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5
- **Crypto:** Native Web Crypto API (No external dependencies)
- **UI:** Tailwind CSS + Framer Motion (Transitions)

---

## Roadmap

- [ ] **Pro Feature:** ECC Encryption (Elliptic Curve)
- [ ] **Pro Feature:** Export encryption results as JSON/PDF
- [ ] RSA key size selector (1024 / 2048 / 4096)
- [ ] Mobile-responsive optimization
- [ ] Dark/light theme toggle

---

## Educational Disclaimer
CryptoVerse is built for **visualization**. While it uses the native Web Crypto API for modern algorithms, the custom step-by-step implementations (AES/Classical) are for educational clarity and should not be used for securing sensitive production data.
