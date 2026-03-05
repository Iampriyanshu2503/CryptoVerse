import { bytesToHex, stringToBytes, bytesToBinaryString } from "./utils"

export interface HashStep {
  label: string
  description: string
  data?: string
  binary?: string
}

export interface HashResult {
  hash: string
  algorithm: string
  steps: HashStep[]
  time: number
  binary: string
}

export async function computeHash(
  input: string,
  algorithm: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512"
): Promise<HashResult> {
  const steps: HashStep[] = []
  const encoded = stringToBytes(input)

  steps.push({
    label: "Input",
    description: `Input string: "${input.slice(0, 100)}${input.length > 100 ? "..." : ""}" (${encoded.length} bytes)`,
    data: input.slice(0, 100),
  })

  steps.push({
    label: "Encode",
    description: `UTF-8 encoded to ${encoded.length} bytes. Hex: ${bytesToHex(encoded).slice(0, 64)}${encoded.length > 32 ? "..." : ""}`,
    binary: bytesToBinaryString(encoded).slice(0, 64),
  })

  // Message length and padding info
  const bitLength = encoded.length * 8
  const paddedLength = algorithm === "SHA-384" || algorithm === "SHA-512"
    ? Math.ceil((bitLength + 1 + 128) / 1024) * 1024
    : Math.ceil((bitLength + 1 + 64) / 512) * 512

  steps.push({
    label: "Padding",
    description: `Append '1' bit, pad with zeros to ${paddedLength - (algorithm === "SHA-384" || algorithm === "SHA-512" ? 128 : 64)} bits, then append ${algorithm === "SHA-384" || algorithm === "SHA-512" ? 128 : 64}-bit message length (${bitLength}).`,
  })

  const blockSize = (algorithm === "SHA-384" || algorithm === "SHA-512") ? 1024 : 512
  const numBlocks = paddedLength / blockSize

  steps.push({
    label: "Block Division",
    description: `Message padded to ${paddedLength} bits, split into ${numBlocks} block(s) of ${blockSize} bits each.`,
  })

  const rounds = algorithm === "SHA-384" || algorithm === "SHA-512" ? 80 : 64
  steps.push({
    label: "Compression",
    description: `Each block processed through ${rounds} rounds of compression using the ${algorithm} compression function with bitwise operations (AND, OR, XOR, NOT, rotations) and modular addition.`,
  })

  // Actually compute
  const start = performance.now()
  const hashBuffer = await crypto.subtle.digest(algorithm, encoded)
  const time = performance.now() - start

  const hashBytes = new Uint8Array(hashBuffer)
  const hash = bytesToHex(hashBytes)
  const binary = bytesToBinaryString(hashBytes)

  steps.push({
    label: "Output",
    description: `Final hash (${hashBytes.length * 8} bits): ${hash}`,
    data: hash,
    binary: binary.slice(0, 128),
  })

  return { hash, algorithm, steps, time, binary }
}

// Simple MD5 implementation for educational purposes
export function md5Simple(input: string): { hash: string; steps: HashStep[] } {
  const steps: HashStep[] = []
  steps.push({
    label: "Note",
    description: "MD5 is cryptographically broken and should not be used for security purposes. Shown here for educational comparison only.",
  })

  // Use a simple hash for demonstration since Web Crypto doesn't support MD5
  let hash = 0
  const str = input
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  const hexHash = Math.abs(hash).toString(16).padStart(32, "0")

  steps.push({
    label: "Output",
    description: `MD5 (simulated): ${hexHash}`,
    data: hexHash,
  })

  return { hash: hexHash, steps }
}

export interface AvalancheResult {
  input1: string
  input2: string
  hash1: string
  hash2: string
  binary1: string
  binary2: string
  differingBits: number
  totalBits: number
  percentage: number
  diffPositions: number[]
}

export async function avalancheEffect(
  input1: string,
  input2: string,
  algorithm: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512" = "SHA-256"
): Promise<AvalancheResult> {
  const [r1, r2] = await Promise.all([
    computeHash(input1, algorithm),
    computeHash(input2, algorithm),
  ])

  const bin1 = r1.binary
  const bin2 = r2.binary
  const diffPositions: number[] = []

  for (let i = 0; i < bin1.length; i++) {
    if (bin1[i] !== bin2[i]) {
      diffPositions.push(i)
    }
  }

  return {
    input1,
    input2,
    hash1: r1.hash,
    hash2: r2.hash,
    binary1: bin1,
    binary2: bin2,
    differingBits: diffPositions.length,
    totalBits: bin1.length,
    percentage: (diffPositions.length / bin1.length) * 100,
    diffPositions,
  }
}

export interface BenchmarkResult {
  algorithm: string
  hashRate: number // hashes per second
  avgTime: number // ms per hash
  sampleHash: string
}

export async function benchmarkHash(
  algorithm: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512",
  iterations: number = 1000,
  inputSize: number = 1024
): Promise<BenchmarkResult> {
  const input = "A".repeat(inputSize)
  const encoded = stringToBytes(input)

  const start = performance.now()
  let sampleHash = ""
  for (let i = 0; i < iterations; i++) {
    const buf = await crypto.subtle.digest(algorithm, encoded)
    if (i === 0) sampleHash = bytesToHex(new Uint8Array(buf))
  }
  const elapsed = performance.now() - start

  return {
    algorithm,
    hashRate: Math.round((iterations / elapsed) * 1000),
    avgTime: elapsed / iterations,
    sampleHash,
  }
}
