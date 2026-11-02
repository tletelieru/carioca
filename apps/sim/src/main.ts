import { DECK_SIZE, cardId, createDeck, shuffle } from '@carioca/engine'

const seed = Number(process.argv[2] ?? Date.now()) | 0
const { items } = shuffle(createDeck(), seed)

console.log(`seed ${seed}: ${DECK_SIZE} cards`)
console.log(items.slice(0, 12).map(cardId).join(' '))
