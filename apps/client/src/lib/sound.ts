import { createContext } from 'react'
import { ROUNDS, isRealEscala } from '@carioca/engine'
import type { Action, MatchState } from '@carioca/engine'
import type { Effect, Music, TrackId } from './music'

export const SoundContext = createContext<Music | null>(null)

export const MusicContext = createContext<Music | null>(null)

export const ROUND_TRACKS: TrackId[] = ROUNDS.map((contract) => (isRealEscala(contract) ? 'royal' : 'round'))

export const ACTION_SOUNDS: Record<Action['type'], Effect | null> = {
  draw: null,
  layDown: 'meld',
  add: 'card',
  discard: 'card',
}

export const ROUND_SOUNDS: Record<'better' | 'worse', boolean> = {
  better: true,
  worse: false,
}

export function roundOutcome(points: number[], seat: number): 'better' | 'worse' {
  const rivals = points.filter((_, other) => other !== seat)
  return points[seat] <= Math.min(...rivals) ? 'better' : 'worse'
}

export const REVEAL_SOUNDS: Record<'group', Effect> = {
  group: 'tick',
}

export const DEALER_DRAW_SOUNDS: Record<'hop' | 'stop', Effect> = {
  hop: 'tick',
  stop: 'chime',
}

export function trackForRound(round: number): TrackId {
  return ROUND_TRACKS[round] ?? 'round'
}

export function trackForMatch(state: MatchState | null): TrackId {
  return state ? trackForRound(state.round) : 'intro'
}
