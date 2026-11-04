export interface Contract {
  trios: number
  escalas: number
  escalaLength?: number
  mixedSuits?: boolean
}

export interface CardPoints {
  joker: number
  ace: number
  face: number
}

export interface RulesConfig {
  handSize: number
  rounds: Contract[]
  trioSize: number
  escalaSize: number
  maxJokersPerTrio: number
  adjacentJokers: boolean
  aceLow: boolean
  aceHigh: boolean
  wrapAround: boolean
  distinctTrioRanks: boolean
  addSameTurn: boolean
  noLayDownFirstTurn: boolean
  exactLayDown: boolean
  jokersInRealEscala: boolean
  points: CardPoints
  maxDrawsPerRound: number
}

export const REAL_ESCALA = 13

export const ROUNDS: Contract[] = [
  { trios: 2, escalas: 0 },
  { trios: 1, escalas: 1 },
  { trios: 0, escalas: 2 },
  { trios: 3, escalas: 0 },
  { trios: 2, escalas: 1 },
  { trios: 1, escalas: 2 },
  { trios: 0, escalas: 3 },
  { trios: 0, escalas: 2, escalaLength: 6 },
  { trios: 0, escalas: 1, escalaLength: REAL_ESCALA, mixedSuits: true },
  { trios: 0, escalas: 1, escalaLength: REAL_ESCALA },
]

export const DEFAULT_RULES: RulesConfig = {
  handSize: 12,
  rounds: ROUNDS,
  trioSize: 3,
  escalaSize: 4,
  maxJokersPerTrio: 1,
  adjacentJokers: false,
  aceLow: true,
  aceHigh: true,
  wrapAround: true,
  distinctTrioRanks: true,
  addSameTurn: false,
  noLayDownFirstTurn: true,
  exactLayDown: true,
  jokersInRealEscala: true,
  points: { joker: 30, ace: 20, face: 10 },
  maxDrawsPerRound: 600,
}

export function resolveRules(rules: Partial<RulesConfig> = {}): RulesConfig {
  return { ...DEFAULT_RULES, ...rules, points: { ...DEFAULT_RULES.points, ...rules.points } }
}

export function escalaLength(contract: Contract, rules: RulesConfig): number {
  return contract.escalaLength ?? rules.escalaSize
}

export function isRealEscala(contract: Contract): boolean {
  return contract.escalaLength === REAL_ESCALA && !contract.mixedSuits
}

export function isEscalaLoca(contract: Contract): boolean {
  return contract.mixedSuits === true
}
