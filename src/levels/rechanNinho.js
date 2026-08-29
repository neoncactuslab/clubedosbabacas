import { GRAVITY, MAX_FALL, moveAndCollide, aabb, clamp } from '../engine.js';
import { enemyHpForLevel, enemyAttackForLevel } from '../balance.js';
import { createGrunt } from '../enemies.js';
import { drawMiniHpBar, drawLimb, roundRect } from '../renderUtils.js';

export const VIEW_W = 960;
export const VIEW_H = 540;
export const GROUND_Y = 460;
export const DEATH_Y = 620;
export const FALL_DAMAGE = 15;

export const LEVEL_NAME = 'Rechan (o Ninho)';
export const LEVEL_NUMBER = 6;

// De volta ao Rechan -- dessa vez um percurso bem mais longo, com três
// arenas de boss espalhadas (início / meio / fim), em vez de um só chefão
// no final. Alterna trecho no chão com corredores elevados, igual às fases
// anteriores, só que em dose bem maior.
export const platforms = [
  { x: 0, y: GROUND_Y, w: 460, h: 80 },
  { x: 520, y: GROUND_Y, w: 480, h: 80 },
  { x: 1060, y: GROUND_Y - 30, w: 460, h: 30 },
  { x: 1580, y: GROUND_Y, w: 480, h: 80 },
  { x: 2120, y: GROUND_Y, w: 520, h: 80 },
  { x: 2700, y: GROUND_Y - 30, w: 460, h: 30 },
  { x: 3220, y: GROUND_Y, w: 480, h: 80 },
  { x: 3760, y: GROUND_Y - 30, w: 420, h: 30 },
  { x: 4240, y: GROUND_Y, w: 560, h: 80 }
];

export const checkpoints = [0, 520, 1060, 1580, 2120, 2700, 3220, 3760, 4240];

export const LEVEL_W = 4800;
export const PLAYER_START = { x: 60, y: GROUND_Y - 200 };

export var GRUNT_HIT_TOAST = 'Ô mermão!';
export var PLATFORM_FILL = '#453a4d';
export var PLATFORM_TOP = '#c1546a';

export function createEnemies(level) {
  return [
    createGrunt({
      name: 'Encrenqueiro do Rechan', x: 200, y: GROUND_Y - 42, w: 24, h: 42,
      minX: 60, maxX: 400, speed: 105, baseHp: 26, baseAttack: 8
    }, level),
    createGrunt({
      name: 'Encrenqueiro do Rechan', x: 1150, y: GROUND_Y - 30 - 42, w: 24, h: 42,
      minX: 1090, maxX: 1480, speed: 108, baseHp: 26, baseAttack: 8
    }, level),
    createGrunt({
      name: 'Encrenqueiro do Rechan', x: 1650, y: GROUND_Y - 42, w: 24, h: 42,
      minX: 1620, maxX: 1850, speed: 110, baseHp: 26, baseAttack: 8
    }, level),
    createGrunt({
      name: 'Encrenqueiro do Rechan', x: 1950, y: GROUND_Y - 42, w: 24, h: 42,
      minX: 1900, maxX: 2040, speed: 110, baseHp: 26, baseAttack: 8
    }, level),
    createGrunt({
      name: 'Encrenqueiro do Rechan', x: 2800, y: GROUND_Y - 30 - 42, w: 24, h: 42,
      minX: 2730, maxX: 3140, speed: 112, baseHp: 26, baseAttack: 8
    }, level),
    createGrunt({
      name: 'Encrenqueiro do Rechan', x: 3300, y: GROUND_Y - 42, w: 24, h: 42,
      minX: 3260, maxX: 3480, speed: 108, baseHp: 26, baseAttack: 8
    }, level),
    createGrunt({
      name: 'Encrenqueiro do Rechan', x: 3560, y: GROUND_Y - 42, w: 24, h: 42,
      minX: 3520, maxX: 3680, speed: 112, baseHp: 26, baseAttack: 8
    }, level),
    createGrunt({
      name: 'Encrenqueiro do Rechan', x: 3850, y: GROUND_Y - 30 - 42, w: 24, h: 42,
      minX: 3790, maxX: 4160, speed: 110, baseHp: 26, baseAttack: 8
    }, level)
  ];
}

var BOSS_KNOCKBACK_SPEED = 175;
var BOSS_KNOCKBACK_DURATION = 0.18;

// ---------- Diálogo de introdução ----------

export var introDialogue = {
  start: 'n1',
  nodes: {
    n1: { speaker: 'Narrador', text: 'De volta ao Rechan... parece que o bairro nunca aprende. Dessa vez não é só um babaca -- são três, cada um pior que o outro, espalhados pelo maior ninho de babacas da região.', next: 'n2' },
    n2: {
      speaker: '{name}', text: 'O Rechan de novo? Bora limpar essa bagunça de uma vez!',
      choices: [
        { label: 'Vamos acabar com o ninho de uma vez!', next: null },
        { label: 'Três babacas de uma vez, hein...', next: null }
      ]
    }
  }
};

// =====================================================================
// Boss 1: Alexandre -- logo no começo da fase
// =====================================================================

const ARENA1_MIN_X = 520;
const ARENA1_MAX_X = 1000;
const BASE_HP_A = 100;
const SOCO_DMG_A = 8;
const EMPURRAO_DMG_A = 13;

export function createBossAlexandre(level) {
  return {
    name: 'Alexandre',
    x: 900, y: GROUND_Y - 56, w: 30, h: 56, vx: 0, vy: 0, onGround: false,
    facing: -1,
    hp: enemyHpForLevel(BASE_HP_A, level),
    maxHp: enemyHpForLevel(BASE_HP_A, level),
    socoDmg: enemyAttackForLevel(SOCO_DMG_A, level),
    empurraoDmg: enemyAttackForLevel(EMPURRAO_DMG_A, level),
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

var TELEGRAPH_SOCO_A = 0.28;
var ACTIVE_SOCO_A = 0.15;
var RECOVER_SOCO_A = 0.26;
var TELEGRAPH_EMPURRAO_A = 0.4;
var ACTIVE_EMPURRAO_A = 0.32;
var RECOVER_EMPURRAO_A = 0.36;
var DESABAFO_TIME_A = 1.6;
var EMPURRAO_SPEED_A = 230;
var APPROACH_SPEED_A = 60;
var ENGAGE_RANGE_A = 46;

function setStateA(boss, state, duration) {
  boss.state = state;
  boss.stateTimer = duration;
  boss.hitDone = false;
}

export function stepBossAlexandre(boss, player, platforms, dt) {
  if (!boss.alive || boss.asleep) return;

  if (boss.stateTimer > 0) boss.stateTimer -= dt;
  var playerCenter = player.x + player.w / 2;
  var bossCenter = boss.x + boss.w / 2;
  boss.facing = playerCenter < bossCenter ? -1 : 1;

  switch (boss.state) {
    case 'approach': {
      var dist = Math.abs(playerCenter - bossCenter);
      if (dist > ENGAGE_RANGE_A) {
        boss.vx = boss.facing * APPROACH_SPEED_A;
      } else {
        boss.vx = 0;
        boss.actionCount += 1;
        if (boss.actionCount % 3 === 0) {
          setStateA(boss, 'desabafo', DESABAFO_TIME_A);
        } else if (boss.actionCount % 2 === 1) {
          setStateA(boss, 'telegraph-soco', TELEGRAPH_SOCO_A);
        } else {
          setStateA(boss, 'telegraph-empurrao', TELEGRAPH_EMPURRAO_A);
        }
      }
      break;
    }
    case 'telegraph-soco':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateA(boss, 'active-soco', ACTIVE_SOCO_A);
      break;
    case 'active-soco':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateA(boss, 'recover-soco', RECOVER_SOCO_A);
      break;
    case 'recover-soco':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateA(boss, 'approach', 0);
      break;
    case 'telegraph-empurrao':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateA(boss, 'active-empurrao', ACTIVE_EMPURRAO_A);
      break;
    case 'active-empurrao':
      boss.vx = boss.facing * EMPURRAO_SPEED_A;
      if (boss.stateTimer <= 0) setStateA(boss, 'recover-empurrao', RECOVER_EMPURRAO_A);
      break;
    case 'recover-empurrao':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateA(boss, 'approach', 0);
      break;
    case 'desabafo':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateA(boss, 'approach', 0);
      break;
  }

  if (boss.knockbackTimer > 0 && boss.state !== 'active-empurrao') {
    boss.vx = boss.knockbackVx;
    boss.knockbackTimer -= dt;
  }

  boss.vy += GRAVITY * dt;
  if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;
  moveAndCollide(boss, platforms, boss.vx * dt, boss.vy * dt);
  boss.x = clamp(boss.x, ARENA1_MIN_X, ARENA1_MAX_X - boss.w);
}

export function bossAttackHitboxAlexandre(boss) {
  if (boss.state === 'active-soco') {
    var reach = 26;
    var x = boss.facing > 0 ? boss.x + boss.w : boss.x - reach;
    return { x: x, y: boss.y + 8, w: reach, h: boss.h - 16, damage: boss.socoDmg, message: 'Soco simples!' };
  }
  if (boss.state === 'active-empurrao') {
    return { x: boss.x, y: boss.y, w: boss.w, h: boss.h, damage: boss.empurraoDmg, message: 'Empurrão!' };
  }
  return null;
}

export function bossDamageMultiplierAlexandre(boss) {
  return boss.state === 'desabafo' ? 1.5 : 1;
}

export function hitBossAlexandre(boss, damage, knockbackDir) {
  if (!boss.alive) return;
  boss.hp = Math.max(0, boss.hp - Math.round(damage * bossDamageMultiplierAlexandre(boss)));
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

var preBossDialogueAlexandre = {
  start: 'p1',
  nodes: {
    p1: { speaker: '{name}', text: 'Você deve ser o tal do Alexandre...', next: 'p2' },
    p2: { speaker: 'Alexandre', text: 'Fica na sua! Já basta o meu pai ter sido preso por causa duma placa solar, não vim aqui pra dar mole também!', next: 'p3' },
    p3: { speaker: 'Narrador', text: 'Alexandre aperta os punhos, meio sem jeito, e parte pra cima.', next: null }
  }
};

var victoryDialogueAlexandre = {
  start: 'v1',
  nodes: {
    v1: { speaker: 'Alexandre', text: 'Tá bom, tá bom, eu me rendo... acho que aprontar é coisa de família mesmo.', next: null }
  }
};

// ---------- Desenho: Alexandre ----------

export function drawBossAlexandre(ctx, b) {
  if (!b.alive) return;
  var venting = b.state === 'desabafo';
  var cx = b.x + b.w / 2;
  var baseY = b.y + b.h;

  var skin = '#e8c9a8';
  var shirt = '#8a8f96';
  var pants = '#2a2e38';
  var hair = '#100d0a';

  var walking = b.state === 'approach' && Math.abs(b.vx) > 5;
  var strideB = walking ? Math.sin(b.x * 0.15) * 7 : 0;
  var shrug = venting ? Math.sin(b.stateTimer * 5) * 4 : 0;

  ctx.save();
  ctx.translate(cx + shrug, baseY);
  ctx.scale(b.facing, 1);

  // pernas finas
  drawLimb(ctx, -8, -30, -9 + strideB, -2, 6, pants, '#20191a');
  drawLimb(ctx, 7, -30, 8 - strideB, -2, 6, pants, '#20191a');

  // bracos
  var punch = 0;
  if (b.state === 'telegraph-soco') punch = 8;
  if (b.state === 'active-soco') punch = 24;
  if (b.state === 'active-empurrao' || b.state === 'telegraph-empurrao') {
    drawLimb(ctx, -8, -54, -16, -36, 5.5, skin, null);
    drawLimb(ctx, 8, -54, 16, -36, 5.5, skin, null);
  } else {
    drawLimb(ctx, -8, -54, -12 + strideB * 0.4, -34, 5.5, skin, null);
    drawLimb(ctx, 8, -54, 10 + punch, -46, 5.5, skin, null);
  }

  // tronco magro
  ctx.fillStyle = shirt;
  roundRect(ctx, -8, -58, 16, 28, 4);
  ctx.fill();

  // cabeca
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, -66, 8, 0, Math.PI * 2); ctx.fill();

  // cabelo preto simples
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.arc(0, -70, 8, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();

  // rosto meio encabulado
  ctx.strokeStyle = '#2a2320';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(2, -66); ctx.lineTo(5, -65.5); ctx.stroke();

  ctx.restore();

  if (b.state.indexOf('active') === 0) {
    ctx.strokeStyle = 'rgba(255,93,115,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + b.facing * 28, baseY - 42, 11, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (venting) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '16px sans-serif';
    ctx.fillText('😅', cx - 8, baseY - 82);
  }

  drawMiniHpBar(ctx, b.x - 3, b.y - 34, b.w + 6, b.hp / b.maxHp, '#ff5d73');
}

// =====================================================================
// Boss 2: Wellerson "Welão" -- no meio da fase
// =====================================================================

const ARENA2_MIN_X = 2120;
const ARENA2_MAX_X = 2640;
const BASE_HP_W = 140;
const ABRACO_DMG_W = 12;
const FLASH_DMG_W = 17;

export function createBossWelao(level) {
  return {
    name: 'Welão',
    x: 2560, y: GROUND_Y - 54, w: 42, h: 54, vx: 0, vy: 0, onGround: false,
    facing: -1,
    hp: enemyHpForLevel(BASE_HP_W, level),
    maxHp: enemyHpForLevel(BASE_HP_W, level),
    abracoDmg: enemyAttackForLevel(ABRACO_DMG_W, level),
    flashDmg: enemyAttackForLevel(FLASH_DMG_W, level),
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

var TELEGRAPH_ABRACO_W = 0.32;
var ACTIVE_ABRACO_W = 0.18;
var RECOVER_ABRACO_W = 0.3;
var TELEGRAPH_FLASH_W = 0.35;
var ACTIVE_FLASH_W = 0.22;
var RECOVER_FLASH_W = 0.4;
var CHORANDO_TIME_W = 1.7;
var FLASH_SPEED_W = 320;
var APPROACH_SPEED_W = 54;
var ENGAGE_RANGE_W = 50;

function setStateW(boss, state, duration) {
  boss.state = state;
  boss.stateTimer = duration;
  boss.hitDone = false;
}

export function stepBossWelao(boss, player, platforms, dt) {
  if (!boss.alive || boss.asleep) return;

  if (boss.stateTimer > 0) boss.stateTimer -= dt;
  var playerCenter = player.x + player.w / 2;
  var bossCenter = boss.x + boss.w / 2;
  boss.facing = playerCenter < bossCenter ? -1 : 1;

  switch (boss.state) {
    case 'approach': {
      var dist = Math.abs(playerCenter - bossCenter);
      if (dist > ENGAGE_RANGE_W) {
        boss.vx = boss.facing * APPROACH_SPEED_W;
      } else {
        boss.vx = 0;
        boss.actionCount += 1;
        if (boss.actionCount % 3 === 0) {
          setStateW(boss, 'chorando', CHORANDO_TIME_W);
        } else if (boss.actionCount % 2 === 1) {
          setStateW(boss, 'telegraph-abraco', TELEGRAPH_ABRACO_W);
        } else {
          setStateW(boss, 'telegraph-flash', TELEGRAPH_FLASH_W);
        }
      }
      break;
    }
    case 'telegraph-abraco':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateW(boss, 'active-abraco', ACTIVE_ABRACO_W);
      break;
    case 'active-abraco':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateW(boss, 'recover-abraco', RECOVER_ABRACO_W);
      break;
    case 'recover-abraco':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateW(boss, 'approach', 0);
      break;
    case 'telegraph-flash':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateW(boss, 'active-flash', ACTIVE_FLASH_W);
      break;
    case 'active-flash':
      boss.vx = boss.facing * FLASH_SPEED_W;
      if (boss.stateTimer <= 0) setStateW(boss, 'recover-flash', RECOVER_FLASH_W);
      break;
    case 'recover-flash':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateW(boss, 'approach', 0);
      break;
    case 'chorando':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateW(boss, 'approach', 0);
      break;
  }

  if (boss.knockbackTimer > 0 && boss.state !== 'active-flash') {
    boss.vx = boss.knockbackVx;
    boss.knockbackTimer -= dt;
  }

  boss.vy += GRAVITY * dt;
  if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;
  moveAndCollide(boss, platforms, boss.vx * dt, boss.vy * dt);
  boss.x = clamp(boss.x, ARENA2_MIN_X, ARENA2_MAX_X - boss.w);
}

export function bossAttackHitboxWelao(boss) {
  if (boss.state === 'active-abraco') {
    return { x: boss.x - 4, y: boss.y, w: boss.w + 8, h: boss.h, damage: boss.abracoDmg, message: 'Abraço de torcedor!' };
  }
  if (boss.state === 'active-flash') {
    return { x: boss.x, y: boss.y, w: boss.w, h: boss.h, damage: boss.flashDmg, message: 'Flash!' };
  }
  return null;
}

export function bossDamageMultiplierWelao(boss) {
  return boss.state === 'chorando' ? 1.5 : 1;
}

export function hitBossWelao(boss, damage, knockbackDir) {
  if (!boss.alive) return;
  boss.hp = Math.max(0, boss.hp - Math.round(damage * bossDamageMultiplierWelao(boss)));
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

var preBossDialogueWelao = {
  start: 'p1',
  nodes: {
    p1: { speaker: '{name}', text: 'Fala Welão! Preparado?', next: 'p2' },
    p2: { speaker: 'Welão', text: 'Só se for igual o meu time foi ano passado! PA-L-MEI-RAS! E se eu perder de você eu vou reportar, hein!', next: 'p3' },
    p3: { speaker: 'Narrador', text: 'Welão seca uma lágrima escondida e parte pro abraço.', next: null }
  }
};

var victoryDialogueWelao = {
  start: 'v1',
  nodes: {
    v1: { speaker: 'Welão', text: 'Buáá... reportado. Eu vou reportar vocês pro Riot, viu!', next: null }
  }
};

// ---------- Desenho: Welão ----------

export function drawBossWelao(ctx, b) {
  if (!b.alive) return;
  var crying = b.state === 'chorando';
  var cx = b.x + b.w / 2;
  var baseY = b.y + b.h;

  var skin = '#a06840';
  var shirt = '#1a7a3a';
  var shirtStripe = '#f2f4f6';
  var pants = '#2a2e38';
  var hair = '#100d0a';

  var walking = b.state === 'approach' && Math.abs(b.vx) > 5;
  var strideB = walking ? Math.sin(b.x * 0.12) * 6 : 0;
  var sob = crying ? Math.sin(b.stateTimer * 8) * 3 : 0;

  ctx.save();
  ctx.translate(cx + sob, baseY);
  ctx.scale(b.facing, 1);

  // pernas curtas e grossas
  drawLimb(ctx, -11, -24, -13 + strideB, -2, 9, pants, '#1a1a20');
  drawLimb(ctx, 10, -24, 12 - strideB, -2, 9, pants, '#1a1a20');

  // bracos grossos
  var hug = 0;
  if (b.state === 'telegraph-abraco') hug = 6;
  if (b.state === 'active-abraco') hug = 22;
  drawLimb(ctx, -13, -46, -18 + strideB * 0.4, -28 - hug * 0.2, 8, skin, null);
  drawLimb(ctx, 13, -46, 18 + hug * 0.5, -28 - hug * 0.2, 8, skin, null);

  // tronco largo (camiseta do Palmeiras)
  ctx.fillStyle = shirt;
  roundRect(ctx, -15, -52, 30, 30, 8);
  ctx.fill();
  ctx.fillStyle = shirtStripe;
  ctx.fillRect(-15, -40, 30, 4);
  ctx.fillStyle = '#0d0a0b';
  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('P', 0, -30);
  ctx.textAlign = 'left';

  // cabeca
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, -60, 10, 0, Math.PI * 2); ctx.fill();

  // cabelo curto
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.arc(0, -64, 10, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();

  // bochechas coradas / chorando
  if (crying) {
    ctx.strokeStyle = 'rgba(120,180,255,0.8)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(4, -58); ctx.lineTo(3.5, -50); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, -58); ctx.lineTo(6.5, -51); ctx.stroke();
  }

  ctx.restore();

  if (b.state.indexOf('active') === 0) {
    ctx.strokeStyle = 'rgba(255,93,115,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + b.facing * 34, baseY - 40, 13, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (crying) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '16px sans-serif';
    ctx.fillText('😭', cx - 8, baseY - 78);
  }

  drawMiniHpBar(ctx, b.x - 4, b.y - 30, b.w + 8, b.hp / b.maxHp, '#ff5d73');
}

// =====================================================================
// Boss 3: Guilherme "Gui da academia" / "Buchecha" -- no final da fase
// =====================================================================

const ARENA3_MIN_X = 4240;
const ARENA3_MAX_X = 4800;
const BASE_HP_G = 180;
const VOADORA_DMG_G = 15;
const AGARRAO_DMG_G = 22;

export function createBossGuilherme(level) {
  return {
    name: 'Guilherme',
    x: 4720, y: GROUND_Y - 70, w: 38, h: 70, vx: 0, vy: 0, onGround: false,
    facing: -1,
    hp: enemyHpForLevel(BASE_HP_G, level),
    maxHp: enemyHpForLevel(BASE_HP_G, level),
    voadoraDmg: enemyAttackForLevel(VOADORA_DMG_G, level),
    agarraoDmg: enemyAttackForLevel(AGARRAO_DMG_G, level),
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

var TELEGRAPH_VOADORA_G = 0.3;
var ACTIVE_VOADORA_G = 0.17;
var RECOVER_VOADORA_G = 0.28;
var TELEGRAPH_AGARRAO_G = 0.42;
var ACTIVE_AGARRAO_G = 0.4;
var RECOVER_AGARRAO_G = 0.42;
var HUMOR_TIME_G = 1.6;
var AGARRAO_SPEED_G = 260;
var APPROACH_SPEED_G = 64;
var ENGAGE_RANGE_G = 54;

function setStateG(boss, state, duration) {
  boss.state = state;
  boss.stateTimer = duration;
  boss.hitDone = false;
}

export function stepBossGuilherme(boss, player, platforms, dt) {
  if (!boss.alive || boss.asleep) return;

  if (boss.stateTimer > 0) boss.stateTimer -= dt;
  var playerCenter = player.x + player.w / 2;
  var bossCenter = boss.x + boss.w / 2;
  boss.facing = playerCenter < bossCenter ? -1 : 1;

  switch (boss.state) {
    case 'approach': {
      var dist = Math.abs(playerCenter - bossCenter);
      if (dist > ENGAGE_RANGE_G) {
        boss.vx = boss.facing * APPROACH_SPEED_G;
      } else {
        boss.vx = 0;
        boss.actionCount += 1;
        if (boss.actionCount % 3 === 0) {
          setStateG(boss, 'humor', HUMOR_TIME_G);
        } else if (boss.actionCount % 2 === 1) {
          setStateG(boss, 'telegraph-voadora', TELEGRAPH_VOADORA_G);
        } else {
          setStateG(boss, 'telegraph-agarrao', TELEGRAPH_AGARRAO_G);
        }
      }
      break;
    }
    case 'telegraph-voadora':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateG(boss, 'active-voadora', ACTIVE_VOADORA_G);
      break;
    case 'active-voadora':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateG(boss, 'recover-voadora', RECOVER_VOADORA_G);
      break;
    case 'recover-voadora':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateG(boss, 'approach', 0);
      break;
    case 'telegraph-agarrao':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateG(boss, 'active-agarrao', ACTIVE_AGARRAO_G);
      break;
    case 'active-agarrao':
      boss.vx = boss.facing * AGARRAO_SPEED_G;
      if (boss.stateTimer <= 0) setStateG(boss, 'recover-agarrao', RECOVER_AGARRAO_G);
      break;
    case 'recover-agarrao':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateG(boss, 'approach', 0);
      break;
    case 'humor':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateG(boss, 'approach', 0);
      break;
  }

  if (boss.knockbackTimer > 0 && boss.state !== 'active-agarrao') {
    boss.vx = boss.knockbackVx;
    boss.knockbackTimer -= dt;
  }

  boss.vy += GRAVITY * dt;
  if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;
  moveAndCollide(boss, platforms, boss.vx * dt, boss.vy * dt);
  boss.x = clamp(boss.x, ARENA3_MIN_X, ARENA3_MAX_X - boss.w);
}

export function bossAttackHitboxGuilherme(boss) {
  if (boss.state === 'active-voadora') {
    var reach = 34;
    var x = boss.facing > 0 ? boss.x + boss.w : boss.x - reach;
    return { x: x, y: boss.y + 12, w: reach, h: boss.h - 26, damage: boss.voadoraDmg, message: 'Voadora de ferro!' };
  }
  if (boss.state === 'active-agarrao') {
    return { x: boss.x, y: boss.y, w: boss.w, h: boss.h, damage: boss.agarraoDmg, message: 'Agarrão!' };
  }
  return null;
}

export function bossDamageMultiplierGuilherme(boss) {
  return boss.state === 'humor' ? 1.5 : 1;
}

export function hitBossGuilherme(boss, damage, knockbackDir) {
  if (!boss.alive) return;
  boss.hp = Math.max(0, boss.hp - Math.round(damage * bossDamageMultiplierGuilherme(boss)));
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

var preBossDialogueGuilherme = {
  start: 'p1',
  nodes: {
    p1: { speaker: '{name}', text: 'Só falta você agora, Gui.', next: 'p2' },
    p2: { speaker: 'Guilherme', text: 'Hoje é dia de treino de perna E de braço, cê escolheu a pior hora pra aparecer!', next: 'p3' },
    p3: { speaker: 'Narrador', text: 'As veias de Guilherme saltam. Ele estala o pescoço e parte pra cima.', next: null }
  }
};

var victoryDialogueGuilherme = {
  start: 'v1',
  nodes: {
    v1: { speaker: 'Guilherme', text: 'Isso... isso é só a bomba baixando... podia jurar que hoje eu tava mais forte...', next: null }
  }
};

// ---------- Desenho: Guilherme ----------

export function drawBossGuilherme(ctx, b) {
  if (!b.alive) return;
  var moody = b.state === 'humor';
  var cx = b.x + b.w / 2;
  var baseY = b.y + b.h;

  var skin = '#e8c9a8';
  var shirt = '#2a2e38';
  var pants = '#1a1a20';
  var hair = '#100d0a';

  var walking = b.state === 'approach' && Math.abs(b.vx) > 5;
  var strideB = walking ? Math.sin(b.x * 0.13) * 8 : 0;
  var twitch = moody ? Math.sin(b.stateTimer * 24) * 2.5 : 0;

  ctx.save();
  ctx.translate(cx + twitch, baseY);
  ctx.scale(b.facing, 1);

  // pernas grossas de treino
  drawLimb(ctx, -12, -40, -14 + strideB, -2, 10, pants, '#0d0a0b');
  drawLimb(ctx, 11, -40, 13 - strideB, -2, 10, pants, '#0d0a0b');

  // bracos enormes
  var reachOut = 0;
  if (b.state === 'telegraph-voadora') reachOut = 8;
  if (b.state === 'active-voadora') reachOut = 32;
  drawLimb(ctx, -14, -78, -20 + strideB * 0.4, -50, 10, skin, null);
  drawLimb(ctx, 14, -78, 22 + reachOut, -66, 10, skin, null);
  // bíceps em destaque
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(-17, -62, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(17, -62, 6.5, 0, Math.PI * 2); ctx.fill();

  // tronco em V (regata de academia)
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.moveTo(-16, -84); ctx.lineTo(16, -84); ctx.lineTo(11, -46); ctx.lineTo(-11, -46);
  ctx.closePath();
  ctx.fill();
  // peitoral marcado
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(0, -80); ctx.lineTo(0, -56); ctx.stroke();

  // cabeca (pescoço grosso)
  ctx.fillStyle = skin;
  ctx.fillRect(-6, -92, 12, 12);
  ctx.beginPath(); ctx.arc(0, -96, 10, 0, Math.PI * 2); ctx.fill();

  // cabelo raspado
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.arc(0, -100, 10, Math.PI * 0.9, Math.PI * 2.1); ctx.fill();

  // veias saltadas na testa (efeito comico do anabolizante)
  ctx.strokeStyle = '#8a2a2a';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-3, -104); ctx.lineTo(-1, -100); ctx.lineTo(-3, -97); ctx.stroke();

  ctx.restore();

  if (b.state.indexOf('active') === 0) {
    ctx.strokeStyle = 'rgba(255,93,115,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + b.facing * 44, baseY - 62, 15, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (moody) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '18px sans-serif';
    ctx.fillText('😤', cx - 9, baseY - 116);
  }

  drawMiniHpBar(ctx, b.x - 5, b.y - 52, b.w + 10, b.hp / b.maxHp, '#ff5d73');
}

// =====================================================================
// Lista de encontros -- é isso que o game.js consome pra alternar entre
// os três bosses conforme o jogador avança pela fase.
// =====================================================================

export var bossEncounters = [
  {
    triggerX: 560,
    createBoss: createBossAlexandre,
    stepBoss: stepBossAlexandre,
    bossAttackHitbox: bossAttackHitboxAlexandre,
    bossDamageMultiplier: bossDamageMultiplierAlexandre,
    hitBoss: hitBossAlexandre,
    drawBoss: drawBossAlexandre,
    preBossDialogue: preBossDialogueAlexandre,
    victoryDialogue: victoryDialogueAlexandre
  },
  {
    triggerX: 2160,
    createBoss: createBossWelao,
    stepBoss: stepBossWelao,
    bossAttackHitbox: bossAttackHitboxWelao,
    bossDamageMultiplier: bossDamageMultiplierWelao,
    hitBoss: hitBossWelao,
    drawBoss: drawBossWelao,
    preBossDialogue: preBossDialogueWelao,
    victoryDialogue: victoryDialogueWelao
  },
  {
    triggerX: 4280,
    createBoss: createBossGuilherme,
    stepBoss: stepBossGuilherme,
    bossAttackHitbox: bossAttackHitboxGuilherme,
    bossDamageMultiplier: bossDamageMultiplierGuilherme,
    hitBoss: hitBossGuilherme,
    drawBoss: drawBossGuilherme,
    preBossDialogue: preBossDialogueGuilherme,
    victoryDialogue: victoryDialogueGuilherme
  }
];

// ---------- Cenário: beco do Rechan à noite ----------

export function renderBackground(ctx, camX, VIEW_W, VIEW_H) {
  var sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, '#1c1430');
  sky.addColorStop(0.55, '#2f2140');
  sky.addColorStop(1, '#402a3a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  drawAlleyStrip(ctx, camX, 0.3, VIEW_H - 55, '#3a2f42', '#1f1826', 11, 12, 0.55);
  drawAlleyStrip(ctx, camX, 0.55, VIEW_H - 40, '#4a3c52', '#241c2c', 71, 15, 1);
  drawFenceLayer(ctx, camX);
}

function drawAlleyStrip(ctx, camX, camFactor, baseY, wallColor, roofColor, seed, count, lightAlpha) {
  var spacing = (LEVEL_W + 600) / count;
  for (var i = -1; i < count; i++) {
    var hx = i * spacing - (camX * camFactor) % spacing - 120;
    var hseed = Math.abs(Math.sin(seed + i * 12.9898)) % 1;
    var w = 130 + hseed * 70;
    var h = 100 + hseed * 80;
    ctx.fillStyle = wallColor;
    ctx.fillRect(hx, baseY - h, w, h);
    ctx.fillStyle = roofColor;
    ctx.fillRect(hx - 6, baseY - h - 8, w + 12, 10);

    // janelas acesas / grafite
    ctx.fillStyle = 'rgba(255, 200, 120, ' + lightAlpha + ')';
    var cols = Math.max(1, Math.floor(w / 30));
    var rows = Math.max(1, Math.floor(h / 32));
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (Math.abs(Math.sin(seed + i * 7 + r * 3 + c)) > 0.6) {
          ctx.fillRect(hx + 7 + c * 28, baseY - h + 9 + r * 30, 12, 14);
        }
      }
    }
    ctx.fillStyle = 'rgba(193,84,106,0.35)';
    ctx.fillRect(hx + w * 0.15, baseY - h * 0.4, w * 0.3, 6);
  }
}

function drawFenceLayer(ctx, camX) {
  var spacing = 26;
  var offset = (camX * 0.85) % spacing;
  var baseY = VIEW_H - 8;
  ctx.strokeStyle = 'rgba(20,15,25,0.4)';
  ctx.lineWidth = 1.4;
  for (var x = -offset - spacing; x < VIEW_W + spacing; x += spacing) {
    ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x + 13, baseY - 26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 13, baseY); ctx.lineTo(x, baseY - 26); ctx.stroke();
  }
}

export function drawPlatform(ctx, pl) {
  ctx.fillStyle = PLATFORM_FILL;
  ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
  ctx.fillStyle = PLATFORM_TOP;
  ctx.fillRect(pl.x, pl.y, pl.w, 6);
}

// ---------- Desenho: Encrenqueiro do Rechan ----------

export function drawGrunt(ctx, g) {
  if (!g.alive) return;
  var facing = g.vx >= 0 ? 1 : -1;
  var cx = g.x + g.w / 2;
  var baseY = g.y + g.h;
  var walking = Math.abs(g.vx) > 5;
  var stride = walking ? Math.sin(g.x * 0.16) * 7 : 0;

  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(facing, 1);

  // pernas
  ctx.strokeStyle = '#2a2e38';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-5, -20); ctx.lineTo(-6 + stride, -1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5, -20); ctx.lineTo(6 - stride, -1); ctx.stroke();

  // bracos
  ctx.strokeStyle = '#8a6a9a';
  ctx.lineWidth = 4.5;
  ctx.beginPath(); ctx.moveTo(7, -34); ctx.lineTo(12, -24); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-7, -34); ctx.lineTo(-11, -24); ctx.stroke();

  // regata
  ctx.fillStyle = '#8a6a9a';
  roundRect(ctx, -8, -40, 16, 20, 4);
  ctx.fill();

  // cabeca
  ctx.fillStyle = '#c9986b';
  ctx.beginPath(); ctx.arc(0, -44, 7.5, 0, Math.PI * 2); ctx.fill();

  // bone virado de lado
  ctx.fillStyle = '#2a2e38';
  ctx.beginPath(); ctx.arc(0, -48, 7.8, Math.PI * 1.1, Math.PI * 2); ctx.fill();
  ctx.fillRect(-8, -50, 5, 3);

  ctx.restore();

  drawMiniHpBar(ctx, g.x - 2, g.y - 20, g.w + 4, g.hp / g.maxHp, '#ff5d73');
}
