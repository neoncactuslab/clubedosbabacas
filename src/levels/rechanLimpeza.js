import { GRAVITY, MAX_FALL, moveAndCollide, aabb, clamp } from '../engine.js';
import { enemyHpForLevel, enemyAttackForLevel } from '../balance.js';
import { createGrunt } from '../enemies.js';
import { drawMiniHpBar, drawLimb, roundRect } from '../renderUtils.js';

export const VIEW_W = 960;
export const VIEW_H = 540;
export const GROUND_Y = 460;
export const DEATH_Y = 620;
export const FALL_DAMAGE = 15;

export const LEVEL_NAME = 'Rechan (Reta Final)';
export const LEVEL_NUMBER = 7;

// Reta final da limpeza do Rechan -- o sol nascendo no lugar da noite da
// fase anterior, simbolizando que o bairro tá quase arrumado. Dessa vez só
// 2 bosses (meio e fim, sem um logo de cara) e o percurso tem duas
// "escadinhas" de plataformas curtas subindo, em vez do corredor elevado
// único e repetido da fase 6 -- pra não parecer a mesma fase reaproveitada.
export const platforms = [
  { x: 0, y: GROUND_Y, w: 500, h: 80 },
  { x: 560, y: GROUND_Y, w: 460, h: 80 },
  { x: 1080, y: GROUND_Y - 30, w: 200, h: 30 },
  { x: 1340, y: GROUND_Y - 60, w: 200, h: 30 },
  { x: 1600, y: GROUND_Y - 30, w: 460, h: 30 },
  { x: 2120, y: GROUND_Y, w: 480, h: 80 },
  { x: 2660, y: GROUND_Y - 30, w: 460, h: 30 },
  { x: 3180, y: GROUND_Y, w: 480, h: 80 },
  { x: 3720, y: GROUND_Y - 30, w: 460, h: 30 },
  { x: 4240, y: GROUND_Y, w: 460, h: 80 }
];

export const checkpoints = [0, 560, 1080, 1340, 1600, 2120, 2660, 3180, 3720, 4240];

export const LEVEL_W = 4700;
export const PLAYER_START = { x: 60, y: GROUND_Y - 200 };

export var GRUNT_HIT_TOAST = 'Aí, tu tá doido?!';
export var PLATFORM_FILL = '#5a4a42';
export var PLATFORM_TOP = '#e0935a';

export function createEnemies(level) {
  return [
    createGrunt({
      name: 'Bagunceiro do Rechan', x: 220, y: GROUND_Y - 42, w: 24, h: 42,
      minX: 60, maxX: 440, speed: 105, baseHp: 27, baseAttack: 9
    }, level),
    createGrunt({
      name: 'Bagunceiro do Rechan', x: 750, y: GROUND_Y - 42, w: 24, h: 42,
      minX: 600, maxX: 980, speed: 108, baseHp: 27, baseAttack: 9
    }, level),
    createGrunt({
      name: 'Bagunceiro do Rechan', x: 1800, y: GROUND_Y - 30 - 42, w: 24, h: 42,
      minX: 1630, maxX: 2030, speed: 110, baseHp: 27, baseAttack: 9
    }, level),
    createGrunt({
      name: 'Bagunceiro do Rechan', x: 2850, y: GROUND_Y - 30 - 42, w: 24, h: 42,
      minX: 2690, maxX: 3090, speed: 110, baseHp: 27, baseAttack: 9
    }, level),
    createGrunt({
      name: 'Bagunceiro do Rechan', x: 3280, y: GROUND_Y - 42, w: 24, h: 42,
      minX: 3220, maxX: 3420, speed: 108, baseHp: 27, baseAttack: 9
    }, level),
    createGrunt({
      name: 'Bagunceiro do Rechan', x: 3540, y: GROUND_Y - 42, w: 24, h: 42,
      minX: 3460, maxX: 3640, speed: 112, baseHp: 27, baseAttack: 9
    }, level),
    createGrunt({
      name: 'Bagunceiro do Rechan', x: 3900, y: GROUND_Y - 30 - 42, w: 24, h: 42,
      minX: 3750, maxX: 4150, speed: 110, baseHp: 27, baseAttack: 9
    }, level)
  ];
}

var BOSS_KNOCKBACK_SPEED = 175;
var BOSS_KNOCKBACK_DURATION = 0.18;

// ---------- Diálogo de introdução ----------

export var introDialogue = {
  start: 'n1',
  nodes: {
    n1: { speaker: 'Narrador', text: 'Reta final no Rechan. O sol tá nascendo, boa parte do bairro já foi limpa -- só faltam dois babacas bem resistentes pra fechar o serviço de vez.', next: 'n2' },
    n2: {
      speaker: '{name}', text: 'Vamos terminar o serviço. Rechan é o ninho dos babacas, e o ninho já tá quase vazio!',
      choices: [
        { label: 'Bora fechar essa limpeza de uma vez!', next: null },
        { label: 'Só mais dois e o bairro é nosso...', next: null }
      ]
    }
  }
};

// =====================================================================
// Boss 1: Rafael Silvério "Xuxinha" -- no meio da fase
// =====================================================================

const ARENA1_MIN_X = 2120;
const ARENA1_MAX_X = 2600;
const BASE_HP_X = 150;
const ESTALO_DMG_X = 11;
const REQUEBRO_DMG_X = 16;

export function createBossXuxinha(level) {
  return {
    name: 'Xuxinha',
    x: 2540, y: GROUND_Y - 54, w: 34, h: 54, vx: 0, vy: 0, onGround: false,
    facing: -1,
    hp: enemyHpForLevel(BASE_HP_X, level),
    maxHp: enemyHpForLevel(BASE_HP_X, level),
    estaloDmg: enemyAttackForLevel(ESTALO_DMG_X, level),
    requebroDmg: enemyAttackForLevel(REQUEBRO_DMG_X, level),
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

var TELEGRAPH_ESTALO_X = 0.26;
var ACTIVE_ESTALO_X = 0.15;
var RECOVER_ESTALO_X = 0.24;
var TELEGRAPH_REQUEBRO_X = 0.36;
var ACTIVE_REQUEBRO_X = 0.3;
var RECOVER_REQUEBRO_X = 0.34;
var RETOCANDO_TIME_X = 1.7;
var REQUEBRO_SPEED_X = 250;
var APPROACH_SPEED_X = 62;
var ENGAGE_RANGE_X = 48;

function setStateX(boss, state, duration) {
  boss.state = state;
  boss.stateTimer = duration;
  boss.hitDone = false;
}

export function stepBossXuxinha(boss, player, platforms, dt) {
  if (!boss.alive || boss.asleep) return;

  if (boss.stateTimer > 0) boss.stateTimer -= dt;
  var playerCenter = player.x + player.w / 2;
  var bossCenter = boss.x + boss.w / 2;
  boss.facing = playerCenter < bossCenter ? -1 : 1;

  switch (boss.state) {
    case 'approach': {
      var dist = Math.abs(playerCenter - bossCenter);
      if (dist > ENGAGE_RANGE_X) {
        boss.vx = boss.facing * APPROACH_SPEED_X;
      } else {
        boss.vx = 0;
        boss.actionCount += 1;
        if (boss.actionCount % 3 === 0) {
          setStateX(boss, 'retocando', RETOCANDO_TIME_X);
        } else if (boss.actionCount % 2 === 1) {
          setStateX(boss, 'telegraph-estalo', TELEGRAPH_ESTALO_X);
        } else {
          setStateX(boss, 'telegraph-requebro', TELEGRAPH_REQUEBRO_X);
        }
      }
      break;
    }
    case 'telegraph-estalo':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateX(boss, 'active-estalo', ACTIVE_ESTALO_X);
      break;
    case 'active-estalo':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateX(boss, 'recover-estalo', RECOVER_ESTALO_X);
      break;
    case 'recover-estalo':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateX(boss, 'approach', 0);
      break;
    case 'telegraph-requebro':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateX(boss, 'active-requebro', ACTIVE_REQUEBRO_X);
      break;
    case 'active-requebro':
      boss.vx = boss.facing * REQUEBRO_SPEED_X;
      if (boss.stateTimer <= 0) setStateX(boss, 'recover-requebro', RECOVER_REQUEBRO_X);
      break;
    case 'recover-requebro':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateX(boss, 'approach', 0);
      break;
    case 'retocando':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateX(boss, 'approach', 0);
      break;
  }

  if (boss.knockbackTimer > 0 && boss.state !== 'active-requebro') {
    boss.vx = boss.knockbackVx;
    boss.knockbackTimer -= dt;
  }

  boss.vy += GRAVITY * dt;
  if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;
  moveAndCollide(boss, platforms, boss.vx * dt, boss.vy * dt);
  boss.x = clamp(boss.x, ARENA1_MIN_X, ARENA1_MAX_X - boss.w);
}

export function bossAttackHitboxXuxinha(boss) {
  if (boss.state === 'active-estalo') {
    var reach = 28;
    var x = boss.facing > 0 ? boss.x + boss.w : boss.x - reach;
    return { x: x, y: boss.y + 8, w: reach, h: boss.h - 16, damage: boss.estaloDmg, message: 'Estalo fabuloso!' };
  }
  if (boss.state === 'active-requebro') {
    return { x: boss.x, y: boss.y, w: boss.w, h: boss.h, damage: boss.requebroDmg, message: 'Requebro certeiro!' };
  }
  return null;
}

export function bossDamageMultiplierXuxinha(boss) {
  return boss.state === 'retocando' ? 1.5 : 1;
}

export function hitBossXuxinha(boss, damage, knockbackDir) {
  if (!boss.alive) return;
  boss.hp = Math.max(0, boss.hp - Math.round(damage * bossDamageMultiplierXuxinha(boss)));
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

var preBossDialogueXuxinha = {
  start: 'p1',
  nodes: {
    p1: { speaker: '{name}', text: 'Xuxinha, vamos resolver essa treta agora mesmo!', next: 'p2' },
    p2: { speaker: 'Xuxinha', text: 'Aiiiin, seu bruto... se acha que dá conta pode vir.', next: 'p3' },
    p3: { speaker: 'Narrador', text: 'Xuxinha ajeita o cabelo, estala os dedos e entra na dança... digo, na briga!', next: null }
  }
};

var victoryDialogueXuxinha = {
  start: 'v1',
  nodes: {
    v1: { speaker: 'Xuxinha', text: 'Depois dessa surra até virei bolsonarista.', next: null }
  }
};

// ---------- Desenho: Xuxinha ----------

export function drawBossXuxinha(ctx, b) {
  if (!b.alive) return;
  var fixing = b.state === 'retocando';
  var cx = b.x + b.w / 2;
  var baseY = b.y + b.h;

  var skin = '#e8c9a8';
  var shirt = '#ff6fb0';
  var pants = '#3a3f4a';
  var hair = '#2a1f1a';

  var walking = b.state === 'approach' && Math.abs(b.vx) > 5;
  var strideB = walking ? Math.sin(b.x * 0.16) * 8 : 0;
  var sway = Math.sin(performance.now() / 220) * (walking ? 3 : 1.2);

  ctx.save();
  ctx.translate(cx + sway, baseY);
  ctx.scale(b.facing, 1);

  // pernas
  drawLimb(ctx, -10, -32, -11 + strideB, -2, 8, pants, '#1a1a20');
  drawLimb(ctx, 9, -32, 10 - strideB, -2, 8, pants, '#1a1a20');

  // bracos
  var snap = 0;
  if (b.state === 'telegraph-estalo') snap = 8;
  if (b.state === 'active-estalo') snap = 26;
  drawLimb(ctx, -10, -56, -16 + strideB * 0.4, -38, 6, skin, null);
  drawLimb(ctx, 10, -56, 14 + snap, -50, 6, skin, null);

  // tronco (camiseta rosa, meio decotada e na cintura)
  ctx.fillStyle = shirt;
  roundRect(ctx, -11, -60, 22, 30, 8);
  ctx.fill();
  // pulseira arco-iris
  ctx.fillStyle = '#ff5d73'; ctx.fillRect(-11, -34, 5, 3);
  ctx.fillStyle = '#ffd35d'; ctx.fillRect(-6, -34, 5, 3);
  ctx.fillStyle = '#5dd5a0'; ctx.fillRect(-1, -34, 5, 3);
  ctx.fillStyle = '#5da8ff'; ctx.fillRect(4, -34, 5, 3);

  // cabeca (rostinho gordinho e fofo)
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, -70, 10.5, 0, Math.PI * 2); ctx.fill();

  // cabelo estilizado com franjinha
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.arc(0, -75, 10.5, Math.PI * 0.9, Math.PI * 2.1); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-9, -78); ctx.quadraticCurveTo(-2, -86, 8, -80); ctx.lineTo(6, -76); ctx.quadraticCurveTo(-2, -80, -8, -74); ctx.closePath(); ctx.fill();

  // oculos de sol estiloso
  ctx.fillStyle = '#2a2320';
  ctx.beginPath(); ctx.ellipse(-3.5, -70, 3.4, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, -70, 3.4, 2.6, 0, 0, Math.PI * 2); ctx.fill();

  // batom / sorriso confiante
  ctx.strokeStyle = '#c1305a';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(1, -65, 2.6, 0.1, Math.PI - 0.1); ctx.stroke();

  ctx.restore();

  if (b.state.indexOf('active') === 0) {
    ctx.strokeStyle = 'rgba(255,93,115,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + b.facing * 32, baseY - 46, 12, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (fixing) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '16px sans-serif';
    ctx.fillText('💅', cx - 8, baseY - 88);
  }

  drawMiniHpBar(ctx, b.x - 4, b.y - 42, b.w + 8, b.hp / b.maxHp, '#ff5d73');
}

// =====================================================================
// Boss 2: Johny "Boca de Bulbassauro" -- no final da fase
// =====================================================================

const ARENA2_MIN_X = 4240;
const ARENA2_MAX_X = 4700;
const BASE_HP_J = 200;
const FERRADA_DMG_J = 16;
const ACO_DMG_J = 24;

export function createBossJohny(level) {
  return {
    name: 'Johny',
    x: 4620, y: GROUND_Y - 72, w: 36, h: 72, vx: 0, vy: 0, onGround: false,
    facing: -1,
    hp: enemyHpForLevel(BASE_HP_J, level),
    maxHp: enemyHpForLevel(BASE_HP_J, level),
    ferradaDmg: enemyAttackForLevel(FERRADA_DMG_J, level),
    acoDmg: enemyAttackForLevel(ACO_DMG_J, level),
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

var TELEGRAPH_FERRADA_J = 0.3;
var ACTIVE_FERRADA_J = 0.16;
var RECOVER_FERRADA_J = 0.28;
var TELEGRAPH_ACO_J = 0.44;
var ACTIVE_ACO_J = 0.4;
var RECOVER_ACO_J = 0.42;
var PARAFUSO_TIME_J = 1.6;
var ACO_SPEED_J = 270;
var APPROACH_SPEED_J = 62;
var ENGAGE_RANGE_J = 54;

function setStateJ(boss, state, duration) {
  boss.state = state;
  boss.stateTimer = duration;
  boss.hitDone = false;
}

export function stepBossJohny(boss, player, platforms, dt) {
  if (!boss.alive || boss.asleep) return;

  if (boss.stateTimer > 0) boss.stateTimer -= dt;
  var playerCenter = player.x + player.w / 2;
  var bossCenter = boss.x + boss.w / 2;
  boss.facing = playerCenter < bossCenter ? -1 : 1;

  switch (boss.state) {
    case 'approach': {
      var dist = Math.abs(playerCenter - bossCenter);
      if (dist > ENGAGE_RANGE_J) {
        boss.vx = boss.facing * APPROACH_SPEED_J;
      } else {
        boss.vx = 0;
        boss.actionCount += 1;
        if (boss.actionCount % 3 === 0) {
          setStateJ(boss, 'parafuso', PARAFUSO_TIME_J);
        } else if (boss.actionCount % 2 === 1) {
          setStateJ(boss, 'telegraph-ferrada', TELEGRAPH_FERRADA_J);
        } else {
          setStateJ(boss, 'telegraph-aco', TELEGRAPH_ACO_J);
        }
      }
      break;
    }
    case 'telegraph-ferrada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateJ(boss, 'active-ferrada', ACTIVE_FERRADA_J);
      break;
    case 'active-ferrada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateJ(boss, 'recover-ferrada', RECOVER_FERRADA_J);
      break;
    case 'recover-ferrada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateJ(boss, 'approach', 0);
      break;
    case 'telegraph-aco':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateJ(boss, 'active-aco', ACTIVE_ACO_J);
      break;
    case 'active-aco':
      boss.vx = boss.facing * ACO_SPEED_J;
      if (boss.stateTimer <= 0) setStateJ(boss, 'recover-aco', RECOVER_ACO_J);
      break;
    case 'recover-aco':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateJ(boss, 'approach', 0);
      break;
    case 'parafuso':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateJ(boss, 'approach', 0);
      break;
  }

  if (boss.knockbackTimer > 0 && boss.state !== 'active-aco') {
    boss.vx = boss.knockbackVx;
    boss.knockbackTimer -= dt;
  }

  boss.vy += GRAVITY * dt;
  if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;
  moveAndCollide(boss, platforms, boss.vx * dt, boss.vy * dt);
  boss.x = clamp(boss.x, ARENA2_MIN_X, ARENA2_MAX_X - boss.w);
}

export function bossAttackHitboxJohny(boss) {
  if (boss.state === 'active-ferrada') {
    var reach = 34;
    var x = boss.facing > 0 ? boss.x + boss.w : boss.x - reach;
    return { x: x, y: boss.y + 12, w: reach, h: boss.h - 26, damage: boss.ferradaDmg, message: 'Ferrada!' };
  }
  if (boss.state === 'active-aco') {
    return { x: boss.x, y: boss.y, w: boss.w, h: boss.h, damage: boss.acoDmg, message: 'Investida de aço!' };
  }
  return null;
}

export function bossDamageMultiplierJohny(boss) {
  return boss.state === 'parafuso' ? 1.5 : 1;
}

export function hitBossJohny(boss, damage, knockbackDir) {
  if (!boss.alive) return;
  boss.hp = Math.max(0, boss.hp - Math.round(damage * bossDamageMultiplierJohny(boss)));
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

var preBossDialogueJohny = {
  start: 'p1',
  nodes: {
    p1: {
      speaker: '{name}', text: 'Boca de Bulbassauro, até que enfim nos encontramos, um dos maiores babacas do mundo.',
      choices: [
        { label: 'Brasileiro que torce pra argentina tem mais é que se foder mesmo.', next: 'p2' },
        { label: 'Eu vou estragar você, mais do que você estragou a moto do Escorrega.', next: 'p2' }
      ]
    },
    p2: { speaker: 'Jonão', text: 'Posso até apanhar, mas meu pau é maior que o seu.', next: 'p3' },
    p3: { speaker: 'Narrador', text: 'Johny estala o braço de ferro com um barulho metálico assustador e parte pra cima.', next: null }
  }
};

var victoryDialogueJohny = {
  start: 'v1',
  nodes: {
    v1: { speaker: 'Johny', text: 'Aff... acho que um parafuso frouxou de verdade dessa vez... podia jurar que tava tudo apertado.', next: null }
  }
};

// ---------- Desenho: Johny ----------

export function drawBossJohny(ctx, b) {
  if (!b.alive) return;
  var loose = b.state === 'parafuso';
  var cx = b.x + b.w / 2;
  var baseY = b.y + b.h;

  var skin = '#c9986b';
  var metal = '#8a94a0';
  var metalDark = '#565f68';
  var shirt = '#3a4a5a';
  var pants = '#2a2e38';
  var hair = '#100d0a';

  var walking = b.state === 'approach' && Math.abs(b.vx) > 5;
  var strideB = walking ? Math.sin(b.x * 0.13) * 8 : 0;
  var twitch = loose ? Math.sin(b.stateTimer * 22) * 3 : 0;

  ctx.save();
  ctx.translate(cx + twitch, baseY);
  ctx.scale(b.facing, 1);

  // pernas compridas
  drawLimb(ctx, -11, -40, -13 + strideB, -2, 9, pants, '#0d0a0b');
  drawLimb(ctx, 10, -40, 12 - strideB, -2, 9, pants, '#0d0a0b');

  // braco esquerdo (normal)
  drawLimb(ctx, -13, -78, -19 + strideB * 0.4, -50, 8, skin, null);

  // braco direito -- de ferro, com parafusos aparecendo
  var reachOut = 0;
  if (b.state === 'telegraph-ferrada') reachOut = 8;
  if (b.state === 'active-ferrada') reachOut = 32;
  ctx.strokeStyle = metal;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(13, -78); ctx.lineTo(20 + reachOut, -60); ctx.stroke();
  ctx.strokeStyle = metalDark;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(15, -74); ctx.lineTo(18 + reachOut * 0.6, -64); ctx.stroke();
  ctx.fillStyle = metalDark;
  ctx.beginPath(); ctx.arc(16, -72, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(19 + reachOut * 0.5, -63, 1.6, 0, Math.PI * 2); ctx.fill();
  // punho de ferro
  ctx.fillStyle = metal;
  ctx.beginPath(); ctx.arc(20 + reachOut, -58, 7, 0, Math.PI * 2); ctx.fill();

  // tronco largo
  ctx.fillStyle = shirt;
  roundRect(ctx, -14, -84, 28, 36, 6);
  ctx.fill();

  // cabeca com pescoço grosso
  ctx.fillStyle = skin;
  ctx.fillRect(-6, -94, 12, 12);
  ctx.beginPath(); ctx.arc(0, -98, 10, 0, Math.PI * 2); ctx.fill();

  // cabelo curto
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.arc(0, -102, 10, Math.PI * 0.9, Math.PI * 2.1); ctx.fill();

  // boca grande e larga (a "boca de bulbassauro")
  ctx.fillStyle = '#7a3a3a';
  ctx.beginPath();
  ctx.ellipse(2, -93, 5.5, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  if (b.state.indexOf('active') === 0) {
    ctx.strokeStyle = 'rgba(255,93,115,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + b.facing * 42, baseY - 62, 15, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (loose) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '16px sans-serif';
    ctx.fillText('🔩', cx - 8, baseY - 112);
  }

  drawMiniHpBar(ctx, b.x - 5, b.y - 52, b.w + 10, b.hp / b.maxHp, '#ff5d73');
}

// =====================================================================
// Lista de encontros
// =====================================================================

export var bossEncounters = [
  {
    triggerX: 2160,
    createBoss: createBossXuxinha,
    stepBoss: stepBossXuxinha,
    bossAttackHitbox: bossAttackHitboxXuxinha,
    bossDamageMultiplier: bossDamageMultiplierXuxinha,
    hitBoss: hitBossXuxinha,
    drawBoss: drawBossXuxinha,
    preBossDialogue: preBossDialogueXuxinha,
    victoryDialogue: victoryDialogueXuxinha
  },
  {
    triggerX: 4280,
    createBoss: createBossJohny,
    stepBoss: stepBossJohny,
    bossAttackHitbox: bossAttackHitboxJohny,
    bossDamageMultiplier: bossDamageMultiplierJohny,
    hitBoss: hitBossJohny,
    drawBoss: drawBossJohny,
    preBossDialogue: preBossDialogueJohny,
    victoryDialogue: victoryDialogueJohny
  }
];

// ---------- Cenário: Rechan ao amanhecer ----------

export function renderBackground(ctx, camX, VIEW_W, VIEW_H) {
  var sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, '#2a3060');
  sky.addColorStop(0.4, '#7a4a6a');
  sky.addColorStop(0.7, '#e0784a');
  sky.addColorStop(1, '#f2b25a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // sol nascendo
  var sunX = VIEW_W * 0.72 - camX * 0.08;
  ctx.fillStyle = 'rgba(255,214,140,0.9)';
  ctx.beginPath(); ctx.arc(sunX % (VIEW_W + 400) - 100, VIEW_H * 0.42, 46, 0, Math.PI * 2); ctx.fill();

  drawRenovatedStrip(ctx, camX, 0.3, VIEW_H - 55, '#5a4a5a', '#3a2e3a', 21, 12, 0.4);
  drawRenovatedStrip(ctx, camX, 0.55, VIEW_H - 40, '#6a5868', '#453a4a', 91, 15, 0.85);
  drawScaffoldLayer(ctx, camX);
}

function drawRenovatedStrip(ctx, camX, camFactor, baseY, wallColor, roofColor, seed, count, lightAlpha) {
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

    // fachadas com pintura fresca (retangulos claros) em algumas paredes
    if (hseed > 0.5) {
      ctx.fillStyle = 'rgba(240,220,190,0.25)';
      ctx.fillRect(hx + w * 0.15, baseY - h * 0.7, w * 0.5, h * 0.35);
    }

    ctx.fillStyle = 'rgba(255, 214, 150, ' + lightAlpha + ')';
    var cols = Math.max(1, Math.floor(w / 30));
    var rows = Math.max(1, Math.floor(h / 32));
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (Math.abs(Math.sin(seed + i * 7 + r * 3 + c)) > 0.62) {
          ctx.fillRect(hx + 7 + c * 28, baseY - h + 9 + r * 30, 12, 14);
        }
      }
    }
  }
}

function drawScaffoldLayer(ctx, camX) {
  var spacing = 150;
  var offset = (camX * 0.75) % spacing;
  var baseY = VIEW_H - 6;
  ctx.strokeStyle = 'rgba(200,150,90,0.35)';
  ctx.lineWidth = 2.2;
  for (var x = -offset - spacing; x < VIEW_W + spacing; x += spacing) {
    ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x, baseY - 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 40, baseY); ctx.lineTo(x + 40, baseY - 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, baseY - 20); ctx.lineTo(x + 40, baseY - 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, baseY - 40); ctx.lineTo(x + 40, baseY - 40); ctx.stroke();
  }
}

export function drawPlatform(ctx, pl) {
  ctx.fillStyle = PLATFORM_FILL;
  ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
  ctx.fillStyle = PLATFORM_TOP;
  ctx.fillRect(pl.x, pl.y, pl.w, 6);
}

// ---------- Desenho: Bagunceiro do Rechan ----------

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
  ctx.strokeStyle = '#7a3a3a';
  ctx.lineWidth = 4.5;
  ctx.beginPath(); ctx.moveTo(7, -32); ctx.lineTo(12, -22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-7, -32); ctx.lineTo(-11, -22); ctx.stroke();

  // moletom com capuz
  ctx.fillStyle = '#7a3a3a';
  roundRect(ctx, -8, -40, 16, 22, 4);
  ctx.fill();
  ctx.fillStyle = '#5a2a2a';
  ctx.beginPath(); ctx.arc(0, -42, 8.5, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();

  // cabeca (sombra do capuz)
  ctx.fillStyle = '#c9986b';
  ctx.beginPath(); ctx.arc(0, -44, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(20,15,20,0.35)';
  ctx.beginPath(); ctx.arc(0, -46, 7, Math.PI, Math.PI * 2); ctx.fill();

  ctx.restore();

  drawMiniHpBar(ctx, g.x - 2, g.y - 20, g.w + 4, g.hp / g.maxHp, '#ff5d73');
}
