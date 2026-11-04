import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.FLIGHT_URL ?? 'http://localhost:5199/carioca/'
const OUT = resolve(import.meta.dirname, '../../../.flight-frames')
const ENGINE = '/carioca/@fs/C:/Users/Tundra/ox/carioca/packages/engine/src/index.ts'
const only = process.argv.slice(2)

const scenarios = {
  'my-draw-deck': {
    spec: { turn: 0, phase: 'draw' },
    run: async (page) => {
      await page.click('[data-source="deck"]')
      await page.waitForTimeout(250)
      await page.click('[data-source="deck"]')
    },
    record: 900,
  },
  'my-draw-discard': {
    spec: { turn: 0, phase: 'draw' },
    run: async (page) => {
      await page.click('[data-source="discard"]')
      await page.waitForTimeout(250)
      await page.click('[data-source="discard"]')
    },
    record: 900,
  },
  'my-discard': {
    spec: { turn: 0, phase: 'play', extra: 1 },
    run: async (page) => {
      const card = page.locator('[data-card]').nth(4)
      await card.click()
      await page.waitForTimeout(250)
      await card.click()
    },
    record: 900,
  },
  'my-lay-down': {
    spec: { turn: 0, phase: 'play', mine: ['5-hearts-0', '5-spades-0', '5-clubs-0', '9-hearts-0', '9-diamonds-0', '9-clubs-0'], extra: 1 },
    run: async (page) => {
      await page.getByRole('button', { name: 'Pick several', exact: true }).click()
      for (const id of ['5-hearts-0', '5-spades-0', '5-clubs-0']) await page.click(`[data-card="${id}"]`)
      await page.getByRole('button', { name: 'Group', exact: true }).click()
      for (const id of ['9-hearts-0', '9-diamonds-0', '9-clubs-0']) await page.click(`[data-card="${id}"]`)
      await page.getByRole('button', { name: 'Group', exact: true }).click()
      await page.waitForTimeout(250)
      await page.getByRole('button', { name: 'Lay down', exact: true }).click()
    },
    record: 2600,
  },
  'my-add': {
    spec: {
      turn: 0,
      phase: 'play',
      mine: ['8-spades-0', '8-diamonds-1'],
      trio: { owner: 1, cards: ['8-hearts-0', '8-clubs-0', '8-diamonds-0'] },
      laidDown: [true, true, false],
      extra: 1,
    },
    run: async (page) => {
      await page.getByRole('button', { name: 'Pick several', exact: true }).click()
      await page.click('[data-card="8-spades-0"]')
      await page.click('[data-card="8-diamonds-1"]')
      await page.waitForTimeout(250)
      await page.getByRole('button', { name: /^Trio:/ }).click()
    },
    record: 900,
  },
  'my-go-out': {
    spec: {
      turn: 0,
      phase: 'play',
      sizes: [1, 9, 12],
      trio: { owner: 0, cards: ['8-hearts-0', '8-clubs-0', '8-diamonds-0'] },
      laidDown: [true, false, false],
    },
    run: async (page) => {
      const card = page.locator('[data-card]').first()
      await card.click()
      await page.waitForTimeout(250)
      await card.click()
    },
    record: 1400,
  },
  'bot-go-out': {
    spec: {
      turn: 1,
      phase: 'play',
      sizes: [12, 1, 12],
      trio: { owner: 1, cards: ['8-hearts-0', '8-clubs-0', '8-diamonds-0'] },
      laidDown: [false, true, false],
    },
    record: 1800,
  },
  'bot-draw': {
    spec: { turn: 1, phase: 'draw' },
    record: 1800,
  },
  'bot-discard': {
    spec: { turn: 1, phase: 'play', botFirstTurn: true, extra: 1 },
    record: 1500,
  },
  'bot-lay-down': {
    spec: {
      turn: 1,
      phase: 'play',
      bot: ['4-hearts-0', '4-spades-0', '4-clubs-0', '12-hearts-0', '12-diamonds-0', '12-clubs-0'],
      extra: 1,
    },
    record: 3200,
  },
}

async function seed(page, spec) {
  await page.evaluate(
    async ({ spec, engine }) => {
      const { createMatch, cardId } = await import(engine)
      const base = createMatch({ players: 3 }, 21)
      const pool = [...base.hands.flat(), ...base.deck, ...base.discard]
      const take = (id) => {
        const index = pool.findIndex((card) => cardId(card) === id)
        return pool.splice(index, 1)[0]
      }
      const reserved = [...(spec.mine ?? []), ...(spec.bot ?? []), ...(spec.trio?.cards ?? [])].map(take)
      const byId = new Map(reserved.map((card) => [cardId(card), card]))
      const isTrio = (card) => card.kind === 'suited' && [4, 5, 8, 9, 12].includes(card.rank)
      const filler = (count) => {
        const picked = []
        for (let index = 0; picked.length < count && index < pool.length; ) {
          if (isTrio(pool[index])) index += 1
          else picked.push(pool.splice(index, 1)[0])
        }
        return picked
      }
      const size = (seat) => spec.sizes?.[seat] ?? 12 + (spec.turn === seat && spec.phase === 'play' ? spec.extra ?? 0 : 0)
      const mine = (spec.mine ?? []).map((id) => byId.get(id))
      const bot = (spec.bot ?? []).map((id) => byId.get(id))
      const hands = [
        [...mine, ...filler(size(0) - mine.length)],
        [...bot, ...filler(size(1) - bot.length)],
        filler(12),
      ]
      const discard = filler(3)
      const melds = spec.trio
        ? [{ kind: 'trio', cards: spec.trio.cards.map((id) => byId.get(id)), id: 0, owner: spec.trio.owner, start: 8 }]
        : []
      const log = [0, 1, 2]
        .filter((seat) => !(spec.botFirstTurn && seat === 1))
        .map((seat) => ({ type: 'discard', seat, card: discard[0] }))
      const state = {
        ...base,
        dealer: 2,
        turn: spec.turn,
        phase: spec.phase,
        hands,
        deck: pool,
        discard,
        melds,
        laidDown: spec.laidDown ?? [false, false, false],
        nextMeld: melds.length,
        taken: null,
        laidThisTurn: false,
        log,
      }
      localStorage.clear()
      localStorage.setItem('preferred-lang', 'en')
      localStorage.setItem('music', 'off')
      localStorage.setItem('saved-match', JSON.stringify({ state, seed: 21, level: 'medium' }))
    },
    { spec, engine: ENGINE },
  )
}

async function record(page, name, scenario) {
  const dir = join(OUT, name)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const client = await page.context().newCDPSession(page)
  const frames = []
  client.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    frames.push({ data, time: metadata.timestamp })
    client.send('Page.screencastFrameAck', { sessionId }).catch(() => undefined)
  })
  const go = async () => {
    await client.send('Page.startScreencast', { format: 'jpeg', quality: 70, everyNthFrame: 2 })
    const started = Date.now()
    if (scenario.run) await scenario.run(page)
    await page.waitForTimeout(Math.max(0, scenario.record - (Date.now() - started) + 600))
    await client.send('Page.stopScreencast')
  }
  if (scenario.run) {
    await page.reload()
    await page.waitForSelector('[data-card]')
    await page.waitForTimeout(400)
    await go()
  } else {
    await client.send('Page.startScreencast', { format: 'jpeg', quality: 70, everyNthFrame: 2 })
    await page.reload()
    await page.waitForTimeout(scenario.record + 1500)
    await client.send('Page.stopScreencast')
  }
  const first = frames[0]?.time ?? 0
  frames.forEach((frame, index) => {
    const ms = Math.round((frame.time - first) * 1000)
    writeFileSync(join(dir, `${String(index).padStart(3, '0')}-${String(ms).padStart(5, '0')}ms.jpg`), Buffer.from(frame.data, 'base64'))
  })
  console.log(name, frames.length, 'frames')
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 400, height: 800 }, serviceWorkers: 'block' })
const page = await context.newPage()
page.on('pageerror', (error) => console.error('pageerror', error.message))
await page.goto(BASE)
for (const [name, scenario] of Object.entries(scenarios)) {
  if (only.length > 0 && !only.includes(name)) continue
  await page.goto(BASE)
  await seed(page, scenario.spec)
  await record(page, name, scenario)
}
await browser.close()
