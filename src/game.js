import { aabb, computeCamera, clamp } from './engine.js';
import { createPlayer, levelUp, damagePlayer, playerAttackHitbox, stepPlayer, ATTACK_DURATION } from './player.js';
import { stepGrunt, hitGrunt } from './enemies.js';
import { runDialogue } from './dialogue.js';
import * as level from './levels/vilaRosa.js';

var canvas = document.getElementById('game-canvas');
var ctx = canvas.getContext('2d');
var stage = document.getElementById('stage');
var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

var VIEW_W = level.VIEW_W;
var VIEW_H = level.VIEW_H;
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
var game = {
  phase: 'splash', // splash | menu | dialogue | playing | complete | gameover
  player: null,
  enemies: [],
  boss: null,
  checkpointX: 0,
  camX: 0,
  t: 0,
  bossIntroDone: false,
  afterDialogue: null
};

function newRun(name) {
  game.player = createPlayer(name, level.PLAYER_START.x, level.PLAYER_START.y);
  game.enemies = level.createEnemies(game.player.level);
  game.boss = level.createBoss(game.player.level);
  game.checkpointX = 0;
  game.camX = 0;
  game.bossIntroDone = false;
  updateHud();
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

var GAME_KEYS = ['KeyA', 'KeyD', 'Space', 'Numpad1'];

function isTypingTarget(el) {
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

window.addEventListener('keydown', function (e) {
  if (isTypingTarget(document.activeElement)) return;
  if (GAME_KEYS.indexOf(e.code) !== -1) e.preventDefault();
  if (e.code === 'KeyA') keys.left = true;
  if (e.code === 'KeyD') keys.right = true;
  if (e.code === 'Space') keys.jump = true;
  if (e.code === 'Numpad1') keys.attack = true;
}, { passive: false });

window.addEventListener('keyup', function (e) {
  if (e.code === 'KeyA') keys.left = false;
  if (e.code === 'KeyD') keys.right = false;
  if (e.code === 'Space') keys.jump = false;
  if (e.code === 'Numpad1') keys.attack = false;
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
var overlayGameover = document.getElementById('overlay-gameover');
var nameInput = document.getElementById('name-input');

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
  overlayGameover.hidden = true;
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

document.getElementById('btn-complete-restart').addEventListener('click', showMenu);
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
      if (damagePlayer(p, g.attack)) { showToast('Au au!'); }
      g.hitCooldown = 0.6;
    }
  }

  // boss
  level.stepBoss(game.boss, p, level.platforms, dt);
  if (!game.bossIntroDone && p.x >= level.BOSS_ARENA_X - 20 && game.boss.asleep) {
    game.bossIntroDone = true;
    game.phase = 'dialogue';
    runDialogue(level.preBossDialogue, { name: p.name }, dialogueUi, function () {
      game.boss.asleep = false;
      game.phase = 'playing';
    });
    return;
  }

  if (!game.boss.asleep && game.boss.alive) {
    var hb = level.bossAttackHitbox(game.boss);
    if (hb && !game.boss.hitDone && aabb(p.x, p.y, p.w, p.h, hb.x, hb.y, hb.w, hb.h)) {
      if (damagePlayer(p, hb.damage)) showToast('Toma essa!');
      game.boss.hitDone = true;
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
      level.hitBoss(game.boss, p.attack, bossDir);
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

  if (game.boss.defeated && game.phase === 'playing') {
    game.phase = 'dialogue';
    runDialogue(level.victoryDialogue, { name: p.name }, dialogueUi, function () {
      levelUp(p);
      updateHud();
      document.getElementById('complete-level').textContent = p.level;
      overlayComplete.hidden = false;
      game.phase = 'complete';
    });
    return;
  }

  var target = p.x - VIEW_W / 2;
  game.camX = computeCamera(p.x, VIEW_W, level.LEVEL_W);
}

function updateCheckpoint() {
  var cps = level.checkpoints;
  for (var i = cps.length - 1; i >= 0; i--) {
    if (game.player.x >= cps[i]) { game.checkpointX = cps[i]; break; }
  }
}

// ---------- Renderização ----------
function drawHouseLayer(camFactor, baseY, wallColor, roofColor, seed, count) {
  var spacing = (level.LEVEL_W + 500) / count;
  for (var i = -1; i < count; i++) {
    var hx = i * spacing - (game.camX * camFactor) % spacing - 120;
    var hseed = Math.abs(Math.sin(seed + i * 12.9898)) % 1;
    var w = 140 + hseed * 60;
    var h = 110 + hseed * 70;
    ctx.fillStyle = wallColor;
    ctx.fillRect(hx, baseY - h, w, h);
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(hx - 10, baseY - h);
    ctx.lineTo(hx + w / 2, baseY - h - 46);
    ctx.lineTo(hx + w + 10, baseY - h);
    ctx.closePath();
    ctx.fill();
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawMiniHpBar(x, y, w, pct, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * pct, 5);
}

function drawGrunt(g) {
  if (!g.alive) return;
  var facing = g.vx >= 0 ? 1 : -1;
  var cx = g.x + g.w / 2;
  var baseY = g.y + g.h;
  var moving = Math.abs(g.vx) > 5;
  var strideRaw = Math.sin(g.x * 0.2);
  var stride = moving ? strideRaw * 5 : 0;

  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(facing, 1);

  // patas
  ctx.strokeStyle = '#4a3626';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(-8 + stride, -1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(7, -12); ctx.lineTo(7 - stride, -1); ctx.stroke();

  // rabo
  ctx.strokeStyle = '#8a6a4f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-11, -18);
  ctx.quadraticCurveTo(-19, -22 + stride * 0.6, -16, -28);
  ctx.stroke();

  // corpo
  ctx.fillStyle = '#8a6a4f';
  ctx.beginPath();
  ctx.ellipse(0, -18, 15, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // cabeça
  ctx.fillStyle = '#96755a';
  ctx.beginPath();
  ctx.arc(13, -22, 8, 0, Math.PI * 2);
  ctx.fill();

  // focinho
  ctx.fillStyle = '#6b4d38';
  ctx.beginPath();
  ctx.ellipse(19, -19, 4.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a2320';
  ctx.beginPath(); ctx.arc(22, -19, 1.3, 0, Math.PI * 2); ctx.fill();

  // orelhas
  ctx.fillStyle = '#5a4433';
  ctx.beginPath();
  ctx.moveTo(8, -28); ctx.lineTo(6, -35); ctx.lineTo(13, -29); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(17, -29); ctx.lineTo(20, -36); ctx.lineTo(21, -28); ctx.closePath(); ctx.fill();

  // olho
  ctx.fillStyle = '#2a2320';
  ctx.beginPath(); ctx.arc(15, -23, 1.4, 0, Math.PI * 2); ctx.fill();

  ctx.restore();

  drawMiniHpBar(g.x - 2, g.y - 12, g.w + 4, g.hp / g.maxHp, '#ff5d73');
}

function drawBossLimb(x1, y1, x2, y2, width, color, footColor) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  if (footColor) {
    ctx.fillStyle = footColor;
    ctx.beginPath();
    ctx.ellipse(x2 + (x2 > x1 ? 5 : -5), y2, 8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBoss(b) {
  if (!b.alive) return;
  var lying = b.state === 'preguica';
  var squash = lying ? 0.7 : (b.state.indexOf('telegraph') === 0 ? 0.92 : 1);
  var cx = b.x + b.w / 2;
  var baseY = b.y + b.h;
  var scaleY = squash;

  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(b.facing, 1);
  ctx.scale(1, scaleY);

  var skin = '#c9986b';
  var shirt = '#eee3c8';
  var shorts = '#5a7a9c';
  var sandal = '#3a2a1f';

  // gingado: pernas e bracos balancam enquanto ele anda ate o jogador
  var walking = b.state === 'approach' && Math.abs(b.vx) > 5;
  var strideB = walking ? Math.sin(b.x * 0.15) * 7 : 0;
  var waddle = walking ? Math.abs(Math.sin(b.x * 0.15)) * 2 : 0;
  ctx.translate(0, -waddle);

  // pernas curtas + chinelos (passada alternada ao caminhar)
  drawBossLimb(-12, -22, -14 + strideB, -2, 9, skin, sandal);
  drawBossLimb(9, -22, 12 - strideB, -2, 9, skin, sandal);

  // bracos (o da frente se estende no golpe de chinelada; balancam ao andar)
  var armSwing = 0;
  var chineladaHand = null;
  if (b.state === 'active-chinelada' || b.state === 'telegraph-chinelada') {
    armSwing = b.state === 'telegraph-chinelada' ? -10 : 22;
    chineladaHand = sandal;
  }
  drawBossLimb(-14, -46, -22 - strideB * 0.6, -30, 8, skin, null);
  drawBossLimb(15, -46, 24 + armSwing + strideB * 0.6, -34, 8, skin, chineladaHand);

  // barriga (a marca registrada)
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.ellipse(0, -34, 24, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(0, -24, 19, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, -24, 3, 0.2, Math.PI - 0.2); ctx.stroke();

  // short
  ctx.fillStyle = shorts;
  ctx.beginPath();
  ctx.ellipse(0, -14, 17, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // cabeca
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(3, -58, 11, 0, Math.PI * 2);
  ctx.fill();

  // careca com samambaia dos lados
  ctx.fillStyle = '#4a3222';
  ctx.beginPath(); ctx.arc(-3, -60, 5, Math.PI * 0.3, Math.PI * 1.1); ctx.fill();
  ctx.beginPath(); ctx.arc(9, -60, 4, Math.PI * 1.7, Math.PI * 2.5); ctx.fill();

  // bigode
  ctx.strokeStyle = '#3a2a1f';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(4, -55); ctx.lineTo(10, -54); ctx.stroke();

  // olhos (fechados durante a preguica)
  ctx.strokeStyle = '#2a2320';
  ctx.fillStyle = '#2a2320';
  ctx.lineWidth = 1.8;
  if (lying) {
    ctx.beginPath(); ctx.moveTo(4, -60); ctx.lineTo(9, -60); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(8, -60, 1.5, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();

  if (b.state.indexOf('active') === 0) {
    ctx.strokeStyle = 'rgba(255,93,115,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + b.facing * 34, baseY - 36 * scaleY, 13, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (lying) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '18px sans-serif';
    ctx.fillText('💤', cx - 8, baseY - b.h * scaleY - 6);
  }

  drawMiniHpBar(b.x - 4, b.y - 14, b.w + 8, b.hp / b.maxHp, '#ff5d73');
}

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
  roundRect(-11, -34, 22, 24, 6);
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

  var sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, '#7ec8e3');
  sky.addColorStop(1, '#cdeaf0');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  drawHouseLayer(0.3, VIEW_H - 60, '#f4e4c9', '#c1543f', 5, 10);
  drawHouseLayer(0.55, VIEW_H - 45, '#eddcbb', '#a94734', 31, 12);

  ctx.save();
  ctx.translate(-game.camX, 0);

  // calçada / plataformas
  for (var i = 0; i < level.platforms.length; i++) {
    var pl = level.platforms[i];
    ctx.fillStyle = '#9a9a8f';
    ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
    ctx.fillStyle = '#5a8f4f';
    ctx.fillRect(pl.x, pl.y, pl.w, 6);
  }

  for (var g = 0; g < game.enemies.length; g++) drawGrunt(game.enemies[g]);

  if (game.boss) drawBoss(game.boss);
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
