import { easyBot } from './easy'
import { hardBot } from './hard'
import { mediumBot } from './medium'
import type { Bot, Level } from './types'

export { createBot } from './brain'
export type { Profile } from './brain'
export { createRng, easyBot, randomBot } from './easy'
export { hardBot } from './hard'
export { mediumBot } from './medium'
export type { Bot, Level, Rng } from './types'

export const BOTS: Record<Level, Bot> = {
  easy: easyBot,
  medium: mediumBot,
  hard: hardBot,
}
