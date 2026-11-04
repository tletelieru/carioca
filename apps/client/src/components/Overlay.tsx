import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface Props {
  title: string
  translucent?: boolean
  parchment?: boolean
  onClose?: () => void
  children: ReactNode
}

export function Overlay({
  title,
  translucent = false,
  parchment = false,
  onClose,
  children,
}: Props) {
  const backdrop = translucent ? 'bg-black/40' : 'bg-black/60'
  const fill = translucent ? 'bg-surface/90 backdrop-blur-md' : 'bg-surface'

  // eslint-disable-next-line local/no-effect -- subscribes to the Escape key on window while the overlay is open
  useEffect(() => {
    if (!onClose) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const heading = <h2 className="font-pixel text-3xl leading-none">{title}</h2>

  return (
    <div
      data-testid="overlay-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
      className={`overlay-fade fixed inset-0 z-20 flex items-center justify-center p-4 ${backdrop}`}
    >
      {parchment ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="overlay-pop parchment pixel-panel flex max-h-full w-full max-w-md flex-col gap-3 overflow-y-auto p-5"
        >
          {heading}
          {children}
        </div>
      ) : (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`overlay-pop pixel-panel flex max-h-full w-full max-w-md flex-col gap-3 overflow-y-auto p-4 ${fill}`}
        >
          {heading}
          {children}
        </div>
      )}
    </div>
  )
}
