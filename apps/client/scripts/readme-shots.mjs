import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const BASE = 'http://localhost:5199/carioca/'
const OUT = resolve(import.meta.dirname, '../../../docs/screenshots')
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 520, height: 1000 }, deviceScaleFactor: 2 })
const page = await context.newPage()
await page.goto(BASE)
await page.evaluate(() => {
  localStorage.clear()
  localStorage.setItem('preferred-lang', 'en')
  localStorage.setItem('music', 'off')
})
await page.reload()
await page.waitForTimeout(800)
const intro = page.getByRole('button', { name: /got it|close|skip/i })
if (await intro.count()) await intro.first().click().catch(() => {})
await page.getByRole('button', { name: 'Easy', exact: true }).click()
await page.screenshot({ path: `${OUT}/home.png`, fullPage: true })

await page.getByRole('button', { name: 'Rules', exact: true }).click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/rules.png` })
await page.keyboard.press('Escape')
await page.waitForTimeout(300)

await page.getByRole('button', { name: '4 players', exact: true }).click()
await page.waitForTimeout(6000)
for (const name of [/got it/i, /start/i, /deal/i, /continue/i]) {
  const button = page.getByRole('button', { name })
  if (await button.count()) await button.first().click().catch(() => {})
}

let laid = false
for (let turn = 0; turn < 40; turn++) {
  const deck = page.locator('[data-source="deck"]')
  await page.waitForFunction(() => /Your turn/.test(document.body.innerText), null, { timeout: 60000 }).catch(() => {})
  const enabled = await deck.isEnabled().catch(() => false)
  if (!enabled) { await page.waitForTimeout(1000); continue }
  await deck.click()
  await page.waitForTimeout(250)
  await deck.click()
  await page.waitForTimeout(900)
  if (!laid) {
    await page.getByRole('button', { name: 'Suggest', exact: true }).click()
    await page.waitForTimeout(400)
    const lay = page.getByRole('button', { name: 'Lay down', exact: true })
    if (await lay.isEnabled()) {
      await lay.click()
      await page.waitForTimeout(1500)
      laid = (await page.locator('text=Down').count()) > 0 && !(await page.locator('text=/doesn|don’t|first turn|Draw a card/').count())
    }
  }
  const card = page.locator('[data-card]').last()
  await card.click()
  await page.waitForTimeout(250)
  await card.click()
  await page.waitForTimeout(700)
  if ((await page.locator('[data-meld-card]').count()) >= 12) {
    await page.screenshot({ path: `${OUT}/table.png`, fullPage: true })
    break
  }
  await page.waitForTimeout(800)
}
await browser.close()
