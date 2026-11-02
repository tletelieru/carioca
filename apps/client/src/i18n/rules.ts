import type { Locale } from './locales'

interface RuleSection {
  tab: string
  rules: string[]
}

interface RulesText {
  sections: RuleSection[]
}

export const rulesText: Record<Locale, RulesText> = {
  en: {
    sections: [
      {
        tab: "Basics",
        rules: [
          "Two French decks and 4 jokers, 108 cards. 2 to 5 players.",
          "Eight rounds, each with a contract you must lay down.",
          "Lowest total after the eight rounds wins.",
        ],
      },
      {
        tab: "Rounds",
        rules: [
          "1. Two trios. 2. A trio and a run. 3. Two runs. 4. Three trios.",
          "5. Two trios and a run. 6. A trio and two runs. 7. Three runs. 8. Royal run.",
          "Trio: 3 cards of the same number. Run: 4 cards in a row of the same suit.",
        ],
      },
      {
        tab: "Turn",
        rules: [
          "Take the last discarded card or the top of the deck, then discard one.",
          "Once you lay down your contract, you can add cards to the sets on the table.",
          "The first player to empty their hand closes the round.",
        ],
      },
      {
        tab: "Points",
        rules: [
          "Cards left in hand count against you.",
          "Number cards at face value, face cards 10, Aces 20, jokers 30.",
        ],
      },
    ],
  },
  es: {
    sections: [
      {
        tab: "Base",
        rules: [
          "Dos naipes ingleses y 4 comodines, 108 cartas. De 2 a 5 jugadores.",
          "Ocho rondas, cada una con un contrato que hay que bajar.",
          "Gana el menor total después de las ocho rondas.",
        ],
      },
      {
        tab: "Rondas",
        rules: [
          "1. Dos tríos. 2. Un trío y una escala. 3. Dos escalas. 4. Tres tríos.",
          "5. Dos tríos y una escala. 6. Un trío y dos escalas. 7. Tres escalas. 8. Escala real.",
          "Trío: 3 cartas del mismo número. Escala: 4 cartas seguidas de la misma pinta.",
        ],
      },
      {
        tab: "Turno",
        rules: [
          "Sacas la última carta botada o la de arriba del mazo, y botas una.",
          "Una vez que bajas tu contrato, puedes agregar cartas a los juegos de la mesa.",
          "El primero que se queda sin cartas cierra la ronda.",
        ],
      },
      {
        tab: "Puntos",
        rules: [
          "Las cartas que te quedan en la mano suman en contra.",
          "Números por su valor, figuras 10, As 20, comodines 30.",
        ],
      },
    ],
  },
}
