# Plan de desarrollo — Carioca

Carioca contra bots, de 2 a 5 jugadores.

## Stack

Igual que 7 de Trébol: **web en TypeScript**, PWA instalable, sin backend.

| Área | Elección |
| --- | --- |
| Monorepo | pnpm workspaces |
| Lenguaje | TypeScript estricto |
| Mesa, menús, puntaje | React 19 + Tailwind 4 |
| Build | Vite + vite-plugin-pwa |
| Tests | Vitest + fast-check |
| Bots | Web Worker, mismo contrato que 7 de Trébol |
| Online | Node + WebSockets, servidor autoritativo (fase futura) |

## Estructura

```
apps/
  client/        PWA: mesa, menús, música
  sim/           CLI de self-play bot contra bot
packages/
  engine/        estado, acciones legales, solver de juegos, puntaje. Puro, sin UI
  bots/          fácil, medio, difícil
eslint/          reglas locales: no-repeated-siblings, no-effect, effect-reason
```

## Contrato del motor

```ts
createMatch(config: MatchConfig, seed: number): MatchState
legalActions(state: MatchState, seat: Seat): Action[]
applyAction(state: MatchState, action: Action): MatchState
viewFor(state: MatchState, seat: Seat): PlayerView
score(state: MatchState): Score
```

```ts
interface Bot {
  choose(view: PlayerView, legal: Action[], rng: Rng): Action
}
```

- Estado inmutable y serializable: sirve para guardar partida y para el servidor.
- RNG con semilla: toda partida se puede reproducir. El primer repartidor sale de la semilla.
- Los bots reciben `PlayerView`, nunca `MatchState`. Así no pueden hacer trampa.
- Acciones: `draw` (mazo o botada), `layDown` (el contrato, una vez por ronda), `add` (a cualquier juego de la mesa) y `discard`.
- `legalActions` lista todas las acciones de sacar, agregar y botar, y hasta 3 bajadas sugeridas por el solver. `isLegal` valida cualquier bajada que cumpla el contrato, aunque no esté en la lista, porque el jugador arma sus propios juegos.
- Todas las reglas dudosas viven en `RulesConfig` (`packages/engine/src/rules.ts`) con valores por defecto.

## Solver (`packages/engine/src/melds.ts`)

- Valida tríos y escalas, ordena escalas con comodines y extiende juegos de la mesa.
- `findLayDowns`: cuenta cartas por tipo, enumera tríos y ventanas de escala mínimas, combina con DFS respetando las cartas disponibles y elige la bajada que deja menos puntos en la mano después de extenderla con cartas naturales.
- `addOptions`: todas las cartas de la mano que se pueden agregar a cada juego, por extremo.
- `contractDistance`: heurística de cartas faltantes para el contrato, con pesos por carta (los bots difíciles pesan más las cartas muertas). Usa arreglos tipados y poda; tarda ~0,1 ms por mano.

## Paleta

Azul marino: mesa tranquila para rondas largas de carioca.

| Var | Claro | Oscuro |
| --- | --- | --- |
| `--bg` | `#e1e8ef` | `#0f1a26` |
| `--surface` | `#f3f7fa` | `#172636` |
| `--raised` | `#ccd8e3` | `#22364a` |
| `--ink` | `#15222e` | `#eaf0f5` |
| `--muted` | `#51606d` | `#a1b2c2` |
| `--accent` | `#1f5f99` | `#4a9be0` |
| `--on-accent` | `#ffffff` | `#08121c` |
| `--gold` | `#8f5b0c` | `#f0b541` |

## Fases

### 0. Base del repo — hecho
- Workspace pnpm, TS, ESLint, Vitest y CI (lint, typecheck, test, build) sobre PRs y pushes a `dev` y `main`. Pages se publica desde `main`.
- Cliente con el baseline ox: EN/ES, claro/oscuro, ícono, footer, ajustes de accesibilidad y la paleta de arriba.
- En `ox-proxy/projects.json`: `"carioca": { "port": 5187, "base": "/carioca" }`.

### 1. Motor — hecho
- 2 naipes ingleses y 4 comodines, 108 cartas, 12 por jugador y una botada inicial.
- Diez rondas con contrato: 2 tríos; 1 trío + 1 escala; 2 escalas; 3 tríos; 2 tríos + 1 escala; 1 trío + 2 escalas; 3 escalas; 2 escalas de 6; escala loca; escala real.
- Turno: sacar del mazo o la última botada, bajarse (opcional, una vez por ronda), agregar a cualquier juego en mesa, botar.
- Mazo agotado: se revuelven las botadas (menos la de arriba) y se arma un mazo nuevo.
- Puntaje en contra con las cartas que quedan en la mano; gana el menor total.

Tests de propiedades con fast-check:
- 108 cartas únicas después de cada acción, con 2 a 5 jugadores.
- El solver encuentra una bajada válida en manos construidas alrededor de cada contrato (con y sin comodines) y rechaza bajadas rotas: juego de menos, juego repetido, juego corto, carta ajena, tipo cambiado, carta duplicada.
- Toda acción fuera de `legalActions` se rechaza; toda acción listada es legal.
- Puntaje de cada ronda igual a los puntos de la mano; quien sale queda en 0.
- Partidas reproducibles y serializables; las vistas no muestran manos ajenas ni el mazo.

### 2. Bots y simulador — hecho
- Un cerebro común (`packages/bots/src/brain.ts`) con perfiles por dificultad.
- Fácil: bota al azar el 30 % de las veces, ignora la botada a veces y no mira puntos. Se baja apenas puede.
- Medio: bota la carta que menos lo aleja del contrato, desempata botando la de más puntos, no le da al siguiente lo que viene recogiendo y suelta puntos cuando un rival está por salir.
- Difícil: puede esperar hasta 3 turnos para bajarse si nadie se ha bajado y le quedarían 6 cartas o más; además cuenta cartas muertas (mesa y botadas) para pesar el contrato, mide las salidas de cada mano (cartas vivas que la mejoran), vigila lo que recogen todos los rivales y suelta puntos antes cuando alguien se bajó con pocas cartas.
- `pnpm sim` corre la escalera medio/fácil, difícil/medio, difícil/fácil y muestra victorias, puntos promedio y rondas trancadas.

Resultado (4 jugadores, 200 partidas por fila, semillas 1–200):

| Bot | Contra | Victorias | Puntos | Rivales | Par |
| --- | --- | --- | --- | --- | --- |
| Medio | Fácil | 94,0 % ±3,3 | 183 | 532 | 25 % |
| Difícil | Medio | 31,5 % ±6,4 | 324 | 349 | 25 % |
| Difícil | Fácil | 95,5 % ±2,9 | 152 | 543 | 25 % |

Difícil ≥ medio ≥ fácil en puntos promedio; contra medio la ventaja de difícil es chica.

### 3. Mesa — hecho
- Inicio: dificultad y cantidad de jugadores (2 a 5), los diez contratos, reglas ilustradas e historial.
- Sorteo de quién da al empezar una partida nueva (el motor elige; la luz salta por los asientos y se detiene en el repartidor), luego reparto.
- Mesa: contrato de la ronda, rivales con cartas y puntaje, juegos bajados por jugador en un área fija con scroll, mazo deslizado y botadas, mano ordenable por número o pinta y con arrastre.
- Toques en dos pasos: el primer toque sube una carta y el segundo la bota; tocar otra carta mueve la selección; tocar fuera la limpia. El mazo deslizado y la botada se levantan con el primer toque y se sacan con el segundo.
- Barra fija sobre la mano: Elegir varias (pasa a Armar juego con 3 o más cartas), Sugerir (solo fácil) y Bajarse. Para poner cartas en la mesa se eligen y se toca el juego destino, propio o ajeno.
- Mesa: una fila por jugador con sus juegos en cartas chicas con índice; con 5 jugadores bajados cabe completa a 390×844 junto a la mano.
- Al empezar una partida la mesa parte vacía: sorteo de quién da, reparto carta a carta, el mazo se desliza al centro y se da vuelta la primera botada.
- Fin de ronda: la última carta cae en las botadas, luego se revela en la mesa la mano que le quedó a cada jugador, un grupo cada 350 ms con un tic y las cartas en gris (sin animaciones se salta directo al resumen), y después un resumen por jugador (puntos, juegos bajados y cartas que le quedaron) con la tabla de puntaje y un jingle según si te fue mejor o peor que el mejor rival.
- La línea de cómo jugar sale por defecto en fácil y se activa en Ajustes.
- Bajarse: el jugador arma sus juegos y confirma. Si no cumple el contrato, aparece un aviso sin castigo. Agregar: elige una o más cartas y toca cualquier juego de la mesa.
- Ayudas solo en fácil: botón Sugerir y juegos de la mesa resaltados donde calzan las cartas elegidas. En medio y difícil no hay pistas.
- Botones y líneas de estado de tamaño fijo, deshabilitados cuando no corresponde: no hay saltos de layout entre turnos.
- Bots en Web Worker. La partida se guarda después de cada jugada; las abandonadas y terminadas quedan en el historial.
- Música chiptune propia en dórico (inicio, ronda y escala real) con interruptor, y efectos por acción desde un mapa declarativo.

### 4. Pulido
- Animación de movimiento de cartas entre mano, mesa y botadas; vibración; ajustes de sonido separados de la música.
- Fondo propio para las fichas de cada rival.

### 5. Publicación
- Pages desde `main`. En tletelieru pasa de `soon` a `live` en la sección Juegos.

## Decisiones

- `RulesConfig` guarda cada regla dudosa; el cliente usa los valores por defecto.
- El jugador se baja armando sus propios juegos: no se agrupan solos en la mano (salvo Sugerir en fácil).
- Bajarse es opcional, como en Tele: se puede seguir armando la mano.
- Un juego bajado puede tener más cartas que el mínimo.
- Si el mazo y las botadas no alcanzan, o se pasa el tope de `maxDrawsPerRound` (600 sacadas), la ronda termina sin ganador y todos cuentan su mano.
- Reglas de ESLint locales copiadas de 7 de Trébol: sin ternarios anidados, sin hermanos JSX repetidos, y todo `useEffect` justificado como sincronización con un sistema externo.

## Pendiente

Confirmar la variante. Todas son supuestos con su opción en `RulesConfig`:

- `handSize: 12`: 12 cartas por ronda en todas las rondas (hay variantes con más cartas en las rondas finales).
- Diez rondas con los contratos de arriba (hay variantes con 4 tríos en vez de las 2 escalas de 6).
- `trioSize: 3`, `escalaSize: 4`.
- `maxJokersPerTrio: 1` y `adjacentJokers: false`: un comodín por trío y nunca dos juntos en una escala.
- `wrapAround: true`: la escala da la vuelta por el As, que va entre la K y el 2 (Q K A 2 3 vale). Se agrega por cualquiera de las dos puntas, también pasando la K o bajando del 2, y la escala real y la loca valen en cualquier rotación de los 13 números. Con `wrapAround: false` vuelven `aceLow` y `aceHigh`: el As va antes del 2 o después de la K, sin dar la vuelta. Las partidas guardadas antes del cambio no traen el campo y siguen sin vuelta.
- Al agregar un comodín a una escala, si cabe en las dos puntas el jugador elige siempre dónde va (también al agregar varias cartas: primero se ponen las naturales y al final se pregunta por el comodín). Los bots eligen la punta que deja más cartas propias para agregar después.
- Escala real: las 13 cartas de una pinta, con comodines (`jokersInRealEscala: true`).
- Escala loca (o sucia): 13 cartas seguidas de cualquier pinta (`mixedSuits: true` en el contrato). Los comodines siguen las reglas de cualquier escala, sin depender de `jokersInRealEscala`. El juego bajado guarda `mixed: true` para aceptar cartas de cualquier pinta al agregar.
- `distinctTrioRanks: true`: dos tríos de un mismo contrato no pueden ser del mismo número.
- Dos escalas de un contrato pueden ser de la misma pinta, incluso seguidas.
- `addSameTurn: false`: se agrega a la mesa (a juegos propios o ajenos) recién desde el turno siguiente a bajarse, y solo si uno ya se bajó.
- `noLayDownFirstTurn: true`: en el primer turno de cada ronda nadie se baja, solo saca y bota. La mesa deja Elegir varias, Sugerir y Bajarse deshabilitados (sin esconderlos) con un aviso.
- `exactLayDown: true`: al bajarse cada trío lleva justo `trioSize` cartas y cada escala justo el largo del contrato (4, 6 en la ronda 8, 13 en la loca y la real). Lo demás se agrega después.
- Puntos: 2–10 su valor, J/Q/K 10, As 20, comodín 30.
- Se puede salir bajándose, agregando o botando la última carta.
- No se puede botar la carta recién tomada de las botadas.
- No hay robo de comodín de la mesa, castigo por pedir la botada fuera de turno, ni cartas de castigo.
- Al agotarse el mazo se revuelven las botadas menos la de arriba.
- Empate final queda como empate.
