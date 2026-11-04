import {
  DEFAULT_RULES,
  ROUNDS,
  applyAction,
  createMatch,
  escalaLength,
  isFirstTurn,
  legalActions,
  startNextRound,
  viewFor,
} from '@carioca/engine'
import type { Action, Card, MatchState, PlayerView, Rank, Suit } from '@carioca/engine'
import { describe, expect, it } from 'vitest'
import { BOTS, createRng } from './index'
import type { Level } from './types'

const LEVELS: Level[] = ['easy', 'medium', 'hard']

const c = (rank: number, suit: Suit, copy: 0 | 1 = 0): Card => ({
  kind: 'suited',
  rank: rank as Rank,
  suit,
  copy,
})

function view(hand: Card[], overrides: Partial<PlayerView> = {}): PlayerView {
  return {
    seat: 0,
    players: 3,
    rules: DEFAULT_RULES,
    dealer: 2,
    round: 0,
    contract: ROUNDS[0],
    turn: 0,
    phase: 'play',
    status: 'playing',
    hand,
    handCounts: [hand.length, 12, 12],
    melds: [],
    discard: [c(4, 'clubs')],
    deckCount: 60,
    laidDown: [false, false, false],
    taken: null,
    log: [],
    results: [],
    ...overrides,
  }
}

function discards(hand: Card[]): Action[] {
  return hand.map((card) => ({ type: 'discard', seat: 0, card }))
}

describe.each(LEVELS)('%s bot', (level) => {
  const bot = BOTS[level]

  it('finishes a match from views only', { timeout: 60000 }, () => {
    const rng = createRng(5)
    let state: MatchState = createMatch({ players: 3 }, 5)
    while (state.status !== 'matchOver') {
      if (state.status === 'roundOver') {
        state = startNextRound(state)
        continue
      }
      const seat = state.turn
      const action = bot.choose(viewFor(state, seat), legalActions(state, seat), rng)
      if (action.type === 'layDown') {
        expect(isFirstTurn(state, seat)).toBe(false)
        const sizes = action.melds.map((meld) => meld.cards.length)
        const contract = state.rules.rounds[state.round]
        expect(sizes.every((size) => size === 3 || size === escalaLength(contract, state.rules))).toBe(true)
      }
      if (action.type === 'add') expect(state.laidThisTurn).toBe(false)
      state = applyAction(state, action)
    }
    expect(state.results).toHaveLength(ROUNDS.length)
  })

  it('lays down as soon as it can', () => {
    const hand = [c(7, 'hearts'), c(7, 'spades'), c(7, 'clubs'), c(9, 'hearts'), c(9, 'spades'), c(9, 'clubs'), c(2, 'diamonds')]
    const legal: Action[] = [
      { type: 'layDown', seat: 0, melds: [{ kind: 'trio', cards: hand.slice(0, 3) }, { kind: 'trio', cards: hand.slice(3, 6) }] },
      ...discards(hand),
    ]
    expect(bot.choose(view(hand), legal, createRng(1)).type).toBe('layDown')
  })
})

describe('careful bots', () => {
  const hand = [c(7, 'hearts'), c(7, 'spades'), c(9, 'clubs'), c(9, 'hearts'), c(13, 'diamonds'), c(2, 'spades')]

  it.each(['medium', 'hard'] as const)('%s keeps its pairs and throws away loose cards', (level) => {
    const action = BOTS[level].choose(view(hand), discards(hand), createRng(2))
    expect(action.type).toBe('discard')
    if (action.type !== 'discard') return
    expect([c(13, 'diamonds'), c(2, 'spades')]).toContainEqual(action.card)
  })

  it.each(['medium', 'hard'] as const)('%s throws the King before the 2 when both are loose', (level) => {
    const action = BOTS[level].choose(view(hand), discards(hand), createRng(3))
    expect(action).toEqual({ type: 'discard', seat: 0, card: c(13, 'diamonds') })
  })

  it.each(['medium', 'hard'] as const)('%s takes the discard that completes a trio', (level) => {
    const drawView = view(hand, { phase: 'draw', discard: [c(7, 'clubs')] })
    const legal: Action[] = [
      { type: 'draw', seat: 0, source: 'deck' },
      { type: 'draw', seat: 0, source: 'discard' },
    ]
    expect(BOTS[level].choose(drawView, legal, createRng(4))).toEqual(legal[1])
  })

  it.each(['medium', 'hard'] as const)('%s keeps one card of each number for the escala loca', (level) => {
    const suits: Suit[] = ['hearts', 'spades', 'diamonds', 'clubs']
    const run = Array.from({ length: 12 }, (_, index) => c(index + 1, suits[index % suits.length]))
    const held = [...run, c(5, 'clubs')]
    const loca = view(held, { contract: ROUNDS.find((contract) => contract.mixedSuits)! })
    const action = BOTS[level].choose(loca, discards(held), createRng(6))
    expect(action.type).toBe('discard')
    if (action.type !== 'discard') return
    expect(action.card.kind === 'suited' && action.card.rank).toBe(5)
  })

  it.each(LEVELS)('%s puts a joker on the end that lets its other cards follow', (level) => {
    const joker: Card = { kind: 'joker', copy: 0 }
    const run = [c(13, 'hearts'), c(1, 'hearts'), c(2, 'hearts'), c(3, 'hearts')]
    const held = [joker, c(11, 'hearts'), c(8, 'clubs')]
    const melds = [{ kind: 'escala' as const, cards: run, id: 0, owner: 1, start: 13 }]
    const table = view(held, { melds, laidDown: [true, true, false] })
    const legal: Action[] = [
      { type: 'add', seat: 0, card: joker, meld: 0, end: 'high' },
      { type: 'add', seat: 0, card: joker, meld: 0, end: 'low' },
      ...discards(held),
    ]
    expect(BOTS[level].choose(table, legal, createRng(7))).toEqual(legal[1])
  })

  it('hard avoids feeding the rival who collects a rank', () => {
    const held = [c(7, 'hearts'), c(7, 'spades'), c(9, 'clubs'), c(9, 'hearts'), c(12, 'diamonds'), c(2, 'diamonds')]
    const watched = view(held, { log: [{ type: 'draw', seat: 2, source: 'discard', card: c(12, 'spades') }] })
    const pick = (level: Level) => BOTS[level].choose(watched, discards(held), createRng(5))
    expect(pick('medium')).toEqual({ type: 'discard', seat: 0, card: c(12, 'diamonds') })
    expect(pick('hard')).toEqual({ type: 'discard', seat: 0, card: c(2, 'diamonds') })
  })
})

describe('createRng', () => {
  it('repeats the same sequence for the same seed', () => {
    const first = createRng(7)
    const second = createRng(7)
    expect([first(), first(), first()]).toEqual([second(), second(), second()])
  })
})
