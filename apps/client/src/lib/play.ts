import { applyAction, cardId, isJoker, isLegal } from '@carioca/engine'
import type { Action, Card, End, MatchState, Seat } from '@carioca/engine'

const HUMAN: Seat = 0

export function addAction(card: Card, meld: number, end: End): Action {
  return { type: 'add', seat: HUMAN, card, meld, end }
}

const END_ORDER: End[] = ['high', 'low']

export function planAdds(state: MatchState, cards: Card[], meld: number): Action[] | null {
  let current = state
  let left = cards
  const plan: Action[] = []
  while (left.length > 0) {
    const step = left
      .flatMap((card) => END_ORDER.map((end) => addAction(card, meld, end)))
      .find((action) => isLegal(current, action))
    if (step?.type !== 'add') return null
    plan.push(step)
    current = applyAction(current, step)
    left = left.filter((card) => cardId(card) !== cardId(step.card))
  }
  return plan
}

export interface JokerChoice {
  plan: Action[]
  joker: Card
  ends: End[]
}

export function planJokerChoice(state: MatchState, cards: Card[], meld: number): JokerChoice | null {
  const joker = cards.filter(isJoker).at(-1)
  if (!joker) return null
  const rest = cards.filter((card) => cardId(card) !== cardId(joker))
  const ordered = [...rest.filter((card) => !isJoker(card)), ...rest.filter(isJoker)]
  const plan = planAdds(state, ordered, meld)
  if (!plan) return null
  const after = plan.reduce(applyAction, state)
  const ends = END_ORDER.filter((end) => isLegal(after, addAction(joker, meld, end))).reverse()
  return ends.length > 1 ? { plan, joker, ends } : null
}

