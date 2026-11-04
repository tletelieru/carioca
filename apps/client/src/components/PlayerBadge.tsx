import { useMessages } from '../i18n/messages'

interface Props {
  name: string
  cards: number
  total: number
  dealer: boolean
  active: boolean
  laidDown: boolean
  spotlight?: boolean
  wide?: boolean
}

function edge(active: boolean, spotlight: boolean): string {
  if (spotlight) return 'dealer-spotlight border-gold'
  if (active) return 'turn-glow border-gold'
  return 'border-transparent'
}

export function PlayerBadge({ name, cards, total, dealer, active, laidDown, spotlight = false, wide = false }: Props) {
  const t = useMessages()

  return (
    <div
      aria-current={active ? 'true' : undefined}
      className={`relative flex min-w-0 items-center whitespace-nowrap pixel-box border-2 bg-surface text-xs leading-tight ${
        wide ? 'gap-2 px-1.5 py-0.5' : 'flex-1 flex-col px-1 py-0.5'
      } ${edge(active, spotlight)}`}
    >
      <span className="flex items-center gap-1 font-pixel text-lg leading-none">
        {name}
        {dealer && (
          <span title={t.dealer} className="text-gold">
            ●
          </span>
        )}
      </span>
      {wide ? (
        <span title={t.cardsLeft(cards)} className="flex items-center gap-1 text-muted">
          <span aria-hidden="true" className="inline-block h-2.5 w-2 back-pattern" />
          <span className="sr-only">{t.cardsLeft(cards)}</span>
          <span aria-hidden="true">{cards}</span>
        </span>
      ) : (
        <span className="text-muted">{t.cardsLeft(cards)}</span>
      )}
      <span className="flex items-center gap-1">
        <span key={total} className="score-pop inline-block tabular-nums">
          {total}
        </span>
        {laidDown && <span className="bg-accent px-1 text-on-accent">{t.laidDown}</span>}
      </span>
    </div>
  )
}
