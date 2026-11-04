import {
  addOptions,
  cardId,
  cardPoints,
  contractDistance,
  cyclicRank,
  extendMeld,
  isJoker,
  naturalValues,
  nextSeat,
  SUITS,
} from '@carioca/engine'
import type { Card, End, PlayerView, Rank, Seat, Suit, SuitedCard, Weigh } from '@carioca/engine'

const COPIES = 2

const LIVE_COST = [4, 1.4, 1]

const NEAR_RUN = 2

export function faceKey(card: Card): string {
  return isJoker(card) ? 'joker' : `${card.rank}-${card.suit}`
}

export function distinctCards(cards: Card[]): Card[] {
  const seen = new Set<string>()
  return cards.filter((card) => {
    const key = faceKey(card)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function withoutCard(hand: Card[], card: Card): Card[] {
  const id = cardId(card)
  return hand.filter((held) => cardId(held) !== id)
}

export function distance(view: PlayerView, hand: Card[], weigh?: Weigh): number {
  return contractDistance(hand, view.contract, view.rules, weigh)
}

export type Live = (rank: Rank, suit: Suit) => number

export function liveCounts(view: PlayerView): Live {
  const seen = new Map<string, number>()
  const count = (card: Card) => {
    if (isJoker(card)) return
    const key = faceKey(card)
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }
  view.melds.forEach((meld) => meld.cards.forEach(count))
  view.discard.slice(0, -1).forEach(count)
  view.hand.forEach(count)
  return (rank: Rank, suit: Suit) => Math.max(0, COPIES - (seen.get(`${rank}-${suit}`) ?? 0))
}

export function liveWeights(view: PlayerView): Weigh {
  const live = liveCounts(view)
  return (rank: Rank, suit: Suit) => LIVE_COST[live(rank, suit)]
}

const STEPS = [-2, -1, 1, 2]

const RANK_COUNT = 13

function neighbours(hand: Card[], mixed: boolean): SuitedCard[] {
  const found = new Map<string, SuitedCard>()
  const note = (rank: Rank, suit: Suit) => {
    const card: SuitedCard = { kind: 'suited', rank, suit, copy: 0 }
    found.set(faceKey(card), card)
  }
  for (const card of hand) {
    if (isJoker(card)) continue
    for (const suit of SUITS) if (suit !== card.suit) note(card.rank, suit)
    const runSuits = mixed ? SUITS : [card.suit]
    for (const step of STEPS) {
      for (const suit of runSuits) note(cyclicRank(card.rank + step), suit)
    }
  }
  return [...found.values()]
}

export function outs(view: PlayerView, hand: Card[], live: Live, weigh?: Weigh): number {
  const base = distance(view, hand, weigh)
  return neighbours(hand, view.contract.mixedSuits === true).reduce((total, card) => {
    const copies = live(card.rank, card.suit)
    if (copies === 0) return total
    return distance(view, [...hand, card], weigh) < base ? total + copies : total
  }, 0)
}

export function points(view: PlayerView, card: Card): number {
  return cardPoints(card, view.rules)
}

export function addable(view: PlayerView, card: Card): boolean {
  return addOptions([card], view.melds, view.rules).length > 0
}

export function followUps(view: PlayerView, card: Card, id: number, end: End): number {
  const meld = view.melds.find((item) => item.id === id)
  const grown = meld && extendMeld(meld, card, end, view.rules)
  if (!meld || !grown) return 0
  return addOptions(withoutCard(view.hand, card), [{ ...meld, ...grown }], view.rules).length
}

function closeInRun(a: SuitedCard, b: SuitedCard, view: PlayerView): boolean {
  if (a.suit !== b.suit && !view.contract.mixedSuits) return false
  if (view.rules.wrapAround) {
    const gap = Math.abs(a.rank - b.rank)
    return gap !== 0 && Math.min(gap, RANK_COUNT - gap) <= NEAR_RUN
  }
  return naturalValues(a, view.rules).some((x) =>
    naturalValues(b, view.rules).some((y) => x !== y && Math.abs(x - y) <= NEAR_RUN),
  )
}

export function pickups(view: PlayerView, seat: Seat): Card[] {
  return view.log.flatMap((entry) =>
    entry.type === 'draw' && entry.seat === seat && entry.card ? [entry.card] : [],
  )
}

export function interest(view: PlayerView, seat: Seat, card: Card): number {
  if (isJoker(card)) return 2
  if (view.laidDown[seat]) return addable(view, card) ? 2 : 0
  let total = 0
  for (const taken of pickups(view, seat)) {
    if (isJoker(taken)) continue
    if (taken.rank === card.rank) total += 1
    if (closeInRun(taken, card, view)) total += 1
  }
  return total
}

export function rivalsInOrder(view: PlayerView): Seat[] {
  const seats: Seat[] = []
  let seat = nextSeat(view.seat, view.players)
  while (seat !== view.seat) {
    seats.push(seat)
    seat = nextSeat(seat, view.players)
  }
  return seats
}

export function danger(view: PlayerView): number {
  return rivalsInOrder(view).reduce((worst, seat) => {
    if (!view.laidDown[seat]) return worst
    return Math.max(worst, 1 / Math.max(1, view.handCounts[seat] - 1))
  }, 0)
}

export function connections(view: PlayerView, card: Card): number {
  if (isJoker(card) || view.laidDown[view.seat]) return 0
  return view.hand.reduce((total, held) => {
    if (isJoker(held) || cardId(held) === cardId(card)) return total
    return total + Number(held.rank === card.rank) + Number(closeInRun(held, card, view))
  }, 0)
}
