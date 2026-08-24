import { GRAVITY, MAX_FALL, moveAndCollide, aabb, clamp } from '../engine.js';
import { enemyHpForLevel, enemyAttackForLevel } from '../balance.js';
import { createGrunt } from '../enemies.js';
import { drawMiniHpBar, drawLimb, drawBuildingLayer } from '../renderUtils.js';

export const VIEW_W = 960;
export const VIEW_H = 540;
export const GROUND_Y = 460;
export const DEATH_Y = 620;
export const FALL_DAMAGE = 15;

export const LEVEL_NAME = 'Vila Rosa';
export const LEVEL_NUMBER = 1;

// Mapa simplificado: só dois vãos pequenos (60px, folgados dentro do alcance
// de pulo do jogador) e o resto é chão contínuo — sem plataformas elevadas
// fora de alcance e sem risco de queda perto do boss.
export const platforms = [
  { x: 0, y: GROUND_Y, w: 500, h: 80 },
  { x: 560, y: GROUND_Y, w: 550, h: 80 },
  { x: 1170, y: GROUND_Y, w: 1430, h: 80 }
];

export const checkpoints = [0, 560, 1170];

export const LEVEL_W = 2600;
export const PLAYER_START = { x: 60, y: GROUND_Y - 200 };

export const BOSS_ARENA_X = 2060;
export const BOSS_ARENA_MIN_X = 2060;
export const BOSS_ARENA_MAX_X = 2590;

export var GRUNT_HIT_TOAST = 'Au au!';
export var PLATFORM_FILL = '#9a9a8f';
export var PLATFORM_TOP = '#5a8f4f';

export function createEnemies(level) {
  return [
    createGrunt({
      name: 'Cachorro do Bairro', x: 200, y: GROUND_Y - 34, w: 34, h: 34,
      minX: 160, maxX: 400, speed: 70, baseHp: 30, baseAttack: 8
    }, level),
    createGrunt({
      name: 'Cachorro do Bairro', x: 700, y: GROUND_Y - 34, w: 34, h: 34,
      minX: 650, maxX: 950, speed: 80, baseHp: 30, baseAttack: 8
    }, level)
  ];
}

// ---------- Boss: Pandoval ----------

const BASE_HP = 140;
const CHINELADA_DMG = 6;
const BARRIGADA_DMG = 16;

export function createBoss(level) {
  return {
    name: 'Pandoval',
    x: 2400, y: GROUND_Y - 50, w: 44, h: 50, vx: 0, vy: 0, onGround: false,
    facing: -1,
    hp: enemyHpForLevel(BASE_HP, level),
    maxHp: enemyHpForLevel(BASE_HP, level),
    chineladaDmg: enemyAttackForLevel(CHINELADA_DMG, level),
    barrigadaDmg: enemyAttackForLevel(BARRIGADA_DMG, level),
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

var BOSS_KNOCKBACK_SPEED = 180;
var BOSS_KNOCKBACK_DURATION = 0.18;

var TELEGRAPH_CHINELADA = 0.4;
var ACTIVE_CHINELADA = 0.2;
var RECOVER_CHINELADA = 0.3;
var TELEGRAPH_BARRIGADA = 0.5;
var ACTIVE_BARRIGADA = 0.6;
var RECOVER_BARRIGADA = 0.5;
var PREGUICA_TIME = 1.8;
var BARRIGADA_SPEED = 260;
var APPROACH_SPEED = 55;
var ENGAGE_RANGE = 80;

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
          setState(boss, 'preguica', PREGUICA_TIME);
        } else if (boss.actionCount % 2 === 1) {
          setState(boss, 'telegraph-chinelada', TELEGRAPH_CHINELADA);
        } else {
          setState(boss, 'telegraph-barrigada', TELEGRAPH_BARRIGADA);
        }
      }
      break;
    }
    case 'telegraph-chinelada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'active-chinelada', ACTIVE_CHINELADA);
      break;
    case 'active-chinelada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'recover-chinelada', RECOVER_CHINELADA);
      break;
    case 'recover-chinelada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'approach', 0);
      break;
    case 'telegraph-barrigada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'active-barrigada', ACTIVE_BARRIGADA);
      break;
    case 'active-barrigada':
      boss.vx = boss.facing * BARRIGADA_SPEED;
      if (boss.stateTimer <= 0) setState(boss, 'recover-barrigada', RECOVER_BARRIGADA);
      break;
    case 'recover-barrigada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'approach', 0);
      break;
    case 'preguica':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'approach', 0);
      break;
  }

  // Empurrão ao ser atingido: sobrepõe o movimento do estado, exceto durante
  // a investida (não queremos cancelar a Barrigada Voadora no meio do golpe).
  if (boss.knockbackTimer > 0 && boss.state !== 'active-barrigada') {
    boss.vx = boss.knockbackVx;
    boss.knockbackTimer -= dt;
  }

  boss.vy += GRAVITY * dt;
  if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;
  moveAndCollide(boss, platforms, boss.vx * dt, boss.vy * dt);
  boss.x = clamp(boss.x, BOSS_ARENA_MIN_X, BOSS_ARENA_MAX_X - boss.w);
}

// Retorna a hitbox de ataque ativa do boss neste instante, ou null.
export function bossAttackHitbox(boss) {
  if (boss.state === 'active-chinelada') {
    var reach = 26;
    var x = boss.facing > 0 ? boss.x + boss.w : boss.x - reach;
    return { x: x, y: boss.y + 6, w: reach, h: boss.h - 12, damage: boss.chineladaDmg, message: 'Chinelada!' };
  }
  if (boss.state === 'active-barrigada') {
    return { x: boss.x, y: boss.y, w: boss.w, h: boss.h, damage: boss.barrigadaDmg, message: 'Barrigada voadora!' };
  }
  return null;
}

export function bossDamageMultiplier(boss) {
  return boss.state === 'preguica' ? 1.5 : 1;
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
    n1: { speaker: 'Narrador', text: 'Vila Rosa, Itapetininga. Em algum lugar por aqui mora o lendário Pandoval — chefão supremo da preguiça.', next: 'n2' },
    n2: {
      speaker: '{name}', text: 'Chegou a hora de dar uma surra nesse desempregado!',
      choices: [
        { label: 'Vamos com tudo!', next: null },
        { label: 'Vamos força-lo a entregar currículo!', next: null }
      ]
    }
  }
};

export var preBossDialogue = {
  start: 'p1',
  nodes: {
    p1: { speaker: 'Pandoval', text: 'Se você me bater, vai se ver com a Mariana depois!', next: 'p2' },
    p2: {
      speaker: '{name}', text: '',
      choices: [
        { label: 'Vai arrumar um trampo, maluco!', next: 'p3' },
        { label: 'Fiquei sabendo que tem vaga lá na Nishimbo, bora?', next: 'p3' }
      ]
    },
    p3: { speaker: 'Narrador', text: 'Pandoval se levanta, resmungando, e o combate começa!', next: null }
  }
};

export var victoryDialogue = {
  start: 'v1',
  nodes: {
    v1: { speaker: 'Pandoval', text: 'Você venceu, mas vou pedir a conta daqui a 2 meses no máximo...', next: 'v2' },
    v2: { speaker: '{name}', text: 'Vamos para a próxima fase enfrentar o próximo babaca!', next: null }
  }
};

// ---------- Cenário ----------

export function renderBackground(ctx, camX, VIEW_W, VIEW_H) {
  var sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, '#7ec8e3');
  sky.addColorStop(1, '#cdeaf0');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  drawBuildingLayer(ctx, camX, 0.3, LEVEL_W, VIEW_H - 60, '#f4e4c9', '#c1543f', 5, 10);
  drawBuildingLayer(ctx, camX, 0.55, LEVEL_W, VIEW_H - 45, '#eddcbb', '#a94734', 31, 12);
}

export function drawPlatform(ctx, pl) {
  ctx.fillStyle = PLATFORM_FILL;
  ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
  ctx.fillStyle = PLATFORM_TOP;
  ctx.fillRect(pl.x, pl.y, pl.w, 6);
}

// ---------- Desenho: Cachorro do Bairro ----------

export function drawGrunt(ctx, g) {
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

  drawMiniHpBar(ctx, g.x - 2, g.y - 12, g.w + 4, g.hp / g.maxHp, '#ff5d73');
}

// ---------- Desenho: Pandoval ----------

export function drawBoss(ctx, b) {
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
  drawLimb(ctx, -12, -22, -14 + strideB, -2, 9, skin, sandal);
  drawLimb(ctx, 9, -22, 12 - strideB, -2, 9, skin, sandal);

  // bracos (o da frente se estende no golpe de chinelada; balancam ao andar)
  var armSwing = 0;
  var chineladaHand = null;
  if (b.state === 'active-chinelada' || b.state === 'telegraph-chinelada') {
    armSwing = b.state === 'telegraph-chinelada' ? -10 : 22;
    chineladaHand = sandal;
  }
  drawLimb(ctx, -14, -46, -22 - strideB * 0.6, -30, 8, skin, null);
  drawLimb(ctx, 15, -46, 24 + armSwing + strideB * 0.6, -34, 8, skin, chineladaHand);

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

  drawMiniHpBar(ctx, b.x - 4, b.y - 32, b.w + 8, b.hp / b.maxHp, '#ff5d73');
}
