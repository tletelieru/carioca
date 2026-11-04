import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { SUITS, cardId, createDeck } from './cards'
import type { Card, Rank, Suit } from './cards'
import {
  addOptions,
  arrangeEscala,
  arrangeMeld,
  bestLayDown,
  contractDistance,
  cyclicRank,
  escalaStart,
  extendMeld,
  findLayDowns,
  trioRank,
  validateLayDown,
} from './melds'
import type { Meld, MeldPlan } from './melds'
import { DEFAULT_RULES, ROUNDS, isEscalaLoca, isRealEscala, resolveRules } from './rules'
import type { Contract } from './rules'
import { shuffle } from './rng'

const rules = DEFAULT_RULES

const ROYAL = ROUNDS.findIndex(isRealEscala)

const LOCA = ROUNDS.findIndex(isEscalaLoca)

const LONG = ROUNDS.findIndex((contract) => contract.escalaLength === 6)

const MIXED_SUITS: Suit[] = ['hearts', 'clubs', 'spades', 'diamonds']

const noWrap = resolveRules({ wrapAround: false })

const mixedRun = (length: number, first = 1) =>
  Array.from({ length }, (_, index) => c(((first + index - 1) % 13) + 1, MIXED_SUITS[index % MIXED_SUITS.length]))

const c = (rank: number, suit: Suit, copy: 0 | 1 = 0): Card => ({
  kind: 'suited',
  rank: rank as Rank,
  suit,
  copy,
})

const joker = (copy: 0 | 1 | 2 | 3 = 0): Card => ({ kind: 'joker', copy })

const wrapped = [12, 13, 1, 2, 3].map((rank) => c(rank, 'hearts'))

function meld(plan: MeldPlan, id = 0): Meld {
  const start =
    plan.kind === 'trio' ? trioRank(plan.cards, rules)! : escalaStart(plan.cards, rules)!
  return { ...plan, id, owner: 1, start }
}

describe('escalas', () => {
  it('accepts runs with the Ace low or high but never wrapping when wrapping is off', () => {
    expect(escalaStart([c(1, 'hearts'), c(2, 'hearts'), c(3, 'hearts'), c(4, 'hearts')], noWrap)).toBe(1)
    expect(escalaStart([c(11, 'hearts'), c(12, 'hearts'), c(13, 'hearts'), c(1, 'hearts')], noWrap)).toBe(11)
    expect(escalaStart([c(13, 'hearts'), c(1, 'hearts'), c(2, 'hearts'), c(3, 'hearts')], noWrap)).toBeNull()
    expect(arrangeEscala([c(3, 'hearts'), c(1, 'hearts'), c(12, 'hearts'), c(2, 'hearts'), c(13, 'hearts')], noWrap)).toBeNull()
  })

  it('wraps runs around the Ace by default', () => {
    expect(escalaStart(wrapped, rules)).toBe(12)
    expect(escalaStart([c(13, 'hearts'), joker(), c(2, 'hearts'), c(3, 'hearts')], rules)).toBe(13)
    expect(escalaStart([c(1, 'hearts'), c(2, 'hearts'), c(3, 'hearts'), c(4, 'hearts')], rules)).toBe(1)
    expect(escalaStart([c(11, 'hearts'), c(12, 'hearts'), c(13, 'hearts'), c(1, 'hearts')], rules)).toBe(11)
    expect(escalaStart([c(13, 'hearts'), c(2, 'hearts'), c(3, 'hearts'), c(4, 'hearts')], rules)).toBeNull()
    const shuffled = [wrapped[4], wrapped[2], wrapped[0], wrapped[3], wrapped[1]]
    expect(arrangeEscala(shuffled, rules)?.map(cardId)).toEqual(wrapped.map(cardId))
    expect(arrangeEscala([c(2, 'hearts'), c(1, 'hearts'), c(13, 'hearts'), joker()], rules)?.map(cardId)).toEqual([
      '13-hearts-0',
      '1-hearts-0',
      '2-hearts-0',
      'joker-0',
    ])
    const hand = [...wrapped.slice(0, 4), c(5, 'spades'), c(6, 'spades'), c(7, 'spades'), c(8, 'spades'), c(10, 'clubs')]
    const options = findLayDowns(hand, ROUNDS[2], rules)
    expect(options.length).toBeGreaterThan(0)
    expect(options[0].map((plan) => plan.cards.length).sort()).toEqual([4, 4])
    expect(contractDistance(hand, ROUNDS[2], rules)).toBe(0)
    expect(contractDistance(hand, ROUNDS[2], noWrap)).toBe(1)
  })

  it('takes any rotation of the thirteen numbers for the royal and the escala loca', () => {
    const royal = Array.from({ length: 13 }, (_, index) => c(cyclicRank(5 + index), 'spades'))
    expect(validateLayDown(royal, [{ kind: 'escala', cards: royal }], ROUNDS[ROYAL], rules)).toBe(true)
    expect(validateLayDown(royal, [{ kind: 'escala', cards: royal }], ROUNDS[ROYAL], noWrap)).toBe(false)
    const loca = mixedRun(13, 9)
    expect(arrangeMeld([...loca].reverse(), rules, 13, true)?.cards).toHaveLength(13)
    expect(validateLayDown(loca, [{ kind: 'escala', cards: loca }], ROUNDS[LOCA], rules)).toBe(true)
  })

  it('rejects mixed suits, gaps and two jokers side by side', () => {
    expect(escalaStart([c(3, 'hearts'), c(4, 'spades'), c(5, 'hearts'), c(6, 'hearts')], rules)).toBeNull()
    expect(escalaStart([c(3, 'hearts'), c(5, 'hearts'), c(6, 'hearts'), c(7, 'hearts')], rules)).toBeNull()
    expect(escalaStart([c(3, 'hearts'), joker(0), joker(1), c(6, 'hearts')], rules)).toBeNull()
    expect(escalaStart([c(3, 'hearts'), joker(0), c(5, 'hearts'), joker(1)], rules)).toBe(3)
  })

  it('allows adjacent jokers when the config says so', () => {
    const loose = resolveRules({ adjacentJokers: true })
    expect(escalaStart([c(3, 'hearts'), joker(0), joker(1), c(6, 'hearts')], loose)).toBe(3)
  })

  it('arranges loose cards and fills gaps with jokers', () => {
    const arranged = arrangeEscala([c(9, 'clubs'), joker(), c(7, 'clubs'), c(6, 'clubs')], rules)
    expect(arranged?.map(cardId)).toEqual(['6-clubs-0', '7-clubs-0', 'joker-0', '9-clubs-0'])
    expect(arrangeEscala([c(1, 'spades'), c(12, 'spades'), c(13, 'spades'), joker()], rules)?.map(cardId)).toEqual([
      'joker-0',
      '12-spades-0',
      '13-spades-0',
      '1-spades-0',
    ])
  })

  it('builds a royal escala of thirteen cards', () => {
    const royal = Array.from({ length: 13 }, (_, index) => c(index + 1, 'diamonds'))
    const plan = arrangeMeld(royal, rules, 13)
    expect(plan?.kind).toBe('escala')
    expect(validateLayDown(royal, [plan!], ROUNDS[ROYAL], rules)).toBe(true)
    const noJokers = resolveRules({ jokersInRealEscala: false })
    const withJoker = [...royal.slice(0, 12), joker()]
    const jokerPlan = arrangeMeld(withJoker, rules, 13)!
    expect(validateLayDown(withJoker, [jokerPlan], ROUNDS[ROYAL], rules)).toBe(true)
    expect(validateLayDown(withJoker, [jokerPlan], ROUNDS[ROYAL], noJokers)).toBe(false)
  })

  it('plays ten rounds with the long runs, the escala loca and the royal last', () => {
    expect(ROUNDS).toHaveLength(10)
    expect(LONG).toBe(7)
    expect(LOCA).toBe(8)
    expect(ROYAL).toBe(9)
    expect(isRealEscala(ROUNDS[LOCA])).toBe(false)
  })

  it('needs two runs of six cards in the long round', () => {
    const low = Array.from({ length: 6 }, (_, index) => c(index + 2, 'hearts'))
    const high = Array.from({ length: 6 }, (_, index) => c(index + 7, 'spades'))
    const hand = [...low, ...high, c(1, 'clubs')]
    const plans: MeldPlan[] = [
      { kind: 'escala', cards: low },
      { kind: 'escala', cards: high },
    ]
    expect(validateLayDown(hand, plans, ROUNDS[LONG], rules)).toBe(true)
    const short: MeldPlan[] = [plans[0], { kind: 'escala', cards: high.slice(1) }]
    expect(validateLayDown(hand, short, ROUNDS[LONG], rules)).toBe(false)
    expect(arrangeMeld(high.slice(1), rules, 6)).toBeNull()
    expect(findLayDowns(hand, ROUNDS[LONG], rules)[0]).toHaveLength(2)
  })

  it('takes any suits in the escala loca but keeps the run in order', () => {
    const loca = mixedRun(13)
    expect(escalaStart(loca, rules)).toBeNull()
    expect(escalaStart(loca, rules, true)).toBe(1)
    expect(escalaStart([c(3, 'hearts'), c(5, 'spades'), c(6, 'hearts')], rules, true)).toBeNull()
    const plan = arrangeMeld([...loca].reverse(), rules, 13, true)
    expect(plan?.cards.map(cardId)).toEqual(loca.map(cardId))
    expect(validateLayDown(loca, [plan!], ROUNDS[LOCA], rules)).toBe(true)
    expect(validateLayDown(loca, [plan!], ROUNDS[ROYAL], rules)).toBe(false)
    expect(arrangeMeld(loca, rules, 13)).toBeNull()
  })

  it('lets jokers stand in the escala loca like in any other run', () => {
    const noJokers = resolveRules({ jokersInRealEscala: false })
    const withJoker = [...mixedRun(13).slice(0, 6), joker(), ...mixedRun(13).slice(7)]
    const plan = arrangeMeld(withJoker, noJokers, 13, true)!
    expect(validateLayDown(withJoker, [plan], ROUNDS[LOCA], noJokers)).toBe(true)
    const twoJokers = [...mixedRun(13).slice(0, 6), joker(0), joker(1), ...mixedRun(13).slice(8)]
    expect(validateLayDown(twoJokers, [{ kind: 'escala', cards: twoJokers }], ROUNDS[LOCA], rules)).toBe(false)
    const loose = resolveRules({ adjacentJokers: true })
    expect(validateLayDown(twoJokers, [{ kind: 'escala', cards: twoJokers }], ROUNDS[LOCA], loose)).toBe(true)
  })

  it('finds the escala loca in a hand with mixed suits and a joker', () => {
    const hand = [...mixedRun(13).slice(0, 4), joker(), ...mixedRun(13).slice(5), c(9, 'diamonds', 1)]
    const options = findLayDowns(hand, ROUNDS[LOCA], rules)
    expect(options.length).toBeGreaterThan(0)
    for (const plans of options) expect(validateLayDown(hand, plans, ROUNDS[LOCA], rules)).toBe(true)
    expect(contractDistance(hand, ROUNDS[LOCA], rules)).toBe(0)
    expect(findLayDowns(hand, ROUNDS[ROYAL], rules)).toEqual([])
    expect(contractDistance(mixedRun(12), ROUNDS[LOCA], rules)).toBe(1)
  })
})

describe('trios', () => {
  it('needs the same rank and at most one joker', () => {
    expect(trioRank([c(7, 'hearts'), c(7, 'spades'), c(7, 'hearts', 1)], rules)).toBe(7)
    expect(trioRank([c(7, 'hearts'), c(7, 'spades'), joker()], rules)).toBe(7)
    expect(trioRank([c(7, 'hearts'), joker(0), joker(1)], rules)).toBeNull()
    expect(trioRank([c(7, 'hearts'), c(8, 'spades'), c(7, 'clubs')], rules)).toBeNull()
  })

  it('rejects two trios of the same rank', () => {
    const hand = [c(7, 'hearts'), c(7, 'spades'), c(7, 'clubs'), c(7, 'hearts', 1), c(7, 'spades', 1), c(7, 'clubs', 1)]
    const plans: MeldPlan[] = [
      { kind: 'trio', cards: hand.slice(0, 3) },
      { kind: 'trio', cards: hand.slice(3) },
    ]
    expect(validateLayDown(hand, plans, ROUNDS[0], rules)).toBe(false)
    expect(validateLayDown(hand, plans, ROUNDS[0], resolveRules({ distinctTrioRanks: false }))).toBe(true)
  })
})

describe('adding to the table', () => {
  it('extends escalas at either end and trios with the same rank', () => {
    const escala = meld({ kind: 'escala', cards: [c(4, 'hearts'), c(5, 'hearts'), c(6, 'hearts'), c(7, 'hearts')] })
    expect(extendMeld(escala, c(3, 'hearts'), 'low', rules)?.start).toBe(3)
    expect(extendMeld(escala, c(8, 'hearts'), 'high', rules)?.start).toBe(4)
    expect(extendMeld(escala, c(8, 'hearts'), 'low', rules)).toBeNull()
    expect(extendMeld(escala, c(8, 'spades'), 'high', rules)).toBeNull()
    const trio = meld({ kind: 'trio', cards: [c(9, 'hearts'), c(9, 'spades'), joker()] }, 1)
    expect(extendMeld(trio, c(9, 'clubs'), 'high', rules)).not.toBeNull()
    expect(extendMeld(trio, joker(1), 'high', rules)).toBeNull()
  })

  it('extends escalas across the Ace in both directions', () => {
    const high = meld({ kind: 'escala', cards: [c(10, 'hearts'), c(11, 'hearts'), c(12, 'hearts'), c(13, 'hearts')] })
    const withAce = extendMeld(high, c(1, 'hearts'), 'high', rules)!
    expect(withAce.start).toBe(10)
    const withTwo = extendMeld({ ...high, ...withAce }, c(2, 'hearts'), 'high', rules)!
    expect(withTwo.cards.map((card) => (card.kind === 'suited' ? card.rank : 0))).toEqual([10, 11, 12, 13, 1, 2])
    expect(extendMeld(high, c(1, 'hearts'), 'high', noWrap)).not.toBeNull()
    expect(extendMeld({ ...high, ...withAce }, c(2, 'hearts'), 'high', noWrap)).toBeNull()
    const low = meld({ kind: 'escala', cards: [c(2, 'clubs'), c(3, 'clubs'), c(4, 'clubs'), c(5, 'clubs')] })
    const downAce = extendMeld(low, c(1, 'clubs'), 'low', rules)!
    expect(downAce.start).toBe(1)
    const downKing = extendMeld({ ...low, ...downAce }, c(13, 'clubs'), 'low', rules)!
    expect(downKing.start).toBe(13)
    expect(downKing.cards.map((card) => (card.kind === 'suited' ? card.rank : 0))).toEqual([13, 1, 2, 3, 4, 5])
    expect(extendMeld({ ...low, ...downAce }, c(13, 'clubs'), 'low', noWrap)).toBeNull()
    const loop = meld({ kind: 'escala', cards: wrapped })
    expect(extendMeld(loop, c(4, 'hearts'), 'high', rules)?.start).toBe(12)
    expect(extendMeld(loop, c(11, 'hearts'), 'low', rules)?.start).toBe(11)
    const royal = meld({ kind: 'escala', cards: Array.from({ length: 13 }, (_, index) => c(index + 1, 'spades')) })
    expect(addOptions([c(1, 'spades', 1), joker()], [royal], rules)).toEqual([])
  })

  it('offers a joker both ends of a run, also around the Ace', () => {
    const ends = (cards: Card[], config = rules) =>
      addOptions([joker()], [meld({ kind: 'escala', cards })], config).map((option) => option.end)
    expect(ends(wrapped)).toEqual(['low', 'high'])
    const fromAce = [c(1, 'hearts'), c(2, 'hearts'), c(3, 'hearts'), c(4, 'hearts')]
    expect(ends(fromAce)).toEqual(['low', 'high'])
    expect(ends(fromAce, noWrap)).toEqual(['high'])
    const toAce = [c(11, 'hearts'), c(12, 'hearts'), c(13, 'hearts'), c(1, 'hearts')]
    expect(ends(toAce)).toEqual(['low', 'high'])
    expect(ends(toAce, noWrap)).toEqual(['low'])
    expect(ends([joker(1), c(6, 'hearts'), c(7, 'hearts'), c(8, 'hearts')])).toEqual(['high'])
  })

  it('extends a mixed escala with any suit', () => {
    const cards = mixedRun(4, 4)
    const mixed: Meld = { kind: 'escala', cards, id: 0, owner: 1, start: 4, mixed: true }
    expect(extendMeld(mixed, c(8, 'diamonds'), 'high', rules)?.start).toBe(4)
    expect(extendMeld(mixed, c(3, 'clubs'), 'low', rules)?.start).toBe(3)
    expect(extendMeld({ ...mixed, mixed: false }, c(8, 'diamonds'), 'high', rules)).toBeNull()
    expect(addOptions([c(8, 'spades'), c(10, 'spades')], [mixed], rules).map((option) => cardId(option.card))).toEqual([
      '8-spades-0',
    ])
  })

  it('lists every card that fits', () => {
    const escala = meld({ kind: 'escala', cards: [c(10, 'clubs'), c(11, 'clubs'), c(12, 'clubs'), c(13, 'clubs')] })
    const options = addOptions([c(1, 'clubs'), c(9, 'clubs'), c(5, 'hearts'), joker()], [escala], rules)
    expect(options.map((option) => `${cardId(option.card)}:${option.end}`)).toEqual([
      '1-clubs-0:high',
      '9-clubs-0:low',
      'joker-0:low',
      'joker-0:high',
    ])
  })
})

interface Built {
  hand: Card[]
  contract: Contract
}

function buildHand(round: number, seed: number, filler: number, jokers: boolean): Built | null {
  const contract = ROUNDS[round]
  const length = contract.escalaLength ?? rules.escalaSize
  const deck = [...shuffle(createDeck(), seed).items]
  let rng = seed
  const draw = (match: (card: Card) => boolean): Card | null => {
    const index = deck.findIndex(match)
    if (index < 0) return null
    return deck.splice(index, 1)[0]
  }
  const next = () => {
    rng = (Math.imul(rng ^ (rng >>> 13), 1103515245) + 12345) | 0
    return (rng >>> 0) / 4294967296
  }
  const pieces: (Card | null)[] = []
  const ranks = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], seed).items
  for (let trio = 0; trio < contract.trios; trio++) {
    const rank = ranks[trio]
    const useJoker = jokers && next() < 0.5
    const naturals = useJoker ? 2 : 3
    for (let n = 0; n < naturals; n++) pieces.push(draw((card) => card.kind === 'suited' && card.rank === rank))
    if (useJoker) pieces.push(draw((card) => card.kind === 'joker'))
  }
  for (let escala = 0; escala < contract.escalas; escala++) {
    const runSuit = SUITS[Math.floor(next() * SUITS.length)]
    const first = 1 + Math.floor(next() * 13)
    const jokerAt = jokers && !isRealEscala(contract) && next() < 0.5 ? 1 + Math.floor(next() * (length - 2)) : -1
    for (let index = 0; index < length; index++) {
      const rank = cyclicRank(first + index)
      const suit = contract.mixedSuits ? SUITS[Math.floor(next() * SUITS.length)] : runSuit
      if (index === jokerAt) pieces.push(draw((card) => card.kind === 'joker'))
      else pieces.push(draw((card) => card.kind === 'suited' && card.rank === rank && card.suit === suit))
    }
  }
  if (pieces.some((card) => card === null)) return null
  const hand = [...(pieces as Card[]), ...deck.slice(0, filler)]
  return { hand: shuffle(hand, seed + 1).items, contract }
}

const seeds = fc.integer({ min: 0, max: 2 ** 31 - 1 })
const rounds = fc.integer({ min: 0, max: ROUNDS.length - 1 })

describe('contract solver', () => {
  it('finds a valid lay-down in every hand built around the contract', () => {
    fc.assert(
      fc.property(rounds, seeds, fc.integer({ min: 0, max: 3 }), fc.boolean(), (round, seed, filler, jokers) => {
        const built = buildHand(round, seed, ROUNDS[round].escalaLength === 13 ? 0 : filler, jokers)
        fc.pre(built !== null)
        const { hand, contract } = built!
        const options = findLayDowns(hand, contract, rules)
        expect(options.length).toBeGreaterThan(0)
        for (const plans of options) expect(validateLayDown(hand, plans, contract, rules)).toBe(true)
        expect(contractDistance(hand, contract, rules)).toBeLessThanOrEqual(jokers ? 1 : 0)
      }),
      { numRuns: 400 },
    )
  })

  it('rejects lay-downs that break the contract', () => {
    fc.assert(
      fc.property(rounds, seeds, fc.integer({ min: 0, max: 5 }), (round, seed, mode) => {
        const built = buildHand(round, seed, 2, false)
        fc.pre(built !== null)
        const { hand, contract } = built!
        const plans = bestLayDown(hand, contract, rules)!
        const target = plans[seed % plans.length]
        const broken = breakPlans(plans, target, mode, hand)
        expect(validateLayDown(hand, broken, contract, rules)).toBe(false)
      }),
      { numRuns: 400 },
    )
  })

  it('never offers a lay-down for random hands that cannot make it', () => {
    fc.assert(
      fc.property(rounds, seeds, (round, seed) => {
        const hand = shuffle(createDeck(), seed).items.slice(0, 13)
        const contract = ROUNDS[round]
        for (const plans of findLayDowns(hand, contract, rules)) {
          expect(validateLayDown(hand, plans, contract, rules)).toBe(true)
        }
      }),
      { numRuns: 400 },
    )
  })

  it('measures how far a hand is from the contract', () => {
    const hand = [c(7, 'hearts'), c(7, 'spades'), c(9, 'clubs'), c(9, 'hearts'), c(2, 'spades')]
    expect(contractDistance(hand, ROUNDS[0], rules)).toBe(2)
    expect(contractDistance([...hand, joker()], ROUNDS[0], rules)).toBe(1)
    expect(contractDistance([...hand, joker(), c(9, 'spades')], ROUNDS[0], rules)).toBe(0)
  })
})

function outsider(hand: Card[]): Card {
  const held = new Set(hand.map(cardId))
  return createDeck().find((card) => !held.has(cardId(card)))!
}

function breakPlans(plans: MeldPlan[], target: MeldPlan, mode: number, hand: Card[]): MeldPlan[] {
  const others = plans.filter((plan) => plan !== target)
  const swapped: MeldPlan = { kind: target.kind === 'trio' ? 'escala' : 'trio', cards: target.cards }
  const builders: (() => MeldPlan[])[] = [
    () => others,
    () => [...plans, target],
    () => [...others, { ...target, cards: target.cards.slice(0, 2) }],
    () => [...others, { ...target, cards: [...target.cards.slice(1), outsider(hand)] }],
    () => [...others, swapped],
    () => [...others, { ...target, cards: [...target.cards, target.cards[0]] }],
  ]
  return builders[mode]()
}
