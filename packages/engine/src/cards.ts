export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const

export type Suit = (typeof SUITS)[number]

export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const

export type Rank = (typeof RANKS)[number]

export type SuitedCard = { kind: 'suited'; suit: Suit; rank: Rank; copy: 0 | 1 }

export type JokerCard = { kind: 'joker'; copy: 0 | 1 | 2 | 3 }

export type Card = SuitedCard | JokerCard

export type Seat = number

export type PlayerCount = 2 | 3 | 4 | 5

export const PLAYER_COUNTS: PlayerCount[] = [2, 3, 4, 5]

export const DECK_SIZE = 108

export function cardId(card: Card): string {
  return card.kind === 'joker' ? `joker-${card.copy}` : `${card.rank}-${card.suit}-${card.copy}`
}

export function sameCard(a: Card, b: Card): boolean {
  return cardId(a) === cardId(b)
}

export function isJoker(card: Card): card is JokerCard {
  return card.kind === 'joker'
}

export function createDeck(): Card[] {
  const suited = ([0, 1] as const).flatMap((copy) =>
    SUITS.flatMap((suit) => RANKS.map((rank): Card => ({ kind: 'suited', suit, rank, copy }))),
  )
  const jokers = ([0, 1, 2, 3] as const).map((copy): Card => ({ kind: 'joker', copy }))
  return [...suited, ...jokers]
}
