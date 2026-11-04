import { nextRandom } from '@carioca/engine'
import { createBot } from './brain'
import type { Bot, Rng } from './types'

export function createRng(seed: number): Rng {
  let state = seed
  return () => {
    const random = nextRandom(state)
    state = random.rng
    return random.value
  }
}

export const randomBot: Bot = {
  choose: (_view, legal, rng) => legal[Math.floor(rng() * legal.length)],
}

export const easyBot = createBot({
  careless: 0.3,
  ignorePile: 0.4,
  pointWeight: 0,
  dangerWeight: 0,
  feedWeight: 0,
  rivals: 'none',
  live: false,
  noise: 8,
  connectWeight: 0,
  outsWeight: 0,
  holdTurns: 0,
})
