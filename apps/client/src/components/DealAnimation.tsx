import type { CSSProperties } from 'react'
import type { PlayerCount } from '@carioca/engine'
import { HUMAN } from '../useMatch'

const FLIGHTS_PER_SEAT = 5

const SPREAD = 300

const TOP = -280

const BOTTOM = 280

function vector(seat: number, players: PlayerCount): { x: number; y: number } {
  if (seat === HUMAN) return { x: 0, y: BOTTOM }
  const bots = players - 1
  return { x: (seat / (bots + 1) - 0.5) * SPREAD, y: TOP }
}

export function DealAnimation({ players, dealer }: { players: PlayerCount; dealer: number }) {
  const seats = Array.from({ length: players }, (_, offset) => (dealer + 1 + offset) % players)

  return (
    <div aria-hidden="true" className="pointer-events-none fixed top-1/2 left-1/2 z-10">
      {Array.from({ length: FLIGHTS_PER_SEAT }, (_, round) =>
        seats.map((seat, index) => {
          const { x, y } = vector(seat, players)
          const style = {
            '--to-x': `${x}px`,
            '--to-y': `${y}px`,
            '--delay': `${(round * players + index) * 50}ms`,
          } as CSSProperties
          return <span key={`${round}-${seat}`} style={style} className="deal-flight card-back" />
        }),
      )}
    </div>
  )
}
