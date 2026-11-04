import { useMessages } from '../i18n/messages'
import { sideColumn } from '../lib/otherGames'
import type { TextSize } from '../lib/textSize'
import { GamesIcon, GamesOffIcon, GearIcon, InstallIcon } from './icons'

interface OtherGamesButtons {
  on: boolean
  onOpen: () => void
  onToggle: (() => void) | null
}

interface Props {
  onInstall: (() => void) | null
  otherGames: OtherGamesButtons
  textSize: TextSize
  settingsOpen: boolean
  onSettings: () => void
}

const iconShape = 'size-9 shrink-0 items-center justify-center pixel-box text-muted'
const iconButton = `flex ${iconShape}`

export function Header({ onInstall, otherGames, textSize, settingsOpen, onSettings }: Props) {
  const t = useMessages()
  const { on, onOpen, onToggle } = otherGames
  const toggleLabel = on ? t.hideOtherGames : t.showOtherGames
  const openClass = onToggle ? `${iconButton} ${sideColumn[textSize].hide}` : iconButton

  return (
    <header className="flex items-center gap-2">
      <img
        src={`${import.meta.env.BASE_URL}favicon.svg`}
        alt=""
        className="size-8 shrink-0"
      />
      <span className="min-w-0 flex-1 truncate font-pixel text-2xl">{t.appName}</span>
      {onInstall && (
        <button
          type="button"
          aria-label={t.install}
          title={t.install}
          onClick={onInstall}
          className={iconButton}
        >
          <InstallIcon />
        </button>
      )}
      <button
        type="button"
        aria-label={t.otherGames}
        title={t.otherGames}
        onClick={onOpen}
        className={openClass}
      >
        <GamesIcon />
      </button>
      {onToggle && (
        <button
          type="button"
          aria-label={toggleLabel}
          aria-pressed={on}
          title={toggleLabel}
          onClick={onToggle}
          className={`hidden ${iconShape} ${sideColumn[textSize].flex}`}
        >
          {on ? <GamesIcon /> : <GamesOffIcon />}
        </button>
      )}
      <button
        type="button"
        aria-label={t.settings}
        aria-expanded={settingsOpen}
        title={t.settings}
        onClick={onSettings}
        className={iconButton}
      >
        <GearIcon />
      </button>
    </header>
  )
}
