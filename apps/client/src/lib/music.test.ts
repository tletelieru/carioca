import { describe, expect, it } from 'vitest'
import { ROUNDS } from '@carioca/engine'
import { TRACKS } from './music'
import { ACTION_SOUNDS, ROUND_TRACKS, trackForMatch } from './sound'

describe('music tracks', () => {
  it('keeps every track valid and calm', () => {
    for (const track of Object.values(TRACKS)) {
      expect(track.melody).toHaveLength(64)
      expect(track.chords).toHaveLength(4)
      expect(track.bpm).toBeGreaterThanOrEqual(88)
      expect(track.bpm).toBeLessThanOrEqual(100)
      for (const note of track.melody) expect(note === 0 || (note >= 48 && note <= 96)).toBe(true)
      for (const chord of track.chords) expect(chord).toHaveLength(4)
    }
  })

  it('uses a different melody for each mood', () => {
    expect(new Set(Object.values(TRACKS).map((track) => track.melody.join())).size).toBe(3)
  })

  it('picks a track for every round and plays the intro at the start screen', () => {
    expect(ROUND_TRACKS).toHaveLength(ROUNDS.length)
    expect(ROUND_TRACKS[0]).toBe('round')
    expect(ROUND_TRACKS[ROUNDS.length - 2]).toBe('round')
    expect(ROUND_TRACKS[ROUNDS.length - 1]).toBe('royal')
    expect(trackForMatch(null)).toBe('intro')
  })

  it('makes a sound when cards hit the table', () => {
    expect(ACTION_SOUNDS.discard).toBe('card')
    expect(ACTION_SOUNDS.layDown).toBe('meld')
    expect(ACTION_SOUNDS.draw).toBeNull()
  })
})
