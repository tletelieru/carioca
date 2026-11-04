import { useState } from 'react'
import { flushSync } from 'react-dom'
import type { CSSProperties } from 'react'
import type { Level } from '@carioca/bots'
import {
  arrangeMeld,
  canLayDown,
  cardId,
  closedDiscard,
  contractFor,
  escalaLength,
  findLayDowns,
  isLegal,
  liveResult,
  matchTotals,
  matchWinners,
  meldEnds,
} from '@carioca/engine'
import type {
  Action,
  Card,
  End,
  LogEntry,
  MatchState,
  Meld,
  PlayerCount,
  RulesConfig,
  Seat,
  Source,
} from '@carioca/engine'
import { useMessages } from '../i18n/messages'
import type { Messages } from '../i18n/messages'
import { cardKey, cardLabel, contractLabel } from '../lib/cards'
import { FLIGHT_STAGGER_MS, flyTo, grabCard } from '../lib/flight'
import { saveRecord } from '../lib/history'
import { readSortMode, sortModeKey } from '../lib/settings'
import type { SortMode } from '../lib/settings'
import { addAction, planAdds, planJokerChoice } from '../lib/play'
import { clearSavedMatch } from '../lib/savedMatch'
import { prefersReducedMotion } from '../useDealerDraw'
import { HUMAN, revealSeats, useMatch } from '../useMatch'
import { BotFan } from './BotFan'
import { DealAnimation } from './DealAnimation'
import { Hand } from './Hand'
import { MeldView } from './MeldView'
import { MiniCard } from './MiniCard'
import { Overlay } from './Overlay'
import { PlayerBadge } from './PlayerBadge'
import { ResultEffect } from './ResultEffect'
import { REVEAL_STEP_MS, RoundSummary } from './RoundSummary'
import { ScoreTable } from './ScoreTable'
import { SlidDeck } from './SlidDeck'

interface Props {
  players: PlayerCount
  seed: number
  level: Level
  restored: MatchState | null
  rules?: Partial<RulesConfig>
  howTo: boolean
  onExit: () => void
}

interface Chooser {
  meld: number
  ends: End[]
  card: Card
}

interface Command {
  label: string
  onClick: () => void
  enabled: boolean
  primary?: boolean
}

function hasPlays(state: MatchState): boolean {
  return state.results.length > 0 || state.log.length > 0
}

function saveAbandoned(state: MatchState, seed: number, level: Level): void {
  if (state.status === 'matchOver' || !hasPlays(state)) return
  const results = state.status === 'playing' ? [...state.results, liveResult(state)] : state.results
  saveRecord({
    id: seed,
    finishedAt: Date.now(),
    players: state.players,
    level,
    results,
    totals: matchTotals({ players: state.players, results }),
    winners: [],
    abandoned: true,
  })
}

function describe(entry: LogEntry | undefined, names: string[], t: Messages, closed: boolean): string {
  if (!entry) return ''
  if (closed && entry.type === 'discard') return t.wentOut(names[entry.seat])
  switch (entry.type) {
    case 'draw':
      return entry.card
        ? t.logTookDiscard(names[entry.seat], cardLabel(entry.card, t.joker))
        : t.logDrewDeck(names[entry.seat])
    case 'layDown':
      return t.logLaidDown(names[entry.seat])
    case 'add':
      return t.logAdded(names[entry.seat], cardLabel(entry.card, t.joker))
    case 'discard':
      return t.logDiscarded(names[entry.seat], cardLabel(entry.card, t.joker))
    case 'reshuffle':
      return t.logReshuffle
  }
}

const FAN_REM = 20

const LAY_DOWN_OPTIONS = 12

function pickedCard(source: Source): Element | null {
  return document.querySelector(`[data-source="${source}"] [data-lifted]`)
}

function lastOf(selector: string): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).at(-1) ?? null
}

function discardTop(): HTMLElement | null {
  return document.querySelector('[data-discard-top]')
}

function meldCard(card: Card): HTMLElement | null {
  return document.querySelector(`[data-meld-card="${cardKey(card)}"]`)
}

function heldCard(card: Card): Element | null {
  const key = cardKey(card)
  return document.querySelector(`[data-card="${key}"] > span`) ?? document.querySelector(`[data-staged="${key}"]`)
}

function placedCards(action: Action): Card[] {
  if (action.type === 'discard' || action.type === 'add') return [action.card]
  if (action.type === 'layDown') return action.melds.flatMap((meld) => meld.cards)
  return []
}

function landingFor(action: Action, card: Card): HTMLElement | null {
  return action.type === 'discard' ? discardTop() : meldCard(card)
}

function humanMove(actions: Action[], apply: () => void) {
  const [first] = actions
  if (first?.type === 'draw') {
    const grabbed = grabCard(pickedCard(first.source))
    flushSync(apply)
    flyTo(grabbed, lastOf('[data-card] > span'))
    return
  }
  if (first?.type === 'discard') {
    const from = heldCard(first.card)?.getBoundingClientRect()
    flushSync(apply)
    const top = discardTop()
    flyTo(grabCard(top, from), top)
    return
  }
  const flights = actions.flatMap((action) => placedCards(action).map((card) => ({ action, card, grabbed: grabCard(heldCard(card)) })))
  flushSync(apply)
  flights.forEach(({ action, card, grabbed }, index) => flyTo(grabbed, landingFor(action, card), index * FLIGHT_STAGGER_MS))
}

function botMove(action: Action, apply: () => void) {
  const fan = `[data-seat="${action.seat}"] .fan-card`
  if (action.type === 'draw') {
    const grabbed = grabCard(pickedCard(action.source))
    flushSync(apply)
    flyTo(grabbed, lastOf(fan))
    return
  }
  const from = lastOf(fan)?.getBoundingClientRect()
  const cards = placedCards(action)
  flushSync(apply)
  cards.forEach((card, index) => {
    const target = landingFor(action, card)
    flyTo(grabCard(target, from), target, index * FLIGHT_STAGGER_MS)
  })
}


const SORT_MODES: SortMode[] = ['suit', 'rank']

const OVERLAPS: [number, string][] = [
  [12, '-ml-3'],
  [16, '-ml-3.5'],
  [Infinity, '-ml-4'],
]

function overlapFor(melds: Meld[]): string {
  const cards = melds.reduce((total, meld) => total + meld.cards.length, 0)
  return OVERLAPS.find(([limit]) => cards <= limit)![1]
}

function prompt(state: MatchState, t: Messages): string {
  if (state.phase === 'draw') return t.drawPrompt
  return state.laidDown[HUMAN] ? t.addPrompt : t.playPrompt
}

export function Table({ players, seed, level, restored, rules, howTo, onExit }: Props) {
  const t = useMessages()
  const { state, dealing, waiting, summary, revealed, botPick, draw: dealerDraw, legal, act, actAll, next } = useMatch(players, seed, level, restored, rules, botMove)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [staged, setStaged] = useState<Card[][]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [chooser, setChooser] = useState<Chooser | null>(null)
  const [several, setSeveral] = useState(false)
  const [lifted, setLifted] = useState<Source | null>(null)
  const [sortMode, setSortMode] = useState(readSortMode)
  const [scoresOpen, setScoresOpen] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const hints = level === 'easy'
  const names = Array.from({ length: players }, (_, seat) => (seat === HUMAN ? t.you : t.bot(seat)))
  const totals = matchTotals(state)
  const contract = contractFor(state)
  const myTurn = state.status === 'playing' && state.turn === HUMAN && !waiting
  const playing = myTurn && state.phase === 'play'
  const laid = state.laidDown[HUMAN]
  const locked = !laid && !canLayDown(state, HUMAN)
  const hand = state.hands[HUMAN]
  const stagedIds = new Set(staged.flat().map(cardId))
  const visible = hand.filter((card) => !stagedIds.has(cardId(card)))
  const picked = hand.filter((card) => selected.has(cardKey(card)))
  const single = picked.length === 1 ? picked[0] : null
  const hidden = dealerDraw.stage !== 'done' && !prefersReducedMotion()
  const top = hidden ? undefined : state.discard.at(-1)
  const below = hidden ? undefined : state.discard.at(-2)
  const closed = closedDiscard(state)
  const discardLabel = () => {
    if (!top) return t.emptyPile
    return closed ? t.faceDown : cardLabel(top, t.joker)
  }
  const pileLifted = (source: Source) => lifted === source || botPick?.source === source
  const afterReveal = { '--delay': `${players * REVEAL_STEP_MS}ms` } as CSSProperties
  const outLine = () => {
    if (lastResult?.out === undefined || lastResult.out === null) return t.blocked
    return t.wentOut(names[lastResult.out])
  }
  const winners = matchWinners(state)
  const humanWon = winners.includes(HUMAN)
  const lastResult = state.results.at(-1)

  const layDownRefusal = () => {
    if (!playing) return t.drawFirst
    return locked ? t.layDownNextTurn : null
  }

  const reset = () => {
    setSeveral(false)
    setLifted(null)
    setSelected(new Set())
    setNotice(null)
    setChooser(null)
  }

  const perform = (action: Action) => {
    humanMove([action], () => {
      reset()
      act(action)
    })
  }

  const performAll = (actions: Action[]) => {
    humanMove(actions, () => {
      reset()
      actAll(actions)
    })
  }

  const tapCard = (card: Card) => {
    const key = cardKey(card)
    setNotice(null)
    setChooser(null)
    setLifted(null)
    if (several) {
      const nextSelected = new Set(selected)
      if (nextSelected.has(key)) nextSelected.delete(key)
      else nextSelected.add(key)
      setSelected(nextSelected)
      return
    }
    if (selected.has(key) && selected.size === 1) {
      discardCard(card)
      return
    }
    setSelected(new Set([key]))
  }

  const draw = (source: Source) => {
    const action: Action = { type: 'draw', seat: HUMAN, source }
    if (isLegal(state, action)) perform(action)
  }

  const tapPile = (source: Source) => {
    if (lifted === source) {
      draw(source)
      return
    }
    setSelected(new Set())
    setNotice(null)
    setLifted(source)
  }

  const clearOutside = (target: EventTarget) => {
    if (target instanceof Element && target.closest('button')) return
    setSelected(new Set())
    setLifted(null)
    setChooser(null)
  }

  const formGroup = () => {
    if (picked.length < state.rules.trioSize) {
      setNotice(t.groupTooSmall)
      return
    }
    setStaged([...staged, picked])
    setSelected(new Set())
    setNotice(null)
  }

  const suggest = () => {
    const refusal = layDownRefusal()
    if (refusal) {
      setNotice(refusal)
      return
    }
    const option = legal.find((action) => action.type === 'layDown')
    if (option?.type !== 'layDown') {
      setNotice(t.contractFailed)
      return
    }
    setStaged(option.melds.map((meld) => meld.cards))
    reset()
  }

  const solveStaged = (minEscala: number): Action | string => {
    const cards = staged.flat()
    const options = findLayDowns(cards, contract, state.rules, LAY_DOWN_OPTIONS)
      .map((melds): Action => ({ type: 'layDown', seat: HUMAN, melds }))
      .filter((action) => isLegal(state, action))
    const exact = options.find(
      (action) => action.type === 'layDown' && action.melds.flatMap((meld) => meld.cards).length === cards.length,
    )
    if (exact) return exact
    if (options.length > 0) return t.exactSizes(state.rules.trioSize, minEscala)
    return t.notContract(contractLabel(contract, t.words))
  }

  const layDown = () => {
    const refusal = layDownRefusal()
    if (refusal) {
      setNotice(refusal)
      return
    }
    const minEscala = escalaLength(contract, state.rules)
    const plans = staged.map((cards) => arrangeMeld(cards, state.rules, minEscala, contract.mixedSuits))
    const direct: Action = { type: 'layDown', seat: HUMAN, melds: plans.flatMap((plan) => (plan ? [plan] : [])) }
    const solved = plans.some((plan) => plan === null) || !isLegal(state, direct) ? solveStaged(minEscala) : direct
    if (typeof solved === 'string') {
      setNotice(solved)
      return
    }
    setStaged([])
    perform(solved)
  }

  function discardCard(card: Card) {
    if (!playing) {
      setNotice(t.drawFirst)
      return
    }
    const action: Action = { type: 'discard', seat: HUMAN, card }
    if (!isLegal(state, action)) {
      setNotice(t.cantThrowBack)
      return
    }
    setStaged([])
    perform(action)
  }

  const fits = (meld: Meld, card: Card) =>
    meldEnds(meld).filter((end) => isLegal(state, addAction(card, meld.id, end)))

  const fitsAll = (meld: Meld) => {
    if (picked.length === 0) return false
    if (single) return fits(meld, single).length > 0
    return planAdds(state, picked, meld.id) !== null
  }

  const pickMeld = (meld: Meld) => {
    if (picked.length === 0) {
      setNotice(t.pickOneToAdd)
      return
    }
    if (state.laidThisTurn && !state.rules.addSameTurn) {
      setNotice(t.addNextTurn)
      return
    }
    if (!single) {
      const choice = planJokerChoice(state, picked, meld.id)
      if (choice) {
        if (choice.plan.length > 0) performAll(choice.plan)
        else reset()
        setChooser({ meld: meld.id, ends: choice.ends, card: choice.joker })
        return
      }
      const plan = planAdds(state, picked, meld.id)
      if (!plan) {
        setNotice(t.addFailed)
        return
      }
      performAll(plan)
      return
    }
    const ends = fits(meld, single)
    if (ends.length === 0) {
      setNotice(t.addFailed)
      return
    }
    if (ends.length === 1) {
      perform(addAction(single, meld.id, ends[0]))
      return
    }
    setChooser({ meld: meld.id, ends, card: single })
  }

  const building = myTurn && !laid
  const grouping = several && building && picked.length >= state.rules.trioSize
  const pickLabel = () => {
    if (!several) return t.selectSeveral
    return grouping ? t.formGroup : t.done
  }
  const pickSeveral = () => {
    const refusal = several ? null : layDownRefusal()
    if (refusal) {
      setNotice(refusal)
      return
    }
    if (grouping) {
      formGroup()
      return
    }
    setSelected(new Set())
    setSeveral(!several)
  }
  const commands: Command[] = [
    { label: pickLabel(), onClick: pickSeveral, enabled: myTurn },
    ...(hints ? [{ label: t.suggest, onClick: suggest, enabled: building }] : []),
    { label: t.layDown, onClick: layDown, enabled: building && staged.length > 0, primary: true },
  ]

  const status = notice ?? statusLine()
  const canAdd = playing && laid
  const shown = state.status === 'playing' ? [] : revealSeats(state).slice(0, revealed)
  const owners = Array.from({ length: players }, (_, seat) => seat).filter(
    (seat) => state.melds.some((meld) => meld.owner === seat) || shown.includes(seat),
  )
  const canDraw = (source: Source) => myTurn && isLegal(state, { type: 'draw', seat: HUMAN, source })

  function statusLine(): string {
    if (dealerDraw.stage === 'hopping') return t.drawingDealer
    if (dealerDraw.stage === 'announcing') return t.dealerIs(names[state.dealer])
    if (myTurn) return howTo ? prompt(state, t) : ''
    return describe(state.log.at(-1), names, t, closed)
  }

  const bots = names.map((_, seat) => seat).filter((seat) => seat !== HUMAN)

  const badge = (seat: Seat, wide = false) => (
    <PlayerBadge
      wide={wide}
      name={names[seat]}
      cards={state.hands[seat].length}
      total={totals[seat]}
      dealer={state.dealer === seat && dealerDraw.stage !== 'hopping'}
      active={state.status === 'playing' && !waiting && state.turn === seat}
      spotlight={dealerDraw.spotlight === seat}
      laidDown={state.laidDown[seat]}
    />
  )

  return (
    <main
      onClick={(event) => clearOutside(event.target)}
      className="no-scrollbar flex min-h-0 flex-1 flex-col gap-1.5 overflow-x-clip overflow-y-auto overscroll-contain">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setScoresOpen(true)}
          className="min-w-0 flex-1 pixel-box bg-surface px-3 py-1.5 text-left"
        >
          <span className="block font-pixel text-xl leading-none">{t.roundLabel(state.round + 1)}</span>
          <span className="block truncate text-sm text-gold">{contractLabel(contract, t.words)}</span>
        </button>
        {[
          { label: t.scoreTitle, onClick: () => setScoresOpen(true) },
          { label: t.exit, onClick: () => setExitOpen(true) },
        ].map(({ label, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="pixel-button bg-raised px-3 py-1 text-ink"
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ gridTemplateColumns: `repeat(${bots.length}, minmax(0, 1fr))` }} className="grid gap-1">
        {bots.map((seat) => (
          <div key={seat} data-seat={seat} className="flex min-w-0 flex-col gap-1">
            <div className="flex min-w-0">{badge(seat)}</div>
            <BotFan
              key={`${state.round}-${seat}`}
              cards={hidden ? 0 : state.hands[seat].length}
              active={state.status === 'playing' && !waiting && state.turn === seat}
              width={FAN_REM / bots.length}
              dealing={dealing}
            />
          </div>
        ))}
      </div>

      <section
        aria-label={t.tableTitle}
        className="no-scrollbar flex min-h-24 flex-1 basis-0 flex-col gap-1 overflow-y-auto pixel-box bg-surface/60 p-1.5"
      >
        {owners.length === 0 && <p className="m-auto text-sm text-muted">{t.noMelds}</p>}
        {owners.map((owner) => (
          <div key={owner} className="flex items-center gap-1.5">
            <span className="w-8 shrink-0 truncate text-xs leading-none text-muted">{names[owner]}</span>
            <div className="flex min-w-0 flex-wrap gap-x-1.5 gap-y-1">
              {state.melds
                .filter((meld) => meld.owner === owner)
                .map((meld) => (
                  <MeldView
                    key={meld.id}
                    meld={meld}
                    target={hints && canAdd && fitsAll(meld)}
                    ends={chooser?.meld === meld.id ? chooser.ends : null}
                    onPick={canAdd ? () => pickMeld(meld) : null}
                    onEnd={(end) => chooser && perform(addAction(chooser.card, meld.id, end))}
                    overlap={overlapFor(state.melds.filter((item) => item.owner === owner))}
                  />
                ))}
              {shown.includes(owner) && (
                <div role="group" aria-label={t.leftover(names[owner])} className="card-drop flex opacity-50 grayscale">
                  {state.hands[owner].map((card) => (
                    <span key={cardKey(card)} className="-ml-3 first:ml-0">
                      <MiniCard card={card} index />
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          data-source="deck"
          aria-label={`${t.deck}: ${t.deckCount(state.deck.length)}`}
          disabled={!canDraw('deck')}
          onClick={() => tapPile('deck')}
          className={`flex flex-col items-center gap-0.5 ${canDraw('deck') ? 'turn-glow' : ''}`}
        >
          <SlidDeck count={hidden ? 0 : state.deck.length} empty={hidden} lifted={pileLifted('deck')} sliding={dealing} />
          <span className="text-xs text-muted">{t.deckCount(state.deck.length)}</span>
        </button>
        <button
          type="button"
          data-source="discard"
          aria-label={`${t.discardPile}: ${discardLabel()}`}
          disabled={!canDraw('discard')}
          onClick={() => tapPile('discard')}
          className={`flex flex-col items-center gap-0.5 ${canDraw('discard') ? 'turn-glow' : ''}`}
        >
          {top ? (
            <span className="relative block">
              {below && (
                <span aria-hidden="true" className="absolute inset-0 block">
                  <MiniCard card={below} />
                </span>
              )}
              <span
                key={cardKey(top)}
                data-discard-top
                data-lifted={pileLifted('discard') || undefined}
                className={`relative block transition-transform ${dealing ? 'turn-up' : ''} ${pileLifted('discard') ? '-translate-y-2' : ''}`}
              >
                {closed ? <span className="block h-16 w-11 back-pattern card-shadow" /> : <MiniCard card={top} />}
              </span>
            </span>
          ) : (
            <span className={`block h-16 w-11 border-2 border-dashed ${hidden ? 'border-transparent' : 'border-line'}`} />
          )}
          <span className="text-xs text-muted">{t.discardPile}</span>
        </button>
      </div>

      <p
        aria-live="polite"
        className={`flex h-8 shrink-0 items-center justify-center text-center text-sm leading-tight font-medium ${notice ? 'text-rose-600 dark:text-rose-400' : 'text-gold'}`}
      >
        {status}
      </p>

      {!laid && (
      <section
        aria-label={t.staged}
        className="no-scrollbar flex h-12 shrink-0 items-center justify-center gap-2 overflow-x-auto"
      >
        {staged.length === 0 && <span className="text-xs text-muted">{t.staged}</span>}
        {staged.map((cards, index) => (
            <div key={cards.map(cardKey).join()} className="flex items-center gap-1 pixel-box bg-raised p-1">
              <span className="flex">
                {cards.map((card) => (
                  <span key={cardKey(card)} data-staged={cardKey(card)} className="-ml-1 block first:ml-0">
                    <MiniCard card={card} compact />
                  </span>
                ))}
              </span>
              <button
                type="button"
                aria-label={t.removeGroup}
                onClick={() => setStaged(staged.filter((_, other) => other !== index))}
                className="px-1 font-pixel text-xl leading-none text-muted"
              >
                ×
              </button>
            </div>
          ))}
      </section>
      )}

      <div className={`grid shrink-0 gap-1.5 ${hints ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {commands.map(({ label, onClick, enabled, primary }) => (
          <button
            key={label}
            type="button"
            disabled={!enabled}
            onClick={onClick}
            className={`pixel-box py-2 text-sm leading-tight font-medium disabled:opacity-40 ${
              primary && enabled ? 'bg-accent text-on-accent' : 'bg-raised'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div data-seat={HUMAN} className="flex shrink-0 items-center justify-between gap-2">
        {badge(HUMAN, true)}
        <div role="group" aria-label={t.sortLabel} className="flex gap-0.5 pixel-box bg-raised p-0.5">
          {SORT_MODES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={sortMode === option}
              onClick={() => {
                localStorage.setItem(sortModeKey, option)
                setSortMode(option)
              }}
              className={`pixel-box px-2 py-1 text-xs font-medium ${
                sortMode === option ? 'bg-accent text-on-accent' : 'text-muted'
              }`}
            >
              {option === 'rank' ? t.sortByRank : t.sortBySuit}
            </button>
          ))}
        </div>
      </div>

      <Hand
        key={`${state.round}-${sortMode}`}
        mode={sortMode}
        hand={hidden ? [] : visible}
        selected={selected}
        selectable={myTurn}
        dealing={dealing}
        onTap={tapCard}
      />

      {dealing && <DealAnimation players={players} dealer={state.dealer} />}

      {exitOpen && (
        <Overlay title={t.exitTitle} onClose={() => setExitOpen(false)}>
          <p className="font-pixel text-xl leading-tight text-muted">{t.exitBody}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setExitOpen(false)}
              className="pixel-button bg-raised py-2.5 text-ink"
            >
              {t.keepPlaying}
            </button>
            <button
              type="button"
              onClick={() => {
                saveAbandoned(state, seed, level)
                clearSavedMatch()
                onExit()
              }}
              className="pixel-button bg-rose-700 py-2.5 text-white"
            >
              {t.exitConfirm}
            </button>
          </div>
        </Overlay>
      )}

      {scoresOpen && (
        <Overlay title={t.scoreTitle} onClose={() => setScoresOpen(false)}>
          <ScoreTable
            names={names}
            results={state.results}
            live={state.status === 'playing' ? liveResult(state) : undefined}
          />
          <p className="text-xs text-muted">{t.lowerWins}</p>
          {state.status === 'playing' && <p className="text-xs text-muted">{t.liveScore}</p>}
          <button
            type="button"
            onClick={() => setScoresOpen(false)}
            className="pixel-box bg-raised py-2 font-medium"
          >
            {t.close}
          </button>
        </Overlay>
      )}

      {summary && state.status === 'roundOver' && (
        <Overlay title={t.roundFinished(state.round + 1)}>
          <p className="font-pixel text-xl leading-tight text-gold">
            {outLine()}
          </p>
          {lastResult && <RoundSummary names={names} state={state} result={lastResult} />}
          <div style={afterReveal} className="reveal-in flex flex-col gap-3">
            <ScoreTable names={names} results={state.results} />
          </div>
          <button
            type="button"
            onClick={() => {
              reset()
              setStaged([])
              next()
            }}
            className="w-full pixel-box bg-accent py-2 font-medium text-on-accent"
          >
            {t.nextRound}
          </button>
        </Overlay>
      )}

      {summary && state.status === 'matchOver' && <ResultEffect won={humanWon} />}

      {summary && state.status === 'matchOver' && (
        <Overlay title={t.matchFinished}>
          <p
            className={`text-center font-pixel text-3xl leading-none text-gold ${
              humanWon ? 'result-win' : 'result-lose'
            }`}
          >
            {winners.length > 1
              ? t.tie(winners.map((seat) => names[seat]).join(', '))
              : t.winner(names[winners[0]], totals[winners[0]])}
          </p>
          <ScoreTable names={names} results={state.results} />
          <button
            type="button"
            onClick={onExit}
            className="pixel-box bg-accent py-2 font-medium text-on-accent"
          >
            {t.backHome}
          </button>
        </Overlay>
      )}
    </main>
  )
}
