import { GRAVITY, MAX_FALL, moveAndCollide, aabb } from './engine.js';
import { playerMaxHpForLevel, playerAttackForLevel } from './balance.js';

export const MOVE_ACCEL = 2400;
export const MOVE_MAX = 220;
export const FRICTION = 2000;
export const JUMP_VEL = -650;

export const ATTACK_DURATION = 0.22;
export const ATTACK_ACTIVE_WINDOW = [0.04, 0.14]; // hitbox ativo entre esses tempos do swing
export const ATTACK_COOLDOWN = 0.32;
export const ATTACK_REACH = 30;
export const INVULN_TIME = 0.8;

export function createPlayer(name, startX, startY) {
  const level = 1;
  return {
    name: name || 'Herói',
    level,
    maxHp: playerMaxHpForLevel(level),
    hp: playerMaxHpForLevel(level),
    attack: playerAttackForLevel(level),
    x: startX, y: startY, vx: 0, vy: 0, w: 30, h: 44,
    onGround: false, facing: 1,
    attackTimer: 0, attackCooldown: 0, attackHitDone: false,
    invuln: 0,
    dead: false
  };
}

export function levelUp(player) {
  player.level += 1;
  player.maxHp = playerMaxHpForLevel(player.level);
  player.hp = player.maxHp;
  player.attack = playerAttackForLevel(player.level);
}

export function damagePlayer(player, amount) {
  if (player.invuln > 0 || player.dead) return false;
  player.hp = Math.max(0, player.hp - amount);
  player.invuln = INVULN_TIME;
  if (player.hp <= 0) player.dead = true;
  return true;
}

export function playerAttackHitbox(player) {
  const inWindow = player.attackTimer > 0 &&
    (ATTACK_DURATION - player.attackTimer) >= ATTACK_ACTIVE_WINDOW[0] &&
    (ATTACK_DURATION - player.attackTimer) <= ATTACK_ACTIVE_WINDOW[1];
  if (!inWindow) return null;
  const x = player.facing > 0 ? player.x + player.w : player.x - ATTACK_REACH;
  return { x, y: player.y + 4, w: ATTACK_REACH, h: player.h - 8 };
}

export function stepPlayer(player, input, platforms, dt) {
  if (player.dead) return;

  let accel = 0;
  if (input.left) { accel -= MOVE_ACCEL; player.facing = -1; }
  if (input.right) { accel += MOVE_ACCEL; player.facing = 1; }

  player.vx += accel * dt;
  if (accel === 0) {
    const sign = player.vx > 0 ? 1 : -1;
    player.vx -= sign * Math.min(Math.abs(player.vx), FRICTION * dt);
  }
  player.vx = Math.max(-MOVE_MAX, Math.min(MOVE_MAX, player.vx));

  if (input.jump && player.onGround) {
    player.vy = JUMP_VEL;
    player.onGround = false;
  }

  player.vy += GRAVITY * dt;
  if (player.vy > MAX_FALL) player.vy = MAX_FALL;

  if (input.attack && player.attackCooldown <= 0) {
    player.attackTimer = ATTACK_DURATION;
    player.attackCooldown = ATTACK_COOLDOWN;
    player.attackHitDone = false;
  }
  if (player.attackTimer > 0) player.attackTimer -= dt;
  if (player.attackCooldown > 0) player.attackCooldown -= dt;
  if (player.invuln > 0) player.invuln -= dt;

  moveAndCollide(player, platforms, player.vx * dt, player.vy * dt);
}
