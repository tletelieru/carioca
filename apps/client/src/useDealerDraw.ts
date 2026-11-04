import { useContext, useEffect, useState } from 'react'
import type { Seat } from '@carioca/engine'
import { DEALER_DRAW_SOUNDS, SoundContext } from './lib/sound'

export const DRAW_MS = 2000

export const ANNOUNCE_MS = 800

const FIRST_HOP_MS = 60

const SLOWDOWN = 4

export type DrawStage = 'hopping' | 'announcing' | 'done'

export interface DealerDraw {
  stage: DrawStage
  spotlight: Seat | null
}

export function hopDelays(players: number, dealer: Seat): number[] {
  const laps = players >= 4 ? 1 : 2
  const hops = players * laps + dealer + 1
  const raw = Array.from({ length: hops }, (_, index) => {
    const progress = hops > 1 ? index / (hops - 1) : 1
    return FIRST_HOP_MS * (1 + SLOWDOWN * progress * progress)
  })
  const total = raw.reduce((sum, delay) => sum + delay, 0)
  return raw.map((delay) => (delay * DRAW_MS) / total)
}

export function prefersReducedMotion(): boolean {
  if (document.documentElement.classList.contains('reduce-motion')) return true
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export function useDealerDraw(players: number, dealer: Seat, active: boolean): DealerDraw {
  const [draw, setDraw] = useState<DealerDraw>(() => ({
    stage: active ? 'hopping' : 'done',
    spotlight: null,
  }))
  const sound = useContext(SoundContext)

  // eslint-disable-next-line local/no-effect -- runs the dealer draw sequence with timers and plays its sounds as each hop fires
  useEffect(() => {
    if (!active) return
    const timers: ReturnType<typeof setTimeout>[] = []
    const announce = () => {
      sound?.effect(DEALER_DRAW_SOUNDS.stop)
      setDraw({ stage: 'announcing', spotlight: dealer })
      timers.push(setTimeout(() => setDraw({ stage: 'done', spotlight: null }), ANNOUNCE_MS))
    }
    if (prefersReducedMotion()) {
      timers.push(setTimeout(announce, 0))
      return () => timers.forEach(clearTimeout)
    }
    let elapsed = 0
    const delays = hopDelays(players, dealer)
    delays.forEach((delay, hop) => {
      const at = elapsed
      elapsed += delay
      timers.push(
        setTimeout(() => {
          sound?.effect(DEALER_DRAW_SOUNDS.hop)
          setDraw({ stage: 'hopping', spotlight: hop % players })
        }, at),
      )
    })
    timers.push(setTimeout(announce, elapsed))
    return () => timers.forEach(clearTimeout)
  }, [active, players, dealer, sound])

  return draw
}
