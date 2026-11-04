import type { CSSProperties } from 'react'
import type { Card, MatchState, RoundResult } from '@carioca/engine'
import { useMessages } from '../i18n/messages'
import type { Messages } from '../i18n/messages'
import { cardKey } from '../lib/cards'
import { MiniCard } from './MiniCard'

interface Props {
  names: string[]
  state: MatchState
  result: RoundResult
}

export const REVEAL_STEP_MS = 350

function breakdown(state: MatchState, result: RoundResult, seat: number, t: Messages): string {
  if (result.out === seat) return t.summaryOut
  const left = state.hands[seat].length
  return state.laidDown[seat] ? t.summaryDown(left) : t.summaryUp(left)
}

function CardRow({ cards, faded }: { cards: Card[]; faded: boolean }) {
  return (
    <span className={`flex ${faded ? 'opacity-50 grayscale' : ''}`}>
      {cards.map((card) => (
        <span key={cardKey(card)} className="-ml-3 first:ml-0">
          <MiniCard card={card} compact />
        </span>
      ))}
    </span>
  )
}

export function RoundSummary({ names, state, result }: Props) {
  const t = useMessages()

  return (
    <ol className="flex flex-col gap-1.5">
      {names.map((name, seat) => {
        const style = { '--delay': `${seat * REVEAL_STEP_MS}ms` } as CSSProperties
        const melds = state.melds.filter((meld) => meld.owner === seat)
        const better = result.points[seat] === Math.min(...result.points)
        return (
          <li key={name} style={style} className="reveal-in flex flex-col gap-1 pixel-box bg-raised px-2 py-1.5">
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-pixel text-xl leading-none">{name}</span>
              <span
                className={`pixel-box px-2 font-pixel text-xl leading-tight tabular-nums ${
                  better ? 'bg-emerald-500/20' : 'bg-rose-500/15'
                }`}
              >
                {result.points[seat]}
              </span>
            </span>
            <span className="text-xs text-muted">{breakdown(state, result, seat, t)}</span>
            <span className="no-scrollbar flex flex-wrap gap-x-2 gap-y-1 overflow-x-auto">
              {melds.map((meld) => (
                <CardRow key={meld.id} cards={meld.cards} faded={false} />
              ))}
              {state.hands[seat].length > 0 && <CardRow cards={state.hands[seat]} faded />}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
