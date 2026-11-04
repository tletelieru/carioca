import type { End, Meld } from '@carioca/engine'
import { useMessages } from '../i18n/messages'
import { cardKey, cardLabel } from '../lib/cards'
import { MiniCard } from './MiniCard'

interface Props {
  meld: Meld
  target: boolean
  ends: End[] | null
  onPick: (() => void) | null
  onEnd: (end: End) => void
  overlap: string
}

export function MeldView({ meld, target, ends, onPick, onEnd, overlap }: Props) {
  const t = useMessages()
  const kind = meld.kind === 'trio' ? t.trio : t.escala
  const label = `${kind}: ${meld.cards.map((card) => cardLabel(card, t.joker)).join(', ')}`
  const cards = (
    <span className="flex">
      {meld.cards.map((card) => (
        <span key={cardKey(card)} className={`${overlap} first:ml-0`}>
          <span data-meld-card={cardKey(card)} className="block">
            <MiniCard card={card} index />
          </span>
        </span>
      ))}
    </span>
  )

  return (
    <div className="relative">
      {onPick ? (
        <button
          type="button"
          aria-label={label}
          onClick={onPick}
          className={`pixel-box bg-raised/60 p-0.5 ${target ? 'meld-target' : ''}`}
        >
          {cards}
        </button>
      ) : (
        <div role="group" aria-label={label} className="pixel-box bg-raised/60 p-0.5">
          {cards}
        </div>
      )}
      {ends && (
        <div className="absolute inset-x-0 -bottom-1 z-10 flex translate-y-full justify-center gap-1">
          {ends.map((end) => (
            <button
              key={end}
              type="button"
              onClick={() => onEnd(end)}
              className="pixel-box bg-accent px-2 py-1 text-xs font-medium text-on-accent"
            >
              {end === 'low' ? t.addLow : t.addHigh}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
