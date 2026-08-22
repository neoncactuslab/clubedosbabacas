// IA genérica para inimigos comuns (não-boss): patrulha entre minX/maxX e
// causa dano por contato, respeitando um intervalo entre golpes.
import { moveAndCollide, aabb, GRAVITY, MAX_FALL } from './engine.js';
import { enemyHpForLevel, enemyAttackForLevel } from './balance.js';

export var KNOCKBACK_SPEED = 260;
export var KNOCKBACK_DURATION = 0.22;

export function createGrunt(def, level) {
  return {
    kind: 'grunt',
    name: def.name,
    x: def.x, y: def.y, w: def.w, h: def.h,
    vx: def.speed, vy: 0, onGround: false,
    minX: def.minX, maxX: def.maxX, speed: def.speed,
    hp: enemyHpForLevel(def.baseHp, level),
    maxHp: enemyHpForLevel(def.baseHp, level),
    attack: enemyAttackForLevel(def.baseAttack, level),
    hitCooldown: 0,
    knockbackTimer: 0,
    alive: true
  };
}

export function stepGrunt(g, platforms, dt) {
  if (!g.alive) return;

  if (g.knockbackTimer > 0) {
    g.knockbackTimer -= dt;
    if (g.knockbackTimer <= 0) {
      // acabou o empurrão: retoma a patrulha na direção em que estava indo
      g.vx = g.vx >= 0 ? g.speed : -g.speed;
    }
  }

  g.x += g.vx * dt;
  if (g.x < g.minX) { g.x = g.minX; g.vx = g.speed; }
  if (g.x + g.w > g.maxX) { g.x = g.maxX - g.w; g.vx = -g.speed; }

  g.vy += GRAVITY * dt;
  if (g.vy > MAX_FALL) g.vy = MAX_FALL;
  moveAndCollide(g, platforms, 0, g.vy * dt);

  if (g.hitCooldown > 0) g.hitCooldown -= dt;
}

export function hitGrunt(g, damage, knockbackDir) {
  if (!g.alive) return;
  g.hp = Math.max(0, g.hp - damage);
  if (g.hp <= 0) {
    g.alive = false;
    return;
  }
  if (knockbackDir) {
    g.vx = knockbackDir * KNOCKBACK_SPEED;
    g.knockbackTimer = KNOCKBACK_DURATION;
  }
}
