import type { Level } from '@carioca/bots'

export const levelKey = 'bot-level'

export function readLevel(): Level {
  const saved = localStorage.getItem(levelKey)
  if (saved === 'easy' || saved === 'hard') return saved
  return 'medium'
}

export const fourColorsKey = 'four-colors'

export function readFourColors(): boolean {
  return localStorage.getItem(fourColorsKey) === 'on'
}

export const sortModeKey = 'sort-mode'

export type SortMode = 'rank' | 'suit'

export function readSortMode(): SortMode {
  return localStorage.getItem(sortModeKey) === 'rank' ? 'rank' : 'suit'
}

export const plainFontKey = 'plain-font'

export function readPlainFont(): boolean {
  return localStorage.getItem(plainFontKey) === 'on'
}

export const reduceMotionKey = 'reduce-motion'

export function readReduceMotion(): boolean {
  return localStorage.getItem(reduceMotionKey) === 'on'
}

export const musicKey = 'music'

export function readMusic(): boolean {
  return localStorage.getItem(musicKey) !== 'off'
}

export const howToKey = 'how-to'

export function readHowTo(saved: string | null, level: Level): boolean {
  if (saved === 'on' || saved === 'off') return saved === 'on'
  return level === 'easy'
}
