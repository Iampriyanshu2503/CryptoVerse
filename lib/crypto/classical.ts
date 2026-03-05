import { mod, charToNum, numToChar, matMul, textToBlocks } from "./utils"

export interface CipherStep {
  label: string
  description: string
  highlights?: { index: number; from: string; to: string; key?: string }[]
  state?: string
  matrix?: (string | number)[][]
  mapping?: Record<string, string>
}

export interface CipherResult {
  steps: CipherStep[]
  result: string
  intermediateStates: string[]
}

// ---- Caesar Cipher ----
export function caesarCipher(
  text: string,
  shift: number,
  decrypt = false
): CipherResult {
  const s = decrypt ? -shift : shift
  const upper = text.toUpperCase()
  const steps: CipherStep[] = []
  const intermediateStates: string[] = []
  let result = ""

  steps.push({
    label: "Initialize",
    description: `Caesar cipher with shift = ${mod(s, 26)}. Each letter is shifted ${decrypt ? "backward" : "forward"} by ${mod(s, 26)} positions.`,
  })

  for (let i = 0; i < upper.length; i++) {
    const c = upper[i]
    if (c >= "A" && c <= "Z") {
      const original = charToNum(c)
      const shifted = mod(original + s, 26)
      const newChar = numToChar(shifted)
      result += newChar
      steps.push({
        label: `Step ${i + 1}`,
        description: `'${c}' (${original}) + ${mod(s, 26)} = ${shifted} mod 26 = '${newChar}'`,
        highlights: [{ index: i, from: c, to: newChar, key: String(mod(s, 26)) }],
        state: result,
      })
    } else {
      result += c
    }
    intermediateStates.push(result)
  }

  steps.push({
    label: "Complete",
    description: `${decrypt ? "Decrypted" : "Encrypted"} text: ${result}`,
    state: result,
  })

  return { steps, result, intermediateStates }
}

export function caesarBruteForce(ciphertext: string): { shift: number; text: string }[] {
  return Array.from({ length: 26 }, (_, i) => ({
    shift: i,
    text: caesarCipher(ciphertext, i, true).result,
  }))
}

// ---- Vigenere Cipher ----
export function vigenereCipher(
  text: string,
  key: string,
  decrypt = false
): CipherResult {
  const upper = text.toUpperCase().replace(/[^A-Z]/g, "")
  const keyUpper = key.toUpperCase().replace(/[^A-Z]/g, "")
  if (!keyUpper) return { steps: [], result: "", intermediateStates: [] }

  const steps: CipherStep[] = []
  const intermediateStates: string[] = []
  let result = ""

  steps.push({
    label: "Initialize",
    description: `Vigenere cipher with key "${keyUpper}". Each letter is shifted by the corresponding key letter.`,
  })

  for (let i = 0; i < upper.length; i++) {
    const c = upper[i]
    const k = keyUpper[i % keyUpper.length]
    const cNum = charToNum(c)
    const kNum = charToNum(k)
    const shifted = decrypt ? mod(cNum - kNum, 26) : mod(cNum + kNum, 26)
    const newChar = numToChar(shifted)
    result += newChar

    steps.push({
      label: `Step ${i + 1}`,
      description: `'${c}'(${cNum}) ${decrypt ? "-" : "+"} '${k}'(${kNum}) = ${shifted} = '${newChar}'`,
      highlights: [{ index: i, from: c, to: newChar, key: k }],
      state: result,
    })
    intermediateStates.push(result)
  }

  steps.push({
    label: "Complete",
    description: `Result: ${result}`,
    state: result,
  })

  return { steps, result, intermediateStates }
}

// ---- Playfair Cipher ----
function buildPlayfairMatrix(key: string): string[][] {
  const used = new Set<string>()
  const chars: string[] = []
  const combined = (key.toUpperCase() + "ABCDEFGHIKLMNOPQRSTUVWXYZ").replace(/J/g, "I")
  for (const c of combined) {
    if (c >= "A" && c <= "Z" && !used.has(c)) {
      used.add(c)
      chars.push(c)
    }
  }
  const matrix: string[][] = []
  for (let i = 0; i < 5; i++) {
    matrix.push(chars.slice(i * 5, i * 5 + 5))
  }
  return matrix
}

function findInMatrix(matrix: string[][], c: string): [number, number] {
  for (let r = 0; r < 5; r++) {
    for (let col = 0; col < 5; col++) {
      if (matrix[r][col] === c) return [r, col]
    }
  }
  return [0, 0]
}

export function playfairCipher(
  text: string,
  key: string,
  decrypt = false
): CipherResult {
  const matrix = buildPlayfairMatrix(key)
  const clean = text.toUpperCase().replace(/[^A-Z]/g, "").replace(/J/g, "I")
  const steps: CipherStep[] = []
  const intermediateStates: string[] = []

  steps.push({
    label: "Build Matrix",
    description: `5x5 Playfair matrix built from key "${key.toUpperCase()}" (J=I).`,
    matrix: matrix,
  })

  // Build bigrams
  const bigrams: string[] = []
  let i = 0
  while (i < clean.length) {
    const a = clean[i]
    const b = i + 1 < clean.length ? clean[i + 1] : "X"
    if (a === b) {
      bigrams.push(a + "X")
      i++
    } else {
      bigrams.push(a + b)
      i += 2
    }
  }

  steps.push({
    label: "Form Bigrams",
    description: `Bigrams: ${bigrams.join(" ")}`,
    matrix: matrix,
  })

  let result = ""
  bigrams.forEach((bg, idx) => {
    const [r1, c1] = findInMatrix(matrix, bg[0])
    const [r2, c2] = findInMatrix(matrix, bg[1])
    let newA: string, newB: string

    if (r1 === r2) {
      // Same row
      const d = decrypt ? -1 : 1
      newA = matrix[r1][mod(c1 + d, 5)]
      newB = matrix[r2][mod(c2 + d, 5)]
    } else if (c1 === c2) {
      // Same column
      const d = decrypt ? -1 : 1
      newA = matrix[mod(r1 + d, 5)][c1]
      newB = matrix[mod(r2 + d, 5)][c2]
    } else {
      // Rectangle
      newA = matrix[r1][c2]
      newB = matrix[r2][c1]
    }

    result += newA + newB

    const rule =
      r1 === r2 ? "Same row" : c1 === c2 ? "Same column" : "Rectangle"
    steps.push({
      label: `Bigram ${idx + 1}: ${bg}`,
      description: `${rule} rule: '${bg[0]}'[${r1},${c1}] '${bg[1]}'[${r2},${c2}] -> '${newA}${newB}'`,
      highlights: [
        { index: idx * 2, from: bg[0], to: newA },
        { index: idx * 2 + 1, from: bg[1], to: newB },
      ],
      state: result,
      matrix: matrix,
    })
    intermediateStates.push(result)
  })

  steps.push({
    label: "Complete",
    description: `Result: ${result}`,
    state: result,
  })

  return { steps, result, intermediateStates }
}

// ---- Hill Cipher ----
export function hillCipher(
  text: string,
  keyMatrix: number[][],
  decrypt = false
): CipherResult {
  const size = keyMatrix.length
  const blocks = textToBlocks(text, size)
  const steps: CipherStep[] = []
  const intermediateStates: string[] = []

  steps.push({
    label: "Key Matrix",
    description: `${size}x${size} Hill cipher key matrix.`,
    matrix: keyMatrix,
  })

  steps.push({
    label: "Text Blocks",
    description: `Text split into blocks of ${size}: ${blocks.map((b) => b.map(numToChar).join("")).join(" ")}`,
  })

  let result = ""
  blocks.forEach((block, idx) => {
    const blockCol = block.map((v) => [v])
    const encrypted = matMul(keyMatrix, blockCol, 26)
    const chars = encrypted.map((row) => numToChar(row[0])).join("")
    result += chars

    steps.push({
      label: `Block ${idx + 1}`,
      description: `[${block.map(numToChar).join(",")}] * Key = [${encrypted.map((r) => r[0]).join(",")}] = "${chars}"`,
      matrix: keyMatrix,
      state: result,
    })
    intermediateStates.push(result)
  })

  steps.push({
    label: "Complete",
    description: `Result: ${result}`,
    state: result,
  })

  return { steps, result, intermediateStates }
}

// ---- Rail Fence Cipher ----
export function railFenceCipher(
  text: string,
  rails: number,
  decrypt = false
): CipherResult {
  const steps: CipherStep[] = []
  const intermediateStates: string[] = []

  if (decrypt) {
    // Decryption
    const n = text.length
    const fence: string[][] = Array.from({ length: rails }, () => Array(n).fill(""))
    const pattern: number[] = []
    let rail = 0, dir = 1
    for (let i = 0; i < n; i++) {
      pattern.push(rail)
      if (rail === 0) dir = 1
      if (rail === rails - 1) dir = -1
      rail += dir
    }
    const lengths = Array(rails).fill(0)
    pattern.forEach((r) => lengths[r]++)

    steps.push({
      label: "Initialize",
      description: `Rail fence with ${rails} rails. Reading off rails to decrypt.`,
    })

    let idx = 0
    for (let r = 0; r < rails; r++) {
      for (let c = 0; c < n; c++) {
        if (pattern[c] === r) {
          fence[r][c] = text[idx++]
        }
      }
    }

    let result = ""
    for (let c = 0; c < n; c++) {
      result += fence[pattern[c]][c]
      intermediateStates.push(result)
    }

    steps.push({
      label: "Complete",
      description: `Decrypted: ${result}`,
      state: result,
    })

    return { steps, result, intermediateStates }
  }

  // Encryption
  const fence: string[][] = Array.from({ length: rails }, () => Array(text.length).fill(""))
  let rail = 0
  let dir = 1

  steps.push({
    label: "Initialize",
    description: `Rail fence cipher with ${rails} rails. Writing text in zigzag pattern.`,
  })

  for (let i = 0; i < text.length; i++) {
    fence[rail][i] = text[i]
    if (rail === 0) dir = 1
    if (rail === rails - 1) dir = -1
    rail += dir

    steps.push({
      label: `Step ${i + 1}`,
      description: `Place '${text[i]}' on rail ${rail - dir + (dir === 1 ? 0 : 0)}`,
      state: fence.map((r) => r.filter(Boolean).join("")).join(" | "),
    })
  }

  const result = fence.map((r) => r.filter(Boolean).join("")).join("")
  intermediateStates.push(result)

  steps.push({
    label: "Read Rails",
    description: `Reading off each rail: ${result}`,
    state: result,
  })

  return { steps, result, intermediateStates }
}

// ---- Monoalphabetic Substitution ----
export function monoalphabeticCipher(
  text: string,
  substitutionKey: string,
  decrypt = false
): CipherResult {
  const keyUpper = substitutionKey.toUpperCase()
  const steps: CipherStep[] = []
  const intermediateStates: string[] = []
  const upper = text.toUpperCase()

  const mapping: Record<string, string> = {}
  const reverseMapping: Record<string, string> = {}
  for (let i = 0; i < 26; i++) {
    const plain = String.fromCharCode(65 + i)
    const cipher = keyUpper[i] || plain
    mapping[plain] = cipher
    reverseMapping[cipher] = plain
  }

  const activeMap = decrypt ? reverseMapping : mapping

  steps.push({
    label: "Substitution Map",
    description: `Monoalphabetic substitution using provided key alphabet.`,
    mapping: activeMap,
  })

  let result = ""
  for (let i = 0; i < upper.length; i++) {
    const c = upper[i]
    if (c >= "A" && c <= "Z") {
      const newChar = activeMap[c] || c
      result += newChar
      steps.push({
        label: `Step ${i + 1}`,
        description: `'${c}' -> '${newChar}'`,
        highlights: [{ index: i, from: c, to: newChar }],
        state: result,
      })
    } else {
      result += c
    }
    intermediateStates.push(result)
  }

  steps.push({
    label: "Complete",
    description: `Result: ${result}`,
    state: result,
  })

  return { steps, result, intermediateStates }
}
