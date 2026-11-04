import type { CSSProperties } from 'react'
import type { Card } from '@carioca/engine'
import { SUIT_ON_CARD, rankLabel } from '../lib/cards'
import { JokerIcon, SuitIcon } from './SuitIcon'

interface Props {
  card: Card
  tilt: number
  lift: number
  front?: boolean
}

function Corner({ card, flipped }: { card: Card; flipped: boolean }) {
  const place = flipped ? 'right-3 bottom-2 rotate-180' : 'top-2 left-3'
  return (
    <span className={`absolute ${place} flex flex-col items-center gap-0.5`}>
      {card.kind === 'joker' ? (
        <JokerIcon className="size-5" />
      ) : (
        <>
          <span className="text-3xl leading-none">{rankLabel(card.rank)}</span>
          <SuitIcon suit={card.suit} className="size-3.5" />
        </>
      )}
    </span>
  )
}

export function PlayingCard({ card, tilt, lift, front = false }: Props) {
  const style = { '--tilt': `${tilt}deg`, '--lift': `${lift}px` } as CSSProperties
  const tone = card.kind === 'joker' ? 'text-gold' : SUIT_ON_CARD[card.suit]

  return (
    <div style={style} className={`playing-card relative -mx-1 ${front ? 'z-10' : ''}`}>
      <div className={`card-face hero-card relative h-36 w-24 border-4 border-card-ink font-pixel sm:h-44 sm:w-30 ${tone}`}>
        <span className="absolute inset-1.5 border-2 border-gold/50" />
        {[false, true].map((flipped) => (
          <Corner key={String(flipped)} card={card} flipped={flipped} />
        ))}
        <span className="absolute inset-0 flex items-center justify-center">
          {card.kind === 'joker' ? (
            <JokerIcon className="size-12 sm:size-14" />
          ) : (
            <SuitIcon suit={card.suit} className="size-9 sm:size-12" />
          )}
        </span>
      </div>
    </div>
  )
}
