import { useState } from 'react'
import type { Card, Rank, Suit } from '@carioca/engine'
import { useLocale, useMessages } from '../i18n/messages'
import { rulesText } from '../i18n/rules'
import type { Example } from '../i18n/rules'
import { MiniCard } from './MiniCard'
import { Overlay } from './Overlay'

const SUIT_CODES: Record<string, Suit> = { c: 'clubs', d: 'diamonds', h: 'hearts', s: 'spades' }

const RANK_CODES: Record<string, Rank> = { A: 1, J: 11, Q: 12, K: 13 }

const LONG_GROUP = 6

function parseCard(code: string): { card: Card; highlight: boolean } {
  const highlight = code.endsWith('*')
  const plain = highlight ? code.slice(0, -1) : code
  if (plain === 'JK') return { card: { kind: 'joker', copy: 0 }, highlight }
  const rankCode = plain.slice(0, -1)
  const rank = RANK_CODES[rankCode] ?? (Number(rankCode) as Rank)
  return { card: { kind: 'suited', rank, suit: SUIT_CODES[plain.at(-1)!], copy: 0 }, highlight }
}

function Illustration({ example }: { example: Example }) {
  return (
    <span aria-hidden="true" className="flex flex-wrap gap-x-2 gap-y-1.5 pt-1">
      {example.map((group) => (
        <span key={group.join()} className="flex">
          {group.map((code, index) => {
            const { card, highlight } = parseCard(code)
            const overlap = group.length > LONG_GROUP ? '-ml-3' : '-ml-1'
            return (
              <span key={`${code}-${index}`} className={index === 0 ? '' : overlap}>
                <MiniCard card={card} highlight={highlight} compact />
              </span>
            )
          })}
        </span>
      ))}
    </span>
  )
}

export function Rules({ onClose }: { onClose: () => void }) {
  const t = useMessages()
  const text = rulesText[useLocale()]
  const [tab, setTab] = useState(0)
  const section = text.sections[tab]

  return (
    <Overlay title={t.rules} parchment onClose={onClose}>
      <div className="grid grid-cols-4 gap-1">
        {text.sections.map(({ tab: label }, index) => (
          <button
            key={label}
            type="button"
            aria-pressed={tab === index}
            onClick={() => setTab(index)}
            className={`pixel-box py-1.5 text-sm ${tab === index ? 'bg-accent text-on-accent' : 'bg-raised'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <ul className="flex flex-col gap-2.5 text-sm leading-tight">
        {section.rules.map((rule) => (
          <li key={rule.text} className="flex gap-2">
            <span aria-hidden="true" className="mt-1 size-2 shrink-0 bg-gold" />
            <span className="flex min-w-0 flex-col">
              {rule.text}
              {rule.example && <Illustration example={rule.example} />}
            </span>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onClose} className="pixel-box bg-raised py-2">
        {t.close}
      </button>
    </Overlay>
  )
}
