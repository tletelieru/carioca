export type ColorMode = 'light' | 'dark'

export const colorModeKey = 'color-mode'

export function pickColorMode(saved: string | null, prefersDark: boolean): ColorMode {
  if (saved === 'light' || saved === 'dark') return saved
  return prefersDark ? 'dark' : 'light'
}

export function prefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}
