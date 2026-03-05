export function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

export function charToNum(c: string): number {
  return c.toUpperCase().charCodeAt(0) - 65
}

export function numToChar(n: number): string {
  return String.fromCharCode(mod(n, 26) + 65)
}

export function generateAlphabet(): string[] {
  return Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))
}

export function matMul(a: number[][], b: number[][], modulus: number): number[][] {
  const rows = a.length
  const cols = b[0].length
  const inner = b.length
  const result: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0))
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      for (let k = 0; k < inner; k++) {
        result[i][j] = mod(result[i][j] + a[i][k] * b[k][j], modulus)
      }
    }
  }
  return result
}

export function modInverse(a: number, m: number): number {
  const g = gcd(mod(a, m), m)
  if (g !== 1) return -1
  let [old_r, r] = [mod(a, m), m]
  let [old_s, s] = [1, 0]
  while (r !== 0) {
    const q = Math.floor(old_r / r)
    ;[old_r, r] = [r, old_r - q * r]
    ;[old_s, s] = [s, old_s - q * s]
  }
  return mod(old_s, m)
}

export function gcd(a: number, b: number): number {
  while (b) {
    ;[a, b] = [b, a % b]
  }
  return a
}

export function matInverse2x2(m: number[][], modulus: number): number[][] | null {
  const det = mod(m[0][0] * m[1][1] - m[0][1] * m[1][0], modulus)
  const detInv = modInverse(det, modulus)
  if (detInv === -1) return null
  return [
    [mod(m[1][1] * detInv, modulus), mod(-m[0][1] * detInv, modulus)],
    [mod(-m[1][0] * detInv, modulus), mod(m[0][0] * detInv, modulus)],
  ]
}

export function textToBlocks(text: string, blockSize: number): number[][] {
  const clean = text.toUpperCase().replace(/[^A-Z]/g, "")
  const padded = clean.padEnd(Math.ceil(clean.length / blockSize) * blockSize, "X")
  const blocks: number[][] = []
  for (let i = 0; i < padded.length; i += blockSize) {
    blocks.push(Array.from(padded.slice(i, i + blockSize), charToNum))
  }
  return blocks
}

export function letterFrequency(text: string): Record<string, number> {
  const freq: Record<string, number> = {}
  const alpha = generateAlphabet()
  for (const c of alpha) freq[c] = 0
  const upper = text.toUpperCase()
  for (const c of upper) {
    if (c >= "A" && c <= "Z") freq[c]++
  }
  const total = Object.values(freq).reduce((s, v) => s + v, 0)
  if (total === 0) return freq
  for (const c of alpha) freq[c] = freq[c] / total
  return freq
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

export function bytesToBinaryString(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(2).padStart(8, "0"))
    .join("")
}
