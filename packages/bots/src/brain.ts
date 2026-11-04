import type { Action, Card, PlayerView, Weigh } from '@carioca/engine'
import {
  addable,
  connections,
  danger,
  distance,
  distinctCards,
  faceKey,
  followUps,
  interest,
  liveCounts,
  liveWeights,
  outs,
  points,
  rivalsInOrder,
  withoutCard,
} from './analysis'
import type { Bot, Rng } from './types'

export interface Profile {
  careless: number
  ignorePile: number
  pointWeight: number
  dangerWeight: number
  feedWeight: number
  rivals: 'none' | 'next' | 'all'
  live: boolean
  noise: number
  connectWeight: number
  outsWeight: number
  holdTurns: number
}

const DISTANCE_WEIGHT = 10

const ADDABLE_PENALTY = 5

const RIVAL_FADE = 0.5

type Discard = Extract<Action, { type: 'discard' }>

function weighFor(view: PlayerView, profile: Profile): Weigh | undefined {
  return profile.live ? liveWeights(view) : undefined
}

function feedRisk(view: PlayerView, card: Card, profile: Profile): number {
  if (profile.rivals === 'none') return 0
  const rivals = rivalsInOrder(view)
  const watched = profile.rivals === 'next' ? rivals.slice(0, 1) : rivals
  return watched.reduce(
    (total, seat, index) => total + interest(view, seat, card) * RIVAL_FADE ** index,
    0,
  )
}

function shapeCost(view: PlayerView, card: Card, weigh: Weigh | undefined): number {
  if (view.laidDown[view.seat]) return addable(view, card) ? ADDABLE_PENALTY : 0
  return distance(view, withoutCard(view.hand, card), weigh)
}

function discardCost(
  view: PlayerView,
  card: Card,
  shape: number,
  profile: Profile,
  rng: Rng,
): number {
  const pointWeight = profile.pointWeight + profile.dangerWeight * danger(view)
  return (
    shape * DISTANCE_WEIGHT -
    points(view, card) * pointWeight +
    feedRisk(view, card, profile) * profile.feedWeight +
    connections(view, card) * profile.connectWeight +
    rng() * profile.noise
  )
}

function carelessDiscard(discards: Discard[], rng: Rng): Action {
  const plain = discards.filter((action) => action.card.kind !== 'joker')
  const pool = plain.length > 0 ? plain : discards
  return pool[Math.floor(rng() * pool.length)]
}

function outsBonus(view: PlayerView, card: Card, profile: Profile, weigh: Weigh | undefined): number {
  if (profile.outsWeight === 0) return 0
  return outs(view, withoutCard(view.hand, card), liveCounts(view), weigh) * profile.outsWeight
}

function chooseDiscard(view: PlayerView, discards: Discard[], profile: Profile, rng: Rng): Action {
  if (rng() < profile.careless) return carelessDiscard(discards, rng)
  const weigh = weighFor(view, profile)
  const options = distinctCards(discards.map((action) => action.card)).map((card) => ({
    card,
    shape: shapeCost(view, card, weigh),
  }))
  const tightest = Math.min(...options.map((option) => option.shape))
  const laid = view.laidDown[view.seat]
  let best = options[0].card
  let bestCost = Infinity
  for (const { card, shape } of options) {
    const bonus = !laid && shape === tightest ? outsBonus(view, card, profile, weigh) : 0
    const cost = discardCost(view, card, shape, profile, rng) - bonus
    if (cost < bestCost) {
      bestCost = cost
      best = card
    }
  }
  return discards.find((action) => faceKey(action.card) === faceKey(best))!
}

function bestAfterTaking(view: PlayerView, card: Card, weigh: Weigh | undefined): number {
  const hand = [...view.hand, card]
  return Math.min(
    ...distinctCards(view.hand).map((item) => distance(view, withoutCard(hand, item), weigh)),
  )
}

function wantsPile(view: PlayerView, profile: Profile, rng: Rng): boolean {
  const top = view.discard.at(-1)
  if (!top || rng() < profile.ignorePile) return false
  if (view.laidDown[view.seat]) return addable(view, top)
  const weigh = weighFor(view, profile)
  return bestAfterTaking(view, top, weigh) < distance(view, view.hand, weigh)
}

function chooseDraw(view: PlayerView, legal: Action[], profile: Profile, rng: Rng): Action {
  const pile = legal.find((action) => action.type === 'draw' && action.source === 'discard')
  const deck = legal.find((action) => action.type === 'draw' && action.source === 'deck')
  if (!deck) return pile ?? legal[0]
  if (pile && wantsPile(view, profile, rng)) return pile
  return deck
}

function chooseAdd(view: PlayerView, legal: Action[]): Action | undefined {
  let best: Action | undefined
  let bestPoints = -1
  let bestRoom = -1
  for (const action of legal) {
    if (action.type !== 'add') continue
    const value = points(view, action.card)
    if (value < bestPoints) continue
    const room = followUps(view, action.card, action.meld, action.end)
    if (value === bestPoints && room <= bestRoom) continue
    best = action
    bestPoints = value
    bestRoom = room
  }
  return best
}

const HOLD_LEFTOVER = 6

function ownDraws(view: PlayerView): number {
  return view.log.filter((entry) => entry.type === 'draw' && entry.seat === view.seat).length
}

function shouldHold(view: PlayerView, layDown: Action, profile: Profile): boolean {
  if (layDown.type !== 'layDown' || profile.holdTurns === 0) return false
  if (view.laidDown.some((laid, seat) => laid && seat !== view.seat)) return false
  if (ownDraws(view) > profile.holdTurns) return false
  const used = layDown.melds.reduce((total, meld) => total + meld.cards.length, 0)
  return view.hand.length - used >= HOLD_LEFTOVER
}

export function createBot(profile: Profile): Bot {
  return {
    choose(view, legal, rng) {
      if (view.phase === 'draw') return chooseDraw(view, legal, profile, rng)
      const layDown = legal.find((action) => action.type === 'layDown')
      if (layDown && !shouldHold(view, layDown, profile)) return layDown
      const add = chooseAdd(view, legal)
      if (add) return add
      const discards = legal.filter((action): action is Discard => action.type === 'discard')
      if (discards.length === 0) return legal[0]
      return chooseDiscard(view, discards, profile, rng)
    },
  }
}
