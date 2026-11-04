import type { Level } from '@carioca/bots'
import type { MatchState } from '@carioca/engine'

export interface SavedMatch {
  state: MatchState
  seed: number
  level: Level
}

export const savedMatchKey = 'saved-match'

export function readSavedMatch(): SavedMatch | null {
  try {
    const saved = JSON.parse(localStorage.getItem(savedMatchKey) ?? 'null') as SavedMatch | null
    return saved?.state?.hands && saved.state.rules ? saved : null
  } catch {
    return null
  }
}

export function writeSavedMatch(match: SavedMatch): void {
  localStorage.setItem(savedMatchKey, JSON.stringify(match))
}

export function clearSavedMatch(): void {
  localStorage.removeItem(savedMatchKey)
}
