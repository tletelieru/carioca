import { DECK_SIZE, cardId, createDeck, sameCard } from './cards'
import type { Card, PlayerCount, Seat } from './cards'
import { addOptions, extendMeld, findLayDowns, meldStart, validateLayDown } from './melds'
import type { End, Meld, MeldPlan } from './melds'
import { nextRandom, shuffle } from './rng'
import { escalaLength, resolveRules } from './rules'
import type { Contract, RulesConfig } from './rules'
import { handPoints } from './scoring'

export interface MatchConfig {
  players: PlayerCount
  rules?: Partial<RulesConfig>
}

export type Phase = 'draw' | 'play'

export type MatchStatus = 'playing' | 'roundOver' | 'matchOver'

export type Source = 'deck' | 'discard'

export type LogEntry =
  | { type: 'draw'; seat: Seat; source: Source; card: Card | null }
  | { type: 'layDown'; seat: Seat; melds: number[] }
  | { type: 'add'; seat: Seat; card: Card; meld: number }
  | { type: 'discard'; seat: Seat; card: Card }
  | { type: 'reshuffle' }

export interface RoundResult {
  round: number
  points: number[]
  out: Seat | null
}

export interface MatchState {
  players: PlayerCount
  rules: RulesConfig
  rng: number
  dealer: Seat
  round: number
  status: MatchStatus
  turn: Seat
  phase: Phase
  hands: Card[][]
  deck: Card[]
  discard: Card[]
  melds: Meld[]
  laidDown: boolean[]
  taken: string | null
  laidThisTurn: boolean
  draws: number
  nextMeld: number
  log: LogEntry[]
  results: RoundResult[]
}

export type Action =
  | { type: 'draw'; seat: Seat; source: Source }
  | { type: 'layDown'; seat: Seat; melds: MeldPlan[] }
  | { type: 'add'; seat: Seat; card: Card; meld: number; end: End }
  | { type: 'discard'; seat: Seat; card: Card }

export interface Score {
  rounds: RoundResult[]
  totals: number[]
  winners: Seat[]
}

const LAY_DOWN_OPTIONS = 3

export function nextSeat(seat: Seat, players: number): Seat {
  return (seat + 1) % players
}

export function contractFor(state: Pick<MatchState, 'rules' | 'round'>): Contract {
  return state.rules.rounds[state.round]
}

function deal(players: PlayerCount, rules: RulesConfig, dealer: Seat, rng: number) {
  if (players * rules.handSize + 1 > DECK_SIZE) throw new Error('Hand size too large')
  const { items, rng: next } = shuffle(createDeck(), rng)
  const deck = [...items]
  const hands: Card[][] = Array.from({ length: players }, () => [])
  for (let card = 0; card < rules.handSize; card++) {
    for (let offset = 1; offset <= players; offset++) {
      hands[(dealer + offset) % players].push(deck.pop()!)
    }
  }
  const discard = [deck.pop()!]
  return { hands, deck, discard, rng: next }
}

function startRound(
  base: Pick<MatchState, 'players' | 'rules' | 'results'>,
  round: number,
  dealer: Seat,
  rng: number,
): MatchState {
  const { players, rules } = base
  const dealt = deal(players, rules, dealer, rng)
  return {
    ...base,
    rng: dealt.rng,
    dealer,
    round,
    status: 'playing',
    turn: nextSeat(dealer, players),
    phase: 'draw',
    hands: dealt.hands,
    deck: dealt.deck,
    discard: dealt.discard,
    melds: [],
    laidDown: Array<boolean>(players).fill(false),
    taken: null,
    laidThisTurn: false,
    draws: 0,
    nextMeld: 0,
    log: [],
  }
}

export function createMatch(config: MatchConfig, seed: number): MatchState {
  const rules = resolveRules(config.rules)
  if (rules.rounds.length === 0) throw new Error('A match needs at least one round')
  const random = nextRandom(seed)
  const dealer = Math.floor(random.value * config.players)
  return startRound({ players: config.players, rules, results: [] }, 0, dealer, random.rng)
}

export function startNextRound(state: MatchState): MatchState {
  if (state.status !== 'roundOver') throw new Error('The current round has not finished')
  return startRound(state, state.round + 1, nextSeat(state.dealer, state.players), state.rng)
}

function canDraw(state: MatchState, source: Source): boolean {
  if (state.draws >= state.rules.maxDrawsPerRound) return false
  if (source === 'discard') return state.discard.length > 0
  return state.deck.length > 0 || state.discard.length > 1
}

export function isFirstTurn(state: Pick<MatchState, 'log'>, seat: Seat): boolean {
  return !state.log.some((entry) => entry.type === 'discard' && entry.seat === seat)
}

export function closedDiscard(state: Pick<MatchState, 'status' | 'results' | 'log'>): boolean {
  if (state.status === 'playing') return false
  const out = state.results.at(-1)?.out
  const last = state.log.at(-1)
  return out !== null && out !== undefined && last?.type === 'discard' && last.seat === out
}

export function canLayDown(state: Pick<MatchState, 'rules' | 'log' | 'laidDown'>, seat: Seat): boolean {
  if (state.laidDown[seat]) return false
  return !state.rules.noLayDownFirstTurn || !isFirstTurn(state, seat)
}

function canAdd(state: MatchState, seat: Seat): boolean {
  return state.laidDown[seat] && (state.rules.addSameTurn || !state.laidThisTurn)
}

function canDiscard(state: MatchState, hand: Card[], card: Card): boolean {
  return cardId(card) !== state.taken || hand.length === 1
}

export function legalActions(state: MatchState, seat: Seat): Action[] {
  if (state.status !== 'playing' || state.turn !== seat) return []
  if (state.phase === 'draw') {
    return (['deck', 'discard'] as const)
      .filter((source) => canDraw(state, source))
      .map((source) => ({ type: 'draw', seat, source }))
  }
  const hand = state.hands[seat]
  const actions: Action[] = []
  if (canLayDown(state, seat)) {
    for (const melds of findLayDowns(hand, contractFor(state), state.rules, LAY_DOWN_OPTIONS)) {
      actions.push({ type: 'layDown', seat, melds })
    }
  }
  if (canAdd(state, seat)) {
    for (const option of addOptions(hand, state.melds, state.rules)) {
      actions.push({ type: 'add', seat, ...option })
    }
  }
  for (const card of hand) {
    if (canDiscard(state, hand, card)) actions.push({ type: 'discard', seat, card })
  }
  return actions
}

function holds(hand: Card[], card: Card): boolean {
  return hand.some((held) => sameCard(held, card))
}

export function isLegal(state: MatchState, action: Action): boolean {
  if (state.status !== 'playing' || state.turn !== action.seat) return false
  const hand = state.hands[action.seat]
  if (action.type === 'draw') return state.phase === 'draw' && canDraw(state, action.source)
  if (state.phase !== 'play') return false
  if (action.type === 'layDown') {
    if (!canLayDown(state, action.seat) || !Array.isArray(action.melds)) return false
    return validateLayDown(hand, action.melds, contractFor(state), state.rules)
  }
  if (action.type === 'add') {
    if (!canAdd(state, action.seat) || !holds(hand, action.card)) return false
    const meld = state.melds.find((item) => item.id === action.meld)
    return meld !== undefined && extendMeld(meld, action.card, action.end, state.rules) !== null
  }
  return holds(hand, action.card) && canDiscard(state, hand, action.card)
}

function withHand(hands: Card[][], seat: Seat, hand: Card[]): Card[][] {
  return hands.map((held, index) => (index === seat ? hand : held))
}

function without(hand: Card[], cards: Card[]): Card[] {
  const ids = new Set(cards.map(cardId))
  return hand.filter((card) => !ids.has(cardId(card)))
}

export function roundPoints(state: MatchState): number[] {
  return state.hands.map((hand) => handPoints(hand, state.rules))
}

function finishRound(state: MatchState, out: Seat | null): MatchState {
  const result = { round: state.round, points: roundPoints(state), out }
  const status = state.round === state.rules.rounds.length - 1 ? 'matchOver' : 'roundOver'
  return { ...state, results: [...state.results, result], status }
}

function settle(state: MatchState, seat: Seat): MatchState {
  return state.hands[seat].length === 0 ? finishRound(state, seat) : state
}

function draw(state: MatchState, seat: Seat, source: Source): MatchState {
  let { deck, discard, rng } = state
  const log = [...state.log]
  if (source === 'discard') {
    const card = discard[discard.length - 1]
    return {
      ...state,
      discard: discard.slice(0, -1),
      hands: withHand(state.hands, seat, [...state.hands[seat], card]),
      phase: 'play',
      taken: cardId(card),
      draws: state.draws + 1,
      log: [...log, { type: 'draw', seat, source, card }],
    }
  }
  if (deck.length === 0) {
    const reshuffled = shuffle(discard.slice(0, -1), rng)
    deck = reshuffled.items
    rng = reshuffled.rng
    discard = discard.slice(-1)
    log.push({ type: 'reshuffle' })
  }
  const card = deck[deck.length - 1]
  return {
    ...state,
    rng,
    deck: deck.slice(0, -1),
    discard,
    hands: withHand(state.hands, seat, [...state.hands[seat], card]),
    phase: 'play',
    taken: null,
    draws: state.draws + 1,
    log: [...log, { type: 'draw', seat, source, card: null }],
  }
}

function layDown(state: MatchState, seat: Seat, plans: MeldPlan[]): MatchState {
  const contract = contractFor(state)
  const minEscala = escalaLength(contract, state.rules)
  const mixed = contract.mixedSuits === true
  const melds: Meld[] = plans.map((plan, index) => ({
    kind: plan.kind,
    cards: plan.cards,
    id: state.nextMeld + index,
    owner: seat,
    start: meldStart(plan, state.rules, minEscala, mixed)!,
    ...(mixed && plan.kind === 'escala' ? { mixed } : {}),
  }))
  const next: MatchState = {
    ...state,
    hands: withHand(state.hands, seat, without(state.hands[seat], plans.flatMap((plan) => plan.cards))),
    melds: [...state.melds, ...melds],
    laidDown: state.laidDown.map((laid, index) => laid || index === seat),
    laidThisTurn: true,
    nextMeld: state.nextMeld + melds.length,
    log: [...state.log, { type: 'layDown', seat, melds: melds.map((meld) => meld.id) }],
  }
  return settle(next, seat)
}

function add(state: MatchState, seat: Seat, card: Card, id: number, end: End): MatchState {
  const melds = state.melds.map((meld) =>
    meld.id === id ? { ...meld, ...extendMeld(meld, card, end, state.rules)! } : meld,
  )
  const next: MatchState = {
    ...state,
    hands: withHand(state.hands, seat, without(state.hands[seat], [card])),
    melds,
    log: [...state.log, { type: 'add', seat, card, meld: id }],
  }
  return settle(next, seat)
}

function discard(state: MatchState, seat: Seat, card: Card): MatchState {
  const placed: MatchState = {
    ...state,
    hands: withHand(state.hands, seat, without(state.hands[seat], [card])),
    discard: [...state.discard, card],
    log: [...state.log, { type: 'discard', seat, card }],
  }
  if (placed.hands[seat].length === 0) return finishRound(placed, seat)
  const next: MatchState = {
    ...placed,
    turn: nextSeat(seat, state.players),
    phase: 'draw',
    taken: null,
    laidThisTurn: false,
  }
  const blocked = !canDraw(next, 'deck') && !canDraw(next, 'discard')
  return blocked ? finishRound(next, null) : next
}

export function applyAction(state: MatchState, action: Action): MatchState {
  if (!isLegal(state, action)) throw new Error('Illegal action')
  switch (action.type) {
    case 'draw':
      return draw(state, action.seat, action.source)
    case 'layDown':
      return layDown(state, action.seat, action.melds)
    case 'add':
      return add(state, action.seat, action.card, action.meld, action.end)
    case 'discard':
      return discard(state, action.seat, action.card)
  }
}

export function matchTotals(state: Pick<MatchState, 'players' | 'results'>): number[] {
  return Array.from({ length: state.players }, (_, seat) =>
    state.results.reduce((total, result) => total + result.points[seat], 0),
  )
}

export function matchWinners(state: Pick<MatchState, 'players' | 'results'>): Seat[] {
  const totals = matchTotals(state)
  const best = Math.min(...totals)
  return totals.flatMap((total, seat) => (total === best ? [seat] : []))
}

export function score(state: MatchState): Score {
  return { rounds: state.results, totals: matchTotals(state), winners: matchWinners(state) }
}

export function liveResult(state: MatchState): RoundResult {
  return { round: state.round, points: roundPoints(state), out: null }
}

export function cardsInPlay(state: MatchState): Card[] {
  return [
    ...state.hands.flat(),
    ...state.deck,
    ...state.discard,
    ...state.melds.flatMap((meld) => meld.cards),
  ]
}
