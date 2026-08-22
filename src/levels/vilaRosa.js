import { GRAVITY, MAX_FALL, moveAndCollide, aabb, clamp } from '../engine.js';
import { enemyHpForLevel, enemyAttackForLevel } from '../balance.js';
import { createGrunt } from '../enemies.js';

export const VIEW_W = 960;
export const VIEW_H = 540;
export const GROUND_Y = 460;
export const DEATH_Y = 620;
export const FALL_DAMAGE = 15;

export const LEVEL_NAME = 'Vila Rosa';
export const LEVEL_NUMBER = 1;

export const platforms = [
  { x: 0, y: GROUND_Y, w: 420, h: 80 },
  { x: 500, y: GROUND_Y, w: 320, h: 80 },
  { x: 900, y: 380, w: 120, h: 26 },
  { x: 1090, y: GROUND_Y, w: 360, h: 80 },
  { x: 1500, y: 340, w: 110, h: 26 },
  { x: 1660, y: GROUND_Y, w: 340, h: 80 },
  { x: 2050, y: GROUND_Y, w: 550, h: 80 }
];

export const checkpoints = [0, 500, 1090, 1660];

export const LEVEL_W = 2600;
export const PLAYER_START = { x: 60, y: GROUND_Y - 200 };

export const BOSS_ARENA_X = 2060;
export const BOSS_ARENA_MIN_X = 2060;
export const BOSS_ARENA_MAX_X = 2590;

export function createEnemies(level) {
  return [
    createGrunt({
      name: 'Cachorro do Bairro', x: 540, y: GROUND_Y - 34, w: 34, h: 34,
      minX: 540, maxX: 780, speed: 70, baseHp: 30, baseAttack: 8
    }, level),
    createGrunt({
      name: 'Cachorro do Bairro', x: 1150, y: GROUND_Y - 34, w: 34, h: 34,
      minX: 1130, maxX: 1400, speed: 80, baseHp: 30, baseAttack: 8
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
    asleep: true
  };
}

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
    return { x: x, y: boss.y + 6, w: reach, h: boss.h - 12, damage: boss.chineladaDmg };
  }
  if (boss.state === 'active-barrigada') {
    return { x: boss.x, y: boss.y, w: boss.w, h: boss.h, damage: boss.barrigadaDmg };
  }
  return null;
}

export function bossDamageMultiplier(boss) {
  return boss.state === 'preguica' ? 1.5 : 1;
}

export function hitBoss(boss, damage) {
  if (!boss.alive) return;
  boss.hp = Math.max(0, boss.hp - Math.round(damage * bossDamageMultiplier(boss)));
  if (boss.hp <= 0) {
    boss.alive = false;
    boss.defeated = true;
  }
}

// ---------- Diálogos ----------

export var introDialogue = {
  start: 'n1',
  nodes: {
    n1: { speaker: 'Narrador', text: 'Vila Rosa, Itapetininga. Em algum lugar por aqui mora o lendário Pandoval — chefão supremo da preguiça.', next: 'n2' },
    n2: {
      speaker: '{name}', text: 'Cansei de ouvir esse cara zoando todo mundo no grupo. Hoje ele vai aprender.',
      choices: [
        { label: 'Vamos com tudo!', next: null },
        { label: 'Será que eu deveria ter treinado mais?', next: null }
      ]
    }
  }
};

export var preBossDialogue = {
  start: 'p1',
  nodes: {
    p1: { speaker: 'Pandoval', text: 'Ô, {name}... intervalo do intervalo, po. Deixa eu descansar.', next: 'p2' },
    p2: {
      speaker: '{name}', text: '',
      choices: [
        { label: 'Levanta desse sofá, Pandoval!', next: 'p3' },
        { label: 'Só vim entregar um salgado...', next: 'p3' }
      ]
    },
    p3: { speaker: 'Narrador', text: 'Pandoval se levanta, resmungando, e o combate começa!', next: null }
  }
};

export var victoryDialogue = {
  start: 'v1',
  nodes: {
    v1: { speaker: 'Pandoval', text: 'Tá bom, tá bom! Eu admito, eu tava só de bobeira mesmo... Mariana que manda em casa de verdade.', next: 'v2' },
    v2: { speaker: '{name}', text: 'Sobe de novo pro sofá, Pandoval. Valeu o treino.', next: null }
  }
};
