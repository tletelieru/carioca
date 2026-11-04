import { SUITS } from '@carioca/engine'
import { locales } from '../i18n/locales'
import type { Locale } from '../i18n/locales'
import { useLocale, useMessages } from '../i18n/messages'
import { SUIT_ON_CARD, SUIT_SYMBOL } from '../lib/cards'
import { textSizes } from '../lib/textSize'
import type { TextSize } from '../lib/textSize'
import type { ColorMode } from '../lib/theme'
import { MoonIcon, MusicIcon, MusicOffIcon, SunIcon } from './icons'
import { Overlay } from './Overlay'

interface Props {
  mode: ColorMode
  onToggleMode: () => void
  onLocale: (locale: Locale) => void
  fourColors: boolean
  onFourColors: (next: boolean) => void
  textSize: TextSize
  onTextSize: (next: TextSize) => void
  reduceMotion: boolean
  onReduceMotion: (next: boolean) => void
  howTo: boolean
  onHowTo: (next: boolean) => void
  musicOn: boolean
  onMusic: (next: boolean) => void
  plainFont: boolean
  onPlainFont: (next: boolean) => void
  onRules: () => void
  otherGames: boolean
  onOtherGames: (next: boolean) => void
  onClose: () => void
}

const iconButton = 'flex size-10 shrink-0 items-center justify-center pixel-box bg-raised'

const SAMPLE: Record<TextSize, string> = {
  normal: 'text-sm',
  large: 'text-lg',
  xlarge: 'text-2xl',
}

export function Settings({
  mode,
  onToggleMode,
  onLocale,
  fourColors,
  onFourColors,
  textSize,
  onTextSize,
  reduceMotion,
  onReduceMotion,
  howTo,
  onHowTo,
  musicOn,
  onMusic,
  plainFont,
  onPlainFont,
  onRules,
  otherGames,
  onOtherGames,
  onClose,
}: Props) {
  const t = useMessages()
  const locale = useLocale()
  const modeLabel = mode === 'dark' ? t.toLight : t.toDark
  const musicLabel = musicOn ? t.musicOff : t.musicOnLabel
  const iconActions = [
    {
      label: musicLabel,
      pressed: musicOn,
      onClick: () => onMusic(!musicOn),
      icon: musicOn ? <MusicIcon /> : <MusicOffIcon />,
    },
    {
      label: modeLabel,
      pressed: undefined,
      onClick: onToggleMode,
      icon: mode === 'dark' ? <SunIcon /> : <MoonIcon />,
    },
  ]
  const toggles = [
    { label: t.howTo, hint: t.howToHint, checked: howTo, onChange: onHowTo },
    { label: t.plainFont, hint: t.plainFontHint, checked: plainFont, onChange: onPlainFont },
    { label: t.showOtherGames, hint: t.showOtherGamesHint, checked: otherGames, onChange: onOtherGames },
    { label: t.reduceMotion, hint: t.reduceMotionHint, checked: reduceMotion, onChange: onReduceMotion },
    { label: t.fourColors, hint: t.fourColorsHint, checked: fourColors, onChange: onFourColors },
  ]

  return (
    <Overlay title={t.settings} onClose={onClose}>
      <div className="flex items-center justify-center gap-2">
        <div role="group" aria-label={t.language} className="flex pixel-box bg-raised p-0.5">
          {locales.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={locale === option}
              onClick={() => onLocale(option)}
              className={`pixel-box px-3 py-1.5 text-sm ${
                locale === option ? 'bg-accent text-on-accent' : 'text-muted'
              }`}
            >
              {option.toUpperCase()}
            </button>
          ))}
        </div>
        {iconActions.map(({ label, pressed, onClick, icon }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            aria-pressed={pressed}
            title={label}
            onClick={onClick}
            className={iconButton}
          >
            {icon}
          </button>
        ))}
      </div>
      <div role="group" aria-label={t.textSize} className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t.textSize}</span>
        <div className="grid grid-cols-3 gap-1.5">
          {textSizes.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={textSize === option}
              onClick={() => onTextSize(option)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 pixel-box px-1 py-1.5 text-xs font-medium ${
                textSize === option ? 'bg-accent text-on-accent' : 'bg-raised text-muted'
              }`}
            >
              <span aria-hidden="true" className={`leading-none font-bold ${SAMPLE[option]}`}>
                A
              </span>
              {t.textSizes[option]}
            </button>
          ))}
        </div>
      </div>
      {toggles.map(({ label, hint, checked, onChange }) => (
        <label key={label} className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
            className="pixel-check"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{label}</span>
            <span className="block text-xs text-muted">{hint}</span>
          </span>
        </label>
      ))}
      <div aria-hidden="true" className="flex justify-center gap-2">
        {SUITS.map((suit) => (
          <span
            key={suit}
            className={`flex size-9 items-center justify-center pixel-box bg-card text-2xl ${SUIT_ON_CARD[suit]}`}
          >
            {SUIT_SYMBOL[suit]}
          </span>
        ))}
      </div>
      {[
        { label: t.rules, onClick: onRules },
        { label: t.close, onClick: onClose },
      ].map(({ label, onClick }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          className="pixel-box bg-raised py-2 font-medium"
        >
          {label}
        </button>
      ))}
    </Overlay>
  )
}
