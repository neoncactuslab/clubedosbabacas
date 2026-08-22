import { aabb, computeCamera, clamp } from './engine.js';
import { createPlayer, levelUp, damagePlayer, playerAttackHitbox, stepPlayer } from './player.js';
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

window.addEventListener('keydown', function (e) {
  if (['KeyA', 'KeyD', 'KeyW', 'Space'].indexOf(e.code) !== -1) e.preventDefault();
  if (e.code === 'KeyA') keys.left = true;
  if (e.code === 'KeyD') keys.right = true;
  if (e.code === 'KeyW') keys.jump = true;
  if (e.code === 'Space') keys.attack = true;
}, { passive: false });

window.addEventListener('keyup', function (e) {
  if (e.code === 'KeyA') keys.left = false;
  if (e.code === 'KeyD') keys.right = false;
  if (e.code === 'KeyW') keys.jump = false;
  if (e.code === 'Space') keys.attack = false;
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
        hitGrunt(ge, p.attack);
        p.attackHitDone = true;
        break;
      }
    }
    if (!p.attackHitDone && !game.boss.asleep && game.boss.alive &&
        aabb(atkBox.x, atkBox.y, atkBox.w, atkBox.h, game.boss.x, game.boss.y, game.boss.w, game.boss.h)) {
      level.hitBoss(game.boss, p.attack);
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

function drawGrunt(g) {
  if (!g.alive) return;
  ctx.fillStyle = '#8a6a4f';
  ctx.beginPath();
  ctx.ellipse(g.x + g.w / 2, g.y + g.h / 2 + 4, g.w / 2 + 4, g.h / 2 - 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a4433';
  ctx.beginPath();
  ctx.arc(g.x + (g.vx >= 0 ? g.w + 2 : -2), g.y + g.h / 2 - 6, 7, 0, Math.PI * 2);
  ctx.fill();
  // barra de vida mini
  var pct = g.hp / g.maxHp;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(g.x - 2, g.y - 12, g.w + 4, 5);
  ctx.fillStyle = '#ff5d73';
  ctx.fillRect(g.x - 2, g.y - 12, (g.w + 4) * pct, 5);
}

function drawBoss(b) {
  if (!b.alive) return;
  var squash = b.state === 'preguica' ? 0.55 : (b.state.indexOf('telegraph') === 0 ? 0.85 : 1);
  var bw = b.w * (2 - squash);
  var bh = b.h * squash;
  var by = b.y + (b.h - bh);

  ctx.fillStyle = b.state === 'preguica' ? '#c9a876' : '#d9b27c';
  ctx.beginPath();
  ctx.ellipse(b.x + b.w / 2, by + bh / 2, bw / 2, bh / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#3a2a1f';
  var eyeX = b.x + b.w / 2 + b.facing * (bw / 2 - 10);
  if (b.state !== 'preguica') {
    ctx.beginPath();
    ctx.arc(eyeX, by + bh * 0.35, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#3a2a1f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(eyeX - 5, by + bh * 0.35);
    ctx.lineTo(eyeX + 5, by + bh * 0.35);
    ctx.stroke();
  }

  if (b.state.indexOf('active') === 0) {
    ctx.strokeStyle = 'rgba(255,93,115,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(b.x + b.w / 2 + b.facing * bw * 0.6, by + bh / 2, 14, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (b.state === 'preguica') {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '20px sans-serif';
    ctx.fillText('💤', b.x + b.w / 2 - 10, by - 8);
  }
}

function drawPlayer(p) {
  var px = p.x, py = p.y;
  var flash = p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0;
  ctx.fillStyle = flash ? 'rgba(255,255,255,0.5)' : '#3f6fb0';
  var r = 8;
  ctx.beginPath();
  ctx.moveTo(px + r, py);
  ctx.arcTo(px + p.w, py, px + p.w, py + p.h, r);
  ctx.arcTo(px + p.w, py + p.h, px, py + p.h, r);
  ctx.arcTo(px, py + p.h, px, py, r);
  ctx.arcTo(px, py, px + p.w, py, r);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffe3ad';
  ctx.beginPath();
  ctx.arc(px + p.w / 2, py + 10, 8, 0, Math.PI * 2);
  ctx.fill();

  if (p.attackTimer > 0) {
    var hb = playerAttackHitbox(p);
    ctx.fillStyle = 'rgba(255,93,115,0.55)';
    if (hb) ctx.fillRect(hb.x, hb.y, hb.w, hb.h);
  }
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
