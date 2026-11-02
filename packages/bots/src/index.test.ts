import { describe, expect, it } from 'vitest'
import { createRng } from './index'

describe('createRng', () => {
  it('repeats the same sequence for the same seed', () => {
    const first = createRng(7)
    const second = createRng(7)
    const a = [first(), first(), first()]
    const b = [second(), second(), second()]
    expect(a).toEqual(b)
    expect(a.every((value) => value >= 0 && value < 1)).toBe(true)
  })
})
