const CARD_LONG = 1.875
const CARD_SHORT = 1.25
const MAX_SPACING = 0.5

interface Props {
  cards: number
  active: boolean
  width: number
  dealing: boolean
}

export function BotFan({ cards, active, width, dealing }: Props) {
  const room = width - CARD_SHORT
  const spacing = Math.min(cards > 1 ? room / (cards - 1) : 0, MAX_SPACING)
  const overlap = `${spacing - CARD_SHORT}rem`

  return (
    <div aria-hidden="true" className={`flex h-8 shrink-0 items-center justify-center ${dealing ? 'fan-in' : ''}`}>
      <div className={`flex items-center justify-center ${active ? 'fan-active' : ''}`}>
        {Array.from({ length: cards }, (_, index) => (
          <span
            key={index}
            style={{
              width: `${CARD_SHORT}rem`,
              height: `${CARD_LONG}rem`,
              ...(index > 0 && { marginLeft: overlap }),
            }}
            className="fan-card back-pattern"
          />
        ))}
      </div>
    </div>
  )
}
