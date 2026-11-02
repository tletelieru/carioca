import { nextRandom } from '@carioca/engine'
import type { Rng } from './types'

export type { Level, Rng } from './types'

export function createRng(seed: number): Rng {
  let state = seed
  return () => {
    const random = nextRandom(state)
    state = random.rng
    return random.value
  }
}
