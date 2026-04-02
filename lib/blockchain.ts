// ─── CryptoVerse Blockchain Core ─────────────────────────────────────────────
// lib/blockchain.ts — Full simulation using Web Crypto API (SHA-256 + ECDSA)

// ── SHA-256 ───────────────────────────────────────────────────────────────────
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

export function sha256Sync(message: string): string {
  // Simple sync hash for display purposes using a deterministic algorithm
  let hash = 0x811c9dc5
  for (let i = 0; i < message.length; i++) {
    hash ^= message.charCodeAt(i)
    hash = (hash * 0x01000193) >>> 0
  }
  // Expand to 64 hex chars
  let h = hash.toString(16).padStart(8, "0")
  let seed = hash
  for (let i = 0; i < 7; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0
    h += seed.toString(16).padStart(8, "0")
  }
  return h
}

// ── Block ─────────────────────────────────────────────────────────────────────
export interface Block {
  index:        number
  timestamp:    number
  data:         string
  previousHash: string
  hash:         string
  nonce:        number
  difficulty:   number
  miner?:       string
}

export async function calculateHash(b: Omit<Block,"hash">): Promise<string> {
  const str = `${b.index}${b.timestamp}${b.data}${b.previousHash}${b.nonce}${b.difficulty}`
  return sha256(str)
}

export async function mineBlock(
  index: number, data: string, previousHash: string,
  difficulty: number, miner?: string,
  onProgress?: (nonce: number, hash: string) => void
): Promise<Block> {
  const target = "0".repeat(difficulty)
  const timestamp = Date.now()
  let nonce = 0
  let hash = ""
  do {
    nonce++
    hash = await calculateHash({ index, timestamp, data, previousHash, nonce, difficulty, miner })
    if (onProgress && nonce % 100 === 0) onProgress(nonce, hash)
  } while (!hash.startsWith(target))
  return { index, timestamp, data, previousHash, hash, nonce, difficulty, miner }
}

export async function isChainValid(chain: Block[]): Promise<boolean> {
  for (let i = 1; i < chain.length; i++) {
    const b = chain[i]
    const recalc = await calculateHash({ ...b, hash: undefined as any })
    if (b.hash !== recalc) return false
    if (b.previousHash !== chain[i-1].hash) return false
  }
  return true
}

export async function createGenesisBlock(): Promise<Block> {
  const b: Omit<Block,"hash"> = {
    index: 0, timestamp: Date.now(),
    data: "Genesis Block — CryptoVerse Chain",
    previousHash: "0000000000000000000000000000000000000000000000000000000000000000",
    nonce: 0, difficulty: 2,
  }
  const hash = await calculateHash(b)
  return { ...b, hash }
}

// ── Wallet ────────────────────────────────────────────────────────────────────
export interface Wallet {
  address:    string
  publicKey:  string
  privateKey: string
  balance:    number
  label:      string
}

export async function generateWallet(label: string): Promise<Wallet> {
  const keyPair = await crypto.subtle.generateKey(
    { name:"ECDSA", namedCurve:"P-256" }, true, ["sign","verify"]
  )
  const pubRaw  = await crypto.subtle.exportKey("raw", keyPair.publicKey)
  const privRaw = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey)
  const pubHex  = Array.from(new Uint8Array(pubRaw)).map(b=>b.toString(16).padStart(2,"0")).join("")
  const privHex = Array.from(new Uint8Array(privRaw)).map(b=>b.toString(16).padStart(2,"0")).join("")
  const address = "0x" + (await sha256(pubHex)).slice(0, 40)
  return { address, publicKey: pubHex, privateKey: privHex, balance: 100, label }
}

export async function signTransaction(privateKeyHex: string, data: string): Promise<string> {
  const privBytes = hexToBytes(privateKeyHex)
  const key = await crypto.subtle.importKey(
    "pkcs8", privBytes, { name:"ECDSA", namedCurve:"P-256" }, false, ["sign"]
  )
  const sig = await crypto.subtle.sign(
    { name:"ECDSA", hash:"SHA-256" }, key, new TextEncoder().encode(data)
  )
  return Array.from(new Uint8Array(sig)).map(b=>b.toString(16).padStart(2,"0")).join("")
}

export async function verifySignature(
  publicKeyHex: string, data: string, signatureHex: string
): Promise<boolean> {
  try {
    const pubBytes = hexToBytes(publicKeyHex)
    const key = await crypto.subtle.importKey(
      "raw", pubBytes, { name:"ECDSA", namedCurve:"P-256" }, false, ["verify"]
    )
    const sigBytes = hexToBytes(signatureHex)
    return await crypto.subtle.verify(
      { name:"ECDSA", hash:"SHA-256" }, key, sigBytes, new TextEncoder().encode(data)
    )
  } catch { return false }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2)
    bytes[i/2] = parseInt(hex.slice(i, i+2), 16)
  return bytes
}

// ── Transaction ───────────────────────────────────────────────────────────────
export interface Transaction {
  id:        string
  from:      string
  to:        string
  amount:    number
  fee:       number
  timestamp: number
  signature: string
  status:    "pending" | "confirmed" | "failed"
  blockIndex?: number
}

export async function createTransaction(
  from: Wallet, toAddress: string, amount: number, fee: number
): Promise<Transaction | null> {
  if (from.balance < amount + fee) return null
  const id   = (await sha256(`${from.address}${toAddress}${amount}${Date.now()}`)).slice(0,16)
  const data = `${from.address}→${toAddress}:${amount}`
  const signature = await signTransaction(from.privateKey, data)
  return { id, from: from.address, to: toAddress, amount, fee, timestamp: Date.now(), signature, status:"pending" }
}

// ── Token ─────────────────────────────────────────────────────────────────────
export interface Token {
  symbol:      string
  name:        string
  totalSupply: number
  decimals:    number
  owner:       string
  balances:    Record<string, number>
  createdAt:   number
  color:       string
}

export interface TokenTransfer {
  from: string; to: string; amount: number
  token: string; timestamp: number; txHash: string
}

// ── localStorage persistence ──────────────────────────────────────────────────
const KEYS = {
  chain:     "cv_bc_chain",
  wallets:   "cv_bc_wallets",
  mempool:   "cv_bc_mempool",
  confirmed: "cv_bc_confirmed",
  tokens:    "cv_bc_tokens",
  transfers: "cv_bc_transfers",
}

export function loadChain(): Block[] {
  try { return JSON.parse(localStorage.getItem(KEYS.chain) ?? "[]") } catch { return [] }
}
export function saveChain(chain: Block[]) {
  try { localStorage.setItem(KEYS.chain, JSON.stringify(chain)) } catch {}
}
export function loadWallets(): Wallet[] {
  try { return JSON.parse(localStorage.getItem(KEYS.wallets) ?? "[]") } catch { return [] }
}
export function saveWallets(w: Wallet[]) {
  try { localStorage.setItem(KEYS.wallets, JSON.stringify(w)) } catch {}
}
export function loadMempool(): Transaction[] {
  try { return JSON.parse(localStorage.getItem(KEYS.mempool) ?? "[]") } catch { return [] }
}
export function saveMempool(m: Transaction[]) {
  try { localStorage.setItem(KEYS.mempool, JSON.stringify(m)) } catch {}
}
export function loadConfirmed(): Transaction[] {
  try { return JSON.parse(localStorage.getItem(KEYS.confirmed) ?? "[]") } catch { return [] }
}
export function saveConfirmed(c: Transaction[]) {
  try { localStorage.setItem(KEYS.confirmed, JSON.stringify(c)) } catch {}
}
export function loadTokens(): Token[] {
  try { return JSON.parse(localStorage.getItem(KEYS.tokens) ?? "[]") } catch { return [] }
}
export function saveTokens(t: Token[]) {
  try { localStorage.setItem(KEYS.tokens, JSON.stringify(t)) } catch {}
}
export function loadTransfers(): TokenTransfer[] {
  try { return JSON.parse(localStorage.getItem(KEYS.transfers) ?? "[]") } catch { return [] }
}
export function saveTransfers(t: TokenTransfer[]) {
  try { localStorage.setItem(KEYS.transfers, JSON.stringify(t)) } catch {}
}
export function resetBlockchain() {
  Object.values(KEYS).forEach(k => { try { localStorage.removeItem(k) } catch {} })
}