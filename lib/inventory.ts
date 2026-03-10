// ─── Shared inventory utilities ───────────────────────────────────────────────
// Used by Marketplace, Contest, and Challenge pages

export interface OwnedHint { id: string; name: string; uses: number; purchasedAt: string }
export interface Tx        { label: string; amount: number; date: string }

export function getCoins(): number {
  try { return Number(localStorage.getItem("cv_coins") ?? "0") } catch { return 0 }
}
export function setCoinsVal(n: number) {
  try {
    localStorage.setItem("cv_coins", String(Math.max(0, n)))
    // Notify same-tab listeners (storage event only fires cross-tab)
    window.dispatchEvent(new CustomEvent("cv_coins_changed", { detail: Math.max(0, n) }))
  } catch {}
}
export function spendCoins(n: number): boolean {
  const c = getCoins(); if (c < n) return false
  setCoinsVal(c - n); return true
}
export function addCoins(n: number): number {
  const c = getCoins() + n; setCoinsVal(c); return c
}

export function getOwned(): OwnedHint[] {
  try { return JSON.parse(localStorage.getItem("cv_owned_hints") ?? "[]") } catch { return [] }
}
export function saveOwned(items: OwnedHint[]) {
  try { localStorage.setItem("cv_owned_hints", JSON.stringify(items)) } catch {}
}

export function getTxHistory(): Tx[] {
  try { return JSON.parse(localStorage.getItem("cv_tx_history") ?? "[]") } catch { return [] }
}
export function addTx(tx: Tx) {
  const h = getTxHistory(); h.unshift(tx)
  try { localStorage.setItem("cv_tx_history", JSON.stringify(h.slice(0, 30))) } catch {}
}

// Use one charge of an item — returns true if used successfully
export function useItem(id: string): boolean {
  const owned = getOwned()
  const idx = owned.findIndex(o => o.id === id)
  if (idx === -1 || owned[idx].uses <= 0) return false
  owned[idx] = { ...owned[idx], uses: owned[idx].uses - 1 }
  saveOwned(owned.filter(o => o.uses > 0))  // remove depleted items
  addTx({ label: `Used ${owned[idx].name}`, amount: 0, date: new Date().toLocaleDateString() })
  return true
}

// Check if user owns at least 1 use of an item
export function hasItem(id: string): boolean {
  return getOwned().some(o => o.id === id && o.uses > 0)
}

// Item IDs
export const ITEM = {
  SKIP:    "hint_skip",    // Skip puzzle without penalty
  REVEAL:  "hint_reveal",  // Reveal first letter
  CIPHER:  "hint_cipher",  // Reveal cipher type
  FREEZE:  "hint_freeze",  // Pause timer 15s
  KEY:     "hint_key",     // Reveal key fragment
  FREQ:    "hint_freq",    // Letter frequency map
  DOUBLE:  "hint_double",  // Double points next solve
  SHIELD:  "hint_shield",  // Block one wrong answer penalty
}