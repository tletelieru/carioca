import { useCallback, useEffect, useState } from 'react'

interface InstallPrompt extends Event {
  prompt: () => Promise<void>
}

export function useInstall() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)

  // eslint-disable-next-line local/no-effect -- subscribes to the browser install prompt events
  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault()
      setPrompt(event as InstallPrompt)
    }
    const clear = () => setPrompt(null)
    window.addEventListener('beforeinstallprompt', capture)
    window.addEventListener('appinstalled', clear)
    return () => {
      window.removeEventListener('beforeinstallprompt', capture)
      window.removeEventListener('appinstalled', clear)
    }
  }, [])

  const install = useCallback(async () => {
    await prompt?.prompt()
    setPrompt(null)
  }, [prompt])

  return prompt ? install : null
}
