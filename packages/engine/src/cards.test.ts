import { describe, expect, it } from 'vitest'
import { DECK_SIZE, cardId, createDeck } from './cards'
import { shuffle } from './rng'

describe('deck', () => {
  it('has ${DECK_SIZE} unique cards', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(DECK_SIZE)
    expect(new Set(deck.map(cardId)).size).toBe(DECK_SIZE)
  })

  it('has every card twice and four jokers', () => {
    const deck = createDeck()
    expect(deck.filter((card) => card.kind === 'joker')).toHaveLength(4)
    expect(deck.filter((card) => card.kind === 'suited' && card.rank === 1)).toHaveLength(8)
  })

  it('shuffles the same way for the same seed', () => {
    const deck = createDeck()
    const first = shuffle(deck, 42).items.map(cardId)
    const second = shuffle(deck, 42).items.map(cardId)
    expect(first).toEqual(second)
    expect(new Set(first).size).toBe(DECK_SIZE)
  })
})
