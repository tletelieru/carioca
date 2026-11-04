import { parseArgs } from 'node:util'
import { createRng, easyBot, hardBot, mediumBot, randomBot } from '@carioca/bots'
import type { Bot } from '@carioca/bots'
import {
  PLAYER_COUNTS,
  ROUNDS,
  applyAction,
  createMatch,
  legalActions,
  matchTotals,
  matchWinners,
  startNextRound,
  viewFor,
} from '@carioca/engine'
import type { MatchState, PlayerCount } from '@carioca/engine'

const { values } = parseArgs({
  options: {
    matches: { type: 'string', default: '200' },
    players: { type: 'string', default: '4' },
    seed: { type: 'string', default: '1' },
    hero: { type: 'string' },
    field: { type: 'string' },
  },
})

const CATALOG: Record<string, Bot> = {
  random: randomBot,
  easy: easyBot,
  medium: mediumBot,
  hard: hardBot,
}

const LADDER: [string, string][] = [
  ['medium', 'easy'],
  ['hard', 'medium'],
  ['hard', 'easy'],
]

const matches = Number(values.matches)
const players = Number(values.players) as PlayerCount
const firstSeed = Number(values.seed)

function usage(): never {
  console.error(
    'Usage: pnpm sim [--matches <n>] [--players <2-5>] [--seed <n>] [--hero <bot> --field <bot>]',
  )
  process.exit(1)
}

if (!Number.isInteger(matches) || matches < 1 || !PLAYER_COUNTS.includes(players)) usage()

function pairings(): [string, string][] {
  if (values.hero === undefined && values.field === undefined) return LADDER
  const pair: [string, string] = [values.hero ?? 'medium', values.field ?? 'easy']
  if (!CATALOG[pair[0]] || !CATALOG[pair[1]]) usage()
  return [pair]
}

function playMatch(seed: number, hero: Bot, field: Bot, heroSeat: number): MatchState {
  const rng = createRng(seed)
  let state = createMatch({ players }, seed)
  while (state.status !== 'matchOver') {
    if (state.status === 'roundOver') {
      state = startNextRound(state)
      continue
    }
    const seat = state.turn
    const bot = seat === heroSeat ? hero : field
    state = applyAction(state, bot.choose(viewFor(state, seat), legalActions(state, seat), rng))
  }
  return state
}

interface Outcome {
  hero: string
  field: string
  wins: number
  points: number
  fieldPoints: number
  blocked: number
  ms: number
}

function run(heroName: string, fieldName: string): Outcome {
  const hero = CATALOG[heroName]
  const field = CATALOG[fieldName]
  const outcome = { hero: heroName, field: fieldName, wins: 0, points: 0, fieldPoints: 0, blocked: 0, ms: 0 }
  const started = performance.now()
  for (let index = 0; index < matches; index++) {
    const heroSeat = index % players
    const state = playMatch(firstSeed + index, hero, field, heroSeat)
    if (matchWinners(state).includes(heroSeat)) outcome.wins += 1
    outcome.blocked += state.results.filter((result) => result.out === null).length
    matchTotals(state).forEach((total, seat) => {
      if (seat === heroSeat) outcome.points += total
      else outcome.fieldPoints += total
    })
  }
  outcome.ms = (performance.now() - started) / matches
  return outcome
}

console.log(`${players} players, ${matches} matches per row, seeds from ${firstSeed}`)
console.log(`even odds: ${(100 / players).toFixed(1)}%. Lower points are better.`)
console.log('')
console.log('| Bot | Against | Wins | Avg points | Field avg | Blocked rounds | ms/match |')
console.log('| --- | --- | --- | --- | --- | --- | --- |')

for (const [heroName, fieldName] of pairings()) {
  const outcome = run(heroName, fieldName)
  const rate = outcome.wins / matches
  const margin = 1.96 * Math.sqrt((rate * (1 - rate)) / matches)
  const row = [
    heroName,
    fieldName,
    `${(rate * 100).toFixed(1)}% ±${(margin * 100).toFixed(1)}`,
    (outcome.points / matches).toFixed(1),
    (outcome.fieldPoints / matches / (players - 1)).toFixed(1),
    `${((outcome.blocked / (matches * ROUNDS.length)) * 100).toFixed(1)}%`,
    outcome.ms.toFixed(0),
  ]
  console.log(`| ${row.join(' | ')} |`)
}
