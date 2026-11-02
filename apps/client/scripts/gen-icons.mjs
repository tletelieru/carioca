import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
const svg = readFileSync(join(pub, 'favicon.svg'))

async function render(size, out, background) {
  let img = sharp(svg, { density: 384 }).resize(size, size, {
    fit: 'contain',
    background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
  })
  if (background) {
    img = img.flatten({ background })
  }
  await img.png().toFile(join(pub, out))
  console.log('wrote', out)
}

async function renderMaskable(size, out, background) {
  const pad = Math.round(size * 0.14)
  const inner = size - pad * 2
  const icon = await sharp(svg, { density: 384 })
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  await sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: icon, top: pad, left: pad }])
    .png()
    .toFile(join(pub, out))
  console.log('wrote', out)
}

const bg = { r: 246, g: 239, b: 220, alpha: 1 }

await render(192, 'pwa-192x192.png')
await render(512, 'pwa-512x512.png')
await render(180, 'apple-touch-icon.png', bg)
await renderMaskable(512, 'maskable-512x512.png', bg)
