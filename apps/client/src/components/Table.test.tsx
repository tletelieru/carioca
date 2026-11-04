import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cardId, createMatch, escalaStart } from '@carioca/engine'
import type { Card, MatchState, Meld, Rank, Suit } from '@carioca/engine'
import { ROUNDS } from '@carioca/engine'
import App from '../App'
import { LocaleContext } from '../i18n/messages'
import { Table } from './Table'

const SHORT = { rounds: [ROUNDS[0], ROUNDS[1], ROUNDS[9]], maxDrawsPerRound: 90 }

function button(name: string | RegExp) {
  return screen.queryByRole('button', { name }) as HTMLButtonElement | null
}

function enabled(name: string | RegExp) {
  const found = button(name)
  return found && !found.disabled ? found : null
}

function wait(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

function handCards() {
  return [...screen.getByRole('region', { name: 'Your hand' }).querySelectorAll<HTMLButtonElement>('[data-card]')]
}

function myPlay() {
  const hand = screen.queryByRole('region', { name: 'Your hand' })
  return hand?.querySelector('[data-card][aria-disabled="false"]') !== null && hand !== null
}

function discardSomething() {
  for (const card of handCards()) {
    fireEvent.click(card)
    fireEvent.click(card)
    if (!screen.queryByText('You can’t throw back the card you just took.')) return
  }
}

function takeTurn() {
  const next = button('Next round')
  if (next) return fireEvent.click(next)
  const deck = enabled(/^Deck:/)
  if (deck) {
    fireEvent.click(deck)
    fireEvent.click(deck)
    return
  }
  const suggest = enabled('Suggest')
  if (suggest) {
    fireEvent.click(suggest)
    const layDown = enabled('Lay down')
    if (layDown) fireEvent.click(layDown)
  }
  if (myPlay()) return discardSomething()
  wait(600)
}

function start(players: string, level = 'Easy') {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: level }))
  fireEvent.click(screen.getByRole('button', { name: players }))
}

function playUntilMyTurn() {
  wait(4400)
  let guard = 0
  while (!enabled(/^Deck:/) && guard < 200) {
    wait(600)
    guard += 1
  }
}

const JOKER: Card = { kind: 'joker', copy: 0 }

function hearts(rank: number): Card {
  return { kind: 'suited', suit: 'hearts', rank: rank as Rank, copy: 0 }
}

function restoreWithRun(run: Card[], held: Card[]) {
  const base = createMatch({ players: 2 }, 9)
  const taken = new Set([...run, ...held].map(cardId))
  const strip = (cards: Card[]) => cards.filter((card) => !taken.has(cardId(card)))
  const start = escalaStart(run, base.rules)!
  const meld: Meld = { kind: 'escala', cards: run, id: 0, owner: 1, start }
  const state: MatchState = {
    ...base,
    turn: 0,
    phase: 'play',
    hands: [held, strip(base.hands[1])],
    deck: strip(base.deck),
    discard: strip(base.discard).length > 0 ? strip(base.discard) : strip(base.deck).slice(0, 1),
    melds: [meld],
    laidDown: [true, true],
    nextMeld: 1,
    log: [{ type: 'layDown', seat: 1, melds: [0] }],
  }
  localStorage.setItem('saved-match', JSON.stringify({ state, seed: 9, level: 'medium' }))
  render(<App />)
}

function card(rank: number, suit: Suit, copy: 0 | 1 = 0): Card {
  return { kind: 'suited', suit, rank: rank as Rank, copy }
}

const LOOSE = [card(3, 'spades'), card(6, 'clubs'), card(9, 'hearts'), card(13, 'spades'), card(5, 'diamonds'), card(7, 'spades')]

function restoreBeforeLayDown(hand: Card[], level = 'medium') {
  const base = createMatch({ players: 2 }, 9)
  const taken = new Set(hand.map(cardId))
  const strip = (cards: Card[]) => cards.filter((item) => !taken.has(cardId(item)))
  const state: MatchState = {
    ...base,
    turn: 0,
    phase: 'play',
    hands: [hand, strip(base.hands[1])],
    deck: strip(base.deck),
    discard: strip(base.discard).length > 0 ? strip(base.discard) : strip(base.deck).slice(0, 1),
    log: [
      { type: 'discard', seat: 0, card: base.discard[0] },
      { type: 'discard', seat: 1, card: base.discard[0] },
      { type: 'draw', seat: 0, source: 'deck', card: null },
    ],
  }
  localStorage.setItem('saved-match', JSON.stringify({ state, seed: 9, level }))
  render(<App />)
}

function stageGroup(cards: Card[]) {
  const pick = button('Pick several')
  if (pick) fireEvent.click(pick)
  for (const item of cards) fireEvent.click(document.querySelector(`[data-card="${cardId(item)}"]`)!)
  fireEvent.click(button('Group')!)
}

describe('Table', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    localStorage.setItem('preferred-lang', 'en')
    document.documentElement.className = ''
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it.each(['2 players', '5 players'])('deals twelve cards with %s', (label) => {
    start(label)
    expect(handCards()).toHaveLength(0)
    wait(2900)
    expect(handCards()).toHaveLength(12)
    expect(screen.getByText('2 trios')).toBeTruthy()
  })

  it('keeps the action buttons in place while bots play', () => {
    start('4 players', 'Medium')
    const names = ['Pick several', 'Lay down', 'Place']
    expect(button('Place')).toBeNull()
    names.pop()
    const labels = () => names.map((name) => Boolean(button(name)))
    expect(labels()).toEqual([true, true])
    expect(button('Suggest')).toBeNull()
    playUntilMyTurn()
    expect(labels()).toEqual([true, true])
    expect(button('Suggest')).toBeNull()
    fireEvent.click(enabled(/^Deck:/)!)
    fireEvent.click(enabled(/^Deck:/)!)
    fireEvent.click(button('Pick several')!)
    expect(button('Suggest')).toBeNull()
    expect(button('Lay down')!.parentElement!.querySelectorAll('button')).toHaveLength(2)
    expect(button('Draw')).toBeNull()
    expect(button('Lay down')!.disabled).toBe(true)
  })

  it('keeps the lay-down controls enabled before drawing and on the first turn, and refuses the lay-down with a message', () => {
    const firstTurn = 'No laying down on your first turn: draw and discard.'
    const drawFirst = 'Draw a card first: tap the deck or the discard.'
    start('2 players', 'Easy')
    playUntilMyTurn()
    for (const name of ['Pick several', 'Suggest']) expect(button(name)!.disabled).toBe(false)
    fireEvent.click(button('Suggest')!)
    expect(screen.getByText(drawFirst)).toBeTruthy()
    expect(handCards()).toHaveLength(12)
    fireEvent.click(enabled('Pick several')!)
    expect(screen.getByText(drawFirst)).toBeTruthy()
    expect(button('Done')).toBeNull()
    fireEvent.click(enabled(/^Deck:/)!)
    expect(screen.queryByText(drawFirst)).toBeNull()
    fireEvent.click(enabled(/^Deck:/)!)
    expect(screen.queryByText(firstTurn)).toBeNull()
    for (const name of ['Pick several', 'Suggest']) expect(button(name)!.disabled).toBe(false)
    fireEvent.click(button('Suggest')!)
    expect(screen.getByText(firstTurn)).toBeTruthy()
    expect(handCards()).toHaveLength(13)
    fireEvent.click(enabled('Pick several')!)
    expect(screen.getByText(firstTurn)).toBeTruthy()
    expect(button('Done')).toBeNull()
    expect(button('Pick several')).toBeTruthy()
    expect(screen.getByText('Nobody has laid down yet.')).toBeTruthy()
    discardSomething()
    expect(screen.queryByText(firstTurn)).toBeNull()
    playUntilMyTurn()
    fireEvent.click(enabled(/^Deck:/)!)
    fireEvent.click(enabled(/^Deck:/)!)
    fireEvent.click(button('Suggest')!)
    expect(screen.queryByText(firstTurn)).toBeNull()
  })

  it('says when the groups do not meet the contract, without hints', () => {
    start('2 players', 'Medium')
    playUntilMyTurn()
    fireEvent.click(enabled(/^Deck:/)!)
    fireEvent.click(enabled(/^Deck:/)!)
    discardSomething()
    playUntilMyTurn()
    fireEvent.click(enabled(/^Deck:/)!)
    fireEvent.click(enabled(/^Deck:/)!)
    fireEvent.click(button('Pick several')!)
    handCards()
      .slice(0, 3)
      .forEach((card) => fireEvent.click(card))
    fireEvent.click(button('Group')!)
    fireEvent.click(button('Lay down')!)
    expect(screen.getByText('Those cards don’t make 2 trios.')).toBeTruthy()
    expect(handCards()).toHaveLength(10)
    fireEvent.click(button('Undo group')!)
    expect(handCards()).toHaveLength(13)
  })

  it('takes from the deck with two taps and discards a card with two taps', () => {
    start('2 players', 'Medium')
    playUntilMyTurn()
    const deck = enabled(/^Deck:/)!
    fireEvent.click(deck)
    expect(handCards()).toHaveLength(12)
    fireEvent.click(deck)
    expect(handCards()).toHaveLength(13)
    const [first, card] = handCards()
    fireEvent.click(first)
    expect(first.getAttribute('aria-pressed')).toBe('true')
    const label = card.getAttribute('aria-label')
    fireEvent.click(card)
    expect(first.getAttribute('aria-pressed')).toBe('false')
    expect(handCards()).toHaveLength(13)
    fireEvent.click(card)
    expect(handCards()).toHaveLength(12)
    expect(screen.getByRole('button', { name: `Discard pile: ${label}` })).toBeTruthy()
  })

  it('lifts the top discard on the first tap and takes it on the second', () => {
    start('2 players', 'Medium')
    playUntilMyTurn()
    const pile = enabled(/^Discard pile:/)!
    const label = pile.getAttribute('aria-label')!.replace('Discard pile: ', '')
    fireEvent.click(pile)
    expect(handCards()).toHaveLength(12)
    fireEvent.click(pile)
    expect(handCards()).toHaveLength(13)
    expect(handCards().some((card) => card.getAttribute('aria-label') === label)).toBe(true)
  })

  it('asks before leaving a match and skips the history when nothing was played', () => {
    start('3 players')
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }))
    expect(screen.getByRole('region', { name: 'Your hand' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, exit' }))
    expect(screen.getByText('The ten contracts')).toBeTruthy()
    expect(localStorage.getItem('match-history')).toBeNull()
  })

  it('comes back to the match after a reload and records it as abandoned', () => {
    start('3 players')
    for (let step = 0; step < 12; step++) takeTurn()
    const ids = () => handCards().map((card) => card.dataset.card).sort()
    const before = ids()
    cleanup()
    render(<App />)
    expect(ids()).toEqual(before)
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, exit' }))
    expect(localStorage.getItem('saved-match')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'History' }))
    expect(screen.getByText('Abandoned')).toBeTruthy()
  })

  it('draws who deals before the first deal and waits for it', () => {
    start('4 players', 'Medium')
    expect(screen.getByText('Drawing who deals…')).toBeTruthy()
    expect(handCards()).toHaveLength(0)
    expect(screen.getByRole('button', { name: /^Discard pile: Empty/ })).toBeTruthy()
    wait(2100)
    const saved = JSON.parse(localStorage.getItem('saved-match')!) as { state: MatchState }
    const dealer = saved.state.dealer === 0 ? 'You' : `Bot ${saved.state.dealer}`
    expect(screen.getByText(`Dealer: ${dealer}`)).toBeTruthy()
    expect(saved.state.log).toHaveLength(0)
    expect(screen.getByRole('region', { name: 'Your hand' }).querySelector('.deal-in')).toBeNull()
    wait(900)
    expect(screen.getByRole('region', { name: 'Your hand' }).querySelector('.deal-in')).not.toBeNull()
  })

  it('places a selected card on another player set', () => {
    const base = createMatch({ players: 2 }, 9)
    const hearts = (rank: number): Card => ({ kind: 'suited', suit: 'hearts', rank: rank as Rank, copy: 0 })
    const run = [3, 4, 5, 6].map(hearts)
    const seven = hearts(7)
    const taken = new Set([...run, seven].map(cardId))
    const strip = (cards: Card[]) => cards.filter((card) => !taken.has(cardId(card)))
    const meld: Meld = { kind: 'escala', cards: run, id: 0, owner: 1, start: 3 }
    const state: MatchState = {
      ...base,
      turn: 0,
      phase: 'play',
      hands: [[seven, ...strip(base.hands[0]).slice(0, 4)], strip(base.hands[1])],
      deck: strip(base.deck),
      discard: strip(base.discard).length > 0 ? strip(base.discard) : strip(base.deck).slice(0, 1),
      melds: [meld],
      laidDown: [true, true],
      nextMeld: 1,
      log: [{ type: 'layDown', seat: 1, melds: [0] }],
    }
    localStorage.setItem('saved-match', JSON.stringify({ state, seed: 9, level: 'medium' }))
    render(<App />)
    expect(screen.queryByText('Drawing who deals…')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '7 ♥' }))
    fireEvent.click(screen.getByRole('button', { name: /^Run: 3 ♥/ }))
    expect(screen.getByRole('button', { name: /^Run: 3 ♥, 4 ♥, 5 ♥, 6 ♥, 7 ♥/ })).toBeTruthy()
    expect(handCards()).toHaveLength(4)
  })

  it('wraps a run past the King and lets a natural card go round the Ace', () => {
    restoreWithRun([11, 12, 13, 1].map(hearts), [hearts(2), hearts(5)])
    fireEvent.click(screen.getByRole('button', { name: '2 ♥' }))
    fireEvent.click(screen.getByRole('button', { name: /^Run: J ♥/ }))
    expect(screen.getByRole('button', { name: 'Run: J ♥, Q ♥, K ♥, A ♥, 2 ♥' })).toBeTruthy()
    expect(button('Add at the start')).toBeNull()
  })

  it('asks where a joker goes when both ends of a wrapped run take it', () => {
    restoreWithRun([12, 13, 1, 2].map(hearts), [JOKER, hearts(9)])
    fireEvent.click(screen.getByRole('button', { name: 'Joker' }))
    fireEvent.click(screen.getByRole('button', { name: /^Run: Q ♥/ }))
    expect(screen.getByRole('button', { name: 'Run: Q ♥, K ♥, A ♥, 2 ♥' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Add at the start' }))
    expect(screen.getByRole('button', { name: 'Run: Joker, Q ♥, K ♥, A ♥, 2 ♥' })).toBeTruthy()
    expect(button('Add at the end')).toBeNull()
  })

  it('asks where a joker goes after placing the other picked cards', () => {
    restoreWithRun([5, 6, 7, 8].map(hearts), [JOKER, hearts(9), hearts(13)])
    fireEvent.click(button('Pick several')!)
    fireEvent.click(screen.getByRole('button', { name: 'Joker' }))
    fireEvent.click(screen.getByRole('button', { name: '9 ♥' }))
    fireEvent.click(screen.getByRole('button', { name: /^Run: 5 ♥/ }))
    expect(screen.getByRole('button', { name: 'Run: 5 ♥, 6 ♥, 7 ♥, 8 ♥, 9 ♥' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Add at the end' }))
    expect(screen.getByRole('button', { name: 'Run: 5 ♥, 6 ♥, 7 ♥, 8 ♥, 9 ♥, Joker' })).toBeTruthy()
    expect(handCards()).toHaveLength(1)
  })

  it('reveals the leftover hands on the table before the round summary', () => {
    const base = createMatch({ players: 2 }, 13)
    const last = base.hands[0][0]
    const state: MatchState = {
      ...base,
      turn: 0,
      phase: 'play',
      hands: [[last], base.hands[1]],
      laidDown: [true, false],
      log: [{ type: 'draw', seat: 0, source: 'deck', card: null }],
    }
    localStorage.setItem('saved-match', JSON.stringify({ state, seed: 13, level: 'medium' }))
    render(<App />)
    const [card] = handCards()
    fireEvent.click(card)
    fireEvent.click(card)
    expect(screen.queryByText('Round 1 finished')).toBeNull()
    expect(screen.queryByRole('group', { name: 'Cards left by Bot 1' })).toBeNull()
    wait(750)
    expect(screen.getByRole('group', { name: 'Cards left by Bot 1' })).toBeTruthy()
    expect(screen.queryByText('Round 1 finished')).toBeNull()
    wait(400)
    expect(screen.getByText('Round 1 finished')).toBeTruthy()
  })

  it('shows only the bots on top and your seat with the sort controls above your hand', () => {
    start('3 players')
    const seats = [...document.querySelectorAll('[data-seat]')].map((seat) => seat.getAttribute('data-seat'))
    expect(seats).toEqual(['1', '2', '0'])
    const mine = document.querySelector<HTMLElement>('[data-seat="0"]')!
    expect(within(mine).getByText('You')).toBeTruthy()
    expect(within(mine).getByRole('group', { name: 'Sort your hand' })).toBeTruthy()
    expect(mine.nextElementSibling?.getAttribute('aria-label')).toBe('Your hand')
  })

  it('closes the round with the last card face down on the discard pile', () => {
    const base = createMatch({ players: 2 }, 13)
    const last = base.hands[0][0]
    const state: MatchState = {
      ...base,
      turn: 0,
      phase: 'play',
      hands: [[last], base.hands[1]],
      laidDown: [true, false],
      log: [{ type: 'draw', seat: 0, source: 'deck', card: null }],
    }
    localStorage.setItem('saved-match', JSON.stringify({ state, seed: 13, level: 'medium' }))
    render(<App />)
    const [card] = handCards()
    fireEvent.click(card)
    fireEvent.click(card)
    const pile = screen.getByRole('button', { name: 'Discard pile: Face down' })
    expect(pile.hasAttribute('disabled')).toBe(true)
    expect(pile.querySelector('[data-discard-top] .back-pattern')).not.toBeNull()
    expect(screen.getByText('You went out.')).toBeTruthy()
    wait(1200)
    expect(screen.getByText('Round 1 finished')).toBeTruthy()
  })

  it('lays down two trios staged as one group of six, joker included', () => {
    const six = [JOKER, card(1, 'hearts'), card(1, 'clubs'), card(11, 'diamonds'), card(11, 'hearts'), card(11, 'diamonds', 1)]
    restoreBeforeLayDown([...six, ...LOOSE])
    stageGroup(six)
    fireEvent.click(enabled('Lay down')!)
    expect(screen.queryByText('That doesn’t meet the contract.')).toBeNull()
    expect(document.querySelectorAll('[data-meld-card]')).toHaveLength(6)
    expect(handCards()).toHaveLength(LOOSE.length)
  })

  it('names the contract when the staged cards cannot make it, and asks for exact sizes', () => {
    const trios = [card(4, 'hearts'), card(4, 'clubs'), card(4, 'spades'), card(8, 'hearts'), card(8, 'clubs'), card(8, 'spades')]
    restoreBeforeLayDown([...trios, card(4, 'diamonds'), ...LOOSE])
    stageGroup(LOOSE.slice(0, 3))
    fireEvent.click(enabled('Lay down')!)
    expect(screen.getByText('Those cards don’t make 2 trios.')).toBeTruthy()
    fireEvent.click(button('Undo group')!)
    stageGroup([...trios, card(4, 'diamonds')])
    fireEvent.click(enabled('Lay down')!)
    expect(screen.getByText(/^Each trio is exactly 3 cards/)).toBeTruthy()
    expect(screen.getByText('Nobody has laid down yet.')).toBeTruthy()
  })

  it('keeps all three action buttons while picking several on easy, and Suggest stages the lay-down', () => {
    const trios = [card(4, 'hearts'), card(4, 'clubs'), card(4, 'spades'), card(8, 'hearts'), card(8, 'clubs'), card(8, 'spades')]
    restoreBeforeLayDown([...trios, ...LOOSE], 'easy')
    const row = () => button('Lay down')!.parentElement!.querySelectorAll('button')
    expect(row()).toHaveLength(3)
    fireEvent.click(button('Pick several')!)
    expect(row()).toHaveLength(3)
    expect(button('Done')).toBeTruthy()
    expect(enabled('Suggest')).toBeTruthy()
    fireEvent.click(button('Suggest')!)
    expect(row()).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: 'Undo group' })).toHaveLength(2)
    fireEvent.click(enabled('Lay down')!)
    expect(document.querySelectorAll('[data-meld-card]')).toHaveLength(6)
  })

  it('shows the score of the round in progress', () => {
    start('2 players')
    fireEvent.click(screen.getByRole('button', { name: 'Score' }))
    expect(screen.getByRole('dialog', { name: 'Score' })).toBeTruthy()
    expect(screen.getByText(/in progress/)).toBeTruthy()
  })

  it('plays a whole short match against bots', { timeout: 300000 }, () => {
    const exit = vi.fn()
    render(
      <LocaleContext value="en">
        <Table players={3} seed={11} level="easy" restored={null} rules={SHORT} howTo onExit={exit} />
      </LocaleContext>,
    )
    let guard = 0
    while (!screen.queryByText('Match finished') && guard < 4000) {
      takeTurn()
      guard += 1
    }
    expect(screen.getByText('Match finished')).toBeTruthy()
    const history = JSON.parse(localStorage.getItem('match-history')!) as { results: unknown[] }[]
    expect(history[0].results).toHaveLength(SHORT.rounds.length)
    fireEvent.click(screen.getByRole('button', { name: 'Back to start' }))
    expect(exit).toHaveBeenCalled()
  })
})
