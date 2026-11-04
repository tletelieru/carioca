const LOOKAHEAD_SECONDS = 0.3
const TICK_MS = 100
const MASTER_VOLUME = 0.5
const STEPS_PER_CHORD = 16

const REST = 0

export type TrackId = 'intro' | 'round' | 'royal'

export interface Track {
  bpm: number
  melody: number[]
  chords: number[][]
}

const D_MINOR = [38, 50, 53, 57]
const G_MAJOR = [43, 55, 59, 62]
const C_MAJOR = [36, 52, 55, 60]
const A_MINOR = [45, 57, 60, 64]
const F_MAJOR = [41, 53, 57, 60]

export const TRACKS: Record<TrackId, Track> = {
  intro: {
    bpm: 92,
    melody: [
      74, REST, 72, REST, 69, REST, 67, 69, 65, REST, 67, REST, 69, REST, REST, REST,
      71, REST, 69, REST, 67, REST, 65, 67, 62, REST, 64, REST, 65, REST, REST, REST,
      69, REST, 72, REST, 74, REST, 76, 74, 72, REST, 69, REST, 67, REST, REST, REST,
      65, REST, 67, REST, 69, REST, 71, 69, 67, REST, 65, REST, 62, REST, REST, REST,
    ],
    chords: [D_MINOR, G_MAJOR, A_MINOR, D_MINOR],
  },
  round: {
    bpm: 96,
    melody: [
      62, REST, 65, REST, 69, REST, REST, REST, 67, REST, 65, REST, 64, REST, REST, REST,
      62, REST, 65, REST, 71, REST, 69, REST, 67, REST, REST, REST, REST, REST, REST, REST,
      60, REST, 64, REST, 67, REST, REST, REST, 69, REST, 67, REST, 65, REST, REST, REST,
      64, REST, 67, REST, 71, REST, 69, 67, 65, REST, 64, REST, 62, REST, REST, REST,
    ],
    chords: [D_MINOR, G_MAJOR, C_MAJOR, D_MINOR],
  },
  royal: {
    bpm: 100,
    melody: [
      74, 72, 74, REST, 76, REST, 77, REST, 76, REST, 74, REST, 72, REST, 71, REST,
      69, REST, 71, REST, 72, REST, 74, REST, 71, REST, 67, REST, 69, REST, REST, REST,
      77, REST, 76, REST, 74, REST, 72, REST, 74, REST, 76, REST, 77, REST, 79, REST,
      81, REST, 79, REST, 77, REST, 76, REST, 74, REST, REST, REST, REST, REST, REST, REST,
    ],
    chords: [D_MINOR, A_MINOR, F_MAJOR, G_MAJOR],
  },
}

function stepSeconds(track: Track): number {
  return 60 / track.bpm / 2
}

function frequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

function playTone(
  context: AudioContext,
  output: AudioNode,
  midi: number,
  time: number,
  length: number,
  type: OscillatorType,
  volume: number,
): void {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = type
  oscillator.frequency.value = frequency(midi)
  gain.gain.setValueAtTime(volume, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + length)
  oscillator.connect(gain).connect(output)
  oscillator.start(time)
  oscillator.stop(time + length)
}

const WIN_NOTES = [72, 76, 79, 84, 79, 84, 88]
const LOSE_NOTES = [69, 67, 64, 62, 60, 57]
const WIN_STEP_SECONDS = 0.14
const LOSE_STEP_SECONDS = 0.34
const KNOCK_GAP_SECONDS = 0.16

function playKnock(context: AudioContext, output: AudioNode, time: number): void {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'triangle'
  oscillator.frequency.setValueAtTime(190, time)
  oscillator.frequency.exponentialRampToValueAtTime(60, time + 0.08)
  gain.gain.setValueAtTime(0.9, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11)
  oscillator.connect(gain).connect(output)
  oscillator.start(time)
  oscillator.stop(time + 0.12)
}

function scheduleStep(
  context: AudioContext,
  output: AudioNode,
  track: Track,
  step: number,
  time: number,
): void {
  const length = stepSeconds(track)
  const note = track.melody[step % track.melody.length]
  if (note !== REST) playTone(context, output, note, time, length * 1.8, 'square', 0.035)
  const position = step % (STEPS_PER_CHORD * track.chords.length)
  const chord = track.chords[Math.floor(position / STEPS_PER_CHORD)]
  const inChord = position % STEPS_PER_CHORD
  if (inChord % 8 === 0) playTone(context, output, chord[0], time, length * 3.6, 'triangle', 0.14)
  if (inChord % 2 === 1) {
    playTone(context, output, chord[1 + (inChord >> 1) % 3], time, length, 'triangle', 0.05)
  }
}

export type Effect = 'card' | 'meld' | 'tick' | 'chime'

const EFFECTS: Record<Effect, { notes: number[]; step: number; type: OscillatorType; volume: number }> = {
  card: { notes: [84], step: 0.05, type: 'triangle', volume: 0.08 },
  meld: { notes: [72, 76, 79], step: 0.07, type: 'square', volume: 0.05 },
  tick: { notes: [96], step: 0.03, type: 'square', volume: 0.04 },
  chime: { notes: [79, 84, 88], step: 0.09, type: 'triangle', volume: 0.1 },
}

export interface Music {
  play: () => void
  pause: () => void
  effect: (id: Effect) => void
  knock: () => void
  jingle: (won: boolean) => void
  setTrack: (id: TrackId) => void
}

export function createMusic(initial: TrackId = 'intro'): Music | null {
  if (typeof AudioContext === 'undefined') return null
  let context: AudioContext | null = null
  let output: GainNode | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  let step = 0
  let track = TRACKS[initial]
  let nextTime = 0

  const tick = () => {
    if (!context || !output) return
    while (nextTime < context.currentTime + LOOKAHEAD_SECONDS) {
      scheduleStep(context, output, track, step, nextTime)
      step += 1
      nextTime += stepSeconds(track)
    }
  }

  return {
    play() {
      if (!context) {
        context = new AudioContext()
        output = context.createGain()
        output.gain.value = MASTER_VOLUME
        output.connect(context.destination)
        nextTime = context.currentTime + 0.05
      }
      void context.resume()
      timer ??= setInterval(tick, TICK_MS)
    },
    pause() {
      if (timer !== null) clearInterval(timer)
      timer = null
      void context?.suspend()
    },
    setTrack(id) {
      if (track === TRACKS[id]) return
      track = TRACKS[id]
      step = 0
    },
    effect(id) {
      if (!context || !output) return
      const { notes, step, type, volume } = EFFECTS[id]
      const start = context.currentTime
      notes.forEach((note, index) => {
        playTone(context!, output!, note, start + index * step, step * 2, type, volume)
      })
    },
    knock() {
      if (!context || !output) return
      const time = context.currentTime
      playKnock(context, output, time)
      playKnock(context, output, time + KNOCK_GAP_SECONDS)
    },
    jingle(won) {
      if (!context || !output) return
      const notes = won ? WIN_NOTES : LOSE_NOTES
      const length = won ? WIN_STEP_SECONDS : LOSE_STEP_SECONDS
      const start = context.currentTime + 0.05
      notes.forEach((note, index) => {
        const time = start + index * length
        playTone(context!, output!, note, time, length * 1.6, won ? 'square' : 'triangle', 0.07)
      })
      nextTime = start + notes.length * length + 1
    },
  }
}
