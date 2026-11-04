import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('switches language', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /settings|ajustes/i }))
    await userEvent.click(screen.getByRole('button', { name: 'ES' }))
    expect(screen.getByText("Diez rondas de tríos y escalas, cada una con su contrato, contra bots.")).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'EN' }))
    expect(screen.getByText("Ten rounds of trios and runs, each with its own contract, against bots.")).toBeTruthy()
  })

  it('toggles dark mode', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /settings|ajustes/i }))
    await userEvent.click(screen.getByRole('button', { name: /dark mode|modo oscuro/i }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('color-mode')).toBe('dark')
  })

  it('opens settings as a modal and closes it from outside', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /settings|ajustes/i }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    await userEvent.click(screen.getByTestId('overlay-backdrop'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows the rules from the start screen and from settings', async () => {
    localStorage.setItem('preferred-lang', 'en')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Rules' }))
    const rules = screen.getByRole('dialog', { name: 'Rules' })
    await userEvent.click(within(rules).getByRole('button', { name: "Rounds" }))
    expect(screen.getByText("1. Two trios.")).toBeTruthy()
    expect(screen.getByText("9. Crazy run: 13 cards in a row, one of each number, suits mixed.")).toBeTruthy()
    expect(screen.getByText("10. Royal run: all 13 cards of one suit.")).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    const settings = screen.getByRole('dialog', { name: 'Settings' })
    await userEvent.click(within(settings).getByRole('button', { name: 'Rules' }))
    expect(screen.getByRole('dialog', { name: 'Rules' })).toBeTruthy()
  })

  it('saves the four color setting and applies it', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /settings|ajustes/i }))
    await userEvent.click(screen.getByRole('checkbox', { name: /four|cuatro/i }))
    expect(document.documentElement.classList.contains('four-colors')).toBe(true)
    expect(localStorage.getItem('four-colors')).toBe('on')
  })

  it('mutes the music from settings', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /settings|ajustes/i }))
    await userEvent.click(screen.getByRole('button', { name: /turn music off|apagar música/i }))
    expect(localStorage.getItem('music')).toBe('off')
    expect(screen.getByRole('button', { name: /turn music on|encender música/i })).toBeTruthy()
  })

  it('starts a match with every player count from 2 to 5', async () => {
    localStorage.setItem('preferred-lang', 'en')
    render(<App />)
    for (const players of [2, 3, 4, 5]) {
      expect(screen.getByRole('button', { name: `${players} players` })).toBeTruthy()
    }
  })

  it('switches to the plain font', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /settings|ajustes/i }))
    await userEvent.click(screen.getByRole('checkbox', { name: /plain font|letra normal/i }))
    expect(document.documentElement.classList.contains('plain-font')).toBe(true)
    expect(localStorage.getItem('plain-font')).toBe('on')
  })

  it('scales the text and turns animations off', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /settings|ajustes/i }))
    await userEvent.click(screen.getByRole('button', { name: /extra large|muy grande/i }))
    expect(document.documentElement.style.fontSize).toBe('130%')
    await userEvent.click(screen.getByRole('checkbox', { name: /animations|animaciones/i }))
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(true)
  })

  it('links the other games from the side column', () => {
    localStorage.setItem('preferred-lang', 'en')
    render(<App />)
    const others = screen.getByRole('complementary', { name: 'Other games' })
    const links = within(others).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      'https://tletelieru.github.io/7-de-trebol/',
      'https://tletelieru.github.io/brisca/',
      'https://tletelieru.github.io/escoba/',
      'https://tletelieru.github.io/uno/',
      'https://tletelieru.github.io/tele/',
    ])
    expect(within(others).queryByRole('link', { name: /Carioca/ })).toBeNull()
  })

  it('opens the other games from the header', async () => {
    localStorage.setItem('preferred-lang', 'en')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Other games' }))
    const dialog = screen.getByRole('dialog', { name: 'Other games' })
    const links = within(dialog).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      'https://tletelieru.github.io/7-de-trebol/',
      'https://tletelieru.github.io/brisca/',
      'https://tletelieru.github.io/escoba/',
      'https://tletelieru.github.io/uno/',
      'https://tletelieru.github.io/tele/',
    ])
    expect(within(dialog).queryByRole('link', { name: /Carioca/ })).toBeNull()
  })

  it('hides the other games from settings', async () => {
    localStorage.setItem('preferred-lang', 'en')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /^Show other games/ }))
    expect(localStorage.getItem('other-games')).toBe('off')
    expect(screen.queryByRole('complementary', { name: 'Other games' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Other games' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Show other games' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('toggles the side column from the header in sync with settings', async () => {
    localStorage.setItem('preferred-lang', 'en')
    render(<App />)
    const hide = screen.getByRole('button', { name: 'Hide other games' })
    expect(hide.getAttribute('aria-pressed')).toBe('true')
    await userEvent.click(hide)
    expect(screen.queryByRole('complementary', { name: 'Other games' })).toBeNull()
    expect(localStorage.getItem('other-games')).toBe('off')
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    const setting = screen.getByRole('checkbox', { name: /^Show other games/ })
    expect((setting as HTMLInputElement).checked).toBe(false)
    await userEvent.click(setting)
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('complementary', { name: 'Other games' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Hide other games' }).getAttribute('aria-pressed')).toBe('true')
    await userEvent.click(screen.getByRole('button', { name: 'Hide other games' }))
    await userEvent.click(screen.getByRole('button', { name: 'Show other games' }))
    expect(screen.getByRole('complementary', { name: 'Other games' })).toBeTruthy()
    expect(localStorage.getItem('other-games')).toBe('on')
  })
})
