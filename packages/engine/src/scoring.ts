import type { Card } from './cards'
import type { RulesConfig } from './rules'

const FACE_FROM = 11

export function cardPoints(card: Card, rules: RulesConfig): number {
  if (card.kind === 'joker') return rules.points.joker
  if (card.rank === 1) return rules.points.ace
  if (card.rank >= FACE_FROM) return rules.points.face
  return card.rank
}

export function handPoints(hand: Card[], rules: RulesConfig): number {
  return hand.reduce((total, card) => total + cardPoints(card, rules), 0)
}
