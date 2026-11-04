import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { DECK_SIZE, PLAYER_COUNTS, cardId, createDeck } from './cards'
import type { Card, PlayerCount, Rank, Suit } from './cards'
import {
  applyAction,
  canLayDown,
  cardsInPlay,
  closedDiscard,
  createMatch,
  isFirstTurn,
  isLegal,
  legalActions,
  matchTotals,
  matchWinners,
  score,
  startNextRound,
} from './match'
import type { Action, MatchState } from './match'
import { escalaStart, trioRank } from './melds'
import type { Meld } from './melds'
import { nextRandom } from './rng'
import { DEFAULT_RULES, ROUNDS, isEscalaLoca } from './rules'
import { handPoints } from './scoring'
import { viewFor } from './view'

const seeds = fc.integer({ min: 0, max: 2 ** 31 - 1 })
const playerCounts = fc.constantFrom<PlayerCount>(...PLAYER_COUNTS)
const SHORT = { maxDrawsPerRound: 160 }

const c = (rank: number, suit: Suit, copy: 0 | 1 = 0): Card => ({
  kind: 'suited',
  rank: rank as Rank,
  suit,
  copy,
})

function pick(legal: Action[], random: number): Action {
  const eager = legal.filter((action) => action.type === 'layDown' || action.type === 'add')
  if (eager.length > 0 && random < 0.9) return eager[Math.floor((random / 0.9) * eager.length)]
  return legal[Math.floor(random * legal.length)]
}

function step(state: MatchState, rng: number): { state: MatchState; rng: number } {
  const legal = legalActions(state, state.turn)
  const random = nextRandom(rng)
  return { state: applyAction(state, pick(legal, random.value)), rng: random.rng }
}

function playMatch(players: PlayerCount, seed: number, visit?: (state: MatchState) => void) {
  let state = createMatch({ players, rules: SHORT }, seed)
  let rng = seed
  const finished: MatchState[] = []
  for (;;) {
    while (state.status === 'playing') {
      visit?.(state)
      ;({ state, rng } = step(state, rng))
    }
    finished.push(state)
    if (state.status === 'matchOver') return { state, finished }
    state = startNextRound(state)
  }
}

function baseState(hands: Card[][], melds: Meld[] = [], laidDown = [false, false]): MatchState {
  const used = new Set([...hands.flat(), ...melds.flatMap((meld) => meld.cards)].map(cardId))
  const rest = createDeck().filter((card) => !used.has(cardId(card)))
  return {
    players: 2,
    rules: DEFAULT_RULES,
    rng: 1,
    dealer: 1,
    round: 0,
    status: 'playing',
    turn: 0,
    phase: 'play',
    hands,
    deck: rest.slice(1),
    discard: rest.slice(0, 1),
    melds,
    laidDown,
    taken: null,
    laidThisTurn: false,
    draws: 0,
    nextMeld: melds.length,
    log: [0, 1].map((seat) => ({ type: 'discard', seat, card: rest[0] })),
    results: [],
  }
}

function meldOf(kind: Meld['kind'], cards: Card[], id: number, owner = 1): Meld {
  const start = kind === 'trio' ? trioRank(cards, DEFAULT_RULES)! : escalaStart(cards, DEFAULT_RULES)!
  return { kind, cards, id, owner, start }
}

describe('match properties', () => {
  it('keeps all 108 cards, each once, after every action', () => {
    fc.assert(
      fc.property(playerCounts, seeds, (players, seed) => {
        playMatch(players, seed, (state) => {
          const ids = cardsInPlay(state).map(cardId)
          expect(ids).toHaveLength(DECK_SIZE)
          expect(new Set(ids).size).toBe(DECK_SIZE)
        })
      }),
      { numRuns: 25 },
    )
  })

  it('plays ten rounds and scores the cards left in each hand', () => {
    fc.assert(
      fc.property(playerCounts, seeds, (players, seed) => {
        const { state, finished } = playMatch(players, seed)
        expect(state.results.map((result) => result.round)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
        finished.forEach((end, round) => {
          const result = end.results[round]
          expect(result.points).toEqual(end.hands.map((hand) => handPoints(hand, end.rules)))
          if (result.out !== null) expect(result.points[result.out]).toBe(0)
        })
        const totals = matchTotals(state)
        expect(score(state).totals).toEqual(totals)
        expect(matchWinners(state).every((seat) => totals[seat] === Math.min(...totals))).toBe(true)
      }),
      { numRuns: 25 },
    )
  })

  it('replays identically from the same seed and stays serializable', () => {
    fc.assert(
      fc.property(playerCounts, seeds, (players, seed) => {
        const first = playMatch(players, seed).state
        expect(playMatch(players, seed).state).toEqual(first)
        expect(JSON.parse(JSON.stringify(first))).toEqual(first)
      }),
      { numRuns: 8 },
    )
  })

  it('accepts every listed action and rejects everything else', () => {
    fc.assert(
      fc.property(playerCounts, seeds, (players, seed) => {
        const deck = createDeck()
        playMatch(players, seed, (state) => {
          if (nextRandom(state.rng + state.draws).value > 0.03) return
          for (let seat = 0; seat < players; seat++) {
            const legal = legalActions(state, seat)
            const listed = new Set(legal.map((action) => JSON.stringify(action)))
            for (const action of legal) expect(isLegal(state, action)).toBe(true)
            const outsider: Action = { type: 'discard', seat, card: deck[(state.draws * 7) % deck.length] }
            if (!listed.has(JSON.stringify(outsider))) expect(() => applyAction(state, outsider)).toThrow('Illegal action')
            const candidates: Action[] = [
              { type: 'draw', seat, source: 'deck' },
              { type: 'draw', seat, source: 'discard' },
              ...deck.map((card): Action => ({ type: 'discard', seat, card })),
              ...state.hands[seat].flatMap((card) =>
                state.melds.flatMap((meld) =>
                  (['low', 'high'] as const).map((end): Action => ({ type: 'add', seat, card, meld: meld.id, end })),
                ),
              ),
            ]
            for (const action of candidates) {
              if (listed.has(JSON.stringify(action))) continue
              expect(isLegal(state, action)).toBe(false)
            }
            const random = state.hands[seat].slice(0, 6)
            const layDown: Action = {
              type: 'layDown',
              seat,
              melds: [
                { kind: 'trio', cards: random.slice(0, 3) },
                { kind: 'trio', cards: random.slice(3, 6) },
              ],
            }
            if (!isLegal(state, layDown)) expect(() => applyAction(state, layDown)).toThrow('Illegal action')
          }
        })
      }),
      { numRuns: 15 },
    )
  })

  it('never shows another hand or the deck order in a view', () => {
    fc.assert(
      fc.property(playerCounts, seeds, (players, seed) => {
        playMatch(players, seed, (state) => {
          const view = viewFor(state, 0)
          expect(view).not.toHaveProperty('hands')
          expect(view).not.toHaveProperty('deck')
          expect(view).not.toHaveProperty('rng')
          expect(view.hand).toEqual(state.hands[0])
          expect(view.deckCount).toBe(state.deck.length)
          for (const entry of view.log) {
            if (entry.type === 'draw' && entry.source === 'deck') expect(entry.card).toBeNull()
          }
        })
      }),
      { numRuns: 10 },
    )
  })
})

describe('dealing and turns', () => {
  it.each(PLAYER_COUNTS)('deals twelve cards each to %i players and turns one up', (players) => {
    const state = createMatch({ players }, 7)
    expect(state.hands.map((hand) => hand.length)).toEqual(Array(players).fill(12))
    expect(state.discard).toHaveLength(1)
    expect(state.deck).toHaveLength(DECK_SIZE - players * 12 - 1)
    expect(state.turn).toBe((state.dealer + 1) % players)
    expect(state.phase).toBe('draw')
  })

  it('rotates the dealer every round', () => {
    const { finished } = playMatch(3, 11)
    const first = finished[0].dealer
    finished.forEach((end, round) => expect(end.dealer).toBe((first + round) % 3))
  })

  it('refuses to start the next round early', () => {
    expect(() => startNextRound(createMatch({ players: 2 }, 1))).toThrow()
  })

  it('reshuffles the discards when the deck runs out', () => {
    const state: MatchState = { ...createMatch({ players: 2 }, 3) }
    const pile = [...state.deck, ...state.discard]
    const empty: MatchState = { ...state, deck: [], discard: pile }
    const next = applyAction(empty, { type: 'draw', seat: state.turn, source: 'deck' })
    expect(next.discard).toEqual([pile.at(-1)])
    expect(next.deck).toHaveLength(pile.length - 2)
    expect(next.log.at(-1)).toEqual({ type: 'draw', seat: state.turn, source: 'deck', card: null })
    expect(next.log.some((entry) => entry.type === 'reshuffle')).toBe(true)
    expect(cardsInPlay(next)).toHaveLength(DECK_SIZE)
  })

  it('does not let you throw back the card you just took', () => {
    const state = createMatch({ players: 2 }, 5)
    const top = state.discard.at(-1)!
    const next = applyAction(state, { type: 'draw', seat: state.turn, source: 'discard' })
    expect(() => applyAction(next, { type: 'discard', seat: state.turn, card: top })).toThrow('Illegal action')
  })
})

describe('laying down and adding', () => {
  const trios = [c(7, 'hearts'), c(7, 'spades'), c(7, 'clubs'), c(9, 'hearts'), c(9, 'spades'), c(9, 'clubs')]

  it('offers the lay-down once and only with the contract', () => {
    const state = baseState([[...trios, c(2, 'diamonds'), c(13, 'clubs')], [c(4, 'clubs')]])
    const options = legalActions(state, 0).filter((action) => action.type === 'layDown')
    expect(options.length).toBeGreaterThan(0)
    const next = applyAction(state, options[0])
    expect(next.laidDown[0]).toBe(true)
    expect(next.melds).toHaveLength(2)
    expect(legalActions(next, 0).some((action) => action.type === 'layDown')).toBe(false)
    const short = baseState([[...trios.slice(0, 5), c(2, 'diamonds')], [c(4, 'clubs')]])
    expect(legalActions(short, 0).some((action) => action.type === 'layDown')).toBe(false)
  })

  it('rejects a lay-down with the wrong melds for the round', () => {
    const run = [c(3, 'hearts'), c(4, 'hearts'), c(5, 'hearts'), c(6, 'hearts')]
    const state = baseState([[...trios.slice(0, 3), ...run, c(2, 'clubs')], [c(4, 'clubs')]])
    const action: Action = {
      type: 'layDown',
      seat: 0,
      melds: [
        { kind: 'trio', cards: trios.slice(0, 3) },
        { kind: 'escala', cards: run },
      ],
    }
    expect(() => applyAction(state, action)).toThrow('Illegal action')
    expect(applyAction({ ...state, round: 1 }, action).melds).toHaveLength(2)
  })

  it('only lets you add after laying down', () => {
    const table = meldOf('escala', [c(3, 'hearts'), c(4, 'hearts'), c(5, 'hearts'), c(6, 'hearts')], 0)
    const hand = [c(7, 'hearts'), c(12, 'clubs')]
    const add: Action = { type: 'add', seat: 0, card: hand[0], meld: 0, end: 'high' }
    expect(() => applyAction(baseState([hand, [c(1, 'clubs')]], [table]), add)).toThrow('Illegal action')
    const next = applyAction(baseState([hand, [c(1, 'clubs')]], [table], [true, true]), add)
    expect(next.melds[0].cards).toHaveLength(5)
    expect(next.hands[0]).toEqual([hand[1]])
  })

  it('lets you keep building instead of laying down', () => {
    const state = baseState([[...trios, c(2, 'diamonds'), c(13, 'clubs')], [c(4, 'clubs')]])
    const legal = legalActions(state, 0)
    expect(legal.some((action) => action.type === 'layDown')).toBe(true)
    const next = applyAction(state, { type: 'discard', seat: 0, card: c(13, 'clubs') })
    expect(next.laidDown[0]).toBe(false)
    expect(next.turn).toBe(1)
  })

  it('closes the round with the last card face down on the discard pile', () => {
    const table = meldOf('trio', [c(8, 'hearts'), c(8, 'spades'), c(8, 'clubs')], 0, 0)
    const last = c(13, 'clubs')
    const state = baseState([[last], [c(4, 'clubs'), c(5, 'clubs')]], [table], [true, false])
    expect(closedDiscard(state)).toBe(false)
    const closed = applyAction(state, { type: 'discard', seat: 0, card: last })
    expect(closed.status).not.toBe('playing')
    expect(closed.discard.at(-1)).toEqual(last)
    expect(closedDiscard(closed)).toBe(true)
    expect(legalActions(closed, 1)).toEqual([])
    const added = applyAction(baseState([[c(8, 'diamonds')], [c(4, 'clubs')]], [table], [true, false]), {
      type: 'add',
      seat: 0,
      card: c(8, 'diamonds'),
      meld: 0,
      end: 'high',
    })
    expect(added.status).not.toBe('playing')
    expect(closedDiscard(added)).toBe(false)
  })

  it('places cards on your own sets and on other players sets', () => {
    const own = meldOf('trio', [c(8, 'hearts'), c(8, 'spades'), c(8, 'clubs')], 0, 0)
    const theirs = meldOf('escala', [c(3, 'hearts'), c(4, 'hearts'), c(5, 'hearts'), c(6, 'hearts')], 1, 1)
    const hand = [c(8, 'diamonds'), c(7, 'hearts'), c(2, 'hearts'), c(11, 'clubs')]
    let state = baseState([hand, [c(1, 'clubs')]], [own, theirs], [true, true])
    state = applyAction(state, { type: 'add', seat: 0, card: hand[0], meld: 0, end: 'high' })
    state = applyAction(state, { type: 'add', seat: 0, card: hand[1], meld: 1, end: 'high' })
    state = applyAction(state, { type: 'add', seat: 0, card: hand[2], meld: 1, end: 'low' })
    expect(state.melds[0].cards).toHaveLength(4)
    expect(state.melds[1].cards).toHaveLength(6)
    expect(state.melds[1].start).toBe(2)
    expect(state.melds[1].owner).toBe(1)
    expect(state.hands[0]).toEqual([hand[3]])
    expect(() => applyAction(state, { type: 'add', seat: 0, card: hand[3], meld: 1, end: 'high' })).toThrow('Illegal action')
  })

  it('ends the round when the last card is discarded and scores the rest', () => {
    const state = baseState([[c(12, 'clubs')], [c(1, 'clubs'), c(13, 'hearts'), { kind: 'joker', copy: 0 }, c(5, 'spades')]], [], [true, true])
    const next = applyAction(state, { type: 'discard', seat: 0, card: c(12, 'clubs') })
    expect(next.status).toBe('roundOver')
    expect(next.results[0]).toEqual({ round: 0, points: [0, 20 + 10 + 30 + 5], out: 0 })
  })

  it('does not let anyone lay down on their first turn of the round', () => {
    const hand = [...trios, c(2, 'diamonds'), c(13, 'clubs')]
    const action: Action = {
      type: 'layDown',
      seat: 0,
      melds: [
        { kind: 'trio', cards: trios.slice(0, 3) },
        { kind: 'trio', cards: trios.slice(3) },
      ],
    }
    const first = { ...baseState([hand, [c(4, 'clubs')]]), log: [] }
    expect(isFirstTurn(first, 0)).toBe(true)
    expect(canLayDown(first, 0)).toBe(false)
    expect(legalActions(first, 0).some((legal) => legal.type === 'layDown')).toBe(false)
    expect(() => applyAction(first, action)).toThrow('Illegal action')
    const later = { ...first, log: [{ type: 'discard', seat: 0, card: c(5, 'spades') } as const] }
    expect(applyAction(later, action).laidDown[0]).toBe(true)
    const loose = { ...first, rules: { ...first.rules, noLayDownFirstTurn: false } }
    expect(applyAction(loose, action).laidDown[0]).toBe(true)
  })

  it('rejects lay-downs with more cards than the contract asks for', () => {
    const four = [...trios.slice(0, 3), c(7, 'diamonds')]
    const run = [c(3, 'hearts'), c(4, 'hearts'), c(5, 'hearts'), c(6, 'hearts'), c(7, 'hearts', 1)]
    const big: Action = {
      type: 'layDown',
      seat: 0,
      melds: [
        { kind: 'trio', cards: four },
        { kind: 'trio', cards: trios.slice(3) },
      ],
    }
    const state = baseState([[...trios, c(7, 'diamonds'), c(2, 'clubs')], [c(4, 'clubs')]])
    expect(isLegal(state, big)).toBe(false)
    expect(isLegal({ ...state, rules: { ...state.rules, exactLayDown: false } }, big)).toBe(true)
    const long: Action = {
      type: 'layDown',
      seat: 0,
      melds: [
        { kind: 'trio', cards: trios.slice(0, 3) },
        { kind: 'escala', cards: run },
      ],
    }
    const second = { ...baseState([[...trios.slice(0, 3), ...run, c(2, 'clubs')], [c(4, 'clubs')]]), round: 1 }
    expect(isLegal(second, long)).toBe(false)
    for (const legal of legalActions(state, 0)) {
      if (legal.type !== 'layDown') continue
      expect(legal.melds.every((meld) => meld.cards.length === 3)).toBe(true)
    }
  })

  it('only lets you add from the turn after laying down', () => {
    const hand = [...trios, c(2, 'diamonds'), c(13, 'clubs')]
    const table = meldOf('escala', [c(3, 'diamonds'), c(4, 'diamonds'), c(5, 'diamonds'), c(6, 'diamonds')], 0, 1)
    const state = baseState([hand, [c(4, 'clubs')]], [table], [false, true])
    expect(legalActions(state, 0).some((legal) => legal.type === 'add')).toBe(false)
    const layDown = legalActions(state, 0).find((legal) => legal.type === 'layDown')!
    const laid = applyAction(state, layDown)
    expect(laid.hands[0]).toHaveLength(2)
    expect(legalActions(laid, 0).some((legal) => legal.type === 'add')).toBe(false)
    const add: Action = { type: 'add', seat: 0, card: c(2, 'diamonds'), meld: 0, end: 'low' }
    expect(isLegal(laid, add)).toBe(false)
    const nextTurn: MatchState = { ...laid, laidThisTurn: false }
    expect(isLegal(nextTurn, add)).toBe(true)
  })

  it('lays down the escala loca with mixed suits and remembers it on the table', () => {
    const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
    const run = Array.from({ length: 13 }, (_, index) => c(index + 1, suits[index % suits.length]))
    const loca = ROUNDS.findIndex(isEscalaLoca)
    const state = { ...baseState([run, [c(4, 'clubs', 1)]]), round: loca }
    const action: Action = { type: 'layDown', seat: 0, melds: [{ kind: 'escala', cards: run }] }
    expect(legalActions(state, 0).some((legal) => legal.type === 'layDown')).toBe(true)
    const next = applyAction(state, action)
    expect(next.melds[0]).toMatchObject({ kind: 'escala', start: 1, mixed: true })
    expect(next.status).toBe('roundOver')
    expect(isLegal({ ...state, round: loca + 1 }, action)).toBe(false)
  })

  it('ends the round when adding the last card', () => {
    const table = meldOf('trio', [c(8, 'hearts'), c(8, 'spades'), c(8, 'clubs')], 0)
    const state = baseState([[c(8, 'diamonds')], [c(2, 'clubs')]], [table], [true, true])
    const next = applyAction(state, { type: 'add', seat: 0, card: c(8, 'diamonds'), meld: 0, end: 'high' })
    expect(next.status).toBe('roundOver')
    expect(next.results[0].points).toEqual([0, 2])
  })
})
