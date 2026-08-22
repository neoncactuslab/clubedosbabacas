# Clube dos Babacas

Jogo de plataforma com combate corpo a corpo e elementos leves de RPG (diálogos
com escolhas, nível e status), desenvolvido pela **Neon Cactus Interactive**.

Premissa: um grupo de amigos que se autointitula "Clube dos Babacas" (pelo
humor pesado que trocam entre si). Cada fase do jogo é um bairro de
Itapetininga-SP, e o boss de cada fase é um amigo real do grupo, retratado de
forma cômica/exagerada. O protagonista é criado pelo próprio jogador (escolhe
o nome).

**Sem pressa** — o plano é adicionar fases aos poucos, no ritmo que der,
mesmo que leve uma semana por fase. Não é pra ser um jogo longo: o alvo é
10-15 fases no total.

## Como jogar

- **A / D** — mover para os lados
- **W** — pular
- **Espaço** — bater (corpo a corpo)

Todos os personagens (protagonista, inimigos e bosses) lutam exclusivamente
corpo a corpo — sem ataques à distância.

## Regra de progressão

Ao derrotar o boss de uma fase, o protagonista sobe de nível: ganha mais
pontos de vida e mais dano de ataque, e é curado por completo. Os inimigos da
fase seguinte são balanceados para aquele mesmo nível — ou seja, a
dificuldade acompanha o jogador em vez de ficar mais fácil com o tempo.

## Estrutura do projeto

```
index.html          → shell da página (HUD, overlays, diálogo, controles de toque)
style.css            → toda a identidade visual (cores, tipografia, layout)
src/
  engine.js          → física, colisão AABB e câmera — genérico, usado por tudo
  balance.js          → fórmulas de nível/dano do jogador e escala dos inimigos por fase
  player.js           → estado do jogador, movimento, ataque, level up
  enemies.js          → IA genérica de inimigos comuns (patrulha + contato)
  dialogue.js         → tocador de diálogo com escolhas, reaproveitável em qualquer fase
  game.js             → orquestrador: máquina de estados, loop do jogo, renderização, HUD
  levels/
    vilaRosa.js        → Fase 1 completa: mapa, inimigos, boss (IA própria) e diálogos
```

Sem build/bundler — é só HTML/CSS/JS puro com ES modules nativos do
navegador. Pra rodar localmente, é só servir a pasta (ex:
`python -m http.server`) e abrir `index.html`. Não pode abrir o `index.html`
direto como `file://`, porque módulos ES exigem HTTP.

## Como criar uma fase nova

Cada fase é um arquivo independente em `src/levels/`, no mesmo formato de
`vilaRosa.js`:

1. Definir `platforms`, `checkpoints`, `LEVEL_W`, `PLAYER_START`.
2. Criar os inimigos comuns da fase via `createEnemies(level)` (reaproveita
   `enemies.js`).
3. Criar o boss: `createBoss(level)` + `stepBoss(...)` com a IA própria dele
   (siga o padrão de estados de `vilaRosa.js`: telegraph → active → recover).
4. Escrever os diálogos (`introDialogue`, `preBossDialogue`,
   `victoryDialogue`) no formato de árvore usado por `dialogue.js`.
5. Trocar o `import * as level from './levels/vilaRosa.js'` em `game.js` para
   apontar pra fase nova (ou evoluir pra um seletor de fases, quando
   tivermos mais de uma).

## Fases

| # | Bairro | Boss | Status |
|---|--------|------|--------|
| 1 | Vila Rosa | Pandoval | ✅ Pronta |
| 2 | — | — | Planejada |
| ... | — | — | — |

## Hospedagem

Publicado via GitHub Pages a partir da branch `main`.
