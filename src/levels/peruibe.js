import { GRAVITY, MAX_FALL, moveAndCollide, aabb, clamp } from '../engine.js';
import { enemyHpForLevel, enemyAttackForLevel } from '../balance.js';
import { createGrunt } from '../enemies.js';
import { drawMiniHpBar, drawLimb, roundRect, drawBuildingLayer } from '../renderUtils.js';

export const VIEW_W = 960;
export const VIEW_H = 540;
export const GROUND_Y = 460;
export const DEATH_Y = 620;
export const FALL_DAMAGE = 15;

export const LEVEL_NAME = 'Peruíbe';
export const LEVEL_NUMBER = 4;

// Trecho do meio é um píer de madeira, 30px mais alto que a areia -- outra
// forma de variar o percurso (depois da plataforma elevada do Rechan e da
// escadinha da Agropecuária). Vãos continuam pequenos e seguros.
export const platforms = [
  { x: 0, y: GROUND_Y, w: 480, h: 80 },
  { x: 540, y: GROUND_Y, w: 510, h: 80 },
  { x: 1110, y: GROUND_Y - 30, w: 890, h: 30 },
  { x: 2060, y: GROUND_Y, w: 1140, h: 80 }
];

export const checkpoints = [0, 540, 1110, 2060];

export const LEVEL_W = 3200;
export const PLAYER_START = { x: 60, y: GROUND_Y - 200 };

export const BOSS_ARENA_X = 2620;
export const BOSS_ARENA_MIN_X = 2620;
export const BOSS_ARENA_MAX_X = 3190;

export var GRUNT_HIT_TOAST = 'Clec clec!';
export var PLATFORM_FILL = '#e0c48a';
export var PLATFORM_TOP = '#a97442';

export function createEnemies(level) {
  return [
    createGrunt({
      name: 'Caranguejo da Praia', x: 180, y: GROUND_Y - 18, w: 26, h: 18,
      minX: 140, maxX: 400, speed: 105, baseHp: 20, baseAttack: 7
    }, level),
    createGrunt({
      name: 'Caranguejo da Praia', x: 700, y: GROUND_Y - 18, w: 26, h: 18,
      minX: 650, maxX: 950, speed: 110, baseHp: 20, baseAttack: 7
    }, level),
    createGrunt({
      name: 'Caranguejo da Praia', x: 1400, y: GROUND_Y - 30 - 18, w: 26, h: 18,
      minX: 1300, maxX: 1650, speed: 115, baseHp: 20, baseAttack: 7
    }, level),
    createGrunt({
      name: 'Caranguejo da Praia', x: 2200, y: GROUND_Y - 18, w: 26, h: 18,
      minX: 2120, maxX: 2500, speed: 110, baseHp: 20, baseAttack: 7
    }, level)
  ];
}

// ---------- Boss: Léo Gobor ("Minhoquinha do MIB") ----------

const BASE_HP = 130;
const BRACADA_DMG = 9;
const BAFORADA_DMG = 12;

export function createBoss(level) {
  return {
    name: 'Léo Gobor',
    x: 2950, y: GROUND_Y - 58, w: 32, h: 58, vx: 0, vy: 0, onGround: false,
    facing: -1,
    hp: enemyHpForLevel(BASE_HP, level),
    maxHp: enemyHpForLevel(BASE_HP, level),
    bracadaDmg: enemyAttackForLevel(BRACADA_DMG, level),
    baforadaDmg: enemyAttackForLevel(BAFORADA_DMG, level),
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

var BOSS_KNOCKBACK_SPEED = 175;
var BOSS_KNOCKBACK_DURATION = 0.18;

var TELEGRAPH_BRACADA = 0.3;
var ACTIVE_BRACADA = 0.18;
var RECOVER_BRACADA = 0.3;
var TELEGRAPH_BAFORADA = 0.5;
var ACTIVE_BAFORADA = 0.4;
var RECOVER_BAFORADA = 0.4;
var VIAGEM_TIME = 1.8;
var APPROACH_SPEED = 55;
var ENGAGE_RANGE = 50; // precisa ficar dentro do alcance real dos golpes (bracada chega a ~50, baforada a ~32 do centro)

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
          setState(boss, 'viagem', VIAGEM_TIME);
        } else if (boss.actionCount % 2 === 1) {
          setState(boss, 'telegraph-bracada', TELEGRAPH_BRACADA);
        } else {
          setState(boss, 'telegraph-baforada', TELEGRAPH_BAFORADA);
        }
      }
      break;
    }
    case 'telegraph-bracada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'active-bracada', ACTIVE_BRACADA);
      break;
    case 'active-bracada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'recover-bracada', RECOVER_BRACADA);
      break;
    case 'recover-bracada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'approach', 0);
      break;
    case 'telegraph-baforada':
      // parado, sem se aproximar -- ataque de curto alcance que pune quem
      // fica colado nele, diferente da investida dos bosses anteriores
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'active-baforada', ACTIVE_BAFORADA);
      break;
    case 'active-baforada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'recover-baforada', RECOVER_BAFORADA);
      break;
    case 'recover-baforada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'approach', 0);
      break;
    case 'viagem':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'approach', 0);
      break;
  }

  if (boss.knockbackTimer > 0) {
    boss.vx = boss.knockbackVx;
    boss.knockbackTimer -= dt;
  }

  boss.vy += GRAVITY * dt;
  if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;
  moveAndCollide(boss, platforms, boss.vx * dt, boss.vy * dt);
  boss.x = clamp(boss.x, BOSS_ARENA_MIN_X, BOSS_ARENA_MAX_X - boss.w);
}

export function bossAttackHitbox(boss) {
  if (boss.state === 'active-bracada') {
    var reach = 34; // bracos compridos, alcance maior que o normal
    var x = boss.facing > 0 ? boss.x + boss.w : boss.x - reach;
    return { x: x, y: boss.y + 8, w: reach, h: boss.h - 16, damage: boss.bracadaDmg, message: 'Braçada longa!' };
  }
  if (boss.state === 'active-baforada') {
    return { x: boss.x - 16, y: boss.y - 6, w: boss.w + 32, h: boss.h * 0.6, damage: boss.baforadaDmg, message: 'Baforada!' };
  }
  return null;
}

export function bossDamageMultiplier(boss) {
  return boss.state === 'viagem' ? 1.5 : 1;
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

// ---------- Diálogos ----------

export var introDialogue = {
  start: 'n1',
  nodes: {
    n1: { speaker: 'Narrador', text: 'Peruíbe, litoral de São Paulo. Entre o cheiro de maresia e uma nuvem esquisita que nunca dissipa, mora Léo Gobor — magrelo, alto, sempre de boné e bigode, com um baseado do tamanho de um charuto grudado na boca.', next: 'n2' },
    n2: {
      speaker: '{name}', text: 'Hoje vamos atrás do Leo do Mel... Vamos pegá-lo!',
      choices: [
        { label: 'Maconheiro tem mais é que apanhar mesmo!', next: null },
        { label: 'Minhoquinha do MIB vai levar uma coça!', next: null }
      ]
    }
  }
};

export var preBossDialogue = {
  start: 'p1',
  nodes: {
    p1: { speaker: 'Léo Gobor', text: 'Ô mano... que climão é esse, tá tudo em paz por aqui...', next: 'p2' },
    p2: {
      speaker: '{name}', text: '',
      choices: [
        { label: 'Climão vai ser você apanhando!', next: 'p3' },
        { label: 'Passa o boné e a essência, vamos resolver isso.', next: 'p3' }
      ]
    },
    p3: { speaker: 'Narrador', text: 'Léo dá uma tragada bem funda e entra na dele... o combate começa!', next: null }
  }
};

export var victoryDialogue = {
  start: 'v1',
  nodes: {
    v1: { speaker: 'Léo Gobor', text: 'Aí mano... valeu a braba, hein... vou ali dar uma acalmada...', next: 'v2' },
    v2: { speaker: '{name}', text: 'Vamos para a próxima fase enfrentar o próximo babaca!', next: null }
  }
};

// ---------- Cenário: praia de Peruíbe ----------

export function renderBackground(ctx, camX, VIEW_W, VIEW_H) {
  var sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, '#7ec8f0');
  sky.addColorStop(0.55, '#bfe6ea');
  sky.addColorStop(0.56, '#2f7fa8');
  sky.addColorStop(1, '#1f5f82');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // ondas
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 2;
  var waveOffset = (camX * 0.4) % 60;
  for (var row = 0; row < 3; row++) {
    var wy = VIEW_H * 0.56 + row * 26;
    ctx.beginPath();
    for (var x = -waveOffset - 60; x < VIEW_W + 60; x += 60) {
      ctx.moveTo(x, wy);
      ctx.quadraticCurveTo(x + 15, wy - 6, x + 30, wy);
      ctx.quadraticCurveTo(x + 45, wy + 6, x + 60, wy);
    }
    ctx.stroke();
  }

  drawBuildingLayer(ctx, camX, 0.25, LEVEL_W, VIEW_H - 60, '#f2e2b8', '#e0704a', 13, 6);
  drawPalmLayer(ctx, camX, 0.5, VIEW_H - 20, 21, 8);
}

function drawPalmLayer(ctx, camX, camFactor, baseY, seed, count) {
  var spacing = (LEVEL_W + 600) / count;
  ctx.strokeStyle = '#6b4a2f';
  ctx.fillStyle = '#3f7d3a';
  for (var i = -1; i < count; i++) {
    var hx = i * spacing - (camX * camFactor) % spacing - 80;
    var hseed = Math.abs(Math.sin(seed + i * 12.9898)) % 1;
    var h = 90 + hseed * 60;
    var lean = (hseed - 0.5) * 14;

    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(hx, baseY);
    ctx.quadraticCurveTo(hx + lean * 0.5, baseY - h * 0.6, hx + lean, baseY - h);
    ctx.stroke();

    for (var f = 0; f < 5; f++) {
      var ang = (f / 4) * Math.PI - Math.PI * 0.15;
      var fx = hx + lean + Math.cos(ang) * 34;
      var fy = baseY - h - Math.abs(Math.sin(ang)) * 18;
      ctx.beginPath();
      ctx.moveTo(hx + lean, baseY - h);
      ctx.quadraticCurveTo(hx + lean + Math.cos(ang) * 18, baseY - h - 10, fx, fy);
      ctx.lineWidth = 5;
      ctx.stroke();
    }
  }
}

export function drawPlatform(ctx, pl) {
  ctx.fillStyle = PLATFORM_FILL;
  ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
  ctx.fillStyle = PLATFORM_TOP;
  ctx.fillRect(pl.x, pl.y, pl.w, 6);
}

// ---------- Desenho: Caranguejo da Praia ----------

export function drawGrunt(ctx, g) {
  if (!g.alive) return;
  var facing = g.vx >= 0 ? 1 : -1;
  var cx = g.x + g.w / 2;
  var baseY = g.y + g.h;
  var moving = Math.abs(g.vx) > 5;
  var scuttle = moving ? Math.sin(g.x * 0.5) * 3 : 0;
  var pinch = moving ? Math.abs(Math.sin(g.x * 0.5)) : 0;

  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(facing, 1);

  // patas
  ctx.strokeStyle = '#c1462a';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  for (var s = -1; s <= 1; s += 2) {
    ctx.beginPath(); ctx.moveTo(s * 8, -8); ctx.lineTo(s * 13, -2 + scuttle * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 6, -6); ctx.lineTo(s * 11, -1 - scuttle * s); ctx.stroke();
  }

  // corpo
  ctx.fillStyle = '#e0603a';
  ctx.beginPath();
  ctx.ellipse(0, -11, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // olhos em haste
  ctx.strokeStyle = '#e0603a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-4, -17); ctx.lineTo(-5, -22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, -17); ctx.lineTo(5, -22); ctx.stroke();
  ctx.fillStyle = '#2a2320';
  ctx.beginPath(); ctx.arc(-5, -23, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, -23, 1.6, 0, Math.PI * 2); ctx.fill();

  // pinças
  ctx.fillStyle = '#c1462a';
  var pinchOpen = 3 + pinch * 3;
  ctx.beginPath(); ctx.ellipse(-13, -12 - pinch * 2, 5, 3 + pinchOpen * 0.2, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(13, -12 - pinch * 2, 5, 3 + pinchOpen * 0.2, -0.4, 0, Math.PI * 2); ctx.fill();

  ctx.restore();

  drawMiniHpBar(ctx, g.x - 2, g.y - 20, g.w + 4, g.hp / g.maxHp, '#ff5d73');
}

// ---------- Desenho: Léo Gobor ----------

export function drawBoss(ctx, b) {
  if (!b.alive) return;
  var tripping = b.state === 'viagem';
  var cx = b.x + b.w / 2;
  var baseY = b.y + b.h;

  var skin = '#c9986b';
  var shirt = '#e0704a';
  var shorts = '#3f7d8a';
  var capColor = '#2f5f8a';

  var walking = b.state === 'approach' && Math.abs(b.vx) > 5;
  var strideB = walking ? Math.sin(b.x * 0.15) * 8 : 0;
  var sway = tripping ? Math.sin(b.stateTimer * 6) * 5 : 0;

  ctx.save();
  ctx.translate(cx + sway, baseY);
  ctx.scale(b.facing, 1);

  // pernas compridas e finas
  drawLimb(ctx, -9, -34, -11 + strideB, -2, 7, shorts, '#20191a');
  drawLimb(ctx, 8, -34, 10 - strideB, -2, 7, shorts, '#20191a');

  // bracos compridos
  var reachOut = 0;
  if (b.state === 'telegraph-bracada') reachOut = 8;
  if (b.state === 'active-bracada') reachOut = 30;
  drawLimb(ctx, -10, -66, -14 + strideB * 0.4, -44, 6, skin, null);
  drawLimb(ctx, 10, -66, 16 + reachOut, -60, 6, skin, null);

  // tronco esguio
  ctx.fillStyle = shirt;
  roundRect(ctx, -9, -70, 18, 32, 5);
  ctx.fill();

  // cabeca
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, -80, 9, 0, Math.PI * 2); ctx.fill();

  // bone
  ctx.fillStyle = capColor;
  ctx.beginPath(); ctx.arc(0, -85, 9.5, Math.PI, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(7, -85, 8, 3, 0, 0, Math.PI * 2); ctx.fill();

  // bigode
  ctx.strokeStyle = '#2a1f16';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(2, -77); ctx.lineTo(9, -76); ctx.stroke();

  // olhos (semicerrados -- ele ta sempre de boa)
  ctx.strokeStyle = '#2a2320';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(2, -81); ctx.lineTo(6, -80.5); ctx.stroke();

  // cigarro gigante com fumaça
  ctx.fillStyle = '#f4efe4';
  ctx.fillRect(9, -78, 12, 2.6);
  ctx.fillStyle = '#c1462a';
  ctx.fillRect(20, -78, 2.4, 2.6);

  ctx.restore();

  // fumaça saindo do cigarro
  var smokeT = performance.now() / 400;
  var mouthX = cx + b.facing * 22;
  var mouthY = baseY - 78;
  ctx.strokeStyle = 'rgba(230,230,230,0.55)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (var k = 0; k < 3; k++) {
    var t = (smokeT + k * 0.6) % 1.8;
    var sx = mouthX + b.facing * t * 14 + Math.sin(t * 4 + k) * 5;
    var sy = mouthY - t * 22;
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5 + t * 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (b.state.indexOf('active') === 0) {
    ctx.strokeStyle = 'rgba(255,93,115,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + b.facing * 36, baseY - 50, 14, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (tripping) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '18px sans-serif';
    ctx.fillText('🌀', cx - 8, baseY - 96);
  }

  drawMiniHpBar(ctx, b.x - 4, b.y - 34, b.w + 8, b.hp / b.maxHp, '#ff5d73');
}
