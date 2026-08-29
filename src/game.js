import { aabb, computeCamera, clamp } from './engine.js';
import { createPlayer, levelUp, damagePlayer, playerAttackHitbox, stepPlayer, ATTACK_DURATION } from './player.js';
import { stepGrunt, hitGrunt } from './enemies.js';
import { runDialogue } from './dialogue.js';
import { roundRect } from './renderUtils.js';
import { LEVELS } from './levels/index.js';

var canvas = document.getElementById('game-canvas');
var ctx = canvas.getContext('2d');
var stage = document.getElementById('stage');
var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

var VIEW_W = 960;
var VIEW_H = 540;
var dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

function resize() {
  var availW = stage.clientWidth;
  var availH = stage.clientHeight;
  var scale = Math.min(availW / VIEW_W, availH / VIEW_H);
  var cssW = Math.floor(VIEW_W * scale);
  var cssH = Math.floor(VIEW_H * scale);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = Math.floor(VIEW_W * dpr);
  canvas.height = Math.floor(VIEW_H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// ---------- Estado geral ----------
var levelIndex = 0;
var level = LEVELS[0];

var game = {
  phase: 'splash', // splash | menu | dialogue | playing | complete | gameover
  player: null,
  enemies: [],
  boss: null,
  checkpointX: 0,
  camX: 0,
  t: 0,
  bossIntroDone: false,
  encounterIndex: 0
};

// Algumas fases (ex: o retorno ao Rechan) têm vários bosses espalhados ao
// longo do percurso (início/meio/fim) em vez de um só. Nesses casos o nível
// exporta `bossEncounters`: uma lista ordenada de { triggerX, createBoss,
// stepBoss, bossAttackHitbox, bossDamageMultiplier, hitBoss, drawBoss,
// preBossDialogue, victoryDialogue }. Cada encontro reaproveita o mesmo slot
// `game.boss`/`game.bossApi` do boss único de sempre -- só troca de conteúdo
// conforme o jogador avança e derrota cada um.
function loadEncounter(i) {
  var enc = level.bossEncounters[i];
  game.encounterIndex = i;
  game.boss = enc.createBoss(game.player.level);
  game.bossApi = { step: enc.stepBoss, attackHitbox: enc.bossAttackHitbox, hit: enc.hitBoss, draw: enc.drawBoss, projectileHitboxes: enc.bossProjectileHitboxes };
  game.bossIntroDone = false;
}

function currentEncounter() {
  return level.bossEncounters ? level.bossEncounters[game.encounterIndex] : null;
}

function loadLevelEntities() {
  game.enemies = level.createEnemies(game.player.level);
  if (level.bossEncounters) {
    loadEncounter(0);
  } else {
    game.boss = level.createBoss(game.player.level);
    game.bossApi = { step: level.stepBoss, attackHitbox: level.bossAttackHitbox, hit: level.hitBoss, draw: level.drawBoss, projectileHitboxes: level.bossProjectileHitboxes };
    game.bossIntroDone = false;
  }
  game.boss2Spawned = false;
  game.ally = null;
  game.allyApi = null;
  game.allySpawned = false;
  game.checkpointX = 0;
  game.camX = 0;
  game.player.x = level.PLAYER_START.x;
  game.player.y = level.PLAYER_START.y;
  game.player.vx = 0;
  game.player.vy = 0;
}

// Alguns bosses vêm em dupla (ex: Akio aparece logo após o Toyoshi). Um
// segundo boss só é ativado quando o nível exporta createBoss2 e cia.
// Em vez de simplesmente aparecer, ele entra andando de fora da tela até
// parar perto do jogador -- só então o diálogo dele começa.
var ARRIVAL_SPEED = 95;

function spawnBoss2() {
  game.boss2Spawned = true;
  var p = game.player;
  var boss = level.createBoss2(p.level);

  // Começa fora da área visível (a pé da câmera não precisa respeitar o
  // limite da arena aqui -- não há física/colisão durante a caminhada de
  // entrada, só desliza; o limite da arena volta a valer quando a IA de
  // combate liga, bem depois de ele já estar em posição segura).
  var minX = level.BOSS_ARENA_MIN_X != null ? level.BOSS_ARENA_MIN_X : 0;
  boss.x = game.camX + VIEW_W + 70;
  boss.arriveTargetX = clamp(p.x + 130, minX, boss.x);
  boss.vx = 0;

  game.boss = boss;
  game.bossApi = { step: level.stepBoss2, attackHitbox: level.bossAttackHitbox2, hit: level.hitBoss2, draw: level.drawBoss2, projectileHitboxes: level.bossProjectileHitboxes2 };
  updateHud();
  game.phase = 'boss2-arriving';
}

function stepBossArrival(dt) {
  var b = game.boss;
  b.facing = -1;
  b.vx = -ARRIVAL_SPEED;
  b.x = Math.max(b.arriveTargetX, b.x - ARRIVAL_SPEED * dt);
  if (b.x <= b.arriveTargetX) {
    b.vx = 0;
    game.phase = 'dialogue';
    runDialogue(level.boss2IntroDialogue, { name: game.player.name }, dialogueUi, function () {
      game.boss.asleep = false;
      game.phase = 'playing';
    });
  }
}

// Alguns bosses chamam reforço no meio da luta (ex: Escorrega entra quando
// o Juninho chega em 50% de vida), em vez de aparecer depois do boss
// principal cair. Reaproveita a mesma caminhada de entrada de fora da tela.
function spawnAlly() {
  game.allySpawned = true;
  var p = game.player;
  var ally = level.createAlly(p.level);

  var minX = level.BOSS_ARENA_MIN_X != null ? level.BOSS_ARENA_MIN_X : 0;
  ally.x = game.camX + VIEW_W + 70;
  ally.arriveTargetX = clamp(p.x + 160, minX, ally.x);
  ally.vx = 0;

  game.ally = ally;
  game.allyApi = { step: level.stepAlly, attackHitbox: level.allyAttackHitbox, hit: level.hitAlly, draw: level.drawAlly, projectileHitboxes: level.allyProjectileHitboxes };
  game.phase = 'ally-arriving';
}

function stepAllyArrival(dt) {
  var a = game.ally;
  a.facing = -1;
  a.vx = -ARRIVAL_SPEED;
  a.x = Math.max(a.arriveTargetX, a.x - ARRIVAL_SPEED * dt);
  if (a.x <= a.arriveTargetX) {
    a.vx = 0;
    game.phase = 'dialogue';
    runDialogue(level.allyJoinDialogue, { name: game.player.name }, dialogueUi, function () {
      game.ally.asleep = false;
      game.phase = 'playing';
    });
  }
}

function finishLevel() {
  var p = game.player;
  levelUp(p);
  updateHud();
  document.getElementById('complete-level').textContent = p.level;
  if (hasNextLevel()) {
    completeTitle.textContent = level.LEVEL_NAME + ' foi conquistada!';
    completeText.textContent = 'Bora pra próxima fase.';
    btnCompleteRestart.textContent = 'Próxima fase';
    overlayComplete.hidden = false;
  } else if (level.endingTitle) {
    // fase marcada como encerramento da história (ex: o boss final) --
    // mostra a tela especial em vez do popup padrão de "mais fases em breve"
    finalEndingTitle.textContent = level.endingTitle;
    finalEndingText.textContent = level.endingText;
    overlayFinalEnding.hidden = false;
  } else {
    completeTitle.textContent = 'Todos os Babacas (por enquanto) foram domados!';
    completeText.textContent = 'Mais fases chegando em breve. Volte sempre pra treinar.';
    btnCompleteRestart.textContent = 'Jogar novamente';
    overlayComplete.hidden = false;
  }
  game.phase = 'complete';
}

function newRun(name) {
  levelIndex = 0;
  level = LEVELS[levelIndex];
  game.player = createPlayer(name, level.PLAYER_START.x, level.PLAYER_START.y);
  loadLevelEntities();
  updateHud();
}

function hasNextLevel() {
  return levelIndex + 1 < LEVELS.length;
}

function goToNextLevel() {
  levelIndex += 1;
  level = LEVELS[levelIndex];
  loadLevelEntities();
  updateHud();
  overlayComplete.hidden = true;
  game.phase = 'dialogue';
  runDialogue(level.introDialogue, { name: game.player.name }, dialogueUi, function () {
    game.phase = 'playing';
  });
}

function respawnAt(cpX) {
  game.player.x = cpX + 60;
  game.player.y = level.GROUND_Y - 200;
  game.player.vx = 0;
  game.player.vy = 0;
}

// ---------- HUD ----------
var hudName = document.getElementById('hud-name');
var hudLevel = document.getElementById('hud-level');
var hudHpFill = document.getElementById('hud-hp-fill');
var hudHpCurrent = document.getElementById('hud-hp-current');
var hudHpMax = document.getElementById('hud-hp-max');
var bossHud = document.getElementById('boss-hud');
var hudBossName = document.getElementById('hud-boss-name');
var hudBossFill = document.getElementById('hud-boss-fill');

function updateHud() {
  var p = game.player;
  if (!p) return;
  hudName.textContent = p.name;
  hudLevel.textContent = p.level;
  hudHpCurrent.textContent = Math.max(0, Math.round(p.hp));
  hudHpMax.textContent = p.maxHp;
  hudHpFill.style.width = clamp(p.hp / p.maxHp, 0, 1) * 100 + '%';

  var b = game.boss;
  if (b && !b.asleep) {
    bossHud.hidden = false;
    hudBossName.textContent = b.name;
    hudBossFill.style.width = clamp(b.hp / b.maxHp, 0, 1) * 100 + '%';
  } else {
    bossHud.hidden = true;
  }
}

var toastEl = document.getElementById('toast');
var toastTimer = null;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1000);
}

// ---------- Input ----------
var keys = { left: false, right: false, jump: false, attack: false };

var GAME_KEYS = ['KeyA', 'KeyD', 'Space', 'Numpad1', 'KeyP'];

function isTypingTarget(el) {
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

window.addEventListener('keydown', function (e) {
  if (isTypingTarget(document.activeElement)) return;
  if (GAME_KEYS.indexOf(e.code) !== -1) e.preventDefault();
  if (e.code === 'KeyA') keys.left = true;
  if (e.code === 'KeyD') keys.right = true;
  if (e.code === 'Space') keys.jump = true;
  if (e.code === 'Numpad1' || e.code === 'KeyP') keys.attack = true;
}, { passive: false });

window.addEventListener('keyup', function (e) {
  if (e.code === 'KeyA') keys.left = false;
  if (e.code === 'KeyD') keys.right = false;
  if (e.code === 'Space') keys.jump = false;
  if (e.code === 'Numpad1' || e.code === 'KeyP') keys.attack = false;
});

function bindHold(el, onDown, onUp) {
  el.addEventListener('pointerdown', function (e) { e.preventDefault(); onDown(); }, { passive: false });
  el.addEventListener('pointerup', function (e) { e.preventDefault(); onUp(); }, { passive: false });
  el.addEventListener('pointerleave', function () { onUp(); });
  el.addEventListener('pointercancel', function () { onUp(); });
}
bindHold(document.getElementById('btn-left'), function () { keys.left = true; }, function () { keys.left = false; });
bindHold(document.getElementById('btn-right'), function () { keys.right = true; }, function () { keys.right = false; });
bindHold(document.getElementById('btn-jump'), function () { keys.jump = true; }, function () { keys.jump = false; });
bindHold(document.getElementById('btn-attack'), function () { keys.attack = true; }, function () { keys.attack = false; });

// ---------- Overlays ----------
var overlaySplash = document.getElementById('overlay-splash');
var overlayMenu = document.getElementById('overlay-menu');
var overlayComplete = document.getElementById('overlay-complete');
var overlayFinalEnding = document.getElementById('overlay-final-ending');
var overlayGameover = document.getElementById('overlay-gameover');
var nameInput = document.getElementById('name-input');
var btnCompleteRestart = document.getElementById('btn-complete-restart');
var completeTitle = document.querySelector('#overlay-complete h1');
var completeText = document.getElementById('complete-text');
var finalEndingTitle = document.getElementById('final-ending-title');
var finalEndingText = document.getElementById('final-ending-text');

setTimeout(function () {
  if (game.phase === 'splash') showMenu();
}, reducedMotion ? 200 : 1600);
overlaySplash.addEventListener('click', function () {
  if (game.phase === 'splash') showMenu();
});

function showMenu() {
  game.phase = 'menu';
  overlaySplash.hidden = true;
  overlayComplete.hidden = true;
  overlayFinalEnding.hidden = true;
  overlayGameover.hidden = true;
  document.getElementById('overlay-level-select').hidden = true;
  overlayMenu.hidden = false;
}

document.getElementById('btn-start').addEventListener('click', startAdventure);
nameInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') startAdventure();
});

function startAdventure() {
  var name = nameInput.value.trim() || 'Herói';
  overlayMenu.hidden = true;
  newRun(name);
  game.phase = 'dialogue';
  runDialogue(level.introDialogue, { name: name }, dialogueUi, function () {
    game.phase = 'playing';
  });
}

// ---------- Seletor de fase (TEMPORÁRIO — só pra testes durante o
// desenvolvimento; remover este bloco + os elementos correspondentes em
// index.html/style.css quando o jogo estiver pronto) ----------
var overlayLevelSelect = document.getElementById('overlay-level-select');
var levelSelectList = document.getElementById('level-select-list');

LEVELS.forEach(function (lvl, idx) {
  var btn = document.createElement('button');
  btn.className = 'level-select-btn';
  btn.innerHTML = '<span>' + lvl.LEVEL_NAME + '</span><span class="lvl-num">FASE ' + (idx + 1) + '</span>';
  btn.addEventListener('click', function () { startAtLevel(idx); });
  levelSelectList.appendChild(btn);
});

document.getElementById('btn-open-level-select').addEventListener('click', function () {
  overlayMenu.hidden = true;
  overlayLevelSelect.hidden = false;
});
document.getElementById('btn-close-level-select').addEventListener('click', function () {
  overlayLevelSelect.hidden = true;
  overlayMenu.hidden = false;
});

function startAtLevel(idx) {
  var name = nameInput.value.trim() || 'Herói';
  overlayLevelSelect.hidden = true;
  levelIndex = idx;
  level = LEVELS[levelIndex];
  game.player = createPlayer(name, level.PLAYER_START.x, level.PLAYER_START.y);
  for (var i = 0; i < idx; i++) levelUp(game.player);
  loadLevelEntities();
  updateHud();
  game.phase = 'dialogue';
  runDialogue(level.introDialogue, { name: name }, dialogueUi, function () {
    game.phase = 'playing';
  });
}

btnCompleteRestart.addEventListener('click', function () {
  if (hasNextLevel()) goToNextLevel();
  else showMenu();
});
document.getElementById('btn-final-restart').addEventListener('click', showMenu);
document.getElementById('btn-gameover-restart').addEventListener('click', showMenu);

// ---------- Diálogo ----------
var dialogueUi = {
  box: document.getElementById('dialogue-box'),
  speaker: document.getElementById('dialogue-speaker'),
  text: document.getElementById('dialogue-text'),
  choices: document.getElementById('dialogue-choices'),
  continueBtn: document.getElementById('dialogue-continue')
};

// ---------- Física / combate ----------
function step(dt) {
  if (game.phase === 'boss2-arriving') {
    stepBossArrival(dt);
    return;
  }
  if (game.phase === 'ally-arriving') {
    stepAllyArrival(dt);
    return;
  }
  if (game.phase !== 'playing') return;
  game.t += dt;

  var p = game.player;
  stepPlayer(p, keys, level.platforms, dt);
  p.x = clamp(p.x, 0, level.LEVEL_W - p.w);

  updateCheckpoint();

  // inimigos comuns
  for (var i = 0; i < game.enemies.length; i++) {
    var g = game.enemies[i];
    if (!g.alive) continue;
    stepGrunt(g, level.platforms, dt);
    if (g.hitCooldown <= 0 && aabb(p.x, p.y, p.w, p.h, g.x, g.y, g.w, g.h)) {
      if (damagePlayer(p, g.attack)) { showToast(level.GRUNT_HIT_TOAST || 'Ai!'); }
      g.hitCooldown = 0.6;
    }
  }

  // boss (numa fase com vários encontros, cada um tem seu próprio ponto de
  // disparo e diálogo -- fora isso é exatamente o mesmo fluxo de sempre)
  var enc = currentEncounter();
  var arenaX = enc ? enc.triggerX : level.BOSS_ARENA_X;
  var preBossDialogue = enc ? enc.preBossDialogue : level.preBossDialogue;
  game.bossApi.step(game.boss, p, level.platforms, dt);
  if (!game.bossIntroDone && p.x >= arenaX - 20 && game.boss.asleep) {
    game.bossIntroDone = true;
    game.phase = 'dialogue';
    runDialogue(preBossDialogue, { name: p.name }, dialogueUi, function () {
      game.boss.asleep = false;
      game.phase = 'playing';
    });
    return;
  }

  // um boss pode travar o combate numa caixa de diálogo cheia no meio da
  // luta (ex: "Biit saca a arma" ao perder metade da vida) -- ele só marca
  // pendingDialogue, e opcionalmente onDialogueResolved pra reagir (ex: dar
  // um salto pra trás) quando o jogador fechar a caixa com "Continuar"
  if (game.boss.pendingDialogue) {
    var bossDlg = game.boss.pendingDialogue;
    game.boss.pendingDialogue = null;
    game.phase = 'dialogue';
    runDialogue(bossDlg, { name: p.name }, dialogueUi, function () {
      if (game.boss.onDialogueResolved) {
        var resolve = game.boss.onDialogueResolved;
        game.boss.onDialogueResolved = null;
        resolve();
      }
      game.phase = 'playing';
    });
    return;
  }

  if (!game.boss.asleep && game.boss.alive) {
    var hb = game.bossApi.attackHitbox(game.boss);
    if (hb && !game.boss.hitDone && aabb(p.x, p.y, p.w, p.h, hb.x, hb.y, hb.w, hb.h)) {
      if (damagePlayer(p, hb.damage)) showToast(hb.message || 'Toma essa!');
      game.boss.hitDone = true;
    }
    // alguns bosses atiram (ex: policiais) -- cada projétil viaja sozinho e só
    // pode acertar uma vez, então isso fica fora do gate de hitDone acima
    if (game.bossApi.projectileHitboxes) {
      var projs = game.bossApi.projectileHitboxes(game.boss);
      for (var pi = 0; pi < projs.length; pi++) {
        var proj = projs[pi];
        if (!proj.hit && aabb(p.x, p.y, p.w, p.h, proj.x, proj.y, proj.w, proj.h)) {
          if (damagePlayer(p, proj.damage)) showToast(proj.message || 'Bang!');
          proj.hit = true;
        }
      }
    }
    // ganho narrativo pontual (ex: "sacou a arma") sem precisar travar o
    // combate numa caixa de diálogo -- o boss só marca a mensagem pendente
    if (game.boss.pendingMessage) {
      showToast(game.boss.pendingMessage);
      game.boss.pendingMessage = null;
    }
  }

  // aliado que reforça o boss principal quando ele chega na metade da vida
  if (level.createAlly && !game.allySpawned && game.boss.alive && !game.boss.asleep &&
      game.boss.hp <= game.boss.maxHp * 0.5) {
    spawnAlly();
    return;
  }

  if (game.ally && !game.ally.asleep && game.ally.alive) {
    game.allyApi.step(game.ally, p, level.platforms, dt);
    var hbAlly = game.allyApi.attackHitbox(game.ally);
    if (hbAlly && !game.ally.hitDone && aabb(p.x, p.y, p.w, p.h, hbAlly.x, hbAlly.y, hbAlly.w, hbAlly.h)) {
      if (damagePlayer(p, hbAlly.damage)) showToast(hbAlly.message || 'Toma essa!');
      game.ally.hitDone = true;
    }
  }

  // ataque do jogador
  var atkBox = playerAttackHitbox(p);
  if (atkBox && !p.attackHitDone) {
    for (var j = 0; j < game.enemies.length; j++) {
      var ge = game.enemies[j];
      if (ge.alive && aabb(atkBox.x, atkBox.y, atkBox.w, atkBox.h, ge.x, ge.y, ge.w, ge.h)) {
        var geDir = (ge.x + ge.w / 2) >= (p.x + p.w / 2) ? 1 : -1;
        hitGrunt(ge, p.attack, geDir);
        p.attackHitDone = true;
        break;
      }
    }
    if (!p.attackHitDone && !game.boss.asleep && game.boss.alive &&
        aabb(atkBox.x, atkBox.y, atkBox.w, atkBox.h, game.boss.x, game.boss.y, game.boss.w, game.boss.h)) {
      var bossDir = (game.boss.x + game.boss.w / 2) >= (p.x + p.w / 2) ? 1 : -1;
      game.bossApi.hit(game.boss, p.attack, bossDir);
      p.attackHitDone = true;
    }
    if (!p.attackHitDone && game.ally && !game.ally.asleep && game.ally.alive &&
        aabb(atkBox.x, atkBox.y, atkBox.w, atkBox.h, game.ally.x, game.ally.y, game.ally.w, game.ally.h)) {
      var allyDir = (game.ally.x + game.ally.w / 2) >= (p.x + p.w / 2) ? 1 : -1;
      game.allyApi.hit(game.ally, p.attack, allyDir);
      p.attackHitDone = true;
    }
  }

  // queda em buraco
  if (p.y > level.DEATH_Y) {
    if (damagePlayer(p, level.FALL_DAMAGE)) showToast('Você caiu!');
    respawnAt(game.checkpointX);
  }

  updateHud();

  if (p.dead) {
    game.phase = 'gameover';
    overlayGameover.hidden = false;
    return;
  }

  var allyDoneOrAbsent = !game.ally || game.ally.defeated;
  if (game.boss.defeated && allyDoneOrAbsent && game.phase === 'playing') {
    if (game.boss2Spawned) {
      // este boss.defeated é o segundo boss (ex: Akio) -- sem diálogo de vitória próprio
      finishLevel();
      return;
    }
    game.phase = 'dialogue';
    if (level.bossEncounters) {
      var finishedEnc = currentEncounter();
      var nextIndex = game.encounterIndex + 1;
      var hasNextEncounter = nextIndex < level.bossEncounters.length;
      runDialogue(finishedEnc.victoryDialogue, { name: p.name }, dialogueUi, function () {
        if (hasNextEncounter) {
          loadEncounter(nextIndex);
          game.phase = 'playing';
        } else {
          finishLevel();
        }
      });
    } else if (level.createBoss2) {
      runDialogue(level.victoryDialogue, { name: p.name }, dialogueUi, spawnBoss2);
    } else {
      runDialogue(level.victoryDialogue, { name: p.name }, dialogueUi, finishLevel);
    }
    return;
  }

  game.camX = computeCamera(p.x, VIEW_W, level.LEVEL_W);
}

function updateCheckpoint() {
  var cps = level.checkpoints;
  for (var i = cps.length - 1; i >= 0; i--) {
    if (game.player.x >= cps[i]) { game.checkpointX = cps[i]; break; }
  }
}

// ---------- Renderização ----------
function drawPlayer(p) {
  var flash = p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0;
  var cx = p.x + p.w / 2;
  var baseY = p.y + p.h;

  var skin = flash ? '#ffffff' : '#f2c49b';
  var shirt = flash ? '#ffffff' : '#3f6fb0';
  var pants = flash ? '#ffffff' : '#2c3e63';
  var hair = flash ? '#ffffff' : '#4a3222';

  var moving = Math.abs(p.vx) > 10 && p.onGround;
  var strideRaw = Math.sin(p.x * 0.18);
  var stride = moving ? strideRaw * 7 : 0;

  var atkProgress = p.attackTimer > 0 ? 1 - (p.attackTimer / ATTACK_DURATION) : 0;
  var swing = Math.sin(Math.min(Math.max(atkProgress, 0), 1) * Math.PI);
  var armAngle = -0.5 + swing * 1.9;
  var shoulderX = 10, shoulderY = -30;
  var armLen = 15;
  var handX = shoulderX + Math.cos(armAngle) * armLen;
  var handY = shoulderY + Math.sin(armAngle) * armLen;

  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(p.facing, 1);

  // pernas
  ctx.strokeStyle = pants;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  if (!p.onGround) {
    ctx.beginPath(); ctx.moveTo(-5, -14); ctx.lineTo(-8, -2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, -14); ctx.lineTo(9, -4); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(-5, -14); ctx.lineTo(-5 + stride, -1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, -14); ctx.lineTo(5 - stride, -1); ctx.stroke();
  }

  // braco de tras
  ctx.strokeStyle = shirt;
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-9, -28); ctx.lineTo(-13, -17); ctx.stroke();

  // tronco
  ctx.fillStyle = shirt;
  roundRect(ctx, -11, -34, 22, 24, 6);
  ctx.fill();

  // braco da frente (soco)
  ctx.strokeStyle = shirt;
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.lineTo(handX, handY); ctx.stroke();
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(handX, handY, 4, 0, Math.PI * 2); ctx.fill();

  // cabeca
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, -44, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.arc(0, -47, 10, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a2320';
  ctx.beginPath(); ctx.arc(4, -45, 1.5, 0, Math.PI * 2); ctx.fill();

  // efeito de impacto na janela ativa do golpe
  var hb = playerAttackHitbox(p);
  if (hb) {
    ctx.strokeStyle = 'rgba(255,93,115,0.9)';
    ctx.lineWidth = 2.2;
    for (var k = 0; k < 3; k++) {
      var ang = -0.7 + k * 0.7;
      ctx.beginPath();
      ctx.moveTo(handX + Math.cos(ang) * 5, handY + Math.sin(ang) * 5);
      ctx.lineTo(handX + Math.cos(ang) * 13, handY + Math.sin(ang) * 13);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  level.renderBackground(ctx, game.camX, VIEW_W, VIEW_H);

  ctx.save();
  ctx.translate(-game.camX, 0);

  for (var i = 0; i < level.platforms.length; i++) {
    level.drawPlatform(ctx, level.platforms[i]);
  }

  for (var g = 0; g < game.enemies.length; g++) level.drawGrunt(ctx, game.enemies[g]);

  if (game.boss) game.bossApi.draw(ctx, game.boss);
  if (game.ally) game.allyApi.draw(ctx, game.ally);
  if (game.player) drawPlayer(game.player);

  ctx.restore();
}

// ---------- Loop ----------
var last = performance.now();
function loop(now) {
  var dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  step(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
