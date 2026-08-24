import { GRAVITY, MAX_FALL, moveAndCollide, aabb, clamp } from '../engine.js';
import { enemyHpForLevel, enemyAttackForLevel } from '../balance.js';
import { createGrunt } from '../enemies.js';
import { drawMiniHpBar, drawLimb, roundRect } from '../renderUtils.js';

export const VIEW_W = 960;
export const VIEW_H = 540;
export const GROUND_Y = 460;
export const DEATH_Y = 620;
export const FALL_DAMAGE = 15;

export const LEVEL_NAME = 'Rechan';
export const LEVEL_NUMBER = 2;

// Fase mais longa e variada que a Vila Rosa: mais trechos, mais inimigos, e
// uma plataforma elevada extra pra dar outro ritmo — mas os vãos continuam
// pequenos (60px) e a plataforma elevada tem chão contínuo por baixo, então
// não existe risco de queda por errar um pulo mais ambicioso.
export const platforms = [
  { x: 0, y: GROUND_Y, w: 450, h: 80 },
  { x: 510, y: GROUND_Y, w: 500, h: 80 },
  { x: 1010, y: GROUND_Y, w: 750, h: 80 },
  { x: 1140, y: 400, w: 140, h: 24 },
  { x: 1820, y: GROUND_Y, w: 380, h: 80 },
  { x: 2260, y: GROUND_Y, w: 1340, h: 80 }
];

export const checkpoints = [0, 510, 1010, 1820, 2260];

export const LEVEL_W = 3600;
export const PLAYER_START = { x: 60, y: GROUND_Y - 200 };

export const BOSS_ARENA_X = 2280;
export const BOSS_ARENA_MIN_X = 2280;
export const BOSS_ARENA_MAX_X = 3590;

export var GRUNT_HIT_TOAST = 'Hic!';
export var PLATFORM_FILL = '#5f5566';
export var PLATFORM_TOP = '#e0a458';

export function createEnemies(level) {
  return [
    createGrunt({
      name: 'Bêbado de Bar', x: 180, y: GROUND_Y - 40, w: 28, h: 40,
      minX: 140, maxX: 380, speed: 50, baseHp: 25, baseAttack: 7
    }, level),
    createGrunt({
      name: 'Bêbado de Bar', x: 650, y: GROUND_Y - 40, w: 28, h: 40,
      minX: 590, maxX: 900, speed: 55, baseHp: 25, baseAttack: 7
    }, level),
    createGrunt({
      name: 'Bêbado de Bar', x: 1180, y: 400 - 40, w: 28, h: 40,
      minX: 1150, maxX: 1250, speed: 45, baseHp: 25, baseAttack: 7
    }, level),
    createGrunt({
      name: 'Bêbado de Bar', x: 1350, y: GROUND_Y - 40, w: 28, h: 40,
      minX: 1300, maxX: 1650, speed: 60, baseHp: 25, baseAttack: 7
    }, level),
    createGrunt({
      name: 'Bêbado de Bar', x: 1900, y: GROUND_Y - 40, w: 28, h: 40,
      minX: 1850, maxX: 2150, speed: 65, baseHp: 25, baseAttack: 7
    }, level)
  ];
}

// ---------- Boss: Toyoshi ----------

const BASE_HP = 110;
const MORDIDA_DMG = 9;
const ABRACO_DMG = 13;

export function createBoss(level) {
  return {
    name: 'Toyoshi',
    x: 3200, y: GROUND_Y - 46, w: 36, h: 46, vx: 0, vy: 0, onGround: false,
    facing: -1,
    hp: enemyHpForLevel(BASE_HP, level),
    maxHp: enemyHpForLevel(BASE_HP, level),
    mordidaDmg: enemyAttackForLevel(MORDIDA_DMG, level),
    abracoDmg: enemyAttackForLevel(ABRACO_DMG, level),
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

var BOSS_KNOCKBACK_SPEED = 190;
var BOSS_KNOCKBACK_DURATION = 0.18;

var TELEGRAPH_MORDIDA = 0.3;
var ACTIVE_MORDIDA = 0.15;
var RECOVER_MORDIDA = 0.25;
var TELEGRAPH_ABRACO = 0.45;
var ACTIVE_ABRACO = 0.5;
var RECOVER_ABRACO = 0.45;
var TONTURA_TIME = 1.6;
var ABRACO_SPEED = 230;
var APPROACH_SPEED = 50;
var ENGAGE_RANGE = 75;

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
          setState(boss, 'tontura', TONTURA_TIME);
        } else if (boss.actionCount % 2 === 1) {
          setState(boss, 'telegraph-mordida', TELEGRAPH_MORDIDA);
        } else {
          setState(boss, 'telegraph-abraco', TELEGRAPH_ABRACO);
        }
      }
      break;
    }
    case 'telegraph-mordida':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'active-mordida', ACTIVE_MORDIDA);
      break;
    case 'active-mordida':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'recover-mordida', RECOVER_MORDIDA);
      break;
    case 'recover-mordida':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'approach', 0);
      break;
    case 'telegraph-abraco':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'active-abraco', ACTIVE_ABRACO);
      break;
    case 'active-abraco':
      boss.vx = boss.facing * ABRACO_SPEED;
      if (boss.stateTimer <= 0) setState(boss, 'recover-abraco', RECOVER_ABRACO);
      break;
    case 'recover-abraco':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'approach', 0);
      break;
    case 'tontura':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'approach', 0);
      break;
  }

  if (boss.knockbackTimer > 0 && boss.state !== 'active-abraco') {
    boss.vx = boss.knockbackVx;
    boss.knockbackTimer -= dt;
  }

  boss.vy += GRAVITY * dt;
  if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;
  moveAndCollide(boss, platforms, boss.vx * dt, boss.vy * dt);
  boss.x = clamp(boss.x, BOSS_ARENA_MIN_X, BOSS_ARENA_MAX_X - boss.w);
}

export function bossAttackHitbox(boss) {
  if (boss.state === 'active-mordida') {
    var reach = 20;
    var x = boss.facing > 0 ? boss.x + boss.w : boss.x - reach;
    return { x: x, y: boss.y + 8, w: reach, h: boss.h - 20, damage: boss.mordidaDmg, message: 'Vo te morde!' };
  }
  if (boss.state === 'active-abraco') {
    return { x: boss.x, y: boss.y, w: boss.w, h: boss.h, damage: boss.abracoDmg, message: 'Te amo mi amigo!' };
  }
  return null;
}

export function bossDamageMultiplier(boss) {
  return boss.state === 'tontura' ? 1.5 : 1;
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
    n1: { speaker: 'Narrador', text: 'Chegamos no bairro do Rechan, nosso próximo inimigo será um pequeno e magro japonês que tem problemas com o alcoolismo. Mas não se iluda, Toyoshi pode se tornar violento a qualquer momento.', next: 'n2' },
    n2: {
      speaker: '{name}', text: 'Hoje esse japonês bêbado vai levar uma surra!',
      choices: [
        { label: 'A Rosana vai ficar viúva', next: null },
        { label: 'Bora pro incubatório!', next: null }
      ]
    }
  }
};

export var preBossDialogue = {
  start: 'p1',
  nodes: {
    p1: { speaker: 'Toyoshi', text: 'Te amo mi amigo... Vo te morde!', next: 'p2' },
    p2: {
      speaker: '{name}', text: '',
      choices: [
        { label: 'Para de beber Toyo, agora você é pai!', next: 'p3' },
        { label: 'Vem na mão, sem puxar revólver hein!', next: 'p3' }
      ]
    },
    p3: { speaker: 'Narrador', text: 'Toyoshi cambaleia pra frente, ajeitando os óculos, e o combate começa!', next: null }
  }
};

export var victoryDialogue = {
  start: 'v1',
  nodes: {
    v1: { speaker: 'Toyoshi', text: 'Chega de treta, vou tomar uma saidera e vou pra casa...', next: 'v2' },
    v2: { speaker: '{name}', text: 'Vamos para a próxima fase enfrentar o próximo babaca!', next: null }
  }
};

// ---------- Boss secreto: Akio (irmão mais novo do Toyoshi) ----------
// Aparece direto depois da vitória sobre o Toyoshi, sem trigger de área —
// game.js chama isso quando level.createBoss2 existe.

export var akioIntroDialogue = {
  start: 'a1',
  nodes: {
    a1: {
      speaker: 'Akio',
      text: 'Eu não tô nem aí se você bateu no meu irmão, mas fiquei sabendo que você falou mal do Yasuo e isso eu não perdoo. Agora sofra! Hasagiii...',
      next: null
    }
  }
};

const BASE_HP_2 = 120;
const GOLPE_DMG = 10;
const HASAGI_DMG = 15;

export function createBoss2(level) {
  return {
    name: 'Akio',
    x: 3150, y: GROUND_Y - 56, w: 36, h: 56, vx: 0, vy: 0, onGround: false,
    facing: -1,
    hp: enemyHpForLevel(BASE_HP_2, level),
    maxHp: enemyHpForLevel(BASE_HP_2, level),
    golpeDmg: enemyAttackForLevel(GOLPE_DMG, level),
    hasagiDmg: enemyAttackForLevel(HASAGI_DMG, level),
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

var TELEGRAPH_GOLPE = 0.25;
var ACTIVE_GOLPE = 0.12;
var RECOVER_GOLPE = 0.2;
var TELEGRAPH_HASAGI = 0.4;
var ACTIVE_HASAGI = 0.5;
var RECOVER_HASAGI = 0.4;
var FOLEGO_TIME = 1.5;
var HASAGI_SPEED = 250;
var APPROACH_SPEED_2 = 60;
var ENGAGE_RANGE_2 = 75;

function setState2(boss, state, duration) {
  boss.state = state;
  boss.stateTimer = duration;
  boss.hitDone = false;
}

export function stepBoss2(boss, player, platforms, dt) {
  if (!boss.alive || boss.asleep) return;

  if (boss.stateTimer > 0) boss.stateTimer -= dt;
  var playerCenter = player.x + player.w / 2;
  var bossCenter = boss.x + boss.w / 2;
  boss.facing = playerCenter < bossCenter ? -1 : 1;

  switch (boss.state) {
    case 'approach': {
      var dist = Math.abs(playerCenter - bossCenter);
      if (dist > ENGAGE_RANGE_2) {
        boss.vx = boss.facing * APPROACH_SPEED_2;
      } else {
        boss.vx = 0;
        boss.actionCount += 1;
        if (boss.actionCount % 3 === 0) {
          setState2(boss, 'folego', FOLEGO_TIME);
        } else if (boss.actionCount % 2 === 1) {
          setState2(boss, 'telegraph-golpe', TELEGRAPH_GOLPE);
        } else {
          setState2(boss, 'telegraph-hasagi', TELEGRAPH_HASAGI);
        }
      }
      break;
    }
    case 'telegraph-golpe':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState2(boss, 'active-golpe', ACTIVE_GOLPE);
      break;
    case 'active-golpe':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState2(boss, 'recover-golpe', RECOVER_GOLPE);
      break;
    case 'recover-golpe':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState2(boss, 'approach', 0);
      break;
    case 'telegraph-hasagi':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState2(boss, 'active-hasagi', ACTIVE_HASAGI);
      break;
    case 'active-hasagi':
      boss.vx = boss.facing * HASAGI_SPEED;
      if (boss.stateTimer <= 0) setState2(boss, 'recover-hasagi', RECOVER_HASAGI);
      break;
    case 'recover-hasagi':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState2(boss, 'approach', 0);
      break;
    case 'folego':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState2(boss, 'approach', 0);
      break;
  }

  if (boss.knockbackTimer > 0 && boss.state !== 'active-hasagi') {
    boss.vx = boss.knockbackVx;
    boss.knockbackTimer -= dt;
  }

  boss.vy += GRAVITY * dt;
  if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;
  moveAndCollide(boss, platforms, boss.vx * dt, boss.vy * dt);
  boss.x = clamp(boss.x, BOSS_ARENA_MIN_X, BOSS_ARENA_MAX_X - boss.w);
}

export function bossAttackHitbox2(boss) {
  if (boss.state === 'active-golpe') {
    var reach = 22;
    var x = boss.facing > 0 ? boss.x + boss.w : boss.x - reach;
    return { x: x, y: boss.y + 8, w: reach, h: boss.h - 20, damage: boss.golpeDmg, message: 'Golpe rápido!' };
  }
  if (boss.state === 'active-hasagi') {
    return { x: boss.x, y: boss.y, w: boss.w, h: boss.h, damage: boss.hasagiDmg, message: 'Hasagiii!' };
  }
  return null;
}

export function bossDamageMultiplier2(boss) {
  return boss.state === 'folego' ? 1.5 : 1;
}

export function hitBoss2(boss, damage, knockbackDir) {
  if (!boss.alive) return;
  boss.hp = Math.max(0, boss.hp - Math.round(damage * bossDamageMultiplier2(boss)));
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

export function drawBoss2(ctx, b) {
  if (!b.alive) return;
  var winded = b.state === 'folego';
  var cx = b.x + b.w / 2;
  var baseY = b.y + b.h;

  var skin = '#d9a878';
  var shirt = '#26232b';
  var pants = '#1c1a20';
  var hair = '#0d0a0b';
  var band = '#c1546a';

  var walking = b.state === 'approach' && Math.abs(b.vx) > 5;
  var strideB = walking ? Math.sin(b.x * 0.17) * 8 : 0;

  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(b.facing, 1);
  if (winded) ctx.translate(0, -6); // curvado, mãos nos joelhos

  // pernas
  drawLimb(ctx, -9, -30, -10 + strideB, -2, 6, pants, null);
  drawLimb(ctx, 7, -30, 8 - strideB, -2, 6, pants, null);
  ctx.fillStyle = '#0d0a0b';
  ctx.beginPath(); ctx.ellipse(-10 + strideB, -1, 5.5, 2.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(8 - strideB, -1, 5.5, 2.8, 0, 0, Math.PI * 2); ctx.fill();

  // bracos
  if (winded) {
    drawLimb(ctx, -9, -56, -16, -30, 6, skin, null);
    drawLimb(ctx, 9, -56, 16, -30, 6, skin, null);
  } else if (b.state === 'telegraph-hasagi') {
    drawLimb(ctx, -9, -56, -18 + strideB * 0.4, -58, 6, skin, null);
    drawLimb(ctx, 9, -56, 18 + strideB * 0.4, -58, 6, skin, null);
  } else if (b.state === 'active-hasagi') {
    drawLimb(ctx, -9, -56, 22, -56, 6, skin, null);
    drawLimb(ctx, 9, -56, 26, -50, 6, skin, null);
  } else if (b.state === 'active-golpe' || b.state === 'telegraph-golpe') {
    var reach2 = b.state === 'active-golpe' ? 26 : 12;
    drawLimb(ctx, -9, -56, -14 + strideB * 0.4, -34, 6, skin, null);
    drawLimb(ctx, 9, -56, 10 + reach2, -50, 6, skin, null);
  } else {
    drawLimb(ctx, -9, -56, -14 + strideB * 0.4, -34, 6, skin, null);
    drawLimb(ctx, 9, -56, 14 - strideB * 0.4, -34, 6, skin, null);
  }

  // tronco (camisa escura, postura ereta)
  ctx.fillStyle = shirt;
  roundRect(ctx, -9, -62, 18, 28, 4);
  ctx.fill();

  // cabeca
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, -70, 9, 0, Math.PI * 2); ctx.fill();

  // cabelo espetado (diferente do irmao)
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.moveTo(-9, -74); ctx.lineTo(-6, -84); ctx.lineTo(-2, -75);
  ctx.lineTo(1, -85); ctx.lineTo(4, -75); ctx.lineTo(8, -83); ctx.lineTo(9, -73);
  ctx.arc(0, -74, 9, Math.PI * 1.98, Math.PI * 1.02, true);
  ctx.closePath();
  ctx.fill();

  // faixa na testa
  ctx.fillStyle = band;
  ctx.fillRect(-9, -73, 18, 4);

  // oculos (armacao preta grossa, igual a do irmao -- traco de familia)
  ctx.strokeStyle = '#0d0a0b';
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.arc(4, -70, 4, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(-4, -70, 4, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(8, -71); ctx.lineTo(11, -72); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-8, -71); ctx.lineTo(-11, -72); ctx.stroke();

  // expressao serio (sem o nariz vermelho do Toyoshi)
  ctx.strokeStyle = '#3a2a1f';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (b.state === 'active-hasagi' || b.state === 'telegraph-hasagi') {
    ctx.moveTo(2, -63); ctx.lineTo(6, -61); ctx.lineTo(2, -60);
  } else {
    ctx.moveTo(2, -62); ctx.lineTo(6, -62);
  }
  ctx.stroke();

  ctx.restore();

  if (b.state.indexOf('active') === 0) {
    ctx.strokeStyle = 'rgba(255,93,115,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + b.facing * 30, baseY - 60, 13, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (winded) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '16px sans-serif';
    ctx.fillText('😤', cx - 8, baseY - 76);
  }

  drawMiniHpBar(ctx, b.x - 4, b.y - 40, b.w + 8, b.hp / b.maxHp, '#ff5d73');
}

// ---------- Cenário: entardecer no Rechan ----------

export function renderBackground(ctx, camX, VIEW_W, VIEW_H) {
  var sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, '#ff9a56');
  sky.addColorStop(0.55, '#c1618a');
  sky.addColorStop(1, '#4b3a72');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  drawBarStrip(ctx, camX, 0.3, VIEW_H - 60, '#4a3a4a', '#2a1f2e', 7, 9, 0.5);
  drawBarStrip(ctx, camX, 0.55, VIEW_H - 45, '#5c4a5c', '#332638', 53, 11, 1);
}

function drawBarStrip(ctx, camX, camFactor, baseY, wallColor, roofColor, seed, count, lightAlpha) {
  var spacing = (LEVEL_W + 500) / count;
  for (var i = -1; i < count; i++) {
    var hx = i * spacing - (camX * camFactor) % spacing - 120;
    var hseed = Math.abs(Math.sin(seed + i * 12.9898)) % 1;
    var w = 140 + hseed * 60;
    var h = 110 + hseed * 70;
    ctx.fillStyle = wallColor;
    ctx.fillRect(hx, baseY - h, w, h);
    ctx.fillStyle = roofColor;
    ctx.fillRect(hx - 8, baseY - h - 10, w + 16, 12);

    // janelas acesas
    ctx.fillStyle = 'rgba(255, 200, 120, ' + lightAlpha + ')';
    var cols = Math.max(1, Math.floor(w / 32));
    var rows = Math.max(1, Math.floor(h / 34));
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (Math.abs(Math.sin(seed + i * 7 + r * 3 + c)) > 0.55) {
          ctx.fillRect(hx + 8 + c * 30, baseY - h + 10 + r * 32, 14, 16);
        }
      }
    }
  }
}

export function drawPlatform(ctx, pl) {
  ctx.fillStyle = PLATFORM_FILL;
  ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
  ctx.fillStyle = PLATFORM_TOP;
  ctx.fillRect(pl.x, pl.y, pl.w, 6);
}

// ---------- Desenho: Bêbado de Bar ----------

export function drawGrunt(ctx, g) {
  if (!g.alive) return;
  var facing = g.vx >= 0 ? 1 : -1;
  var cx = g.x + g.w / 2;
  var baseY = g.y + g.h;
  var wobble = Math.sin(g.x * 0.12) * 0.12;

  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(facing, 1);
  ctx.rotate(wobble);

  // pernas cambaleantes
  ctx.strokeStyle = '#2f2a3a';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-4, -18); ctx.lineTo(-7, -1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, -18); ctx.lineTo(8, -2); ctx.stroke();

  // tronco (camisa amassada)
  ctx.fillStyle = '#7a6a8a';
  roundRect(ctx, -8, -36, 16, 20, 5);
  ctx.fill();

  // braco segurando garrafa
  ctx.strokeStyle = '#7a6a8a';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(7, -32); ctx.lineTo(13, -24); ctx.stroke();
  ctx.fillStyle = '#4a7a5a';
  ctx.fillRect(11, -27, 5, 9);
  ctx.fillRect(12.5, -30, 2, 4);

  ctx.strokeStyle = '#7a6a8a';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-7, -32); ctx.lineTo(-11, -22); ctx.stroke();

  // cabeça
  ctx.fillStyle = '#d9a878';
  ctx.beginPath(); ctx.arc(0, -42, 8, 0, Math.PI * 2); ctx.fill();

  // cabelo bagunçado
  ctx.fillStyle = '#3a2e22';
  ctx.beginPath(); ctx.arc(0, -46, 8, Math.PI, Math.PI * 2.15); ctx.fill();

  // nariz vermelho
  ctx.fillStyle = '#c1546a';
  ctx.beginPath(); ctx.arc(5, -41, 1.6, 0, Math.PI * 2); ctx.fill();

  // olho semicerrado
  ctx.strokeStyle = '#2a2320';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(2, -44); ctx.lineTo(6, -43.5); ctx.stroke();

  ctx.restore();

  drawMiniHpBar(ctx, g.x - 2, g.y - 22, g.w + 4, g.hp / g.maxHp, '#ff5d73');
}

// ---------- Desenho: Toyoshi ----------

export function drawBoss(ctx, b) {
  if (!b.alive) return;
  var dizzy = b.state === 'tontura';
  var cx = b.x + b.w / 2;
  var baseY = b.y + b.h;

  var skin = '#d9a878';
  var shirt = '#7fa89e';
  var pants = '#33353f';
  var hair = '#20191a';

  var walking = b.state === 'approach' && Math.abs(b.vx) > 5;
  var strideB = walking ? Math.sin(b.x * 0.17) * 7 : 0;
  var stumble = dizzy ? Math.sin(b.stateTimer * 10) * 4 : 0;

  ctx.save();
  ctx.translate(cx + stumble, baseY);
  ctx.scale(b.facing, 1);
  ctx.scale(1, 0.82); // Toyoshi é baixo -- comprime a figura toda em direção aos pés
  ctx.rotate(dizzy ? Math.sin(b.stateTimer * 10) * 0.08 : 0);

  // pernas finas
  drawLimb(ctx, -8, -24, -9 + strideB, -2, 6, pants, null);
  drawLimb(ctx, 6, -24, 7 - strideB, -2, 6, pants, null);
  // sapatos
  ctx.fillStyle = '#20191a';
  ctx.beginPath(); ctx.ellipse(-9 + strideB, -1, 5, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(7 - strideB, -1, 5, 2.6, 0, 0, Math.PI * 2); ctx.fill();

  // bracos: abertos no abraco, garrafa em repouso
  var hugOpen = 0;
  if (b.state === 'telegraph-abraco') hugOpen = 14;
  if (b.state === 'active-abraco') hugOpen = 30;

  if (hugOpen > 0) {
    drawLimb(ctx, -8, -50, -8 - hugOpen, -46 - hugOpen * 0.3, 6, skin, null);
    drawLimb(ctx, 8, -50, 8 + hugOpen, -46 - hugOpen * 0.3, 6, skin, null);
  } else {
    drawLimb(ctx, -8, -50, -13 + strideB * 0.5, -34, 6, skin, null);
    drawLimb(ctx, 8, -50, 13 - strideB * 0.5, -36, 6, skin, null);
    // garrafinha na mao de tras
    ctx.fillStyle = '#4a7a5a';
    ctx.fillRect(-16 + strideB * 0.5, -40, 5, 10);
    ctx.fillRect(-14.5 + strideB * 0.5, -43, 2, 4);
  }

  // tronco magrelo
  ctx.fillStyle = shirt;
  roundRect(ctx, -8, -58, 16, 26, 5);
  ctx.fill();

  // cabeca
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, -66, 9, 0, Math.PI * 2); ctx.fill();

  // cabelo
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.arc(0, -70, 9, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();

  // nariz avermelhado (problema com bebida)
  ctx.fillStyle = '#c1546a';
  ctx.beginPath(); ctx.arc(6, -64, 1.6, 0, Math.PI * 2); ctx.fill();

  // oculos grandes, de armação preta e grossa (marca registrada dele)
  ctx.strokeStyle = '#0d0a0b';
  ctx.lineWidth = 2.8;
  ctx.beginPath(); ctx.arc(4, -67, 4.6, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(-5, -67, 4.6, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-0.4, -68); ctx.lineTo(-0.4, -66); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8.5, -68); ctx.lineTo(11, -69); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-9.5, -68); ctx.lineTo(-11, -69); ctx.stroke();

  // boca: mordida durante o ataque
  ctx.strokeStyle = '#3a2a1f';
  ctx.lineWidth = 1.6;
  if (b.state === 'active-mordida' || b.state === 'telegraph-mordida') {
    ctx.beginPath(); ctx.moveTo(4, -61); ctx.lineTo(9, -60); ctx.lineTo(4, -59); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(3, -60); ctx.lineTo(7, -60); ctx.stroke();
  }

  ctx.restore();

  if (b.state.indexOf('active') === 0) {
    ctx.strokeStyle = 'rgba(255,93,115,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + b.facing * 26, baseY - 62, 12, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (dizzy) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '18px sans-serif';
    ctx.fillText('💫', cx - 8, baseY - 78);
  }

  drawMiniHpBar(ctx, b.x - 4, b.y - 30, b.w + 8, b.hp / b.maxHp, '#ff5d73');
}
