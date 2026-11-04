import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const [dir, from, to, out, cropTop = '0', cropHeight = '800', step = '1'] = process.argv.slice(2)
const files = readdirSync(dir).filter((name) => name.endsWith('.jpg')).sort().slice(Number(from), Number(to)).filter((_, i) => i % Number(step) === 0)
const width = 200
const height = Math.round(Number(cropHeight) / 2)
const cols = 6
const rows = Math.ceil(files.length / cols)
const tiles = await Promise.all(
  files.map(async (name, index) => ({
    input: await sharp(join(dir, name)).extract({ left: 0, top: Number(cropTop), width: 400, height: Number(cropHeight) }).resize(width, height).composite([{ input: Buffer.from(`<svg width="${width}" height="16"><rect width="${width}" height="16" fill="black"/><text x="2" y="12" font-size="12" fill="yellow">${name}</text></svg>`), top: 0, left: 0 }]).toBuffer(),
    left: (index % cols) * width,
    top: Math.floor(index / cols) * height,
  })),
)
await sharp({ create: { width: cols * width, height: rows * height, channels: 3, background: '#000' } }).composite(tiles).jpeg().toFile(out)
