export interface Random {
  value: number
  rng: number
}

export function nextRandom(rng: number): Random {
  const next = (rng + 0x6d2b79f5) | 0
  let mixed = Math.imul(next ^ (next >>> 15), 1 | next)
  mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
  return { value: ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296, rng: next }
}

export function shuffle<T>(items: T[], rng: number): { items: T[]; rng: number } {
  const result = [...items]
  let current = rng
  for (let i = result.length - 1; i > 0; i--) {
    const random = nextRandom(current)
    current = random.rng
    const j = Math.floor(random.value * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return { items: result, rng: current }
}
