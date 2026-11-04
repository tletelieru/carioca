import { cardId, isEscalaLoca, isJoker, isRealEscala } from '@carioca/engine'
import type { Card, Contract, Rank, Suit } from '@carioca/engine'
import type { SortMode } from './settings'

export const SUIT_SYMBOL: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
}

const FACE: Partial<Record<Rank, string>> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }

const HAND_SUITS: Suit[] = ['clubs', 'hearts', 'spades', 'diamonds']

const ACE_HIGH = 14

export const SUIT_ON_CARD: Record<Suit, string> = {
  clubs: 'text-card-clubs',
  diamonds: 'text-card-diamonds',
  hearts: 'text-card-hearts',
  spades: 'text-card-spades',
}

export function cardKey(card: Card): string {
  return cardId(card)
}

export function rankLabel(rank: Rank): string {
  return FACE[rank] ?? String(rank)
}

export function cardLabel(card: Card, joker: string): string {
  if (isJoker(card)) return joker
  return `${rankLabel(card.rank)} ${SUIT_SYMBOL[card.suit]}`
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const result = [...items]
  const [item] = result.splice(from, 1)
  result.splice(to, 0, item)
  return result
}

function rankValue(card: Card): number {
  if (isJoker(card)) return ACE_HIGH + 1
  return card.rank === 1 ? ACE_HIGH : card.rank
}

function suitValue(card: Card): number {
  return isJoker(card) ? HAND_SUITS.length : HAND_SUITS.indexOf(card.suit)
}

export function sortHand(hand: Card[], mode: SortMode): Card[] {
  return [...hand].sort((a, b) => {
    if (mode === 'rank') return rankValue(a) - rankValue(b) || suitValue(a) - suitValue(b)
    return suitValue(a) - suitValue(b) || rankValue(a) - rankValue(b)
  })
}

export interface ContractWords {
  trios: (n: number) => string
  escalas: (n: number) => string
  escalasOf: (n: number, length: number) => string
  and: string
  royal: string
  loca: string
  trioShort: string
  escalaShort: string
  royalShort: string
  locaShort: string
}

function escalasLabel(contract: Contract, words: ContractWords): string {
  if (contract.escalas === 0) return ''
  if (contract.escalaLength === undefined) return words.escalas(contract.escalas)
  return words.escalasOf(contract.escalas, contract.escalaLength)
}

function escalasShort(contract: Contract, words: ContractWords): string {
  if (contract.escalas === 0) return ''
  const length = contract.escalaLength === undefined ? '' : `×${contract.escalaLength}`
  return `${contract.escalas}${words.escalaShort}${length}`
}

export function contractLabel(contract: Contract, words: ContractWords): string {
  if (isRealEscala(contract)) return words.royal
  if (isEscalaLoca(contract)) return words.loca
  const parts = [contract.trios > 0 ? words.trios(contract.trios) : '', escalasLabel(contract, words)].filter(Boolean)
  return parts.join(` ${words.and} `)
}

export function contractShort(contract: Contract, words: ContractWords): string {
  if (isRealEscala(contract)) return words.royalShort
  if (isEscalaLoca(contract)) return words.locaShort
  const trios = contract.trios > 0 ? `${contract.trios}${words.trioShort}` : ''
  return [trios, escalasShort(contract, words)].filter(Boolean).join(' ')
}
