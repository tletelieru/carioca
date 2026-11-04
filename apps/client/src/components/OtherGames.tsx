import { useLocale, useMessages } from '../i18n/messages'
import { OTHER_GAMES, sideColumn } from '../lib/otherGames'
import type { TextSize } from '../lib/textSize'
import { Overlay } from './Overlay'

function GameLinks({ fill }: { fill: string }) {
  const locale = useLocale()

  return (
    <ul className="flex flex-col gap-3">
      {OTHER_GAMES.map((game) => (
        <li key={game.slug}>
          <a href={game.url} className={`flex items-center gap-4 pixel-box px-4 py-3 ${fill}`}>
            <img
              src={`${import.meta.env.BASE_URL}games/${game.slug}.svg`}
              alt=""
              width={48}
              height={48}
              className="size-12 shrink-0 [image-rendering:pixelated]"
            />
            <span className="flex min-w-0 flex-col gap-1.5">
              <span className="font-pixel text-xl leading-none">{game.name}</span>
              <span className="text-xs leading-snug text-muted">{game.tagline[locale]}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}

export function OtherGamesAside({ textSize }: { textSize: TextSize }) {
  const t = useMessages()

  return (
    <aside
      aria-label={t.otherGames}
      className={`absolute inset-y-0 left-full ml-4 hidden w-64 ${sideColumn[textSize].show}`}
    >
      <div className="sticky top-4 flex flex-col gap-3">
        <h2 className="font-pixel text-2xl leading-none">{t.otherGames}</h2>
        <GameLinks fill="bg-surface" />
      </div>
    </aside>
  )
}

export function OtherGamesDialog({ onClose }: { onClose: () => void }) {
  const t = useMessages()

  return (
    <Overlay title={t.otherGames} onClose={onClose}>
      <GameLinks fill="bg-raised" />
      <button type="button" onClick={onClose} className="pixel-box bg-raised py-2 font-medium">
        {t.close}
      </button>
    </Overlay>
  )
}
