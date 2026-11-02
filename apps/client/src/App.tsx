import { useLayoutEffect, useState } from 'react'
import { useInstall } from './useInstall'
import { pickLocale, preferredLocaleKey } from './i18n/locales'
import type { Locale } from './i18n/locales'
import { LocaleContext } from './i18n/messages'
import { plainFontKey, readPlainFont, readReduceMotion, reduceMotionKey } from './lib/settings'
import { pickTextSize, textSizeKey, textSizeScale } from './lib/textSize'
import type { TextSize } from './lib/textSize'
import { colorModeKey, pickColorMode, prefersDark } from './lib/theme'
import type { ColorMode } from './lib/theme'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Home } from './components/Home'
import { Rules } from './components/Rules'
import { Settings } from './components/Settings'

export default function App() {
  const install = useInstall()
  const [locale, setLocale] = useState<Locale>(() =>
    pickLocale(localStorage.getItem(preferredLocaleKey), navigator.languages),
  )
  const [mode, setMode] = useState<ColorMode>(() =>
    pickColorMode(localStorage.getItem(colorModeKey), prefersDark()),
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(readReduceMotion)
  const [plainFont, setPlainFont] = useState(readPlainFont)
  const [textSize, setTextSize] = useState<TextSize>(() =>
    pickTextSize(localStorage.getItem(textSizeKey)),
  )

  useLayoutEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.classList.toggle('dark', mode === 'dark')
    document.documentElement.classList.toggle('reduce-motion', reduceMotion)
    document.documentElement.classList.toggle('plain-font', plainFont)
    document.documentElement.style.colorScheme = mode
    document.documentElement.style.fontSize = textSizeScale[textSize]
  }, [locale, mode, reduceMotion, plainFont, textSize])

  return (
    <LocaleContext value={locale}>
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-3 p-4">
        <Header
          onInstall={install}
          settingsOpen={settingsOpen}
          onSettings={() => setSettingsOpen(true)}
        />
        {settingsOpen && (
          <Settings
            mode={mode}
            onToggleMode={() => {
              const next = mode === 'dark' ? 'light' : 'dark'
              localStorage.setItem(colorModeKey, next)
              setMode(next)
            }}
            onLocale={(next) => {
              localStorage.setItem(preferredLocaleKey, next)
              setLocale(next)
            }}
            textSize={textSize}
            onTextSize={(next) => {
              localStorage.setItem(textSizeKey, next)
              setTextSize(next)
            }}
            reduceMotion={reduceMotion}
            onReduceMotion={(next) => {
              localStorage.setItem(reduceMotionKey, next ? 'on' : 'off')
              setReduceMotion(next)
            }}
            plainFont={plainFont}
            onPlainFont={(next) => {
              localStorage.setItem(plainFontKey, next ? 'on' : 'off')
              setPlainFont(next)
            }}
            onRules={() => {
              setSettingsOpen(false)
              setRulesOpen(true)
            }}
            onClose={() => setSettingsOpen(false)}
          />
        )}
        {rulesOpen && <Rules onClose={() => setRulesOpen(false)} />}
        <Home onRules={() => setRulesOpen(true)} />
        <Footer />
      </div>
    </LocaleContext>
  )
}
