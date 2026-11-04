import type { Locale } from '../i18n/locales'
import type { TextSize } from './textSize'

interface OtherGame {
  slug: string
  name: string
  url: string
  tagline: Record<Locale, string>
}

export const OTHER_GAMES: OtherGame[] = [
  {
    slug: '7-de-trebol',
    name: '7 de Trébol',
    url: 'https://tletelieru.github.io/7-de-trebol/',
    tagline: {
      en: 'The Cocktail card game. Six games against bots.',
      es: 'El Cocktail, el juego de naipes. Seis juegos contra bots.',
    },
  },
  {
    slug: 'brisca',
    name: 'Brisca',
    url: 'https://tletelieru.github.io/brisca/',
    tagline: {
      en: 'The Spanish-deck trick game with a trump suit, against bots.',
      es: 'El juego de bazas con triunfo y naipe español, contra bots.',
    },
  },
  {
    slug: 'escoba',
    name: 'Escoba',
    url: 'https://tletelieru.github.io/escoba/',
    tagline: {
      en: 'Add up to 15 and sweep the table, against bots.',
      es: 'Suma 15 y barre la mesa, contra bots.',
    },
  },
  {
    slug: 'uno',
    name: 'UNO',
    url: 'https://tletelieru.github.io/uno/',
    tagline: {
      en: 'Match colors and numbers and empty your hand first, against bots.',
      es: 'Junta colores y números y quédate sin cartas primero, contra bots.',
    },
  },
  {
    slug: 'tele',
    name: 'Tele',
    url: 'https://tletelieru.github.io/tele/',
    tagline: {
      en: 'Go out with all 12 cards in trios and runs, against bots.',
      es: 'Bájate con las 12 cartas en tríos y escaleras, contra bots.',
    },
  },
]

export const otherGamesKey = 'other-games'

export function readOtherGames(): boolean {
  return localStorage.getItem(otherGamesKey) !== 'off'
}

export const sideColumn: Record<TextSize, { show: string; hide: string; flex: string }> = {
  normal: { show: 'min-[68rem]:block', hide: 'min-[68rem]:hidden', flex: 'min-[68rem]:flex' },
  large: { show: 'min-[79rem]:block', hide: 'min-[79rem]:hidden', flex: 'min-[79rem]:flex' },
  xlarge: { show: 'min-[89rem]:block', hide: 'min-[89rem]:hidden', flex: 'min-[89rem]:flex' },
}
