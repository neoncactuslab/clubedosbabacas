import { GRAVITY, MAX_FALL, moveAndCollide, aabb, clamp } from '../engine.js';
import { enemyHpForLevel, enemyAttackForLevel } from '../balance.js';
import { createGrunt } from '../enemies.js';
import { drawMiniHpBar, drawLimb, roundRect } from '../renderUtils.js';

export const VIEW_W = 960;
export const VIEW_H = 540;
export const GROUND_Y = 460;
export const DEATH_Y = 620;
export const FALL_DAMAGE = 15;

export const LEVEL_NAME = 'Suprema Poker';
export const LEVEL_NUMBER = 5;

// Escritório corporativo em Sorocaba, alternando entre o open space (chão)
// e corredores/mezaninos de vidro elevados -- o prédio troca de "andar"
// sem precisar trocar de cenário de verdade.
export const platforms = [
  { x: 0, y: GROUND_Y, w: 520, h: 80 },
  { x: 580, y: GROUND_Y, w: 480, h: 80 },
  { x: 1120, y: GROUND_Y - 30, w: 520, h: 30 },
  { x: 1700, y: GROUND_Y, w: 560, h: 80 },
  { x: 2320, y: GROUND_Y - 30, w: 400, h: 30 },
  { x: 2780, y: GROUND_Y, w: 620, h: 80 }
];

export const checkpoints = [0, 580, 1120, 1700, 2320, 2780];

export const LEVEL_W = 3400;
export const PLAYER_START = { x: 60, y: GROUND_Y - 200 };

export const BOSS_ARENA_X = 2780;
export const BOSS_ARENA_MIN_X = 2780;
export const BOSS_ARENA_MAX_X = 3390;

export var GRUNT_HIT_TOAST = 'Ai, meu crachá!';
export var PLATFORM_FILL = '#d7dbe0';
export var PLATFORM_TOP = '#8fa0b3';

export function createEnemies(level) {
  return [
    createGrunt({
      name: 'Trainee Grindado', x: 200, y: GROUND_Y - 40, w: 22, h: 40,
      minX: 60, maxX: 460, speed: 100, baseHp: 24, baseAttack: 8
    }, level),
    createGrunt({
      name: 'Trainee Grindado', x: 720, y: GROUND_Y - 40, w: 22, h: 40,
      minX: 620, maxX: 1020, speed: 108, baseHp: 24, baseAttack: 8
    }, level),
    createGrunt({
      name: 'Trainee Grindado', x: 1300, y: GROUND_Y - 30 - 40, w: 22, h: 40,
      minX: 1150, maxX: 1600, speed: 112, baseHp: 24, baseAttack: 8
    }, level),
    createGrunt({
      name: 'Trainee Grindado', x: 1800, y: GROUND_Y - 40, w: 22, h: 40,
      minX: 1750, maxX: 2020, speed: 105, baseHp: 24, baseAttack: 8
    }, level),
    createGrunt({
      name: 'Trainee Grindado', x: 2120, y: GROUND_Y - 40, w: 22, h: 40,
      minX: 2070, maxX: 2240, speed: 110, baseHp: 24, baseAttack: 8
    }, level),
    createGrunt({
      name: 'Trainee Grindado', x: 2500, y: GROUND_Y - 30 - 40, w: 22, h: 40,
      minX: 2350, maxX: 2680, speed: 112, baseHp: 24, baseAttack: 8
    }, level)
  ];
}

// ---------- Boss 1: Tanso ----------

const BASE_HP = 110;
const TAPA_DMG = 9;
const INVESTIDA_DMG = 15;

export function createBoss(level) {
  return {
    name: 'Tanso',
    x: 3200, y: GROUND_Y - 64, w: 34, h: 64, vx: 0, vy: 0, onGround: false,
    facing: -1,
    hp: enemyHpForLevel(BASE_HP, level),
    maxHp: enemyHpForLevel(BASE_HP, level),
    tapaDmg: enemyAttackForLevel(TAPA_DMG, level),
    investidaDmg: enemyAttackForLevel(INVESTIDA_DMG, level),
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

var TELEGRAPH_TAPA = 0.3;
var ACTIVE_TAPA = 0.16;
var RECOVER_TAPA = 0.28;
var TELEGRAPH_INVESTIDA = 0.45;
var ACTIVE_INVESTIDA = 0.4;
var RECOVER_INVESTIDA = 0.4;
var ANSIEDADE_TIME = 1.7;
var INVESTIDA_SPEED = 240;
var APPROACH_SPEED = 58;
var ENGAGE_RANGE = 48; // dentro do alcance real da tapa (~34 do centro)

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
          setState(boss, 'ansiedade', ANSIEDADE_TIME);
        } else if (boss.actionCount % 2 === 1) {
          setState(boss, 'telegraph-tapa', TELEGRAPH_TAPA);
        } else {
          setState(boss, 'telegraph-investida', TELEGRAPH_INVESTIDA);
        }
      }
      break;
    }
    case 'telegraph-tapa':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'active-tapa', ACTIVE_TAPA);
      break;
    case 'active-tapa':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'recover-tapa', RECOVER_TAPA);
      break;
    case 'recover-tapa':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'approach', 0);
      break;
    case 'telegraph-investida':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'active-investida', ACTIVE_INVESTIDA);
      break;
    case 'active-investida':
      boss.vx = boss.facing * INVESTIDA_SPEED;
      if (boss.stateTimer <= 0) setState(boss, 'recover-investida', RECOVER_INVESTIDA);
      break;
    case 'recover-investida':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'approach', 0);
      break;
    case 'ansiedade':
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
  if (boss.state === 'active-tapa') {
    var reach = 30;
    var x = boss.facing > 0 ? boss.x + boss.w : boss.x - reach;
    return { x: x, y: boss.y + 10, w: reach, h: boss.h - 20, damage: boss.tapaDmg, message: 'Tapa de contrato!' };
  }
  if (boss.state === 'active-investida') {
    return { x: boss.x, y: boss.y, w: boss.w, h: boss.h, damage: boss.investidaDmg, message: 'Investida de terno!' };
  }
  return null;
}

export function bossDamageMultiplier(boss) {
  return boss.state === 'ansiedade' ? 1.5 : 1;
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
    n1: { speaker: 'Narrador', text: 'Sorocaba, interior de São Paulo. No centro da cidade, um prédio de vidro espelhado esconde a sede da Suprema Poker — mesas cheias de monitores e um cheiro forte de café requentado.', next: 'n2' },
    n2: {
      speaker: '{name}', text: 'Fiquei sabendo que essa empresa é um ninho de babacas!',
      choices: [
        { label: 'Vamos botar pra quebrar!', next: null },
        { label: 'Empresa de cara folgado...', next: null }
      ]
    }
  }
};

export var preBossDialogue = {
  start: 'p1',
  nodes: {
    p1: { speaker: '{name}', text: 'Cheguei na nata dos babacas da Suprema!', next: 'p2' },
    p2: { speaker: 'Tanso', text: 'Não quero briga, tenho 16 filhos pra criar...', next: 'p3' },
    p3: { speaker: 'Narrador', text: 'Tanso ajeita os óculos, solta um suspiro profundo... e mesmo assim parte pra cima!', next: null }
  }
};

// Depois de derrotar o Tanso (e o Leo Med, se já tiver entrado na briga),
// uma porta se abre no fundo da sala -- gatilho pro game.js chamar
// createBoss2 com o terceiro babaca da empresa.
export var victoryDialogue = {
  start: 'v1',
  nodes: {
    v1: { speaker: 'Narrador', text: 'Tanso e Leo Med desabam entre teclados quebrados e copos de café derramados...', next: 'v2' },
    v2: { speaker: 'Narrador', text: 'Uma porta de vidro se abre no fundo da sala, e um cara baixinho e rechonchudo entra chutando o mouse pelo chão.', next: null }
  }
};

// ---------- Aliado: Leo Med ----------
// Entra na luta quando o Tanso chega em 50% de vida.

const ALLY_BASE_HP = 70;
const CANTADA_DMG = 8;
const AVANCO_DMG = 13;

export function createAlly(level) {
  return {
    name: 'Leo Med',
    x: 3300, y: GROUND_Y - 48, w: 30, h: 48, vx: 0, vy: 0, onGround: false,
    facing: -1,
    hp: enemyHpForLevel(ALLY_BASE_HP, level),
    maxHp: enemyHpForLevel(ALLY_BASE_HP, level),
    cantadaDmg: enemyAttackForLevel(CANTADA_DMG, level),
    avancoDmg: enemyAttackForLevel(AVANCO_DMG, level),
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

var TELEGRAPH_CANTADA = 0.26;
var ACTIVE_CANTADA = 0.14;
var RECOVER_CANTADA = 0.24;
var TELEGRAPH_AVANCO = 0.38;
var ACTIVE_AVANCO = 0.3;
var RECOVER_AVANCO = 0.35;
var SEMGRACA_TIME = 1.5;
var AVANCO_SPEED = 230;
var APPROACH_SPEED_A = 68;
var ENGAGE_RANGE_A = 42;

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
          setStateA(a, 'semgraca', SEMGRACA_TIME);
        } else if (a.actionCount % 2 === 1) {
          setStateA(a, 'telegraph-cantada', TELEGRAPH_CANTADA);
        } else {
          setStateA(a, 'telegraph-avanco', TELEGRAPH_AVANCO);
        }
      }
      break;
    }
    case 'telegraph-cantada':
      a.vx = 0;
      if (a.stateTimer <= 0) setStateA(a, 'active-cantada', ACTIVE_CANTADA);
      break;
    case 'active-cantada':
      a.vx = 0;
      if (a.stateTimer <= 0) setStateA(a, 'recover-cantada', RECOVER_CANTADA);
      break;
    case 'recover-cantada':
      a.vx = 0;
      if (a.stateTimer <= 0) setStateA(a, 'approach', 0);
      break;
    case 'telegraph-avanco':
      a.vx = 0;
      if (a.stateTimer <= 0) setStateA(a, 'active-avanco', ACTIVE_AVANCO);
      break;
    case 'active-avanco':
      a.vx = a.facing * AVANCO_SPEED;
      if (a.stateTimer <= 0) setStateA(a, 'recover-avanco', RECOVER_AVANCO);
      break;
    case 'recover-avanco':
      a.vx = 0;
      if (a.stateTimer <= 0) setStateA(a, 'approach', 0);
      break;
    case 'semgraca':
      a.vx = 0;
      if (a.stateTimer <= 0) setStateA(a, 'approach', 0);
      break;
  }

  if (a.knockbackTimer > 0 && a.state !== 'active-avanco') {
    a.vx = a.knockbackVx;
    a.knockbackTimer -= dt;
  }

  a.vy += GRAVITY * dt;
  if (a.vy > MAX_FALL) a.vy = MAX_FALL;
  moveAndCollide(a, platforms, a.vx * dt, a.vy * dt);
  a.x = clamp(a.x, BOSS_ARENA_MIN_X, BOSS_ARENA_MAX_X - a.w);
}

export function allyAttackHitbox(a) {
  if (a.state === 'active-cantada') {
    var reach = 26;
    var x = a.facing > 0 ? a.x + a.w : a.x - reach;
    return { x: x, y: a.y + 6, w: reach, h: a.h - 12, damage: a.cantadaDmg, message: 'Cantada suja!' };
  }
  if (a.state === 'active-avanco') {
    return { x: a.x, y: a.y, w: a.w, h: a.h, damage: a.avancoDmg, message: 'Avanço sem noção!' };
  }
  return null;
}

export function allyDamageMultiplier(a) {
  return a.state === 'semgraca' ? 1.5 : 1;
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

export var allyJoinDialogue = {
  start: 'k1',
  nodes: {
    k1: { speaker: 'Narrador', text: 'Uma cadeira gamer gira no fundo da sala — um baixinho de cabelo loiro se levanta e entra na briga: é o Leo Med!', next: 'k2' },
    k2: { speaker: 'Leo Med', text: 'Me manda um nude depois?', next: null }
  }
};

// ---------- Boss 2: VinnyChaos ----------
// Aparece depois que o Tanso E o Leo Med já caíram -- mesmo padrão
// sequencial do Akio no Rechan / Léo Gobor Verde em Peruíbe.

const BASE_HP_2 = 150;
const RAGEQUIT_DMG = 12;
const TACKLE_DMG = 18;

export function createBoss2(level) {
  return {
    name: 'VinnyChaos',
    x: 3200, y: GROUND_Y - 56, w: 46, h: 56, vx: 0, vy: 0, onGround: false,
    facing: -1,
    hp: enemyHpForLevel(BASE_HP_2, level),
    maxHp: enemyHpForLevel(BASE_HP_2, level),
    ragequitDmg: enemyAttackForLevel(RAGEQUIT_DMG, level),
    tackleDmg: enemyAttackForLevel(TACKLE_DMG, level),
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

var TELEGRAPH_RAGEQUIT = 0.26;
var ACTIVE_RAGEQUIT = 0.15;
var RECOVER_RAGEQUIT = 0.25;
var TELEGRAPH_TACKLE = 0.42;
var ACTIVE_TACKLE = 0.38;
var RECOVER_TACKLE = 0.4;
var PINGALTO_TIME = 1.6;
var TACKLE_SPEED = 250;
var APPROACH_SPEED_2 = 60;
var ENGAGE_RANGE_2 = 54;

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
          setState2(boss, 'pingalto', PINGALTO_TIME);
        } else if (boss.actionCount % 2 === 1) {
          setState2(boss, 'telegraph-ragequit', TELEGRAPH_RAGEQUIT);
        } else {
          setState2(boss, 'telegraph-tackle', TELEGRAPH_TACKLE);
        }
      }
      break;
    }
    case 'telegraph-ragequit':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState2(boss, 'active-ragequit', ACTIVE_RAGEQUIT);
      break;
    case 'active-ragequit':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState2(boss, 'recover-ragequit', RECOVER_RAGEQUIT);
      break;
    case 'recover-ragequit':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState2(boss, 'approach', 0);
      break;
    case 'telegraph-tackle':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState2(boss, 'active-tackle', ACTIVE_TACKLE);
      break;
    case 'active-tackle':
      boss.vx = boss.facing * TACKLE_SPEED;
      if (boss.stateTimer <= 0) setState2(boss, 'recover-tackle', RECOVER_TACKLE);
      break;
    case 'recover-tackle':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState2(boss, 'approach', 0);
      break;
    case 'pingalto':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState2(boss, 'approach', 0);
      break;
  }

  if (boss.knockbackTimer > 0 && boss.state !== 'active-tackle') {
    boss.vx = boss.knockbackVx;
    boss.knockbackTimer -= dt;
  }

  boss.vy += GRAVITY * dt;
  if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;
  moveAndCollide(boss, platforms, boss.vx * dt, boss.vy * dt);
  boss.x = clamp(boss.x, BOSS_ARENA_MIN_X, BOSS_ARENA_MAX_X - boss.w);
}

export function bossAttackHitbox2(boss) {
  if (boss.state === 'active-ragequit') {
    var reach = 26;
    var x = boss.facing > 0 ? boss.x + boss.w : boss.x - reach;
    return { x: x, y: boss.y + 8, w: reach, h: boss.h - 16, damage: boss.ragequitDmg, message: 'Rage quit!' };
  }
  if (boss.state === 'active-tackle') {
    return { x: boss.x, y: boss.y, w: boss.w, h: boss.h, damage: boss.tackleDmg, message: 'Tackle de salgadinho!' };
  }
  return null;
}

export function bossDamageMultiplier2(boss) {
  return boss.state === 'pingalto' ? 1.5 : 1;
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

export var boss2IntroDialogue = {
  start: 'h1',
  nodes: {
    h1: { speaker: 'VinnyChaos', text: 'Não sou obrigado a jogar com Troll cara!', next: null }
  }
};

// ---------- Cenário: escritório da Suprema Poker ----------

export function renderBackground(ctx, camX, VIEW_W, VIEW_H) {
  var wall = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  wall.addColorStop(0, '#e4e9ee');
  wall.addColorStop(0.6, '#c7d0d8');
  wall.addColorStop(1, '#aab6c2');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  drawCitySkyline(ctx, camX, 0.2, VIEW_H * 0.62);
  drawCeilingLights(ctx, camX);
  drawCubiclePartitions(ctx, camX);
}

function drawCitySkyline(ctx, camX, camFactor, baseY) {
  var spacing = (LEVEL_W + 500) / 12;
  for (var i = -1; i < 12; i++) {
    var hx = i * spacing - (camX * camFactor) % spacing - 80;
    var seed = Math.abs(Math.sin(41 + i * 12.9898)) % 1;
    var w = 46 + seed * 26;
    var h = 70 + seed * 90;
    ctx.fillStyle = 'rgba(120,140,165,0.55)';
    ctx.fillRect(hx, baseY - h, w, h);
    // janelas iluminadas do prédio ao fundo
    ctx.fillStyle = 'rgba(255,224,140,0.5)';
    for (var wy = baseY - h + 8; wy < baseY - 8; wy += 14) {
      for (var wx = hx + 6; wx < hx + w - 6; wx += 12) {
        if ((Math.floor(wx + wy) % 3) === 0) ctx.fillRect(wx, wy, 6, 8);
      }
    }
  }
}

function drawCeilingLights(ctx, camX) {
  var spacing = 160;
  var offset = camX % spacing;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (var x = -offset - spacing; x < VIEW_W + spacing; x += spacing) {
    ctx.fillRect(x, 14, 90, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x - 10, 22, 110, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
  }
}

function drawCubiclePartitions(ctx, camX) {
  var spacing = 220;
  var offset = (camX * 0.7) % spacing;
  ctx.fillStyle = 'rgba(150,165,180,0.4)';
  for (var x = -offset - spacing; x < VIEW_W + spacing; x += spacing) {
    ctx.fillRect(x, VIEW_H * 0.62, 70, VIEW_H * 0.3);
  }
}

export function drawPlatform(ctx, pl) {
  ctx.fillStyle = PLATFORM_FILL;
  ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
  ctx.fillStyle = PLATFORM_TOP;
  ctx.fillRect(pl.x, pl.y, pl.w, 6);
}

// ---------- Desenho: Trainee Grindado ----------

export function drawGrunt(ctx, g) {
  if (!g.alive) return;
  var facing = g.vx >= 0 ? 1 : -1;
  var cx = g.x + g.w / 2;
  var baseY = g.y + g.h;
  var walking = Math.abs(g.vx) > 5;
  var stride = walking ? Math.sin(g.x * 0.15) * 6 : 0;

  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(facing, 1);

  // pernas (calça social escura)
  ctx.strokeStyle = '#2a2e38';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-4, -20); ctx.lineTo(-5 + stride, -1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, -20); ctx.lineTo(5 - stride, -1); ctx.stroke();

  // braco
  ctx.strokeStyle = '#f2f4f6';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(6, -32); ctx.lineTo(11, -22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6, -32); ctx.lineTo(-10, -22); ctx.stroke();

  // camisa social branca
  ctx.fillStyle = '#f2f4f6';
  roundRect(ctx, -8, -38, 16, 20, 4);
  ctx.fill();

  // gravata
  ctx.fillStyle = '#7a2a3a';
  ctx.beginPath();
  ctx.moveTo(-2, -37); ctx.lineTo(2, -37); ctx.lineTo(1, -22); ctx.lineTo(0, -19); ctx.lineTo(-1, -22);
  ctx.closePath();
  ctx.fill();

  // cabeca
  ctx.fillStyle = '#d9a878';
  ctx.beginPath(); ctx.arc(0, -42, 7, 0, Math.PI * 2); ctx.fill();

  // cabelo penteado pra tras
  ctx.fillStyle = '#2a2018';
  ctx.beginPath(); ctx.arc(0, -46, 7, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();

  // crachá balancando
  ctx.fillStyle = '#c9d4dc';
  ctx.fillRect(4, -30, 5, 7);
  ctx.strokeStyle = '#8fa0b3';
  ctx.lineWidth = 1;
  ctx.strokeRect(4, -30, 5, 7);

  ctx.restore();

  drawMiniHpBar(ctx, g.x - 2, g.y - 22, g.w + 4, g.hp / g.maxHp, '#ff5d73');
}

// ---------- Desenho: Tanso ----------

export function drawBoss(ctx, b) {
  if (!b.alive) return;
  var anxious = b.state === 'ansiedade';
  var cx = b.x + b.w / 2;
  var baseY = b.y + b.h;

  var skin = '#e8c9a8';
  var shirt = '#f2f4f6';
  var pants = '#2a2e38';
  var tie = '#2f4f7a';

  var walking = b.state === 'approach' && Math.abs(b.vx) > 5;
  var strideB = walking ? Math.sin(b.x * 0.14) * 8 : 0;
  var shake = anxious ? Math.sin(b.stateTimer * 20) * 3 : 0;

  ctx.save();
  ctx.translate(cx + shake, baseY);
  ctx.scale(b.facing, 1);

  // pernas compridas e finas
  drawLimb(ctx, -9, -36, -11 + strideB, -2, 7, pants, '#20191a');
  drawLimb(ctx, 8, -36, 10 - strideB, -2, 7, pants, '#20191a');

  // bracos
  var reachOut = 0;
  if (b.state === 'telegraph-tapa') reachOut = 8;
  if (b.state === 'active-tapa') reachOut = 26;
  drawLimb(ctx, -10, -68, -14 + strideB * 0.4, -46, 6, shirt, skin);
  drawLimb(ctx, 10, -68, 16 + reachOut, -62, 6, shirt, skin);

  // tronco (camisa social)
  ctx.fillStyle = shirt;
  roundRect(ctx, -10, -72, 20, 34, 5);
  ctx.fill();

  // gravata
  ctx.fillStyle = tie;
  ctx.beginPath();
  ctx.moveTo(-3, -71); ctx.lineTo(3, -71); ctx.lineTo(2, -42); ctx.lineTo(0, -38); ctx.lineTo(-2, -42);
  ctx.closePath();
  ctx.fill();

  // cabeca
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, -82, 9.5, 0, Math.PI * 2); ctx.fill();

  // cabelo ralo penteado pro lado
  ctx.fillStyle = '#4a4038';
  ctx.beginPath(); ctx.arc(0, -87, 9.5, Math.PI * 0.9, Math.PI * 1.75); ctx.fill();

  // oculos
  ctx.strokeStyle = '#2a2320';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(-6.5, -84, 5.5, 5);
  ctx.strokeRect(1, -84, 5.5, 5);
  ctx.beginPath(); ctx.moveTo(-1, -81.5); ctx.lineTo(1, -81.5); ctx.stroke();

  ctx.restore();

  if (b.state.indexOf('active') === 0) {
    ctx.strokeStyle = 'rgba(255,93,115,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + b.facing * 36, baseY - 54, 14, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (anxious) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '18px sans-serif';
    ctx.fillText('😰', cx - 9, baseY - 98);
  }

  drawMiniHpBar(ctx, b.x - 4, b.y - 44, b.w + 8, b.hp / b.maxHp, '#ff5d73');
}

// ---------- Desenho: Leo Med ----------

export function drawAlly(ctx, a) {
  if (!a.alive) return;
  var embarrassed = a.state === 'semgraca';
  var cx = a.x + a.w / 2;
  var baseY = a.y + a.h;

  var skin = '#e8c9a8';
  var shirt = '#5a9fd4';
  var pants = '#3a3f4a';
  var hair = '#d9b23c';

  var walking = a.state === 'approach' && Math.abs(a.vx) > 5;
  var strideA = walking ? Math.sin(a.x * 0.17) * 6 : 0;
  var lean = embarrassed ? Math.sin(a.stateTimer * 6) * 4 : 0;

  ctx.save();
  ctx.translate(cx + lean, baseY);
  ctx.scale(a.facing, 1);

  // pernas curtas
  drawLimb(ctx, -7, -22, -8 + strideA, -2, 6, pants, '#20191a');
  drawLimb(ctx, 6, -22, 7 - strideA, -2, 6, pants, '#20191a');

  // bracos
  var poke = 0;
  if (a.state === 'telegraph-cantada') poke = 6;
  if (a.state === 'active-cantada') poke = 20;
  if (a.state === 'active-avanco' || a.state === 'telegraph-avanco') {
    drawLimb(ctx, -8, -40, -16, -30, 5.5, skin, null);
    drawLimb(ctx, 8, -40, 16, -30, 5.5, skin, null);
  } else {
    drawLimb(ctx, -8, -40, -12 + strideA * 0.4, -22, 5.5, skin, null);
    drawLimb(ctx, 8, -40, 10 + poke, -32, 5.5, skin, null);
  }

  // tronco (camisa polo azul, gordinho de sedentarismo gamer)
  ctx.fillStyle = shirt;
  roundRect(ctx, -9, -44, 18, 22, 6);
  ctx.fill();

  // cabeca
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, -50, 8.5, 0, Math.PI * 2); ctx.fill();

  // cabelo loiro
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.arc(0, -54, 8.5, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();

  // sorriso sem graca / cantada
  ctx.strokeStyle = '#8a3a2a';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(1.5, -47, 2.4, 0.15, Math.PI - 0.15); ctx.stroke();

  // olhos
  ctx.fillStyle = '#2a2320';
  ctx.beginPath(); ctx.arc(4, -51, 1.3, 0, Math.PI * 2); ctx.fill();

  ctx.restore();

  if (a.state.indexOf('active') === 0) {
    ctx.strokeStyle = 'rgba(255,93,115,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + a.facing * 26, baseY - 36, 11, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (embarrassed) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '16px sans-serif';
    ctx.fillText('😳', cx - 8, baseY - 66);
  }

  drawMiniHpBar(ctx, a.x - 3, a.y - 26, a.w + 6, a.hp / a.maxHp, '#ff5d73');
}

// ---------- Desenho: VinnyChaos ----------

export function drawBoss2(ctx, b) {
  if (!b.alive) return;
  var lagged = b.state === 'pingalto';
  var cx = b.x + b.w / 2;
  var baseY = b.y + b.h;

  var skin = '#c9986b';
  var hoodie = '#2a2a32';
  var pants = '#4a4a56';
  var hair = '#100d0a';

  var walking = b.state === 'approach' && Math.abs(b.vx) > 5;
  var strideB2 = walking ? Math.sin(b.x * 0.12) * 7 : 0;
  var glitch = lagged ? Math.sin(b.stateTimer * 30) * 2 : 0;

  ctx.save();
  ctx.translate(cx + glitch, baseY);
  ctx.scale(b.facing, 1);

  // pernas curtas e grossas
  drawLimb(ctx, -12, -26, -14 + strideB2, -2, 10, pants, '#1a1a20');
  drawLimb(ctx, 11, -26, 13 - strideB2, -2, 10, pants, '#1a1a20');

  // bracos grossos
  var punch = 0;
  if (b.state === 'telegraph-ragequit') punch = 8;
  if (b.state === 'active-ragequit') punch = 30;
  drawLimb(ctx, -13, -50, -18 + strideB2 * 0.4, -30, 9, skin, null);
  drawLimb(ctx, 13, -50, 20 + punch, -42, 9, skin, null);

  // tronco largo (moletom de gamer)
  ctx.fillStyle = hoodie;
  roundRect(ctx, -16, -58, 32, 34, 8);
  ctx.fill();

  // headset pendurado no pescoco
  ctx.strokeStyle = '#3a3a44';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, -54, 9, 0.2, Math.PI - 0.2); ctx.stroke();

  // cabeca
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, -66, 11, 0, Math.PI * 2); ctx.fill();

  // cabelo preto bagunçado
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.arc(0, -70, 11, Math.PI * 0.85, Math.PI * 2.15); ctx.fill();
  ctx.beginPath(); ctx.arc(-5, -74, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(4, -75, 3, 0, Math.PI * 2); ctx.fill();

  // cara de raiva
  ctx.strokeStyle = '#1a1210';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(2, -70); ctx.lineTo(7, -73); ctx.stroke();
  ctx.strokeStyle = '#8a2a2a';
  ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(3, -62, 3, Math.PI, Math.PI * 1.9); ctx.stroke();

  ctx.restore();

  if (b.state.indexOf('active') === 0) {
    ctx.strokeStyle = 'rgba(255,93,115,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + b.facing * 40, baseY - 46, 15, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (lagged) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '18px sans-serif';
    ctx.fillText('🥶', cx - 9, baseY - 88);
  }

  drawMiniHpBar(ctx, b.x - 5, b.y - 36, b.w + 10, b.hp / b.maxHp, '#ff5d73');
}
