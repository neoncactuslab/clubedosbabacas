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
- **Espaço** — pular
- **1 (teclado numérico / Num Lock)** — bater (corpo a corpo). Deixamos o
  Num 2 e o Num 3 livres de propósito, pra dar pra adicionar outros golpes
  no futuro sem reorganizar os controles.

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
  enemies.js          → IA genérica de inimigos comuns (patrulha + contato + knockback)
  dialogue.js         → tocador de diálogo com escolhas, reaproveitável em qualquer fase
  renderUtils.js      → helpers de desenho compartilhados (roundRect, membros, prédios em paralaxe, mini barra de vida)
  game.js             → orquestrador genérico: máquina de estados, loop, progressão entre fases, HUD, desenha só o jogador
  levels/
    index.js           → lista ordenada das fases (é só importar a fase nova aqui pra ela entrar no jogo)
    vilaRosa.js         → Fase 1: mapa, inimigos, boss (IA própria), diálogos E o desenho de tudo isso
    rechan.js           → Fase 2: idem, com cenário/criaturas totalmente diferentes
```

Cada arquivo de fase é dono do próprio visual: exporta `renderBackground`,
`drawPlatform`, `drawGrunt` e `drawBoss`, então cada fase pode ter cenário e
criaturas completamente diferentes das outras (é literalmente o que o
`game.js` chama — ele não sabe desenhar nada específico de fase, só o
protagonista, que é compartilhado).

Sem build/bundler — é só HTML/CSS/JS puro com ES modules nativos do
navegador. Pra rodar localmente, é só servir a pasta (ex:
`python -m http.server`) e abrir `index.html`. Não pode abrir o `index.html`
direto como `file://`, porque módulos ES exigem HTTP.

## Como criar uma fase nova

Cada fase é um arquivo independente em `src/levels/`, no mesmo formato de
`vilaRosa.js`/`rechan.js`:

1. Definir `platforms`, `checkpoints`, `LEVEL_W`, `PLAYER_START` (dica: os
   vãos entre plataformas devem ter no máximo uns 60-70px de diferença de
   altura E de distância horizontal — já tivemos dois bugs de plataforma
   inalcançável por passar do alcance do pulo do jogador).
2. Criar os inimigos comuns da fase via `createEnemies(level)` (reaproveita
   a IA de `enemies.js` — só muda nome/posição/atributos).
3. Criar o boss: `createBoss(level)` + `stepBoss(...)` com a IA própria dele
   (siga o padrão de estados de `vilaRosa.js`/`rechan.js`: telegraph →
   active → recover, mais um estado "vulnerável" que cicla a cada 3ª ação).
   Boss surpresa/duplo (tipo o Akio depois do Toyoshi): exporte também
   `createBoss2`, `stepBoss2`, `bossAttackHitbox2`, `hitBoss2`, `drawBoss2` e
   `akioIntroDialogue` (mesmo formato, nomes livres) — o `game.js` já detecta
   `level.createBoss2` sozinho e encadeia os dois sem precisar de trigger de
   área pro segundo.
4. Escrever os diálogos (`introDialogue`, `preBossDialogue`,
   `victoryDialogue`) no formato de árvore usado por `dialogue.js`.
5. Desenhar o visual da fase: `renderBackground(ctx, camX, VIEW_W, VIEW_H)`,
   `drawPlatform(ctx, pl)`, `drawGrunt(ctx, g)`, `drawBoss(ctx, b)` — use os
   helpers de `renderUtils.js` (`roundRect`, `drawLimb`, `drawMiniHpBar`,
   `drawBuildingLayer`) mas desenhe formas/cores próprias da fase.
6. Registrar a fase em `src/levels/index.js` (importar e adicionar no array
   `LEVELS`, na ordem certa). Pronto — o `game.js` não precisa de nenhuma
   alteração, e a tela de "fase concluída" já detecta sozinha se tem
   próxima fase ou não.

## Fases

| # | Bairro | Boss | Status |
|---|--------|------|--------|
| 1 | Vila Rosa | Pandoval (Sandoval) | ✅ Pronta |
| 2 | Rechan | Toyoshi | ✅ Pronta |
| 3 | — | — | Planejada |
| ... | — | — | — |

## Hospedagem

Publicado via GitHub Pages a partir da branch `main`.
