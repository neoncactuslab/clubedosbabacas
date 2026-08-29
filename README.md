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

> **TODO antes de considerar o jogo "pronto":** o menu tem um botão
> "🧪 Testar uma fase específica" que pula direto pra qualquer fase (com o
> personagem já no nível certo), só pra agilizar testes durante o
> desenvolvimento. Remover antes do lançamento: em `index.html` o botão
> `#btn-open-level-select` e o overlay `#overlay-level-select`; em
> `style.css` as regras `.link-btn`/`.level-select-*`; em `src/game.js` o
> bloco marcado "Seletor de fase (TEMPORÁRIO...)".

## Como jogar

- **A / D** — mover para os lados
- **Espaço** — pular
- **1 (teclado numérico / Num Lock) ou P** — bater (corpo a corpo). As duas
  teclas fazem a mesma coisa, porque nem todo teclado tem numpad. Deixamos o
  Num 2 e o Num 3 livres de propósito, pra dar pra adicionar outros golpes
  no futuro sem reorganizar os controles.

O protagonista e a esmagadora maioria dos inimigos/bosses lutam exclusivamente
corpo a corpo — sem ataques à distância. A única exceção são bosses com
justificativa narrativa pra atirar (ex: os policiais Biit e Luquinha, na fase
8) — nesse caso os projéteis são sempre lentos o bastante pra dar pra pular
por cima.

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
   Duas variações de "boss em dupla" já prontas no motor, escolha a que
   fizer sentido pra história:
   - **Sequencial** (tipo o Akio depois do Toyoshi — só aparece quando o
     primeiro morre): exporte `createBoss2`, `stepBoss2`,
     `bossAttackHitbox2`, `hitBoss2`, `drawBoss2` e um diálogo de entrada
     (mesmo formato, nomes livres). `game.js` detecta `level.createBoss2`
     sozinho.
   - **Reforço no meio da luta** (tipo o Escorrega, que entra quando o
     Juninho chega em 50% de vida): exporte `createAlly`, `stepAlly`,
     `allyAttackHitbox`, `hitAlly`, `drawAlly` e `allyJoinDialogue`. O
     `game.js` detecta `level.createAlly` e o aciona sozinho quando
     `boss.hp <= boss.maxHp * 0.5` — os dois ficam lutando ao mesmo tempo,
     e a fase só termina quando ambos caem (em qualquer ordem).
   Em ambos os casos, o boss extra entra **andando de fora da câmera**
   (não simplesmente aparece) até um ponto perto do jogador, e só aí o
   diálogo dispara — reaproveita `ARRIVAL_SPEED`/`stepBossArrival` (ou
   `stepAllyArrival`) já prontos em `game.js`.
   - **Vários bosses espalhados pela fase** (tipo o Rechan revisitado, com
     um boss no início, outro no meio e outro no final): em vez de
     `createBoss`/`stepBoss`/etc. no nível raiz do arquivo, exporte
     `bossEncounters` — uma lista ordenada de objetos
     `{ triggerX, createBoss, stepBoss, bossAttackHitbox,
     bossDamageMultiplier, hitBoss, drawBoss, preBossDialogue,
     victoryDialogue }`, um por encontro. O `game.js` detecta
     `level.bossEncounters` sozinho e vai trocando o boss ativo conforme o
     jogador cruza cada `triggerX`, sem precisar de caminhada de entrada
     (cada boss já está parado na própria arena, esperando).

   Um boss também pode **atirar** (única exceção à regra de "só corpo a
   corpo", reservada pra casos como policiais — ex: Biit/Luquinha no Centro
   de Itapetininga): exporte `bossProjectileHitboxes(boss)` (ou `2` pro
   segundo boss) devolvendo `boss.projectiles`, uma lista de
   `{ x, y, w, h, vx, damage, message, hit }` que o próprio `stepBoss` cria,
   move e descarta (o `game.js` só verifica colisão e marca `hit = true`).
   Deixe os projéteis **lentos** de propósito, pra dar pra pular por cima.
   Pra anunciar um momento pontual (tipo "sacou a arma") sem travar o
   combate numa caixa de diálogo, é só setar `boss.pendingMessage` — o
   `game.js` mostra como toast e limpa sozinho. Se o momento merecer uma
   caixa de diálogo completa (com botão de continuar, travando o jogo até
   o jogador fechar), use `boss.pendingDialogue` (mesmo formato de árvore
   de sempre) — e, se o boss precisar reagir depois que a caixa fechar
   (ex: dar um salto), põe a reação em `boss.onDialogueResolved`, uma
   função que o `game.js` chama e descarta sozinho.
4. Escrever os diálogos (`introDialogue`, `preBossDialogue`,
   `victoryDialogue`) no formato de árvore usado por `dialogue.js`. Se a
   fase for (por enquanto) a última do jogo e merecer um encerramento de
   verdade, exporte também `endingTitle`/`endingText` — o `game.js` troca
   automaticamente o popup padrão de "mais fases em breve" por uma tela
   especial e mais bonita quando não há próxima fase cadastrada. Existe
   também o caminho oposto, pra um boss propositalmente invencível (ex: o
   Arnaldinho na fase 9): faça `hitBoss` nunca zerar `boss.alive`/
   `boss.defeated` de verdade (só reabastecer `boss.hp`), e exporte
   `finalGameOverText1`/`finalGameOverText2` — o `game.js` troca a tela de
   derrota padrão (com botão de tentar de novo) por uma tela definitiva,
   sem botão nenhum, quando o jogador morre nessa fase.
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
| 2 | Rechan | Toyoshi (+ Akio, boss sequencial) | ✅ Pronta |
| 3 | Agropecuária Rechan | Juninho Guareí (+ Escorrega, reforço em 50% de vida) | ✅ Pronta |
| 4 | Peruíbe | Léo Gobor ("Minhoquinha do MIB", + Kannabis e Léo Gobor Verde) | ✅ Pronta |
| 5 | Sorocaba (Suprema Poker) | Tanso, Leo Med e VinnyChaos | ✅ Pronta |
| 6 | Rechan (o Ninho) | Alexandre, Welão e Guilherme (3 bosses no início/meio/fim) | ✅ Pronta |
| 7 | Rechan (Reta Final) | Xuxinha e Johny "Boca de Bulbassauro" (2 bosses no meio/fim) | ✅ Pronta |
| 8 | Centro de Itapetininga | Biit e Luquinha, os policiais (2 bosses sequenciais, com ataque à distância) | ✅ Pronta |
| 9 | Academia do Arnaldinho | Arnaldinho, o rei dos babacas (fase final) | ✅ Pronta |

## Hospedagem

Publicado via GitHub Pages a partir da branch `main`.
