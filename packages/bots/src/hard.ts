import { createBot } from './brain'

export const hardBot = createBot({
  careless: 0,
  ignorePile: 0,
  pointWeight: 0.15,
  dangerWeight: 0.6,
  feedWeight: 3,
  rivals: 'all',
  live: true,
  noise: 0.2,
  connectWeight: 1,
  outsWeight: 1.5,
  holdTurns: 3,
})
