import { createBot } from './brain'

export const mediumBot = createBot({
  careless: 0,
  ignorePile: 0,
  pointWeight: 0.15,
  dangerWeight: 0.2,
  feedWeight: 3,
  rivals: 'next',
  live: false,
  noise: 0.5,
  connectWeight: 0,
  outsWeight: 0,
  holdTurns: 0,
})
