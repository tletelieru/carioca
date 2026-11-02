import { useMessages } from '../i18n/messages'
import { GearIcon, InstallIcon } from './icons'

interface Props {
  onInstall: (() => void) | null
  settingsOpen: boolean
  onSettings: () => void
}

const iconButton = 'flex size-9 shrink-0 items-center justify-center pixel-box text-muted'

export function Header({ onInstall, settingsOpen, onSettings }: Props) {
  const t = useMessages()

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
