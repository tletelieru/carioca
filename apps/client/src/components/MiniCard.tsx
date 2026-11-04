import type { Card } from '@carioca/engine'
import { SUIT_ON_CARD, rankLabel } from '../lib/cards'
import { PixelIcon } from './PixelIcon'
import { JokerIcon, SuitIcon } from './SuitIcon'

interface Props {
  card: Card
  highlight?: boolean
  compact?: boolean
  index?: boolean
}

const CROWN = ['#..#..#', '#.###.#', '#######', '#######']

const JACK = 11

function CompactFace({ card, edge }: { card: Card; edge: string }) {
  const base = `card-face flex h-11 w-7 flex-col items-center justify-center gap-0.5 border-2 font-pixel text-lg leading-none ${edge}`
  if (card.kind === 'joker') {
    return (
      <span className={`${base} text-gold`}>
        <JokerIcon className="size-4" />
      </span>
    )
  }
  return (
    <span className={`${base} ${SUIT_ON_CARD[card.suit]}`}>
      {rankLabel(card.rank)}
      <SuitIcon suit={card.suit} className="size-3.5" />
    </span>
  )
}

function IndexFace({ card, edge }: { card: Card; edge: string }) {
  const base = `card-face flex h-10 w-7 flex-col items-start gap-0.5 border-2 pt-0.5 pl-px font-pixel text-sm leading-none tracking-[-0.08em] ${edge}`
  if (card.kind === 'joker') {
    return (
      <span className={`${base} text-gold`}>
        <JokerIcon className="size-3" />
      </span>
    )
  }
  return (
    <span className={`${base} ${SUIT_ON_CARD[card.suit]}`}>
      {rankLabel(card.rank)}
      <SuitIcon suit={card.suit} className="size-2.5" />
    </span>
  )
}

function FullFace({ card, edge }: { card: Card; edge: string }) {
  if (card.kind === 'joker') {
    return (
      <span className={`card-face relative block h-16 w-11 border-2 font-pixel leading-none text-gold ${edge}`}>
        <span className="absolute inset-1 border border-gold/70 bg-gold/15" />
        <span className="absolute inset-0 flex items-center justify-center">
          <JokerIcon className="size-7" />
        </span>
      </span>
    )
  }
  const label = rankLabel(card.rank)
  const isFace = card.rank >= JACK
  return (
    <span className={`card-face relative block h-16 w-11 border-2 font-pixel leading-none ${edge} ${SUIT_ON_CARD[card.suit]}`}>
      {isFace && <span className="absolute inset-1 border border-gold/70 bg-gold/15" />}
      <span className="absolute top-0.5 left-1 text-lg leading-none">{label}</span>
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pt-1">
        {isFace && card.rank !== JACK && <PixelIcon rows={CROWN} className="h-2 w-3.5 text-gold" />}
        <SuitIcon suit={card.suit} className={card.rank === 1 ? 'size-8' : 'size-6'} />
      </span>
      <span className="absolute right-1 bottom-0.5 rotate-180 text-lg leading-none">{label}</span>
    </span>
  )
}

function Face({ card, edge, compact, index }: { card: Card; edge: string; compact: boolean; index: boolean }) {
  if (index) return <IndexFace card={card} edge={edge} />
  if (compact) return <CompactFace card={card} edge={edge} />
  return <FullFace card={card} edge={edge} />
}

export function MiniCard({ card, highlight = false, compact = false, index = false }: Props) {
  const edge = highlight ? 'border-gold' : 'border-card-ink'
  return (
    <span className="card-shadow block">
      <Face card={card} edge={edge} compact={compact} index={index} />
    </span>
  )
}
