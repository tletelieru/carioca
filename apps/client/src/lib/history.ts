import type { Level } from '@carioca/bots'
import type { PlayerCount, RoundResult, Seat } from '@carioca/engine'

export interface MatchRecord {
  id: number
  finishedAt: number
  players: PlayerCount
  level: Level
  results: RoundResult[]
  totals: number[]
  winners: Seat[]
  abandoned?: boolean
}

export const historyKey = 'match-history'

const MAX_RECORDS = 50

export function readHistory(): MatchRecord[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(historyKey) ?? '[]')
    return Array.isArray(saved) ? (saved as MatchRecord[]) : []
  } catch {
    return []
  }
}

export function saveRecord(record: MatchRecord): void {
  const history = readHistory()
  if (history.some((item) => item.id === record.id)) return
  localStorage.setItem(historyKey, JSON.stringify([record, ...history].slice(0, MAX_RECORDS)))
}
