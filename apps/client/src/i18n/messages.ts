import { createContext, useContext } from 'react'
import type { Level } from '@carioca/bots'
import type { ContractWords } from '../lib/cards'
import type { TextSize } from '../lib/textSize'
import { defaultLocale } from './locales'
import type { Locale } from './locales'

export type Outcome = 'won' | 'tied' | 'lost' | 'abandoned'

export interface Messages {
  appName: string
  tagline: string
  contractsTitle: string
  history: string
  historyEmpty: string
  historySummary: (played: number, won: number) => string
  playerCount: (n: number) => string
  outcomes: Record<Outcome, string>
  rules: string
  difficulty: string
  levels: Record<Level, string>
  levelHints: Record<Level, string>
  playWith: (players: number) => string
  words: ContractWords
  roundLabel: (n: number) => string
  you: string
  bot: (n: number) => string
  yourHand: string
  sortByRank: string
  sortLabel: string
  sortBySuit: string
  joker: string
  trio: string
  escala: string
  deck: string
  deckCount: (n: number) => string
  discardPile: string
  emptyPile: string
  faceDown: string
  drawPrompt: string
  drawFirst: string
  playPrompt: string
  addPrompt: string
  waiting: (name: string) => string
  formGroup: string
  drawDeck: string
  place: string
  selectSeveral: string
  done: string
  placePrompt: string
  howTo: string
  howToHint: string
  layDown: string
  suggest: string
  discard: string
  removeGroup: string
  staged: string
  contractFailed: string
  notContract: (contract: string) => string
  exactSizes: (trio: number, run: number) => string
  addFailed: string
  layDownNextTurn: string
  addNextTurn: string
  groupTooSmall: string
  pickOneToDiscard: string
  pickOneToAdd: string
  cantThrowBack: string
  addLow: string
  addHigh: string
  tableTitle: string
  noMelds: string
  laidDown: string
  dealer: string
  dealerIs: (name: string) => string
  drawingDealer: string
  musicOff: string
  musicOnLabel: string
  cardsLeft: (n: number) => string
  logDrewDeck: (name: string) => string
  logTookDiscard: (name: string, card: string) => string
  logLaidDown: (name: string) => string
  logAdded: (name: string, card: string) => string
  logDiscarded: (name: string, card: string) => string
  logReshuffle: string
  exit: string
  exitTitle: string
  exitBody: string
  exitConfirm: string
  keepPlaying: string
  close: string
  scoreTitle: string
  liveScore: string
  lowerWins: string
  round: string
  roundFinished: (n: number) => string
  wentOut: (name: string) => string
  blocked: string
  summaryOut: string
  leftover: (name: string) => string
  summaryDown: (n: number) => string
  summaryUp: (n: number) => string
  matchFinished: string
  nextRound: string
  backHome: string
  winner: (name: string, points: number) => string
  tie: (names: string) => string
  settings: string
  textSize: string
  textSizes: Record<TextSize, string>
  plainFont: string
  plainFontHint: string
  reduceMotion: string
  reduceMotionHint: string
  fourColors: string
  fourColorsHint: string
  toLight: string
  toDark: string
  language: string
  install: string
  developedBy: string
  otherGames: string
  showOtherGames: string
  hideOtherGames: string
  showOtherGamesHint: string
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export const messages: Record<Locale, Messages> = {
  en: {
    appName: 'Carioca',
    tagline: 'Ten rounds of trios and runs, each with its own contract, against bots.',
    contractsTitle: 'The ten contracts',
    history: 'History',
    historyEmpty: 'Finished matches will appear here.',
    historySummary: (played, won) => `${played} played · ${won} won`,
    playerCount: (n) => `${n} players`,
    outcomes: { won: 'You won', tied: 'Tie', lost: 'You lost', abandoned: 'Abandoned' },
    rules: 'Rules',
    difficulty: 'Difficulty',
    levels: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
    levelHints: {
      easy: 'loose bots, with hints for you',
      medium: 'careful bots, no hints',
      hard: 'bots that count cards, no hints',
    },
    playWith: (players) => `${players} players`,
    words: {
      trios: (n) => plural(n, 'trio', 'trios'),
      escalas: (n) => plural(n, 'run', 'runs'),
      escalasOf: (n, length) => `${plural(n, 'run', 'runs')} of ${length}`,
      and: 'and',
      royal: 'Royal run',
      loca: 'Crazy run',
      trioShort: 'T',
      escalaShort: 'R',
      royalShort: 'Royal',
      locaShort: 'Crazy',
    },
    roundLabel: (n) => `Round ${n}`,
    you: 'You',
    bot: (n) => `Bot ${n}`,
    yourHand: 'Your hand',
    sortByRank: 'By number',
    sortLabel: 'Sort your hand',
    sortBySuit: 'By suit',
    joker: 'Joker',
    trio: 'Trio',
    escala: 'Run',
    deck: 'Deck',
    deckCount: (n) => plural(n, 'card', 'cards'),
    discardPile: 'Discard pile',
    emptyPile: 'Empty',
    faceDown: 'Face down',
    drawPrompt: 'Your turn. Tap the deck or the discard twice to take it.',
    drawFirst: 'Draw a card first: tap the deck or the discard.',
    playPrompt: 'Tap a card to raise it, tap it again to discard. Pick several, then Group, to build sets.',
    addPrompt: 'Pick cards, then tap any set on the table to place them. Tap a raised card again to discard it.',
    waiting: (name) => `${name} is playing…`,
    formGroup: 'Group',
    drawDeck: 'Draw',
    place: 'Place',
    selectSeveral: 'Pick several',
    done: 'Done',
    placePrompt: 'Tap the set where they go.',
    howTo: 'Show how to play',
    howToHint: 'A line above your hand says what you can do. On by default in Easy.',
    layDown: 'Lay down',
    suggest: 'Suggest',
    discard: 'Discard',
    removeGroup: 'Undo group',
    staged: 'Your lay-down',
    contractFailed: 'That doesn’t meet the contract.',
    notContract: (contract) => `Those cards don’t make ${contract}.`,
    exactSizes: (trio, run) => `Each trio is exactly ${trio} cards and each run exactly ${run}: take out the extra cards.`,
    addFailed: 'That doesn’t fit there.',
    layDownNextTurn: 'No laying down on your first turn: draw and discard.',
    addNextTurn: 'You can add to the table from your next turn.',
    groupTooSmall: 'Pick at least 3 cards for a group.',
    pickOneToDiscard: 'Pick one card to discard.',
    pickOneToAdd: 'Pick the cards to place, then tap a set.',
    cantThrowBack: 'You can’t throw back the card you just took.',
    addLow: 'Add at the start',
    addHigh: 'Add at the end',
    tableTitle: 'Table',
    noMelds: 'Nobody has laid down yet.',
    laidDown: 'Down',
    dealer: 'Dealer',
    dealerIs: (name) => `Dealer: ${name}`,
    drawingDealer: 'Drawing who deals…',
    musicOff: 'Turn music off',
    musicOnLabel: 'Turn music on',
    cardsLeft: (n) => plural(n, 'card', 'cards'),
    logDrewDeck: (name) => `${name} drew from the deck`,
    logTookDiscard: (name, card) => `${name} took ${card}`,
    logLaidDown: (name) => `${name} laid down`,
    logAdded: (name, card) => `${name} added ${card}`,
    logDiscarded: (name, card) => `${name} discarded ${card}`,
    logReshuffle: 'The discards were shuffled into a new deck',
    exit: 'Exit',
    exitTitle: 'Leave this match?',
    exitBody: 'You will lose the match in progress.',
    exitConfirm: 'Yes, exit',
    keepPlaying: 'Keep playing',
    close: 'Close',
    scoreTitle: 'Score',
    liveScore: 'The marked round is in progress, so its points can still change.',
    lowerWins: 'Points count against you. Lowest total wins.',
    round: 'Round',
    roundFinished: (n) => `Round ${n} finished`,
    wentOut: (name) => `${name} went out.`,
    blocked: 'Nobody went out this round.',
    summaryOut: 'Went out',
    leftover: (name) => `Cards left by ${name}`,
    summaryDown: (n) => `Laid down · ${plural(n, 'card', 'cards')} left`,
    summaryUp: (n) => `Didn’t lay down · ${plural(n, 'card', 'cards')} left`,
    matchFinished: 'Match finished',
    nextRound: 'Next round',
    backHome: 'Back to start',
    winner: (name, points) => `${name} won with ${points} points`,
    tie: (names) => `Tie: ${names}`,
    settings: 'Settings',
    textSize: 'Text size',
    textSizes: { normal: 'Normal', large: 'Large', xlarge: 'Extra large' },
    plainFont: 'Plain font',
    plainFontHint: 'Uses a regular font instead of the pixel one.',
    reduceMotion: 'Turn off animations',
    reduceMotionHint: 'Windows and cards appear without moving.',
    fourColors: 'Four-color suits',
    fourColorsHint: 'Clubs green, spades black, hearts red, diamonds orange.',
    toLight: 'Switch to light mode',
    toDark: 'Switch to dark mode',
    language: 'Language',
    install: 'Install app',
    developedBy: 'Developed by',
    otherGames: 'Other games',
    showOtherGames: 'Show other games',
    hideOtherGames: 'Hide other games',
    showOtherGamesHint: 'A side column with the other card games on wide screens. The header button always opens them.',
  },
  es: {
    appName: 'Carioca',
    tagline: 'Diez rondas de tríos y escalas, cada una con su contrato, contra bots.',
    contractsTitle: 'Los diez contratos',
    history: 'Historial',
    historyEmpty: 'Aquí aparecerán las partidas terminadas.',
    historySummary: (played, won) => `${played} jugadas · ${won} ganadas`,
    playerCount: (n) => `${n} jugadores`,
    outcomes: { won: 'Ganaste', tied: 'Empate', lost: 'Perdiste', abandoned: 'Abandonada' },
    rules: 'Reglas',
    difficulty: 'Dificultad',
    levels: { easy: 'Fácil', medium: 'Medio', hard: 'Difícil' },
    levelHints: {
      easy: 'bots relajados y ayudas para ti',
      medium: 'bots cuidadosos, sin ayudas',
      hard: 'bots que cuentan cartas, sin ayudas',
    },
    playWith: (players) => `${players} jugadores`,
    words: {
      trios: (n) => plural(n, 'trío', 'tríos'),
      escalas: (n) => plural(n, 'escala', 'escalas'),
      escalasOf: (n, length) => `${plural(n, 'escala', 'escalas')} de ${length}`,
      and: 'y',
      royal: 'Escala real',
      loca: 'Escala loca',
      trioShort: 'T',
      escalaShort: 'E',
      royalShort: 'Real',
      locaShort: 'Loca',
    },
    roundLabel: (n) => `Ronda ${n}`,
    you: 'Tú',
    bot: (n) => `Bot ${n}`,
    yourHand: 'Tu mano',
    sortByRank: 'Por número',
    sortLabel: 'Ordenar tu mano',
    sortBySuit: 'Por pinta',
    joker: 'Comodín',
    trio: 'Trío',
    escala: 'Escala',
    deck: 'Mazo',
    deckCount: (n) => plural(n, 'carta', 'cartas'),
    discardPile: 'Botadas',
    emptyPile: 'Vacío',
    faceDown: 'Boca abajo',
    drawPrompt: 'Tu turno. Toca dos veces el mazo o la botada para sacar.',
    drawFirst: 'Primero saca una carta: toca el mazo o el descarte.',
    playPrompt: 'Toca una carta para subirla y otra vez para botarla. Elige varias y Armar juego para tus juegos.',
    addPrompt: 'Elige cartas y toca cualquier juego de la mesa para ponerlas. Toca otra vez una carta subida para botarla.',
    waiting: (name) => `Juega ${name}…`,
    formGroup: 'Armar juego',
    drawDeck: 'Sacar del mazo',
    place: 'Poner',
    selectSeveral: 'Elegir varias',
    done: 'Listo',
    placePrompt: 'Toca el juego donde van.',
    howTo: 'Mostrar cómo jugar',
    howToHint: 'Una línea sobre tu mano dice qué puedes hacer. Activo por defecto en Fácil.',
    layDown: 'Bajarse',
    suggest: 'Sugerir',
    discard: 'Botar',
    removeGroup: 'Deshacer juego',
    staged: 'Tu bajada',
    contractFailed: 'Eso no cumple el contrato.',
    notContract: (contract) => `Esas cartas no forman ${contract}.`,
    exactSizes: (trio, run) => `Cada trío lleva exactamente ${trio} cartas y cada escala exactamente ${run}: saca las que sobran.`,
    addFailed: 'Eso no va ahí.',
    layDownNextTurn: 'En tu primer turno no puedes bajarte: saca y bota.',
    addNextTurn: 'Puedes agregar a la mesa desde tu próximo turno.',
    groupTooSmall: 'Elige al menos 3 cartas para un juego.',
    pickOneToDiscard: 'Elige una carta para botar.',
    pickOneToAdd: 'Elige las cartas que quieres agregar y toca un juego.',
    cantThrowBack: 'No puedes botar la carta que acabas de tomar.',
    addLow: 'Agregar al inicio',
    addHigh: 'Agregar al final',
    tableTitle: 'Mesa',
    noMelds: 'Nadie se ha bajado todavía.',
    laidDown: 'Bajado',
    dealer: 'Da',
    dealerIs: (name) => `Da: ${name}`,
    drawingDealer: 'Sorteando quién da…',
    musicOff: 'Apagar música',
    musicOnLabel: 'Encender música',
    cardsLeft: (n) => plural(n, 'carta', 'cartas'),
    logDrewDeck: (name) => `${name} sacó del mazo`,
    logTookDiscard: (name, card) => `${name} tomó ${card}`,
    logLaidDown: (name) => `${name} se bajó`,
    logAdded: (name, card) => `${name} agregó ${card}`,
    logDiscarded: (name, card) => `${name} botó ${card}`,
    logReshuffle: 'Se revolvieron las botadas para armar un mazo nuevo',
    exit: 'Salir',
    exitTitle: '¿Seguro que quieres salir?',
    exitBody: 'Se perderá la partida en curso.',
    exitConfirm: 'Sí, salir',
    keepPlaying: 'Seguir jugando',
    close: 'Cerrar',
    scoreTitle: 'Puntaje',
    liveScore: 'La ronda marcada está en curso, así que sus puntos aún pueden cambiar.',
    lowerWins: 'Los puntos suman en contra. Gana el menor total.',
    round: 'Ronda',
    roundFinished: (n) => `Fin de la ronda ${n}`,
    wentOut: (name) => `${name} se quedó sin cartas.`,
    blocked: 'Nadie se quedó sin cartas en esta ronda.',
    summaryOut: 'Se quedó sin cartas',
    leftover: (name) => `Cartas que le quedaron a ${name}`,
    summaryDown: (n) => `Se bajó · le quedan ${plural(n, 'carta', 'cartas')}`,
    summaryUp: (n) => `No se bajó · le quedan ${plural(n, 'carta', 'cartas')}`,
    matchFinished: 'Fin de la partida',
    nextRound: 'Siguiente ronda',
    backHome: 'Volver al inicio',
    winner: (name, points) => `Ganador: ${name} con ${points} puntos`,
    tie: (names) => `Empate: ${names}`,
    settings: 'Ajustes',
    textSize: 'Tamaño del texto',
    textSizes: { normal: 'Normal', large: 'Grande', xlarge: 'Muy grande' },
    plainFont: 'Letra normal',
    plainFontHint: 'Usa una letra común en vez de la pixelada.',
    reduceMotion: 'Desactivar animaciones',
    reduceMotionHint: 'Las ventanas y cartas aparecen sin moverse.',
    fourColors: 'Cuatro colores',
    fourColorsHint: 'Trébol verde, pica negra, corazón rojo, diamante naranjo.',
    toLight: 'Cambiar a modo claro',
    toDark: 'Cambiar a modo oscuro',
    language: 'Idioma',
    install: 'Instalar app',
    developedBy: 'Desarrollado por',
    otherGames: 'Otros juegos',
    showOtherGames: 'Mostrar otros juegos',
    hideOtherGames: 'Ocultar otros juegos',
    showOtherGamesHint: 'Una columna lateral con los otros juegos de naipes en pantallas anchas. El botón de la cabecera siempre los abre.',
  },
}

export const LocaleContext = createContext<Locale>(defaultLocale)

export function useLocale(): Locale {
  return useContext(LocaleContext)
}

export function useMessages(): Messages {
  return messages[useLocale()]
}
