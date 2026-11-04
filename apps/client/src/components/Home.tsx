import type { Level } from '@carioca/bots'
import { DEFAULT_RULES, PLAYER_COUNTS, ROUNDS, escalaLength, isEscalaLoca, isRealEscala } from '@carioca/engine'
import type { Card, Contract, PlayerCount, Rank, Suit } from '@carioca/engine'
import { useMessages } from '../i18n/messages'
import { contractLabel } from '../lib/cards'
import { MiniCard } from './MiniCard'
import { PlayingCard } from './PlayingCard'

interface Props {
  level: Level
  onLevel: (level: Level) => void
  onRules: () => void
  onHistory: () => void
  onStart: (players: PlayerCount) => void
}

const FAN: { card: Card; tilt: number; lift: number }[] = [
  { card: { kind: 'suited', suit: 'hearts', rank: 2, copy: 0 }, tilt: -8, lift: 10 },
  { card: { kind: 'joker', copy: 0 }, tilt: 0, lift: 0 },
  { card: { kind: 'suited', suit: 'spades', rank: 1, copy: 0 }, tilt: 8, lift: 10 },
]

const LEVELS: Level[] = ['easy', 'medium', 'hard']

const TRIO_RANKS: Rank[] = [7, 13, 4]

const TRIO_SUITS: Suit[] = ['hearts', 'spades', 'diamonds']

const ESCALA_TOP = 14

const ESCALAS: { suit: Suit; from: number }[] = [
  { suit: 'hearts', from: 3 },
  { suit: 'spades', from: 9 },
  { suit: 'diamonds', from: 5 },
]

const LOCA_SUITS: Suit[] = ['hearts', 'spades', 'diamonds', 'clubs']

const LOCA_JOKER = 6

function suited(suit: Suit, rank: number): Card {
  return { kind: 'suited', suit, rank: rank as Rank, copy: 0 }
}

function locaCard(index: number): Card {
  if (index === LOCA_JOKER) return { kind: 'joker', copy: 0 }
  return suited(LOCA_SUITS[index % LOCA_SUITS.length], index + 1)
}

function contractCards(contract: Contract): Card[][] {
  const length = escalaLength(contract, DEFAULT_RULES)
  if (isRealEscala(contract)) {
    return [Array.from({ length }, (_, index) => suited('clubs', index + 1))]
  }
  if (isEscalaLoca(contract)) return [Array.from({ length }, (_, index) => locaCard(index))]
  const trios = TRIO_RANKS.slice(0, contract.trios).map((rank) => TRIO_SUITS.map((suit) => suited(suit, rank)))
  const escalas = ESCALAS.slice(0, contract.escalas).map(({ suit, from }) =>
    Array.from({ length }, (_, index) => suited(suit, Math.min(from, ESCALA_TOP - length) + index)),
  )
  return [...trios, ...escalas]
}

function cardKey(card: Card): string {
  return card.kind === 'joker' ? 'joker' : `${card.rank}${card.suit}`
}

function ContractCards({ contract }: { contract: Contract }) {
  return (
    <span aria-hidden="true" className="flex flex-wrap gap-x-1.5 gap-y-1">
      {contractCards(contract).map((group) => (
        <span key={group.map(cardKey).join()} className="flex">
          {group.map((card, index) => (
            <span key={cardKey(card)} className={index === 0 ? '' : '-ml-[18px]'}>
              <MiniCard card={card} compact />
            </span>
          ))}
        </span>
      ))}
    </span>
  )
}

export function Home({ level, onLevel, onRules, onHistory, onStart }: Props) {
  const t = useMessages()

  return (
    <main className="flex flex-col items-center gap-6">
      <div aria-hidden="true" className="flex justify-center pt-6">
        {FAN.map(({ card, tilt, lift }) => (
          <PlayingCard key={tilt} card={card} tilt={tilt} lift={lift} front={tilt === 0} />
        ))}
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-pixel text-6xl leading-none">{t.appName}</h1>
        <p className="text-muted">{t.tagline}</p>
      </div>
      <div role="group" aria-label={t.difficulty} className="flex w-full flex-col gap-1">
        <span className="text-center text-sm text-muted">
          {t.difficulty}: {t.levelHints[level]}
        </span>
        <div className="grid grid-cols-3 gap-1 pixel-box bg-surface p-1">
          {LEVELS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={level === option}
              onClick={() => onLevel(option)}
              className={`pixel-box py-1.5 text-sm font-medium ${
                level === option ? 'bg-raised' : 'text-muted'
              }`}
            >
              {t.levels[option]}
            </button>
          ))}
        </div>
      </div>
      <div className="grid w-full grid-cols-2 gap-2">
        {PLAYER_COUNTS.map((players) => (
          <button
            key={players}
            type="button"
            onClick={() => onStart(players)}
            className="pixel-box bg-accent py-3 font-pixel text-2xl leading-none text-on-accent"
          >
            {t.playWith(players)}
          </button>
        ))}
      </div>
      <section className="flex w-full flex-col gap-2 pixel-box bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-pixel text-2xl leading-none">{t.contractsTitle}</h2>
          <div className="flex gap-1">
            {[
              { label: t.history, onClick: onHistory },
              { label: t.rules, onClick: onRules },
            ].map(({ label, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className="pixel-box bg-raised px-2 py-1 text-xs font-medium"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <ol className="grid auto-rows-fr grid-cols-2 gap-1.5">
          {ROUNDS.map((contract, index) => {
            const label = contractLabel(contract, t.words)
            return (
              <li key={label} className="flex items-start gap-1.5 pixel-box bg-raised px-2 py-2 text-sm">
                <span className="font-pixel text-xl leading-none text-gold">{index + 1}</span>
                <span className="flex min-w-0 flex-col gap-2">
                  <span className="leading-none">{label}</span>
                  <ContractCards contract={contract} />
                </span>
              </li>
            )
          })}
        </ol>
      </section>
    </main>
  )
}
