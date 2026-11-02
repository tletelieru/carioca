import { useMessages } from '../i18n/messages'

interface Props {
  onRules: () => void
}

export function Home({ onRules }: Props) {
  const t = useMessages()

  return (
    <main className="flex flex-col items-center gap-6">
      <img
        src={`${import.meta.env.BASE_URL}favicon.svg`}
        alt=""
        className="hero-icon mt-6 size-32"
      />
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-pixel text-6xl leading-none">{t.appName}</h1>
        <p className="text-muted">{t.tagline}</p>
      </div>
      <dl className="grid w-full grid-cols-2 gap-2">
        <div className="flex flex-col items-center gap-1 pixel-box bg-surface p-3 text-center">
          <dt className="text-sm text-muted">{t.players}</dt>
          <dd className="font-pixel text-3xl leading-none text-gold">{t.playerRange}</dd>
        </div>
        <div className="flex flex-col items-center gap-1 pixel-box bg-surface p-3 text-center">
          <dt className="text-sm text-muted">{t.deck}</dt>
          <dd className="text-sm leading-tight">{t.deckName}</dd>
        </div>
      </dl>
      <section className="flex w-full flex-col items-center gap-3 pixel-box bg-surface p-4 text-center">
        <button
          type="button"
          disabled
          className="w-full pixel-box bg-accent py-3 font-pixel text-2xl leading-none text-on-accent opacity-60"
        >
          {t.soon}
        </button>
        <p className="text-sm text-muted">{t.soonHint}</p>
        <button
          type="button"
          onClick={onRules}
          className="w-full pixel-box bg-raised py-2 font-medium"
        >
          {t.rules}
        </button>
      </section>
    </main>
  )
}
