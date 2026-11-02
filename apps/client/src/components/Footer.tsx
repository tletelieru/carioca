import { useMessages } from '../i18n/messages'
import { GitHubIcon } from './icons'

const GITHUB_URL = 'https://github.com/tletelieru'
const SITE_URL = 'https://tletelieru.github.io/tletelieru/'

export function Footer() {
  const t = useMessages()

  return (
    <footer className="mt-auto flex items-center justify-center gap-1 pt-2 text-sm text-muted">
      <span>
        {t.developedBy}{' '}
        <a href={SITE_URL} target="_blank" rel="noreferrer" className="text-accent underline">
          tletelieru
        </a>
      </span>
      <a href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label="GitHub" className="p-1">
        <GitHubIcon />
      </a>
    </footer>
  )
}
