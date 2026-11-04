import type { Card, PlayerCount, Seat } from './cards'
import { contractFor } from './match'
import type { LogEntry, MatchState, MatchStatus, Phase, RoundResult } from './match'
import type { Meld } from './melds'
import type { Contract, RulesConfig } from './rules'

export interface PlayerView {
  seat: Seat
  players: PlayerCount
  rules: RulesConfig
  dealer: Seat
  round: number
  contract: Contract
  turn: Seat
  phase: Phase
  status: MatchStatus
  hand: Card[]
  handCounts: number[]
  melds: Meld[]
  discard: Card[]
  deckCount: number
  laidDown: boolean[]
  taken: string | null
  log: LogEntry[]
  results: RoundResult[]
}

export function viewFor(state: MatchState, seat: Seat): PlayerView {
  return {
    seat,
    players: state.players,
    rules: state.rules,
    dealer: state.dealer,
    round: state.round,
    contract: contractFor(state),
    turn: state.turn,
    phase: state.phase,
    status: state.status,
    hand: state.hands[seat],
    handCounts: state.hands.map((hand) => hand.length),
    melds: state.melds,
    discard: state.discard,
    deckCount: state.deck.length,
    laidDown: state.laidDown,
    taken: seat === state.turn ? state.taken : null,
    log: state.log,
    results: state.results,
  }
}
