import { GRAVITY, MAX_FALL, moveAndCollide, aabb, clamp } from '../engine.js';
import { enemyHpForLevel, enemyAttackForLevel } from '../balance.js';
import { createGrunt } from '../enemies.js';
import { drawMiniHpBar, drawLimb, roundRect } from '../renderUtils.js';

export const VIEW_W = 960;
export const VIEW_H = 540;
export const GROUND_Y = 460;
export const DEATH_Y = 620;
export const FALL_DAMAGE = 15;

export const LEVEL_NAME = 'Agropecuária Rechan';
export const LEVEL_NUMBER = 3;

// Mapa com uma "escadinha" de dois degraus baixos (40px cada) em vez do
// vão único elevado do Rechan -- outro jeito de variar o percurso mantendo
// tudo dentro do alcance seguro de pulo.
export const platforms = [
  { x: 0, y: GROUND_Y, w: 450, h: 80 },
  { x: 510, y: GROUND_Y, w: 490, h: 80 },
  { x: 1000, y: GROUND_Y, w: 2000, h: 80 },
  { x: 1350, y: 420, w: 100, h: 24 },
  { x: 1470, y: 380, w: 100, h: 24 }
];

export const checkpoints = [0, 510, 1000];

export const LEVEL_W = 3000;
export const PLAYER_START = { x: 60, y: GROUND_Y - 200 };

export const BOSS_ARENA_X = 2500;
export const BOSS_ARENA_MIN_X = 2500;
export const BOSS_ARENA_MAX_X = 2990;

export var GRUNT_HIT_TOAST = 'Cocoricó!';
export var PLATFORM_FILL = '#8a7a5c';
export var PLATFORM_TOP = '#6f9b4a';

export function createEnemies(level) {
  return [
    createGrunt({
      name: 'Galinha Brava', x: 180, y: GROUND_Y - 22, w: 22, h: 22,
      minX: 150, maxX: 380, speed: 90, baseHp: 18, baseAttack: 6
    }, level),
    createGrunt({
      name: 'Galinha Brava', x: 700, y: GROUND_Y - 22, w: 22, h: 22,
      minX: 650, maxX: 900, speed: 95, baseHp: 18, baseAttack: 6
    }, level),
    createGrunt({
      name: 'Galinha Brava', x: 1700, y: GROUND_Y - 22, w: 22, h: 22,
      minX: 1600, maxX: 1850, speed: 100, baseHp: 18, baseAttack: 6
    }, level),
    createGrunt({
      name: 'Galinha Brava', x: 2200, y: GROUND_Y - 22, w: 22, h: 22,
      minX: 2100, maxX: 2400, speed: 100, baseHp: 18, baseAttack: 6
    }, level)
  ];
}

// ---------- Boss: Juninho Guareí ----------

const BASE_HP = 150;
const VASSOURADA_DMG = 8;
const CARRINHO_DMG = 18;

export function createBoss(level) {
  return {
    name: 'Juninho Guareí',
    x: 2800, y: GROUND_Y - 52, w: 46, h: 52, vx: 0, vy: 0, onGround: false,
    facing: -1,
    hp: enemyHpForLevel(BASE_HP, level),
    maxHp: enemyHpForLevel(BASE_HP, level),
    vassouradaDmg: enemyAttackForLevel(VASSOURADA_DMG, level),
    carrinhoDmg: enemyAttackForLevel(CARRINHO_DMG, level),
    state: 'approach',
    stateTimer: 0,
    actionCount: 0,
    hitDone: false,
    alive: true,
    defeated: false,
    asleep: true,
    knockbackTimer: 0,
    knockbackVx: 0
  };
}

var BOSS_KNOCKBACK_SPEED = 170;
var BOSS_KNOCKBACK_DURATION = 0.18;

var TELEGRAPH_VASSOURADA = 0.35;
var ACTIVE_VASSOURADA = 0.18;
var RECOVER_VASSOURADA = 0.3;
var TELEGRAPH_CARRINHO = 0.55;
var ACTIVE_CARRINHO = 0.55;
var RECOVER_CARRINHO = 0.55;
var FEDOR_TIME = 1.7;
var CARRINHO_SPEED = 240;
var APPROACH_SPEED = 50;
var ENGAGE_RANGE = 82;

function setState(boss, state, duration) {
  boss.state = state;
  boss.stateTimer = duration;
  boss.hitDone = false;
}

export function stepBoss(boss, player, platforms, dt) {
  if (!boss.alive || boss.asleep) return;

  if (boss.stateTimer > 0) boss.stateTimer -= dt;
  var playerCenter = player.x + player.w / 2;
  var bossCenter = boss.x + boss.w / 2;
  boss.facing = playerCenter < bossCenter ? -1 : 1;

  switch (boss.state) {
    case 'approach': {
      var dist = Math.abs(playerCenter - bossCenter);
      if (dist > ENGAGE_RANGE) {
        boss.vx = boss.facing * APPROACH_SPEED;
      } else {
        boss.vx = 0;
        boss.actionCount += 1;
        if (boss.actionCount % 3 === 0) {
          setState(boss, 'fedor', FEDOR_TIME);
        } else if (boss.actionCount % 2 === 1) {
          setState(boss, 'telegraph-vassourada', TELEGRAPH_VASSOURADA);
        } else {
          setState(boss, 'telegraph-carrinho', TELEGRAPH_CARRINHO);
        }
      }
      break;
    }
    case 'telegraph-vassourada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'active-vassourada', ACTIVE_VASSOURADA);
      break;
    case 'active-vassourada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'recover-vassourada', RECOVER_VASSOURADA);
      break;
    case 'recover-vassourada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'approach', 0);
      break;
    case 'telegraph-carrinho':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'active-carrinho', ACTIVE_CARRINHO);
      break;
    case 'active-carrinho':
      boss.vx = boss.facing * CARRINHO_SPEED;
      if (boss.stateTimer <= 0) setState(boss, 'recover-carrinho', RECOVER_CARRINHO);
      break;
    case 'recover-carrinho':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'approach', 0);
      break;
    case 'fedor':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'approach', 0);
      break;
  }

  if (boss.knockbackTimer > 0 && boss.state !== 'active-carrinho') {
    boss.vx = boss.knockbackVx;
    boss.knockbackTimer -= dt;
  }

  boss.vy += GRAVITY * dt;
  if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;
  moveAndCollide(boss, platforms, boss.vx * dt, boss.vy * dt);
  boss.x = clamp(boss.x, BOSS_ARENA_MIN_X, BOSS_ARENA_MAX_X - boss.w);
}

export function bossAttackHitbox(boss) {
  if (boss.state === 'active-vassourada') {
    var reach = 30;
    var x = boss.facing > 0 ? boss.x + boss.w : boss.x - reach;
    return { x: x, y: boss.y + 6, w: reach, h: boss.h - 14, damage: boss.vassouradaDmg, message: 'Vassourada!' };
  }
  if (boss.state === 'active-carrinho') {
    return { x: boss.x, y: boss.y, w: boss.w, h: boss.h, damage: boss.carrinhoDmg, message: 'Carrinho de feno!' };
  }
  return null;
}

export function bossDamageMultiplier(boss) {
  return boss.state === 'fedor' ? 1.5 : 1;
}

export function hitBoss(boss, damage, knockbackDir) {
  if (!boss.alive) return;
  boss.hp = Math.max(0, boss.hp - Math.round(damage * bossDamageMultiplier(boss)));
  if (boss.hp <= 0) {
    boss.alive = false;
    boss.defeated = true;
    return;
  }
  if (knockbackDir) {
    boss.knockbackVx = knockbackDir * BOSS_KNOCKBACK_SPEED;
    boss.knockbackTimer = BOSS_KNOCKBACK_DURATION;
  }
}

// ---------- Aliado: Escorrega (Luiz Neves) ----------
// Entra na luta quando o Juninho chega em 50% de vida, pra defender o
// patrão. game.js detecta level.createAlly sozinho e cuida da entrada.

const ALLY_BASE_HP = 90;
const RASTEIRA_DMG = 12;
const SACO_RACAO_DMG = 10;

export function createAlly(level) {
  return {
    name: 'Escorrega',
    x: 2700, y: GROUND_Y - 60, w: 34, h: 60, vx: 0, vy: 0, onGround: false,
    facing: -1,
    hp: enemyHpForLevel(ALLY_BASE_HP, level),
    maxHp: enemyHpForLevel(ALLY_BASE_HP, level),
    rasteiraDmg: enemyAttackForLevel(RASTEIRA_DMG, level),
    sacoRacaoDmg: enemyAttackForLevel(SACO_RACAO_DMG, level),
    state: 'approach',
    stateTimer: 0,
    actionCount: 0,
    hitDone: false,
    alive: true,
    defeated: false,
    asleep: true,
    knockbackTimer: 0,
    knockbackVx: 0
  };
}

var TELEGRAPH_RASTEIRA = 0.3;
var ACTIVE_RASTEIRA = 0.35;
var RECOVER_RASTEIRA = 0.4;
var TELEGRAPH_SACO = 0.4;
var ACTIVE_SACO = 0.2;
var RECOVER_SACO = 0.3;
var ESCORREGOU_TIME = 1.5;
var RASTEIRA_SPEED = 270;
var APPROACH_SPEED_A = 65;
var ENGAGE_RANGE_A = 78;

function setStateA(a, state, duration) {
  a.state = state;
  a.stateTimer = duration;
  a.hitDone = false;
}

export function stepAlly(a, player, platforms, dt) {
  if (!a.alive || a.asleep) return;

  if (a.stateTimer > 0) a.stateTimer -= dt;
  var playerCenter = player.x + player.w / 2;
  var aCenter = a.x + a.w / 2;
  a.facing = playerCenter < aCenter ? -1 : 1;

  switch (a.state) {
    case 'approach': {
      var dist = Math.abs(playerCenter - aCenter);
      if (dist > ENGAGE_RANGE_A) {
        a.vx = a.facing * APPROACH_SPEED_A;
      } else {
        a.vx = 0;
        a.actionCount += 1;
        if (a.actionCount % 3 === 0) {
          setStateA(a, 'escorregou', ESCORREGOU_TIME);
        } else if (a.actionCount % 2 === 1) {
          setStateA(a, 'telegraph-rasteira', TELEGRAPH_RASTEIRA);
        } else {
          setStateA(a, 'telegraph-saco', TELEGRAPH_SACO);
        }
      }
      break;
    }
    case 'telegraph-rasteira':
      a.vx = 0;
      if (a.stateTimer <= 0) setStateA(a, 'active-rasteira', ACTIVE_RASTEIRA);
      break;
    case 'active-rasteira':
      a.vx = a.facing * RASTEIRA_SPEED;
      if (a.stateTimer <= 0) setStateA(a, 'recover-rasteira', RECOVER_RASTEIRA);
      break;
    case 'recover-rasteira':
      a.vx = 0;
      if (a.stateTimer <= 0) setStateA(a, 'approach', 0);
      break;
    case 'telegraph-saco':
      a.vx = 0;
      if (a.stateTimer <= 0) setStateA(a, 'active-saco', ACTIVE_SACO);
      break;
    case 'active-saco':
      a.vx = 0;
      if (a.stateTimer <= 0) setStateA(a, 'recover-saco', RECOVER_SACO);
      break;
    case 'recover-saco':
      a.vx = 0;
      if (a.stateTimer <= 0) setStateA(a, 'approach', 0);
      break;
    case 'escorregou':
      a.vx = 0;
      if (a.stateTimer <= 0) setStateA(a, 'approach', 0);
      break;
  }

  if (a.knockbackTimer > 0 && a.state !== 'active-rasteira') {
    a.vx = a.knockbackVx;
    a.knockbackTimer -= dt;
  }

  a.vy += GRAVITY * dt;
  if (a.vy > MAX_FALL) a.vy = MAX_FALL;
  moveAndCollide(a, platforms, a.vx * dt, a.vy * dt);
  a.x = clamp(a.x, BOSS_ARENA_MIN_X, BOSS_ARENA_MAX_X - a.w);
}

export function allyAttackHitbox(a) {
  if (a.state === 'active-rasteira') {
    return { x: a.x, y: a.y + a.h - 18, w: a.w, h: 18, damage: a.rasteiraDmg, message: 'Rasteira!' };
  }
  if (a.state === 'active-saco') {
    var reach = 26;
    var x = a.facing > 0 ? a.x + a.w : a.x - reach;
    return { x: x, y: a.y + 4, w: reach, h: a.h - 10, damage: a.sacoRacaoDmg, message: 'Saco de ração na cara!' };
  }
  return null;
}

export function allyDamageMultiplier(a) {
  return a.state === 'escorregou' ? 1.5 : 1;
}

export function hitAlly(a, damage, knockbackDir) {
  if (!a.alive) return;
  a.hp = Math.max(0, a.hp - Math.round(damage * allyDamageMultiplier(a)));
  if (a.hp <= 0) {
    a.alive = false;
    a.defeated = true;
    return;
  }
  if (knockbackDir) {
    a.knockbackVx = knockbackDir * BOSS_KNOCKBACK_SPEED;
    a.knockbackTimer = BOSS_KNOCKBACK_DURATION;
  }
}

// ---------- Diálogos ----------

export var introDialogue = {
  start: 'n1',
  nodes: {
    n1: { speaker: 'Narrador', text: 'Ainda no Rechan, mas agora na porta da Agropecuária do Juninho Guareí — onde o preço do saco de ração muda dependendo do seu humor, e ele fede a um quilômetro de distância.', next: 'n2' },
    n2: {
      speaker: '{name}', text: 'Hoje esse barbudo fedorento vai aprender que preço bom é preço justo!',
      choices: [
        { label: 'Vou dar um banho de Wap nesse safado!', next: null },
        { label: 'Vou fazê-lo voltar pro Guareí!', next: null }
      ]
    }
  }
};

export var preBossDialogue = {
  start: 'p1',
  nodes: {
    p1: { speaker: 'Juninho Guareí', text: 'Nem venha me pedir fiado!', next: 'p2' },
    p2: {
      speaker: '{name}', text: '',
      choices: [
        { label: 'Tem vitamina pra cavalo ou o Gui levou tudo?', next: 'p3' },
        { label: 'Quando você vai parar de explorar funcionário?', next: 'p3' }
      ]
    },
    p3: { speaker: 'Narrador', text: 'Juninho agarra a vassoura mais perto e o combate começa!', next: null }
  }
};

export var allyJoinDialogue = {
  start: 'e1',
  nodes: {
    e1: { speaker: 'Narrador', text: 'Um funcionário enorme corre da agropecuária pra socorrer o patrão! É o Escorrega!', next: null }
  }
};

export var victoryDialogue = {
  start: 'v1',
  nodes: {
    v1: { speaker: 'Juninho Guareí', text: 'Obrigado por tentar me ajudar Escorrega, vou deixar você almoçar a partir de agora...', next: 'v2' },
    v2: { speaker: '{name}', text: 'Vamos para a próxima fase enfrentar o próximo babaca!', next: null }
  }
};

// ---------- Cenário: agropecuária empoeirada ----------

export function renderBackground(ctx, camX, VIEW_W, VIEW_H) {
  var sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, '#d9b877');
  sky.addColorStop(0.6, '#e8cf9a');
  sky.addColorStop(1, '#c9a866');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  drawSiloLayer(ctx, camX, 0.3, VIEW_H - 60, '#a8895f', '#6b4a34', 9, 7);
  drawFenceLayer(ctx, camX, 0.6, VIEW_H - 6);
}

function drawSiloLayer(ctx, camX, camFactor, baseY, bodyColor, capColor, seed, count) {
  var spacing = (LEVEL_W + 700) / count;
  for (var i = -1; i < count; i++) {
    var hx = i * spacing - (camX * camFactor) % spacing - 100;
    var hseed = Math.abs(Math.sin(seed + i * 12.9898)) % 1;
    var w = 70 + hseed * 30;
    var h = 150 + hseed * 90;
    ctx.fillStyle = bodyColor;
    ctx.fillRect(hx, baseY - h, w, h);
    ctx.fillStyle = capColor;
    ctx.beginPath();
    ctx.arc(hx + w / 2, baseY - h, w / 2, Math.PI, 0);
    ctx.fill();
  }
}

function drawFenceLayer(ctx, camX, camFactor, baseY) {
  var spacing = 70;
  var offset = (camX * camFactor) % spacing;
  ctx.strokeStyle = 'rgba(107, 74, 52, 0.55)';
  ctx.lineWidth = 5;
  for (var x = -offset - spacing; x < VIEW_W + spacing; x += spacing) {
    ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x, baseY - 34); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-spacing, baseY - 26); ctx.lineTo(VIEW_W + spacing, baseY - 26); ctx.stroke();
}

export function drawPlatform(ctx, pl) {
  ctx.fillStyle = PLATFORM_FILL;
  ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
  ctx.fillStyle = PLATFORM_TOP;
  ctx.fillRect(pl.x, pl.y, pl.w, 6);
}

// ---------- Desenho: Galinha Brava ----------

export function drawGrunt(ctx, g) {
  if (!g.alive) return;
  var facing = g.vx >= 0 ? 1 : -1;
  var cx = g.x + g.w / 2;
  var baseY = g.y + g.h;
  var moving = Math.abs(g.vx) > 5;
  var flap = moving ? Math.abs(Math.sin(g.x * 0.4)) * 4 : 0;

  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(facing, 1);

  // patas
  ctx.strokeStyle = '#c1874a';
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(-4, -1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(3, -6); ctx.lineTo(4, -1); ctx.stroke();

  // corpo
  ctx.fillStyle = '#f4efe4';
  ctx.beginPath();
  ctx.ellipse(0, -14, 10, 8 + flap * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // asa
  ctx.fillStyle = '#dcd4c0';
  ctx.beginPath();
  ctx.ellipse(-2, -14 - flap * 0.3, 5, 3.5, -0.3 - flap * 0.05, 0, Math.PI * 2);
  ctx.fill();

  // cabeça
  ctx.fillStyle = '#f4efe4';
  ctx.beginPath(); ctx.arc(9, -19, 5, 0, Math.PI * 2); ctx.fill();

  // crista
  ctx.fillStyle = '#c1546a';
  ctx.beginPath();
  ctx.moveTo(6, -23); ctx.lineTo(8, -27); ctx.lineTo(9, -23);
  ctx.lineTo(11, -27); ctx.lineTo(12, -23);
  ctx.closePath(); ctx.fill();

  // bico
  ctx.fillStyle = '#e0a458';
  ctx.beginPath();
  ctx.moveTo(13, -19); ctx.lineTo(17, -18); ctx.lineTo(13, -17);
  ctx.closePath(); ctx.fill();

  // olho
  ctx.fillStyle = '#2a2320';
  ctx.beginPath(); ctx.arc(10, -20, 1, 0, Math.PI * 2); ctx.fill();

  ctx.restore();

  drawMiniHpBar(ctx, g.x - 2, g.y - 10, g.w + 4, g.hp / g.maxHp, '#ff5d73');
}

// ---------- Desenho: Juninho Guareí ----------

export function drawBoss(ctx, b) {
  if (!b.alive) return;
  var stinky = b.state === 'fedor';
  var squash = stinky ? 0.85 : (b.state.indexOf('telegraph') === 0 ? 0.94 : 1);
  var cx = b.x + b.w / 2;
  var baseY = b.y + b.h;

  var skin = '#c98f5e';
  var apron = '#8a7355';
  var pants = '#4a4034';
  var beard = '#181414';

  var walking = b.state === 'approach' && Math.abs(b.vx) > 5;
  var strideB = walking ? Math.sin(b.x * 0.14) * 7 : 0;

  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(b.facing, 1);
  ctx.scale(1, squash);

  // pernas
  drawLimb(ctx, -13, -24, -15 + strideB, -2, 10, pants, '#2a2420');
  drawLimb(ctx, 10, -24, 13 - strideB, -2, 10, pants, '#2a2420');

  // braco de tras (segura a vassoura)
  drawLimb(ctx, -16, -50, -24 - strideB * 0.5, -20, 9, skin, null);
  ctx.strokeStyle = '#7a5a3a';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-24 - strideB * 0.5, -20); ctx.lineTo(-24 - strideB * 0.5, -55); ctx.stroke();
  ctx.fillStyle = '#e0c458';
  ctx.fillRect(-29 - strideB * 0.5, -58, 10, 8);

  // braco da frente (ataca com vassoura no golpe)
  var swing = 0;
  if (b.state === 'telegraph-vassourada') swing = -14;
  if (b.state === 'active-vassourada') swing = 24;
  drawLimb(ctx, 17, -50, 24 + swing, -34, 9, skin, null);

  // corpo largo (avental sujo)
  ctx.fillStyle = apron;
  roundRect(ctx, -18, -58, 36, 34, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(74,58,34,0.4)';
  ctx.beginPath(); ctx.arc(-6, -38, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(8, -30, 3, 0, Math.PI * 2); ctx.fill();

  // cabeca
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, -68, 12, 0, Math.PI * 2); ctx.fill();

  // barba grande e negra
  ctx.fillStyle = beard;
  ctx.beginPath();
  ctx.moveTo(-11, -66);
  ctx.quadraticCurveTo(-10, -50, 0, -46);
  ctx.quadraticCurveTo(10, -50, 11, -66);
  ctx.quadraticCurveTo(6, -60, 0, -60);
  ctx.quadraticCurveTo(-6, -60, -11, -66);
  ctx.fill();

  // cabelo
  ctx.fillStyle = beard;
  ctx.beginPath(); ctx.arc(0, -72, 12, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();

  // olhos
  ctx.fillStyle = '#2a2320';
  ctx.beginPath(); ctx.arc(5, -69, 1.6, 0, Math.PI * 2); ctx.fill();

  ctx.restore();

  // moscas (ele detesta tomar banho)
  var flyT = performance.now() / 250;
  ctx.fillStyle = 'rgba(30,25,20,0.8)';
  for (var k = 0; k < 3; k++) {
    var fx = cx + Math.cos(flyT + k * 2) * (16 + k * 4);
    var fy = baseY - 82 * squash + Math.sin(flyT * 1.6 + k * 2) * 6;
    ctx.beginPath(); ctx.arc(fx, fy, 1.6, 0, Math.PI * 2); ctx.fill();
  }

  if (b.state.indexOf('active') === 0) {
    ctx.strokeStyle = 'rgba(255,93,115,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + b.facing * 34, baseY - 40 * squash, 14, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (stinky) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '18px sans-serif';
    ctx.fillText('🤢', cx - 8, baseY - 88 * squash);
  }

  drawMiniHpBar(ctx, b.x - 4, b.y - 44, b.w + 8, b.hp / b.maxHp, '#ff5d73');
}

// ---------- Desenho: Escorrega ----------

export function drawAlly(ctx, a) {
  if (!a.alive) return;
  var fallen = a.state === 'escorregou';
  var cx = a.x + a.w / 2;
  var baseY = a.y + a.h;

  var skin = '#5a4230';
  var shirt = '#3a6b4a';
  var pants = '#2a2420';

  var walking = a.state === 'approach' && Math.abs(a.vx) > 5;
  var strideB = walking ? Math.sin(a.x * 0.13) * 8 : 0;

  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(a.facing, 1);
  if (fallen) ctx.rotate(a.facing * 1.35);

  // pernas longas
  drawLimb(ctx, -9, -34, -10 + strideB, -2, 7, pants, '#20191a');
  drawLimb(ctx, 8, -34, 9 - strideB, -2, 7, pants, '#20191a');

  // bracos
  if (a.state === 'active-saco' || a.state === 'telegraph-saco') {
    var sacoSwing = a.state === 'active-saco' ? 26 : 10;
    drawLimb(ctx, -10, -62, -16, -40, 7, skin, null);
    drawLimb(ctx, 10, -62, 14 + sacoSwing, -50, 7, skin, null);
    ctx.fillStyle = '#c9a458';
    ctx.fillRect(14 + sacoSwing - 4, -52, 12, 14);
  } else {
    drawLimb(ctx, -10, -62, -15 + strideB * 0.4, -38, 7, skin, null);
    drawLimb(ctx, 10, -62, 15 - strideB * 0.4, -38, 7, skin, null);
  }

  // tronco alto
  ctx.fillStyle = shirt;
  roundRect(ctx, -10, -68, 20, 30, 5);
  ctx.fill();
  ctx.fillStyle = '#d9a458';
  ctx.fillRect(-10, -46, 20, 5);

  // cabeca
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, -76, 10, 0, Math.PI * 2); ctx.fill();

  // cabelo curto
  ctx.fillStyle = '#0d0a0b';
  ctx.beginPath(); ctx.arc(0, -80, 10, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();

  // olhos
  ctx.fillStyle = '#faf6ee';
  ctx.beginPath(); ctx.arc(4, -77, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a2320';
  ctx.beginPath(); ctx.arc(4.6, -77, 0.9, 0, Math.PI * 2); ctx.fill();

  // perna pra cima na rasteira
  if (a.state === 'active-rasteira') {
    ctx.strokeStyle = pants;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(28, -24); ctx.stroke();
  }

  ctx.restore();

  if (a.state.indexOf('active') === 0) {
    ctx.strokeStyle = 'rgba(255,93,115,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + a.facing * 30, baseY - 50, 13, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (fallen) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '16px sans-serif';
    ctx.fillText('💫', cx - 8, baseY - 60);
  }

  drawMiniHpBar(ctx, a.x - 4, a.y - 14, a.w + 8, a.hp / a.maxHp, '#ffb347');
}
