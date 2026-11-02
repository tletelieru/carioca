export const plainFontKey = 'plain-font'

export function readPlainFont(): boolean {
  return localStorage.getItem(plainFontKey) === 'on'
}

export const reduceMotionKey = 'reduce-motion'

export function readReduceMotion(): boolean {
  return localStorage.getItem(reduceMotionKey) === 'on'
}
