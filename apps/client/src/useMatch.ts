import { useContext, useEffect, useEffectEvent, useState } from 'react'
import { BOTS, createRng } from '@carioca/bots'
import type { Level } from '@carioca/bots'
import {
  applyAction,
  createMatch,
  legalActions,
  matchTotals,
  matchWinners,
  startNextRound,
  viewFor,
} from '@carioca/engine'
import type { Action, MatchState, PlayerCount, RulesConfig, Seat, Source } from '@carioca/engine'
import type { BotReply, BotRequest } from './botWorker'
import { saveRecord } from './lib/history'
import { clearSavedMatch, writeSavedMatch } from './lib/savedMatch'
import { ACTION_SOUNDS, MusicContext, REVEAL_SOUNDS, ROUND_SOUNDS, SoundContext, roundOutcome, trackForRound } from './lib/sound'
import { prefersReducedMotion, useDealerDraw } from './useDealerDraw'

export const HUMAN = 0

let worker: Worker | null = null
let requestId = 0

function botWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  worker ??= new Worker(new URL('./botWorker.ts', import.meta.url), { type: 'module' })
  return worker
}

const DRAW_DELAY = 550

const PLAY_DELAY = 450

export const BOT_PICK_MS = 450

export const DEAL_HOLD = 1500

export const OUT_HOLD = 700

export const REVEAL_GROUP_MS = 350

export function revealSeats(state: MatchState): Seat[] {
  const out = state.results.at(-1)?.out ?? state.turn
  return Array.from({ length: state.players }, (_, offset) => (out + 1 + offset) % state.players).filter(
    (seat) => state.hands[seat].length > 0,
  )
}

function roundWon(ended: MatchState): boolean {
  if (ended.status === 'matchOver') return matchWinners(ended).includes(HUMAN)
  return ROUND_SOUNDS[roundOutcome(ended.results.at(-1)!.points, HUMAN)]
}

function isFresh(state: MatchState): boolean {
  return state.status === 'playing' && state.log.length === 0
}

function delayFor(state: MatchState): number {
  return state.phase === 'draw' ? DRAW_DELAY : PLAY_DELAY
}

export function useMatch(
  players: PlayerCount,
  seed: number,
  level: Level,
  restored: MatchState | null,
  rules?: Partial<RulesConfig>,
  onBotMove?: (action: Action, apply: () => void) => void,
) {
  const [state, setState] = useState(() => restored ?? createMatch({ players, rules }, seed))
  const [rng] = useState(() => createRng(seed))
  const [heldRound, setHeldRound] = useState<number | null>(null)
  const [botPick, setBotPick] = useState<{ seat: Seat; source: Source } | null>(null)
  const sound = useContext(SoundContext)
  const music = useContext(MusicContext)
  const draw = useDealerDraw(players, state.dealer, restored === null)
  const drawing = draw.stage !== 'done'
  const dealing = !drawing && isFresh(state) && heldRound !== state.round
  const waiting = drawing || dealing
  const [shownRound, setShownRound] = useState<number | null>(restored && restored.status !== 'playing' ? restored.round : null)
  const summary = state.status !== 'playing' && shownRound === state.round

  const [revealed, setRevealed] = useState(0)

  // eslint-disable-next-line local/no-effect -- runs the going-out reveal with timers and plays its sounds as each group appears
  useEffect(() => {
    if (state.status === 'playing' || shownRound === state.round) return
    const timers: ReturnType<typeof setTimeout>[] = []
    const open = () => {
      setShownRound(state.round)
      sound?.jingle(roundWon(state))
    }
    if (prefersReducedMotion()) {
      timers.push(setTimeout(open, 0))
      return () => timers.forEach(clearTimeout)
    }
    const seats = revealSeats(state)
    seats.forEach((_, index) => {
      timers.push(
        setTimeout(() => {
          sound?.effect(REVEAL_SOUNDS.group)
          setRevealed(index + 1)
        }, OUT_HOLD + index * REVEAL_GROUP_MS),
      )
    })
    timers.push(setTimeout(open, OUT_HOLD + seats.length * REVEAL_GROUP_MS))
    return () => timers.forEach(clearTimeout)
  }, [state, shownRound, sound])

  function finish(final: MatchState) {
    saveRecord({
      id: seed,
      finishedAt: Date.now(),
      players,
      level,
      results: final.results,
      totals: matchTotals(final),
      winners: matchWinners(final),
    })
  }

  function actAll(actions: Action[]) {
    const next = actions.reduce(applyAction, state)
    const effect = ACTION_SOUNDS[actions[0].type]
    if (effect) sound?.effect(effect)
    if (next.status === 'matchOver') finish(next)
    if (next.status !== 'playing') setRevealed(0)
    setState(next)
  }

  function act(action: Action) {
    actAll([action])
  }

  const actFromBot = useEffectEvent((action: Action) => {
    const apply = () => {
      setBotPick(null)
      act(action)
    }
    if (onBotMove) onBotMove(action, apply)
    else apply()
  })

  // eslint-disable-next-line local/no-effect -- persists the match in progress to localStorage
  useEffect(() => {
    if (state.status === 'matchOver') clearSavedMatch()
    else writeSavedMatch({ state, seed, level })
  }, [state, seed, level])

  // eslint-disable-next-line local/no-effect -- runs bot turns with timers and the bot Web Worker
  useEffect(() => {
    if (drawing) return
    if (dealing) {
      const timer = setTimeout(() => setHeldRound(state.round), DEAL_HOLD)
      return () => clearTimeout(timer)
    }
    const seat = state.turn
    if (state.status !== 'playing' || seat === HUMAN) return
    const delay = delayFor(state)
    const view = viewFor(state, seat)
    const actions = legalActions(state, seat)
    let pickTimer: ReturnType<typeof setTimeout> | undefined
    const perform = (action: Action) => {
      if (action.type !== 'draw') return actFromBot(action)
      setBotPick({ seat, source: action.source })
      pickTimer = setTimeout(() => actFromBot(action), BOT_PICK_MS)
    }
    const worker = botWorker()
    if (!worker) {
      const timer = setTimeout(() => perform(BOTS[level].choose(view, actions, rng)), delay)
      return () => {
        clearTimeout(timer)
        clearTimeout(pickTimer)
      }
    }
    const id = (requestId += 1)
    let delayed = false
    let reply: Action | null = null
    const commit = () => {
      if (delayed && reply) perform(reply)
    }
    const timer = setTimeout(() => {
      delayed = true
      commit()
    }, delay)
    worker.onmessage = (event: MessageEvent<BotReply>) => {
      if (event.data.id !== id) return
      reply = event.data.action
      commit()
    }
    const botSeed = Math.floor(rng() * 2 ** 31)
    worker.postMessage({ id, level, view, legal: actions, seed: botSeed } satisfies BotRequest)
    return () => {
      clearTimeout(timer)
      clearTimeout(pickTimer)
      worker.onmessage = null
    }
  }, [state, drawing, dealing, rng, level])

  const legal: Action[] = waiting ? [] : legalActions(state, HUMAN)

  return {
    state,
    dealing,
    waiting,
    summary,
    revealed,
    botPick,
    draw,
    legal,
    act,
    actAll,
    next: () => {
      const round = startNextRound(state)
      music?.setTrack(trackForRound(round.round))
      setState(round)
    },
  }
}
