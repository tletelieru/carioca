import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/vt323/400.css'
import './index.css'
import App from './App.tsx'

const FONT_WAIT_MS = 1000

function mount() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

const timeout = new Promise((resolve) => setTimeout(resolve, FONT_WAIT_MS))
Promise.race([document.fonts.load('1em VT323'), timeout]).finally(mount)
