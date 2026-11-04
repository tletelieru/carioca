import type { CSSProperties } from 'react'

interface Props {
  count: number
  lifted: boolean
  sliding: boolean
  empty?: boolean
}

const CARDS_PER_BACK = 4

const MAX_BACKS = 14

const AREA_REM = 9.5

const CARD_REM = 2.75

const MAX_STEP_REM = 0.5

const LIFT_REM = 0.5

const TILTS = [-1.5, 0.5, 1.5, -0.5]

export function SlidDeck({ count, lifted, sliding, empty = false }: Props) {
  const backs = Math.min(MAX_BACKS, Math.ceil(count / CARDS_PER_BACK))
  const step = backs > 1 ? Math.min(MAX_STEP_REM, (AREA_REM - CARD_REM) / (backs - 1)) : 0

  return (
    <span
      aria-hidden="true"
      className={`relative block h-16 ${sliding ? 'deck-slide' : ''}`}
      style={{ width: `${AREA_REM}rem` }}
    >
      {backs === 0 && !empty && <span className="absolute top-0 left-0 block h-16 w-11 border-2 border-dashed border-line" />}
      {Array.from({ length: backs }, (_, index) => {
        const top = index === backs - 1 && lifted
        const style = {
          left: `${index * step}rem`,
          top: top ? `-${LIFT_REM}rem` : 0,
          '--tilt': `${TILTS[index % TILTS.length]}deg`,
        } as CSSProperties
        return <span key={index} data-lifted={top || undefined} style={style} className="slid-card back-pattern card-shadow" />
      })}
    </span>
  )
}
