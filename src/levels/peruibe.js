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
        { label: 'Você vai apanhar mais de mim do que da polícia!', next: 'p3' },
        { label: 'Maconheiro safado!', next: 'p3' }
      ]
    },
    p3: { speaker: 'Narrador', text: 'Léo dá uma tragada bem funda e entra na dele... o combate começa!', next: null }
  }
};

// Depois de derrotar o Léo (e o Kannabis, se já tiver entrado na briga),
// em vez de fechar a fase ele "ressuscita" com os poderes do Santo Daime
// -- essa dialogue é o gatilho que o game.js usa pra chamar createBoss2.
export var victoryDialogue = {
  start: 'v1',
  nodes: {
    v1: { speaker: 'Narrador', text: 'Léo cai de joelhos na areia, derrotado... mas um brilho verde estranho começa a sair da pele dele!', next: 'v2' },
    v2: { speaker: 'Léo Gobor', text: 'Vocês não sabiam? Eu guardava os poderes do Santo Daime pra emergência... e isso aqui é uma emergência!', next: 'v3' },
    v3: { speaker: 'Narrador', text: 'Léo cresce, fica verde, rasga a camisa, e se levanta MAIOR e mais furioso do que nunca!', next: null }
  }
};

// ---------- Aliado: Kannabis (Enrico) ----------
// Entra na luta quando o Léo chega em 50% de vida, igual ao Escorrega na
// Agropecuária.

const ALLY_BASE_HP = 85;
const TAPA_DMG = 9;
const VOADORA_DMG = 14;

export function createAlly(level) {
  return {
    name: 'Kannabis',
    x: 3050, y: GROUND_Y - 58, w: 32, h: 58, vx: 0, vy: 0, onGround: false,
    facing: -1,
    hp: enemyHpForLevel(ALLY_BASE_HP, level),
    maxHp: enemyHpForLevel(ALLY_BASE_HP, level),
    tapaDmg: enemyAttackForLevel(TAPA_DMG, level),
    voadoraDmg: enemyAttackForLevel(VOADORA_DMG, level),
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

var TELEGRAPH_TAPA = 0.28;
var ACTIVE_TAPA = 0.15;
var RECOVER_TAPA = 0.25;
var TELEGRAPH_VOADORA = 0.4;
var ACTIVE_VOADORA = 0.35;
var RECOVER_VOADORA = 0.4;
var CHAPADO_TIME = 1.6;
var VOADORA_SPEED = 250;
var APPROACH_SPEED_A = 60;
var ENGAGE_RANGE_A = 46;

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
          setStateA(a, 'chapado', CHAPADO_TIME);
        } else if (a.actionCount % 2 === 1) {
          setStateA(a, 'telegraph-tapa', TELEGRAPH_TAPA);
        } else {
          setStateA(a, 'telegraph-voadora', TELEGRAPH_VOADORA);
        }
      }
      break;
    }
    case 'telegraph-tapa':
      a.vx = 0;
      if (a.stateTimer <= 0) setStateA(a, 'active-tapa', ACTIVE_TAPA);
      break;
    case 'active-tapa':
      a.vx = 0;
      if (a.stateTimer <= 0) setStateA(a, 'recover-tapa', RECOVER_TAPA);
      break;
    case 'recover-tapa':
      a.vx = 0;
      if (a.stateTimer <= 0) setStateA(a, 'approach', 0);
      break;
    case 'telegraph-voadora':
      a.vx = 0;
      if (a.stateTimer <= 0) setStateA(a, 'active-voadora', ACTIVE_VOADORA);
      break;
    case 'active-voadora':
      a.vx = a.facing * VOADORA_SPEED;
      if (a.stateTimer <= 0) setStateA(a, 'recover-voadora', RECOVER_VOADORA);
      break;
    case 'recover-voadora':
      a.vx = 0;
      if (a.stateTimer <= 0) setStateA(a, 'approach', 0);
      break;
    case 'chapado':
      a.vx = 0;
      if (a.stateTimer <= 0) setStateA(a, 'approach', 0);
      break;
  }

  if (a.knockbackTimer > 0 && a.state !== 'active-voadora') {
    a.vx = a.knockbackVx;
    a.knockbackTimer -= dt;
  }

  a.vy += GRAVITY * dt;
  if (a.vy > MAX_FALL) a.vy = MAX_FALL;
  moveAndCollide(a, platforms, a.vx * dt, a.vy * dt);
  a.x = clamp(a.x, BOSS_ARENA_MIN_X, BOSS_ARENA_MAX_X - a.w);
}

export function allyAttackHitbox(a) {
  if (a.state === 'active-tapa') {
    var reach = 24;
    var x = a.facing > 0 ? a.x + a.w : a.x - reach;
    return { x: x, y: a.y + 6, w: reach, h: a.h - 14, damage: a.tapaDmg, message: 'Tapa baseado!' };
  }
  if (a.state === 'active-voadora') {
    return { x: a.x, y: a.y, w: a.w, h: a.h, damage: a.voadoraDmg, message: 'Voadora enfumaçada!' };
  }
  return null;
}

export function allyDamageMultiplier(a) {
  return a.state === 'chapado' ? 1.5 : 1;
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
    k1: { speaker: 'Narrador', text: 'Um amigo aparece correndo pela areia pra ajudar o Léo! É o Kannabis!', next: 'k2' },
    k2: { speaker: 'Kannabis', text: 'Ô mano, calma que eu tava aqui sonhando com uma anã bem gostosa... mas bora resolver essa parada primeiro!', next: null }
  }
};

// ---------- Boss secreto: Léo Gobor Verde (poderes do Santo Daime) ----------
// Aparece depois que o Léo original E o Kannabis já caíram -- mesmo padrão
// sequencial do Akio no Rechan, só que aqui é o próprio Léo "ressuscitando".

const BASE_HP_2 = 170;
const CHICOTADA_DMG = 13;
const INVESTIDA_DMG = 20;

export function createBoss2(level) {
  return {
    name: 'Léo Gobor Verde',
    x: 3050, y: GROUND_Y - 76, w: 48, h: 76, vx: 0, vy: 0, onGround: false,
    facing: -1,
    hp: enemyHpForLevel(BASE_HP_2, level),
    maxHp: enemyHpForLevel(BASE_HP_2, level),
    chicotadaDmg: enemyAttackForLevel(CHICOTADA_DMG, level),
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

var TELEGRAPH_CHICOTADA = 0.28;
var ACTIVE_CHICOTADA = 0.16;
var RECOVER_CHICOTADA = 0.26;
var TELEGRAPH_INVESTIDA = 0.45;
var ACTIVE_INVESTIDA = 0.45;
var RECOVER_INVESTIDA = 0.45;
var BAQUE_TIME = 1.6;
var INVESTIDA_SPEED = 280;
var APPROACH_SPEED_2 = 70;
var ENGAGE_RANGE_2 = 58;

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
          setState2(boss, 'baque', BAQUE_TIME);
        } else if (boss.actionCount % 2 === 1) {
          setState2(boss, 'telegraph-chicotada', TELEGRAPH_CHICOTADA);
        } else {
          setState2(boss, 'telegraph-investida', TELEGRAPH_INVESTIDA);
        }
      }
      break;
    }
    case 'telegraph-chicotada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState2(boss, 'active-chicotada', ACTIVE_CHICOTADA);
      break;
    case 'active-chicotada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState2(boss, 'recover-chicotada', RECOVER_CHICOTADA);
      break;
    case 'recover-chicotada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState2(boss, 'approach', 0);
      break;
    case 'telegraph-investida':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState2(boss, 'active-investida', ACTIVE_INVESTIDA);
      break;
    case 'active-investida':
      boss.vx = boss.facing * INVESTIDA_SPEED;
      if (boss.stateTimer <= 0) setState2(boss, 'recover-investida', RECOVER_INVESTIDA);
      break;
    case 'recover-investida':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState2(boss, 'approach', 0);
      break;
    case 'baque':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState2(boss, 'approach', 0);
      break;
  }

  if (boss.knockbackTimer > 0 && boss.state !== 'active-investida') {
    boss.vx = boss.knockbackVx;
    boss.knockbackTimer -= dt;
  }

  boss.vy += GRAVITY * dt;
  if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;
  moveAndCollide(boss, platforms, boss.vx * dt, boss.vy * dt);
  boss.x = clamp(boss.x, BOSS_ARENA_MIN_X, BOSS_ARENA_MAX_X - boss.w);
}

export function bossAttackHitbox2(boss) {
  if (boss.state === 'active-chicotada') {
    var reach = 40;
    var x = boss.facing > 0 ? boss.x + boss.w : boss.x - reach;
    return { x: x, y: boss.y + 10, w: reach, h: boss.h - 22, damage: boss.chicotadaDmg, message: 'Chicotada verde!' };
  }
  if (boss.state === 'active-investida') {
    return { x: boss.x, y: boss.y, w: boss.w, h: boss.h, damage: boss.investidaDmg, message: 'Investida do Daime!' };
  }
  return null;
}

export function bossDamageMultiplier2(boss) {
  return boss.state === 'baque' ? 1.5 : 1;
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
    h1: { speaker: 'Léo Gobor Verde', text: 'AGORA A ESSÊNCIA... É OUTRA!', next: null }
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

  drawMiniHpBar(ctx, b.x - 4, b.y - 48, b.w + 8, b.hp / b.maxHp, '#ff5d73');
}

// ---------- Desenho: Kannabis (Enrico) ----------

export function drawAlly(ctx, a) {
  if (!a.alive) return;
  var chapado = a.state === 'chapado';
  var cx = a.x + a.w / 2;
  var baseY = a.y + a.h;

  var skin = '#c9986b';
  var shirt = '#4a8f3c';
  var pants = '#c9a458';
  var bandana = '#e0c23a';

  var walking = a.state === 'approach' && Math.abs(a.vx) > 5;
  var strideA = walking ? Math.sin(a.x * 0.15) * 8 : 0;
  var sway = chapado ? Math.sin(a.stateTimer * 5) * 5 : 0;

  ctx.save();
  ctx.translate(cx + sway, baseY);
  ctx.scale(a.facing, 1);

  // pernas compridas e finas -- mesma altura do Léo
  drawLimb(ctx, -9, -34, -11 + strideA, -2, 7, pants, '#20191a');
  drawLimb(ctx, 8, -34, 10 - strideA, -2, 7, pants, '#20191a');

  // bracos
  var slap = 0;
  if (a.state === 'telegraph-tapa') slap = 8;
  if (a.state === 'active-tapa') slap = 30;
  if (a.state === 'active-voadora' || a.state === 'telegraph-voadora') {
    drawLimb(ctx, -10, -66, -20 + strideA * 0.4, -50, 6, skin, null);
    drawLimb(ctx, 10, -66, 20, -50, 6, skin, null);
  } else {
    drawLimb(ctx, -10, -66, -14 + strideA * 0.4, -44, 6, skin, null);
    drawLimb(ctx, 10, -66, 16 + slap, -60, 6, skin, null);
  }

  // tronco (camisa rasta, meio caida)
  ctx.fillStyle = shirt;
  roundRect(ctx, -9, -70, 18, 32, 5);
  ctx.fill();
  ctx.fillStyle = '#c1462a';
  ctx.fillRect(-9, -52, 18, 3);

  // cabeca
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, -80, 9, 0, Math.PI * 2); ctx.fill();

  // dreads saindo por baixo da bandana
  ctx.strokeStyle = '#1c1410';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  for (var d = -1; d <= 1; d++) {
    ctx.beginPath(); ctx.moveTo(d * 6, -83); ctx.lineTo(d * 7, -72 + Math.abs(d) * 2); ctx.stroke();
  }

  // bandana
  ctx.fillStyle = bandana;
  ctx.beginPath(); ctx.arc(0, -85, 9.5, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();

  // barbicha rala
  ctx.strokeStyle = '#3a2b1c';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(1, -75); ctx.lineTo(3, -73); ctx.stroke();

  // olhos bem caidos (chapadao)
  ctx.strokeStyle = '#2a2320';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(2, -81); ctx.lineTo(6, -80.5); ctx.stroke();

  // baseadinho proprio
  ctx.fillStyle = '#f4efe4';
  ctx.fillRect(9, -78, 10, 2.4);
  ctx.fillStyle = '#c1462a';
  ctx.fillRect(19, -78, 2, 2.4);

  ctx.restore();

  // fumaca -- o Kannabis tambem sempre ta com uma nuvenzinha
  var smokeTA = performance.now() / 450;
  var mouthXA = cx + a.facing * 20;
  var mouthYA = baseY - 78;
  ctx.strokeStyle = 'rgba(230,230,230,0.5)';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  for (var k = 0; k < 2; k++) {
    var tA = (smokeTA + k * 0.7) % 1.6;
    var sxA = mouthXA + a.facing * tA * 13 + Math.sin(tA * 4 + k) * 4;
    var syA = mouthYA - tA * 20;
    ctx.beginPath();
    ctx.arc(sxA, syA, 2 + tA * 2.6, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (a.state.indexOf('active') === 0) {
    ctx.strokeStyle = 'rgba(255,93,115,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + a.facing * 34, baseY - 50, 13, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (chapado) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '18px sans-serif';
    ctx.fillText('💭', cx - 8, baseY - 96);
  }

  drawMiniHpBar(ctx, a.x - 4, a.y - 48, a.w + 8, a.hp / a.maxHp, '#ff5d73');
}

// ---------- Desenho: Léo Gobor Verde ----------

export function drawBoss2(ctx, b) {
  if (!b.alive) return;
  var dazed = b.state === 'baque';
  var cx = b.x + b.w / 2;
  var baseY = b.y + b.h;

  var skin = '#4a8f3c';
  var shirtTear = '#e0704a';
  var shorts = '#2a5a3a';
  var capColor = '#2f5f8a';

  var walking = b.state === 'approach' && Math.abs(b.vx) > 5;
  var strideB2 = walking ? Math.sin(b.x * 0.13) * 10 : 0;
  var sway2 = dazed ? Math.sin(b.stateTimer * 5) * 6 : 0;

  ctx.save();
  ctx.translate(cx + sway2, baseY);
  ctx.scale(b.facing, 1);

  // pernas grossas
  drawLimb(ctx, -13, -44, -15 + strideB2, -2, 11, shorts, '#20191a');
  drawLimb(ctx, 12, -44, 14 - strideB2, -2, 11, shorts, '#20191a');

  // bracos enormes
  var reachOut2 = 0;
  if (b.state === 'telegraph-chicotada') reachOut2 = 10;
  if (b.state === 'active-chicotada') reachOut2 = 38;
  drawLimb(ctx, -14, -84, -20 + strideB2 * 0.4, -50, 10, skin, null);
  drawLimb(ctx, 14, -84, 22 + reachOut2, -70, 10, skin, null);

  // tronco largo (camisa rasgada de tanto crescer)
  ctx.fillStyle = shirtTear;
  roundRect(ctx, -14, -90, 28, 42, 6);
  ctx.fill();
  // rasgo mostrando a barriga verde
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(-4, -80); ctx.lineTo(2, -68); ctx.lineTo(-2, -56); ctx.lineTo(-8, -66); ctx.closePath();
  ctx.fill();

  // cabeca
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, -102, 13, 0, Math.PI * 2); ctx.fill();

  // bone minusculo -- comicamente pequeno pra cabeca gigante agora
  ctx.fillStyle = capColor;
  ctx.beginPath(); ctx.arc(0, -113, 5, Math.PI, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, -113, 4.4, 1.6, 0, 0, Math.PI * 2); ctx.fill();

  // bigode -- continuidade com o Leo original
  ctx.strokeStyle = '#20140a';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(3, -97); ctx.lineTo(12, -95.5); ctx.stroke();

  // olhos furiosos
  ctx.strokeStyle = '#1a1210';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(2, -105); ctx.lineTo(8, -108); ctx.stroke();

  ctx.restore();

  if (b.state.indexOf('active') === 0) {
    ctx.strokeStyle = 'rgba(255,93,115,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + b.facing * 46, baseY - 64, 17, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (dazed) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '20px sans-serif';
    ctx.fillText('💫', cx - 9, baseY - 122);
  }

  drawMiniHpBar(ctx, b.x - 5, b.y - 54, b.w + 10, b.hp / b.maxHp, '#ff5d73');
}
