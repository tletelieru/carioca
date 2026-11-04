import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import type { Card } from '@carioca/engine'
import { useMessages } from '../i18n/messages'
import { cardKey, cardLabel, moveItem, sortHand } from '../lib/cards'
import type { SortMode } from '../lib/settings'
import { MiniCard } from './MiniCard'

interface Props {
  mode: SortMode
  hand: Card[]
  selected: Set<string>
  selectable: boolean
  dealing: boolean
  onTap: (card: Card) => void
}

interface Drag {
  key: string
  element: HTMLButtonElement
  startX: number
  startY: number
  grabX: number
  grabY: number
  x: number
  y: number
  moved: boolean
}

const DRAG_THRESHOLD = 6
const CARD_REM = 4
const SLOT_REM = 3
const GAP_REM = 0.25
const RESERVED_CARDS = 14

function isReducedMotion(): boolean {
  return document.documentElement.classList.contains('reduce-motion')
}

function arrange(order: string[], hand: Card[]): Card[] {
  return order.flatMap((key) => hand.filter((card) => cardKey(card) === key))
}

function withArrivals(order: string[], hand: Card[], mode: SortMode): string[] {
  const arrived = hand.filter((card) => !order.includes(cardKey(card)))
  if (arrived.length === 0) return order
  const placed = order.length === 0 ? sortHand(arrived, mode) : arrived
  return [...order, ...placed.map(cardKey)]
}

export function Hand({ mode, hand, selected, selectable, dealing, onTap }: Props) {
  const t = useMessages()
  const [order, setOrder] = useState(() => sortHand(hand, mode).map(cardKey))
  const [dragging, setDragging] = useState<string | null>(null)
  const grid = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const dragged = useRef(false)
  const slots = useRef(new Map<string, { left: number; top: number }>())
  const arranged = withArrivals(order, hand, mode)
  if (arranged !== order) setOrder(arranged)
  const cards = arrange(arranged, hand)
  const keys = cards.map(cardKey)
  const signature = keys.join(',')

  const place = useCallback(() => {
    const current = drag.current
    const box = grid.current?.getBoundingClientRect()
    if (!current?.moved || !box) return
    const x = current.x - current.grabX - box.left - current.element.offsetLeft
    const y = current.y - current.grabY - box.top - current.element.offsetTop
    current.element.style.translate = `${x}px ${y}px`
  }, [])

  // eslint-disable-next-line local/no-effect -- reserves the hand height from the measured width and on window resize
  useLayoutEffect(() => {
    const reserve = () => {
      const element = grid.current
      if (!element) return
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
      const perRow = Math.max(1, Math.floor((element.clientWidth + GAP_REM * rem) / (SLOT_REM * rem)))
      const rows = Math.ceil(RESERVED_CARDS / perRow)
      element.style.minHeight = `${rows * CARD_REM + (rows - 1) * GAP_REM}rem`
    }
    reserve()
    window.addEventListener('resize', reserve)
    return () => window.removeEventListener('resize', reserve)
  })

  // eslint-disable-next-line local/no-effect -- animates cards from their previous DOM positions after a reorder (FLIP)
  useLayoutEffect(() => {
    place()
    const buttons = grid.current?.querySelectorAll<HTMLButtonElement>('[data-card]') ?? []
    const next = new Map<string, { left: number; top: number }>()
    buttons.forEach((button) => {
      const key = button.dataset.card!
      const slot = { left: button.offsetLeft, top: button.offsetTop }
      const previous = slots.current.get(key)
      next.set(key, slot)
      if (!previous || key === drag.current?.key) return
      const x = previous.left - slot.left
      const y = previous.top - slot.top
      if ((x === 0 && y === 0) || isReducedMotion()) return
      button.animate?.([{ translate: `${x}px ${y}px` }, { translate: '0 0' }], {
        duration: 160,
        easing: 'ease-out',
      })
    })
    slots.current = next
  }, [signature, place])

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>, key: string) => {
    const element = event.currentTarget
    const rect = element.getBoundingClientRect()
    element.setPointerCapture?.(event.pointerId)
    dragged.current = false
    drag.current = {
      key,
      element,
      startX: event.clientX,
      startY: event.clientY,
      grabX: event.clientX - rect.left,
      grabY: event.clientY - rect.top,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current
    if (!current) return
    current.x = event.clientX
    current.y = event.clientY
    if (!current.moved) {
      const distance = Math.hypot(event.clientX - current.startX, event.clientY - current.startY)
      if (distance < DRAG_THRESHOLD) return
      current.moved = true
      setDragging(current.key)
    }
    place()
    const box = grid.current?.getBoundingClientRect()
    if (!box) return
    const x = event.clientX - box.left
    const y = event.clientY - box.top
    const from = keys.indexOf(current.key)
    const buttons = grid.current?.querySelectorAll<HTMLButtonElement>('[data-card]') ?? []
    for (const [to, button] of [...buttons].entries()) {
      const key = button.dataset.card!
      if (key === current.key) continue
      const { offsetLeft: left, offsetTop: top, offsetWidth: width, offsetHeight: height } = button
      const inside = x >= left && x <= left + width && y >= top && y <= top + height
      if (!inside) continue
      const sameRow = top === current.element.offsetTop
      const center = left + width / 2
      const crossed = !sameRow || (to > from ? x >= center : x <= center)
      if (crossed) {
        setOrder(() => moveItem(keys, keys.indexOf(current.key), keys.indexOf(key)))
      }
      break
    }
  }

  const onPointerEnd = () => {
    const current = drag.current
    drag.current = null
    if (!current?.moved) return
    dragged.current = true
    const landing = current.element.style.translate
    current.element.style.translate = ''
    if (!isReducedMotion()) {
      current.element.animate?.([{ translate: landing }, { translate: '0 0' }], {
        duration: 140,
        easing: 'ease-out',
      })
    }
    setDragging(null)
  }

  return (
    <section aria-label={t.yourHand} className="flex w-full shrink-0 flex-col items-center">
      <div ref={grid} className="relative flex w-full flex-wrap content-start justify-center gap-1">
        {cards.map((card, index) => {
          const key = cardKey(card)
          const picked = selected.has(key)
          const stagger = { '--delay': `${index * 30}ms` } as CSSProperties
          return (
            <button
              key={key}
              type="button"
              data-card={key}
              style={stagger}
              aria-pressed={picked}
              aria-disabled={!selectable}
              aria-label={cardLabel(card, t.joker)}
              onPointerDown={(event) => onPointerDown(event, key)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerEnd}
              onClick={() => {
                if (dragged.current) {
                  dragged.current = false
                  return
                }
                if (selectable) onTap(card)
              }}
              className={`hand-card ${picked ? 'is-picked' : ''} ${dragging === key ? 'is-dragging' : ''}`}
            >
              <span className={`block ${dealing ? 'deal-in' : ''}`}>
                <MiniCard card={card} highlight={picked} />
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
