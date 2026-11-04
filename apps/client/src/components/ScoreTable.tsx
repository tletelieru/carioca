import { ROUNDS } from '@carioca/engine'
import type { RoundResult } from '@carioca/engine'
import { useMessages } from '../i18n/messages'
import { contractLabel, contractShort } from '../lib/cards'
import { Points } from './Points'

interface Props {
  names: string[]
  results: RoundResult[]
  live?: RoundResult
}

export function ScoreTable({ names, results, live }: Props) {
  const t = useMessages()
  const scores = live ? [...results, live] : results
  const latest = live ? undefined : results.at(-1)?.round
  const totals = names.map((_, seat) =>
    scores.reduce((total, result) => total + result.points[seat], 0),
  )
  const best = Math.min(...totals)

  return (
    <table className="w-full table-fixed border-separate [border-spacing:0.25rem]">
      <thead>
        <tr>
          <th className="w-12" aria-label={t.round} />
          {names.map((name, seat) => {
            const leading = scores.length > 0 && totals[seat] === best
            return (
              <th
                key={name}
                scope="col"
                className={`pixel-box bg-raised px-1 py-1.5 font-normal ${
                  leading ? 'shadow-[inset_0_0_0_2px_var(--gold)]' : ''
                }`}
              >
                <span className="block truncate text-xs text-muted">{name}</span>
                <span className="block font-pixel text-3xl leading-none tabular-nums">{totals[seat]}</span>
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {ROUNDS.map((contract, round) => {
          const result = scores.find((item) => item.round === round)
          const label = contractLabel(contract, t.words)
          return (
            <tr key={label}>
              <th
                scope="row"
                title={label}
                aria-label={`${t.roundLabel(round + 1)}: ${label}`}
                className={`p-0 text-left font-normal leading-none ${result ? '' : 'opacity-60'}`}
              >
                <span className={`inline-flex flex-col px-1 ${round === live?.round ? 'score-live' : ''}`}>
                  <span className="font-pixel text-lg text-gold">{round + 1}</span>
                  <span className="text-xs text-muted">{contractShort(contract, t.words)}</span>
                </span>
              </th>
              {names.map((name, seat) => (
                <td key={name} className="p-0">
                  {result ? (
                    <div className={round === latest ? 'score-pop' : ''}>
                      <Points value={result.points[seat]} block />
                    </div>
                  ) : (
                    <div className="h-9 pixel-box bg-raised/30" />
                  )}
                </td>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
