import { SUITS, cardId, isJoker } from './cards'
import type { Card, Rank, Seat, Suit, SuitedCard } from './cards'
import { REAL_ESCALA, escalaLength } from './rules'
import type { Contract, RulesConfig } from './rules'
import { handPoints } from './scoring'

export type MeldKind = 'trio' | 'escala'

export type End = 'low' | 'high'

export interface MeldPlan {
  kind: MeldKind
  cards: Card[]
}

export interface Meld extends MeldPlan {
  id: number
  owner: Seat
  start: number
  mixed?: boolean
}

export interface AddOption {
  card: Card
  meld: number
  end: End
}

const MAX_VALUE = 14

const ENUMERATION_LIMIT = 400

const ESCALA_ENDS: End[] = ['low', 'high']

const TRIO_ENDS: End[] = ['high']

export function naturalValues(card: SuitedCard, rules: RulesConfig): number[] {
  if (card.rank !== 1) return [card.rank]
  const values: number[] = []
  if (rules.aceLow) values.push(1)
  if (rules.aceHigh) values.push(MAX_VALUE)
  return values
}

function rankOfValue(value: number): Rank {
  return (value === MAX_VALUE ? 1 : value) as Rank
}

function valueAllowed(value: number, rules: RulesConfig): boolean {
  if (value === 1) return rules.aceLow
  if (value === MAX_VALUE) return rules.aceHigh
  return value > 1 && value < MAX_VALUE
}

const RANK_COUNT = 13

export function cyclicRank(value: number): Rank {
  const offset = (value - 1) % RANK_COUNT
  return ((offset < 0 ? offset + RANK_COUNT : offset) + 1) as Rank
}

function hasAdjacentJokers(cards: Card[]): boolean {
  return cards.some((card, index) => index > 0 && isJoker(card) && isJoker(cards[index - 1]))
}

function cyclicStart(naturals: { card: SuitedCard; index: number }[]): number | null {
  const first = naturals[0]
  const start = cyclicRank(first.card.rank - first.index)
  return naturals.every(({ card, index }) => card.rank === cyclicRank(start + index)) ? start : null
}

export function escalaStart(cards: Card[], rules: RulesConfig, mixed = false): number | null {
  if (cards.length > REAL_ESCALA) return null
  if (!rules.adjacentJokers && hasAdjacentJokers(cards)) return null
  const naturals = cards.flatMap((card, index) => (isJoker(card) ? [] : [{ card, index }]))
  if (naturals.length === 0) return null
  const { suit } = naturals[0].card
  if (!mixed && naturals.some(({ card }) => card.suit !== suit)) return null
  if (rules.wrapAround) return cyclicStart(naturals)
  const first = naturals[0]
  for (const value of naturalValues(first.card, rules)) {
    const start = value - first.index
    if (start < 1 || start + cards.length - 1 > MAX_VALUE) continue
    const fits = naturals.every(({ card, index }) =>
      naturalValues(card, rules).includes(start + index),
    )
    if (fits) return start
  }
  return null
}

export function trioRank(cards: Card[], rules: RulesConfig): Rank | null {
  const naturals = cards.filter((card): card is SuitedCard => !isJoker(card))
  if (naturals.length === 0) return null
  if (cards.length - naturals.length > rules.maxJokersPerTrio) return null
  const { rank } = naturals[0]
  return naturals.every((card) => card.rank === rank) ? rank : null
}

export function meldStart(
  plan: MeldPlan,
  rules: RulesConfig,
  minEscala: number,
  mixed = false,
): number | null {
  const size = plan.kind === 'trio' ? rules.trioSize : minEscala
  if (plan.cards.length < size || (rules.exactLayDown && plan.cards.length > size)) return null
  if (plan.kind === 'trio') return trioRank(plan.cards, rules)
  const real = minEscala >= REAL_ESCALA && !mixed
  if (real && !rules.jokersInRealEscala && plan.cards.some(isJoker)) return null
  return escalaStart(plan.cards, rules, mixed)
}

function arrangeFrom(
  byValue: Map<number, Card>,
  jokers: Card[],
  rules: RulesConfig,
  mixed: boolean,
): Card[] | null {
  const values = [...byValue.keys()].sort((a, b) => a - b)
  const low = values[0]
  const high = values[values.length - 1]
  const gaps = high - low + 1 - values.length
  if (gaps > jokers.length) return null
  const extra = jokers.length - gaps
  for (let above = extra; above >= 0; above--) {
    const start = low - (extra - above)
    const end = high + above
    if (start < 1 || end > MAX_VALUE) continue
    const spare = [...jokers]
    const cards: Card[] = []
    for (let value = start; value <= end; value++) cards.push(byValue.get(value) ?? spare.pop()!)
    if (escalaStart(cards, rules, mixed) === start) return cards
  }
  return null
}

function arrangeAround(naturals: SuitedCard[], jokers: Card[], rules: RulesConfig, mixed: boolean): Card[] | null {
  const length = naturals.length + jokers.length
  if (length > RANK_COUNT) return null
  const ranks = naturals.map((card) => card.rank as number)
  const starts = [...ranks, ...Array.from({ length: RANK_COUNT }, (_, index) => index + 1)]
  for (const start of starts) {
    const byOffset = new Map<number, Card>()
    for (const card of naturals) byOffset.set(cyclicRank(card.rank - start + 1) - 1, card)
    if ([...byOffset.keys()].some((offset) => offset >= length)) continue
    const spare = [...jokers]
    const cards = Array.from({ length }, (_, offset) => byOffset.get(offset) ?? spare.pop()!)
    if (escalaStart(cards, rules, mixed) === start) return cards
  }
  return null
}

export function arrangeEscala(cards: Card[], rules: RulesConfig, mixed = false): Card[] | null {
  const naturals = cards.filter((card): card is SuitedCard => !isJoker(card))
  const jokers = cards.filter(isJoker)
  if (naturals.length === 0) return null
  const hasAce = naturals.some((card) => card.rank === 1)
  const aceValues = hasAce ? naturalValues({ ...naturals[0], rank: 1 }, rules) : [1]
  for (const aceValue of aceValues) {
    const byValue = new Map<number, Card>()
    for (const card of naturals) byValue.set(card.rank === 1 ? aceValue : card.rank, card)
    if (byValue.size !== naturals.length) return null
    const arranged = arrangeFrom(byValue, jokers, rules, mixed)
    if (arranged) return arranged
  }
  return rules.wrapAround ? arrangeAround(naturals, jokers, rules, mixed) : null
}

export function arrangeMeld(
  cards: Card[],
  rules: RulesConfig,
  minEscala: number,
  mixed = false,
): MeldPlan | null {
  const trio: MeldPlan = { kind: 'trio', cards }
  if (meldStart(trio, rules, minEscala, mixed) !== null) return trio
  const ordered = arrangeEscala(cards, rules, mixed)
  if (!ordered) return null
  const escala: MeldPlan = { kind: 'escala', cards: ordered }
  return meldStart(escala, rules, minEscala, mixed) === null ? null : escala
}

export function extendMeld(
  meld: Meld,
  card: Card,
  end: End,
  rules: RulesConfig,
): { cards: Card[]; start: number } | null {
  if (meld.kind === 'trio') {
    if (end !== 'high') return null
    const cards = [...meld.cards, card]
    return trioRank(cards, rules) === meld.start ? { cards, start: meld.start } : null
  }
  const cards = end === 'low' ? [card, ...meld.cards] : [...meld.cards, card]
  const below = rules.wrapAround ? cyclicRank(meld.start - 1) : meld.start - 1
  const expected = end === 'low' ? below : meld.start
  return escalaStart(cards, rules, meld.mixed) === expected ? { cards, start: expected } : null
}

export function meldEnds(meld: MeldPlan): End[] {
  return meld.kind === 'trio' ? TRIO_ENDS : ESCALA_ENDS
}

export function addOptions(hand: Card[], melds: Meld[], rules: RulesConfig): AddOption[] {
  return hand.flatMap((card) =>
    melds.flatMap((meld) =>
      meldEnds(meld).flatMap((end) =>
        extendMeld(meld, card, end, rules) ? [{ card, meld: meld.id, end }] : [],
      ),
    ),
  )
}

export function validateLayDown(
  hand: Card[],
  plans: MeldPlan[],
  contract: Contract,
  rules: RulesConfig,
): boolean {
  const trios = plans.filter((plan) => plan.kind === 'trio')
  if (trios.length !== contract.trios) return false
  if (plans.length - trios.length !== contract.escalas) return false
  const held = new Set(hand.map(cardId))
  const used = new Set<string>()
  for (const card of plans.flatMap((plan) => plan.cards)) {
    const id = cardId(card)
    if (!held.has(id) || used.has(id)) return false
    used.add(id)
  }
  const minEscala = escalaLength(contract, rules)
  const starts = plans.map((plan) => meldStart(plan, rules, minEscala, contract.mixedSuits))
  if (starts.some((start) => start === null)) return false
  if (!rules.distinctTrioRanks) return true
  const ranks = plans.flatMap((plan, index) => (plan.kind === 'trio' ? [starts[index]] : []))
  return new Set(ranks).size === ranks.length
}

function typeKey(rank: Rank, suit: Suit): string {
  return `${rank}-${suit}`
}

interface Pool {
  counts: Map<string, number>
  jokers: number
}

interface Piece {
  kind: MeldKind
  slots: (string | null)[]
  rank: number
}

function poolOf(hand: Card[]): Pool {
  const counts = new Map<string, number>()
  let jokers = 0
  for (const card of hand) {
    if (isJoker(card)) jokers += 1
    else counts.set(typeKey(card.rank, card.suit), (counts.get(typeKey(card.rank, card.suit)) ?? 0) + 1)
  }
  return { counts, jokers }
}

function multisets(types: { key: string; count: number }[], size: number): string[][] {
  if (size === 0) return [[]]
  if (types.length === 0) return []
  const [head, ...rest] = types
  const result: string[][] = []
  for (let used = Math.min(head.count, size); used >= 0; used--) {
    for (const tail of multisets(rest, size - used)) {
      result.push([...Array<string>(used).fill(head.key), ...tail])
    }
  }
  return result
}

function trioPieces(pool: Pool, rules: RulesConfig): Piece[] {
  const pieces: Piece[] = []
  for (let rank = 1; rank <= 13; rank++) {
    const types = SUITS.flatMap((suit) => {
      const key = typeKey(rank as Rank, suit)
      const count = pool.counts.get(key) ?? 0
      return count > 0 ? [{ key, count }] : []
    })
    const maxJokers = Math.min(rules.maxJokersPerTrio, pool.jokers, rules.trioSize - 1)
    for (let jokers = 0; jokers <= maxJokers; jokers++) {
      for (const naturals of multisets(types, rules.trioSize - jokers)) {
        pieces.push({ kind: 'trio', slots: [...naturals, ...Array<null>(jokers).fill(null)], rank })
      }
    }
  }
  return pieces
}

function subsets(items: number[], maxSize: number): number[][] {
  const result: number[][] = [[]]
  for (const item of items) {
    const grown = result.filter((subset) => subset.length < maxSize).map((subset) => [...subset, item])
    result.push(...grown)
  }
  return result
}

function heldKey(pool: Pool, rank: Rank, suits: readonly Suit[]): string | null {
  let best: string | null = null
  let most = 0
  for (const suit of suits) {
    const key = typeKey(rank, suit)
    const count = pool.counts.get(key) ?? 0
    if (count > most) {
      best = key
      most = count
    }
  }
  return best
}

function escalaWindows(rules: RulesConfig, length: number): Rank[][] {
  if (rules.wrapAround) {
    return Array.from({ length: RANK_COUNT }, (_, start) =>
      Array.from({ length }, (_, index) => cyclicRank(start + 1 + index)),
    )
  }
  const windows: Rank[][] = []
  for (let start = 1; start + length - 1 <= MAX_VALUE; start++) {
    if (!valueAllowed(start, rules) || !valueAllowed(start + length - 1, rules)) continue
    windows.push(Array.from({ length }, (_, index) => rankOfValue(start + index)))
  }
  return windows
}

function escalaPieces(pool: Pool, rules: RulesConfig, length: number, mixed: boolean): Piece[] {
  const allowJokers = length < REAL_ESCALA || mixed || rules.jokersInRealEscala
  const suitGroups = mixed ? [SUITS] : SUITS.map((suit) => [suit])
  const windows = escalaWindows(rules, length)
  const pieces: Piece[] = []
  for (const suits of suitGroups) {
    for (const ranks of windows) {
      const start = ranks[0]
      const base = ranks.map((rank) => heldKey(pool, rank, suits))
      const missing = base.filter((slot) => slot === null).length
      if (missing === base.length) continue
      if (missing > (allowJokers ? pool.jokers : 0)) continue
      const present = base.flatMap((slot, index) => (slot === null ? [] : [index]))
      const room = allowJokers ? pool.jokers - missing : 0
      const swaps = length <= rules.escalaSize ? room : Math.min(room, 1)
      for (const swap of subsets(present, swaps)) {
        const slots = base.map((slot, index) => (swap.includes(index) ? null : slot))
        if (slots.every((slot) => slot === null)) continue
        const adjacent = slots.some((slot, index) => index > 0 && slot === null && slots[index - 1] === null)
        if (adjacent && !rules.adjacentJokers) continue
        pieces.push({ kind: 'escala', slots, rank: start })
      }
    }
  }
  return pieces
}

function takePiece(pool: Pool, piece: Piece): boolean {
  const need = new Map<string, number>()
  let jokers = 0
  for (const slot of piece.slots) {
    if (slot === null) jokers += 1
    else need.set(slot, (need.get(slot) ?? 0) + 1)
  }
  if (jokers > pool.jokers) return false
  for (const [key, count] of need) if ((pool.counts.get(key) ?? 0) < count) return false
  pool.jokers -= jokers
  for (const [key, count] of need) pool.counts.set(key, pool.counts.get(key)! - count)
  return true
}

function givePiece(pool: Pool, piece: Piece): void {
  for (const slot of piece.slots) {
    if (slot === null) pool.jokers += 1
    else pool.counts.set(slot, (pool.counts.get(slot) ?? 0) + 1)
  }
}

function assignments(hand: Card[], contract: Contract, rules: RulesConfig): Piece[][] {
  const pool = poolOf(hand)
  const mixed = contract.mixedSuits === true
  const escalas = contract.escalas > 0 ? escalaPieces(pool, rules, escalaLength(contract, rules), mixed) : []
  const trios = contract.trios > 0 ? trioPieces(pool, rules) : []
  const results: Piece[][] = []

  const pickTrios = (from: number, chosen: Piece[], ranks: number[]) => {
    if (results.length >= ENUMERATION_LIMIT) return
    if (ranks.length === contract.trios) {
      results.push(chosen)
      return
    }
    for (let index = from; index < trios.length; index++) {
      const piece = trios[index]
      if (rules.distinctTrioRanks && ranks.includes(piece.rank)) continue
      if (!takePiece(pool, piece)) continue
      pickTrios(index, [...chosen, piece], [...ranks, piece.rank])
      givePiece(pool, piece)
    }
  }

  const pickEscalas = (from: number, chosen: Piece[]) => {
    if (results.length >= ENUMERATION_LIMIT) return
    if (chosen.length === contract.escalas) {
      pickTrios(0, chosen, [])
      return
    }
    for (let index = from; index < escalas.length; index++) {
      const piece = escalas[index]
      if (!takePiece(pool, piece)) continue
      pickEscalas(index, [...chosen, piece])
      givePiece(pool, piece)
    }
  }

  pickEscalas(0, [])
  return results
}

function concretize(hand: Card[], pieces: Piece[]): { plans: MeldPlan[]; rest: Card[] } {
  const byType = new Map<string, Card[]>()
  const jokers: Card[] = []
  for (const card of hand) {
    if (isJoker(card)) {
      jokers.push(card)
      continue
    }
    const key = typeKey(card.rank, card.suit)
    byType.set(key, [...(byType.get(key) ?? []), card])
  }
  const plans = pieces.map((piece) => ({
    kind: piece.kind,
    cards: piece.slots.map((slot) => (slot === null ? jokers.pop()! : byType.get(slot)!.pop()!)),
  }))
  const used = new Set(plans.flatMap((plan) => plan.cards.map(cardId)))
  return { plans, rest: hand.filter((card) => !used.has(cardId(card))) }
}

function extendPlans(
  plans: MeldPlan[],
  rest: Card[],
  rules: RulesConfig,
  mixed: boolean,
): { plans: MeldPlan[]; rest: Card[] } {
  const melds: Meld[] = plans.map((plan, id) => ({
    ...plan,
    id,
    owner: 0,
    start: plan.kind === 'trio' ? trioRank(plan.cards, rules)! : escalaStart(plan.cards, rules, mixed)!,
    mixed: plan.kind === 'escala' && mixed,
  }))
  let left = rest
  let grown = true
  while (grown) {
    grown = false
    for (const card of left) {
      if (isJoker(card)) continue
      const option = addOptions([card], melds, rules)[0]
      if (!option) continue
      const meld = melds[option.meld]
      const extended = extendMeld(meld, card, option.end, rules)!
      melds[option.meld] = { ...meld, ...extended }
      left = left.filter((item) => item !== card)
      grown = true
      break
    }
  }
  return { plans: melds.map(({ kind, cards }) => ({ kind, cards })), rest: left }
}

function signature(plans: MeldPlan[]): string {
  return plans
    .map((plan) => `${plan.kind}:${plan.cards.map((card) => (isJoker(card) ? 'J' : `${card.rank}${card.suit}`)).join(',')}`)
    .sort()
    .join('|')
}

export function findLayDowns(
  hand: Card[],
  contract: Contract,
  rules: RulesConfig,
  max = 3,
): MeldPlan[][] {
  const scored = assignments(hand, contract, rules).map((pieces) => {
    const { plans, rest } = concretize(hand, pieces)
    const extended = rules.exactLayDown ? { plans, rest } : extendPlans(plans, rest, rules, contract.mixedSuits === true)
    return { plans: extended.plans, left: handPoints(extended.rest, rules), cards: extended.rest.length }
  })
  scored.sort((a, b) => a.left - b.left || a.cards - b.cards)
  const seen = new Set<string>()
  const result: MeldPlan[][] = []
  for (const option of scored) {
    const key = signature(option.plans)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(option.plans)
    if (result.length >= max) break
  }
  return result
}

export function bestLayDown(hand: Card[], contract: Contract, rules: RulesConfig): MeldPlan[] | null {
  return findLayDowns(hand, contract, rules, 1)[0] ?? null
}

export type Weigh = (rank: Rank, suit: Suit) => number

const unitWeight: Weigh = () => 1

const ESCALA_WINDOWS_PER_SUIT = 3

function slotIndex(rank: number, suit: number): number {
  return (rank - 1) * SUITS.length + suit
}

function selectCheapest(costs: number[], count: number): number[] {
  return costs
    .map((cost, rank) => ({ cost, rank }))
    .sort((a, b) => a.cost - b.cost)
    .slice(0, count)
    .map(({ rank }) => rank)
}

export function contractDistance(
  hand: Card[],
  contract: Contract,
  rules: RulesConfig,
  weigh: Weigh = unitWeight,
): number {
  const counts = new Int8Array(RANK_COUNT * SUITS.length)
  const weights = new Float64Array(RANK_COUNT * SUITS.length)
  let jokers = 0
  for (const card of hand) {
    if (isJoker(card)) jokers += 1
    else counts[slotIndex(card.rank, SUITS.indexOf(card.suit))] += 1
  }
  SUITS.forEach((suit, s) => {
    for (let rank = 1; rank <= RANK_COUNT; rank++) weights[slotIndex(rank, s)] = weigh(rank as Rank, suit)
  })
  const cheapestSuit = Array.from({ length: RANK_COUNT }, (_, r) =>
    Math.min(...SUITS.map((_, s) => weights[slotIndex(r + 1, s)])),
  )
  const length = escalaLength(contract, rules)
  const mixed = contract.mixedSuits === true
  const allowJokers = length < REAL_ESCALA || mixed || rules.jokersInRealEscala
  const windows: number[][] = []
  const mixedSlot = (rank: number) => {
    const slots = SUITS.map((_, s) => slotIndex(rank, s))
    const held = slots.reduce((best, slot) => (counts[slot] > counts[best] ? slot : best))
    return counts[held] > 0 ? held : slots.reduce((best, slot) => (weights[slot] < weights[best] ? slot : best))
  }
  const rankWindows = escalaWindows(rules, length)
  if (contract.escalas > 0 && mixed) {
    for (const ranks of rankWindows) windows.push(ranks.map(mixedSlot))
  }
  if (contract.escalas > 0 && !mixed) {
    SUITS.forEach((_, s) => {
      const perSuit = rankWindows.map((ranks) => {
        const slots = ranks.map((rank) => slotIndex(rank, s))
        return { slots, present: slots.filter((slot) => counts[slot] > 0).length }
      })
      perSuit.sort((a, b) => b.present - a.present)
      const floor = (perSuit[0]?.present ?? 0) - 1
      perSuit
        .filter(({ present }, index) => index < ESCALA_WINDOWS_PER_SUIT || present >= floor)
        .forEach(({ slots }) => windows.push(slots))
    })
  }
  const missingSlots: number[] = []
  const maxWeight = Math.max(...weights)
  const trioCosts = new Array<number>(RANK_COUNT)
  let best = Infinity

  const finish = (cost: number) => {
    let total = cost
    const fillable = allowJokers && jokers > 0 ? [...missingSlots] : []
    if (contract.trios > 0) {
      for (let r = 0; r < RANK_COUNT; r++) {
        let held = 0
        for (let s = 0; s < SUITS.length; s++) held += counts[slotIndex(r + 1, s)]
        trioCosts[r] = Math.max(0, rules.trioSize - held) * cheapestSuit[r]
      }
      const ranks = rules.distinctTrioRanks
        ? selectCheapest(trioCosts, contract.trios)
        : Array<number>(contract.trios).fill(selectCheapest(trioCosts, 1)[0])
      for (const r of ranks) {
        total += trioCosts[r]
        const jokerSlots = Math.min(rules.maxJokersPerTrio, trioCosts[r] / cheapestSuit[r])
        for (let j = 0; j < jokerSlots; j++) fillable.push(cheapestSuit[r])
      }
    }
    if (jokers > 0) {
      fillable.sort((a, b) => b - a)
      for (let j = 0; j < Math.min(jokers, fillable.length); j++) total -= fillable[j]
    }
    if (total < best) best = total
  }

  const pick = (from: number, chosen: number, cost: number) => {
    if (chosen === contract.escalas) {
      finish(cost)
      return
    }
    if (cost - jokers * maxWeight >= best) return
    for (let index = from; index < windows.length; index++) {
      const window = windows[index]
      let extra = 0
      const marked = missingSlots.length
      const used: number[] = []
      for (const slot of window) {
        if (counts[slot] > 0) {
          counts[slot] -= 1
          used.push(slot)
        } else {
          extra += weights[slot]
          missingSlots.push(weights[slot])
        }
      }
      pick(index, chosen + 1, cost + extra)
      missingSlots.length = marked
      for (const slot of used) counts[slot] += 1
    }
  }

  pick(0, 0, 0)
  return best
}
