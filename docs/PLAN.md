# Plan de desarrollo — Carioca

Carioca contra bots, de 2 a 5 jugadores. Reutiliza el solver de juegos de Tele.

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
  client/        PWA: mesa, menús, audio
  sim/           CLI de self-play bot contra bot
packages/
  engine/        estado, acciones legales, puntaje. Puro, sin dependencias de UI
  bots/          fácil, medio, difícil
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
- RNG con semilla: toda partida se puede reproducir.
- Los bots reciben `PlayerView`, nunca `MatchState`. Así no pueden hacer trampa.

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

### 0. Base del repo
- Workspace pnpm, TS, ESLint, Vitest y CI (lint, typecheck, test, build) sobre PRs y pushes a `dev` y `main`. Pages se publica desde `main`.
- Cliente con el baseline ox: EN/ES, claro/oscuro, ícono, footer, ajustes de accesibilidad y la paleta de arriba.
- Mazo definido en `packages/engine/src/cards.ts` con test de cantidad y unicidad.
- En `ox-proxy/projects.json`: `"carioca": { "port": 5187, "base": "/carioca" }`.

Listo cuando: el link de `ox-test` abre el cliente y CI pasa.

### 1. Motor
- 2 naipes ingleses y 4 comodines, 108 cartas.
- Ocho rondas con contrato: 2 tríos; 1 trío + 1 escala; 2 escalas; 3 tríos; 2 tríos + 1 escala; 1 trío + 2 escalas; 3 escalas; escala real.
- Turno: sacar la última botada o del mazo, bajarse con el contrato tapando, agregar a juegos en mesa, botar.
- Mazo agotado: se revuelven las botadas y se desliza.
- Puntaje en contra con las cartas que quedan en la mano; gana el menor total.

Listo cuando, con tests de propiedades:
- Ninguna carta se pierde ni se duplica (108 en todo momento).
- El solver valida cada contrato y rechaza bajadas inválidas.
- Toda acción fuera de `legalActions` se rechaza.

### 2. Bots y simulador
- Solver de juegos de Tele extendido a contratos y a agregar en mesa.
- Fácil: arma el contrato y bota lo que menos sirve.
- Medio: no bota lo que le sirve al siguiente y se baja temprano para soltar puntos.
- Difícil: cuenta botadas y estima el contrato de cada rival.

Listo cuando: `pnpm sim` muestra difícil > medio > fácil en N partidas.

### 3. Mesa
- Inicio: dificultad y cantidad de jugadores. Mesa, resultados, reglas, historial, guardar y retomar partida.
- Bots en Web Worker.

Listo cuando: se juega una partida completa en el celular.

### 4. Pulido
- Animaciones de reparto y movimiento de cartas, música chiptune, efectos, texto grande, letra normal, sin animaciones.

### 5. Publicación
- Pages desde `main`. En tletelieru pasa de `soon` a `live` en la sección Juegos.

## UI propia

- La mesa más compleja: ordenar mano, arrastrar, elegir grupos para bajarse y juegos en mesa donde agregar.

## Pendiente

- Confirmar variante: cartas por ronda, comodines por juego, si la escala real admite comodines y el valor de cada carta.
