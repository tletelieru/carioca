import type { Locale } from './locales'

export type Example = string[][]

export interface Rule {
  text: string
  example?: Example
}

interface RuleSection {
  tab: string
  rules: Rule[]
}

interface RulesText {
  sections: RuleSection[]
}

const DECK: Example = [['Ac', 'Ad', 'Ah', 'As', 'JK']]
const SCORE: Example = [['7d', 'Kh'], ['As'], ['JK']]
const CONTRACTS: Example[] = [
  [['7h', '7s', '7c'], ['Kd', 'Kc', 'Kh']],
  [['9h', '9s', '9c'], ['3d', '4d', '5d', '6d']],
  [['2c', '3c', '4c', '5c'], ['8h', '9h', '10h', 'Jh']],
  [['4s', '4h', '4d'], ['8c', '8d', '8s'], ['Qh', 'Qs', 'Qc']],
  [['5h', '5c', '5s'], ['10d', '10s', '10h'], ['6s', '7s', '8s', '9s']],
  [['Ad', 'As', 'Ah'], ['3h', '4h', '5h', '6h'], ['9c', '10c', 'Jc', 'Qc']],
  [['Ac', '2c', '3c', '4c'], ['5d', '6d', '7d', '8d'], ['10s', 'Js', 'Qs', 'Ks']],
  [['3c', '4c', '5c', '6c', '7c', '8c'], ['8d', '9d', '10d', 'Jd', 'Qd', 'Kd']],
  [['As', '2h', '3d', '4c', '5s', '6h', 'JK', '8c', '9s', '10h', 'Jd', 'Qc', 'Ks']],
  [['Ah', '2h', '3h', '4h', '5h', '6h', '7h', '8h', '9h', '10h', 'Jh', 'Qh', 'Kh']],
]
const SETS: Example = [['5c', '5h', '5s'], ['8s', '9s', '10s', 'Js']]
const ACES: Example = [['Jc', 'Qc', 'Kc', 'Ac'], ['Qh', 'Kh', 'Ah', '2h', '3h']]
const ENDS: Example = [['JK*', '9d', '10d', 'Jd', 'Qd'], ['9d', '10d', 'Jd', 'Qd', 'JK*']]
const JOKERS: Example = [['Qd', 'JK', 'Qs'], ['4h', 'JK', '6h', '7h']]
const LAY_DOWN: Example = [['6c', '6d', '6h'], ['2s', '3s', '4s', '5s']]
const ADD: Example = [['6c', '6d', '6h', '6s*'], ['2s', '3s', '4s', '5s', '6s*']]
const DISCARD: Example = [['Kd*']]
const DRAW: Example = [['Qs*']]

export const rulesText: Record<Locale, RulesText> = {
  en: {
    sections: [
      {
        tab: 'Basics',
        rules: [
          { text: 'Two standard decks and 4 jokers, 108 cards. 2 to 5 players, 12 cards each.', example: DECK },
          { text: 'Ten rounds, each with a contract you must lay down.' },
          { text: 'Lowest total after the ten rounds wins.' },
        ],
      },
      {
        tab: 'Rounds',
        rules: [
          { text: '1. Two trios.', example: CONTRACTS[0] },
          { text: '2. A trio and a run.', example: CONTRACTS[1] },
          { text: '3. Two runs.', example: CONTRACTS[2] },
          { text: '4. Three trios.', example: CONTRACTS[3] },
          { text: '5. Two trios and a run.', example: CONTRACTS[4] },
          { text: '6. A trio and two runs.', example: CONTRACTS[5] },
          { text: '7. Three runs.', example: CONTRACTS[6] },
          { text: '8. Two runs of 6 cards.', example: CONTRACTS[7] },
          { text: '9. Crazy run: 13 cards in a row, one of each number, suits mixed.', example: CONTRACTS[8] },
          { text: '10. Royal run: all 13 cards of one suit.', example: CONTRACTS[9] },
          {
            text: 'Trio: 3 cards of the same number, two trios can’t share a number. Run: 4 cards in a row of the same suit, except in the crazy run. Both can grow later.',
            example: SETS,
          },
          { text: 'The Ace sits between the King and the 2, so a run can go round it: Q K A 2 3.', example: ACES },
          {
            text: 'A joker takes the place of any card: at most one per trio, and never two side by side in a run.',
            example: JOKERS,
          },
        ],
      },
      {
        tab: 'Turn',
        rules: [
          { text: 'Draw from the deck or take the last discarded card. The first tap lifts the card, the second takes it.', example: DRAW },
          { text: 'Your first turn of each round is only draw and discard.' },
          {
            text: 'From your second turn, lay down your contract once per round, when you choose, with exactly the cards it asks for: 3 per trio, 4 per run, 6 in round 8 and 13 in the crazy and royal runs.',
            example: LAY_DOWN,
          },
          {
            text: 'From your next turn on, pick one or more cards and place them on any set on the table, yours or another player’s.',
            example: ADD,
          },
          {
            text: 'A run grows at either end, also past the King or below the 2. When a joker fits at both ends, you choose where it goes.',
            example: ENDS,
          },
          {
            text: 'End your turn by discarding one card: tap it once to raise it and again to discard it. You can’t throw back the card you just took.',
            example: DISCARD,
          },
          {
            text: 'The first player to empty their hand closes the round, whether by laying down, adding or discarding the last card.',
          },
          { text: 'If the deck runs out, the discards are shuffled into a new deck.' },
        ],
      },
      {
        tab: 'Points',
        rules: [
          { text: 'Cards left in hand count against you.' },
          { text: 'Number cards at face value, J, Q and K 10, Aces 20, jokers 30.', example: SCORE },
        ],
      },
    ],
  },
  es: {
    sections: [
      {
        tab: 'Base',
        rules: [
          { text: 'Dos naipes ingleses y 4 comodines, 108 cartas. De 2 a 5 jugadores, 12 cartas cada uno.', example: DECK },
          { text: 'Diez rondas, cada una con un contrato que hay que bajar.' },
          { text: 'Gana el menor total después de las diez rondas.' },
        ],
      },
      {
        tab: 'Rondas',
        rules: [
          { text: '1. Dos tríos.', example: CONTRACTS[0] },
          { text: '2. Un trío y una escala.', example: CONTRACTS[1] },
          { text: '3. Dos escalas.', example: CONTRACTS[2] },
          { text: '4. Tres tríos.', example: CONTRACTS[3] },
          { text: '5. Dos tríos y una escala.', example: CONTRACTS[4] },
          { text: '6. Un trío y dos escalas.', example: CONTRACTS[5] },
          { text: '7. Tres escalas.', example: CONTRACTS[6] },
          { text: '8. Dos escalas de 6 cartas.', example: CONTRACTS[7] },
          { text: '9. Escala loca: 13 cartas seguidas, una de cada número, con pintas mezcladas.', example: CONTRACTS[8] },
          { text: '10. Escala real: las 13 cartas de una pinta.', example: CONTRACTS[9] },
          {
            text: 'Trío: 3 cartas del mismo número, y dos tríos no pueden ser del mismo número. Escala: 4 cartas seguidas de la misma pinta, salvo en la escala loca. Ambos pueden crecer después.',
            example: SETS,
          },
          { text: 'El As va entre la K y el 2, así que la escala puede dar la vuelta: Q K A 2 3.', example: ACES },
          {
            text: 'El comodín reemplaza cualquier carta: uno como máximo por trío y nunca dos juntos en una escala.',
            example: JOKERS,
          },
        ],
      },
      {
        tab: 'Turno',
        rules: [
          { text: 'Sacas carta del mazo o tomas la última botada. El primer toque levanta la carta y el segundo la saca.', example: DRAW },
          { text: 'En tu primer turno de cada ronda solo sacas y botas.' },
          {
            text: 'Desde tu segundo turno te bajas con el contrato una vez por ronda, cuando quieras, con las cartas justas: 3 por trío, 4 por escala, 6 en la ronda 8 y 13 en la escala loca y la real.',
            example: LAY_DOWN,
          },
          {
            text: 'Desde tu turno siguiente eliges una o más cartas y las pones en cualquier juego de la mesa, tuyo o de otro jugador.',
            example: ADD,
          },
          {
            text: 'La escala crece por cualquiera de sus dos puntas, también después de la K o antes del 2. Si un comodín cabe en las dos, eliges dónde va.',
            example: ENDS,
          },
          {
            text: 'Terminas el turno botando una carta: tócala una vez para subirla y otra vez para botarla. No puedes botar la carta que acabas de tomar.',
            example: DISCARD,
          },
          {
            text: 'El primero que se queda sin cartas cierra la ronda, sea bajándose, agregando o botando la última.',
          },
          { text: 'Si se acaba el mazo, se revuelven las botadas y se arma un mazo nuevo.' },
        ],
      },
      {
        tab: 'Puntos',
        rules: [
          { text: 'Las cartas que te quedan en la mano suman en contra.' },
          { text: 'Números por su valor, J, Q y K 10, As 20, comodines 30.', example: SCORE },
        ],
      },
    ],
  },
}
