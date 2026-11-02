export const textSizes = ['normal', 'large', 'xlarge'] as const

export type TextSize = (typeof textSizes)[number]

export const textSizeKey = 'text-size'

export const textSizeScale: Record<TextSize, string> = {
  normal: '100%',
  large: '115%',
  xlarge: '130%',
}

export function pickTextSize(saved: string | null): TextSize {
  return textSizes.find((size) => size === saved) ?? 'normal'
}
