import { describe, expect, it } from 'vitest'
import { ROUNDS } from '@carioca/engine'
import { messages } from '../i18n/messages'
import { contractLabel, contractShort } from './cards'

describe('contract labels', () => {
  it('names the ten contracts in English', () => {
    const { words } = messages.en
    expect(ROUNDS.map((contract) => contractLabel(contract, words))).toEqual([
      '2 trios',
      '1 trio and 1 run',
      '2 runs',
      '3 trios',
      '2 trios and 1 run',
      '1 trio and 2 runs',
      '3 runs',
      '2 runs of 6',
      'Crazy run',
      'Royal run',
    ])
  })

  it('names the long runs and the escala loca in Spanish', () => {
    const { words } = messages.es
    expect(contractLabel(ROUNDS[7], words)).toBe('2 escalas de 6')
    expect(contractLabel(ROUNDS[8], words)).toBe('Escala loca')
    expect(contractLabel(ROUNDS[9], words)).toBe('Escala real')
  })

  it('keeps the short labels apart', () => {
    const { words } = messages.en
    expect(ROUNDS.slice(6).map((contract) => contractShort(contract, words))).toEqual(['3R', '2R×6', 'Crazy', 'Royal'])
    expect(contractShort(ROUNDS[8], messages.es.words)).toBe('Loca')
  })
})
