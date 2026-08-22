// Motor genérico: física, colisão e câmera. Reutilizado por todas as fases.

export const GRAVITY = 2000;
export const MAX_FALL = 900;

export function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// Move um ator contra uma lista de plataformas sólidas, eixo por eixo
// (evita atravessar quinas ao colidir na diagonal).
export function moveAndCollide(entity, platforms, dx, dy) {
  entity.x += dx;
  for (let i = 0; i < platforms.length; i++) {
    const p = platforms[i];
    if (aabb(entity.x, entity.y, entity.w, entity.h, p.x, p.y, p.w, p.h)) {
      if (dx > 0) entity.x = p.x - entity.w;
      else if (dx < 0) entity.x = p.x + p.w;
      entity.vx = 0;
    }
  }

  entity.onGround = false;
  entity.y += dy;
  for (let j = 0; j < platforms.length; j++) {
    const p = platforms[j];
    if (aabb(entity.x, entity.y, entity.w, entity.h, p.x, p.y, p.w, p.h)) {
      if (dy > 0) {
        entity.y = p.y - entity.h;
        entity.vy = 0;
        entity.onGround = true;
      } else if (dy < 0) {
        entity.y = p.y + p.h;
        entity.vy = 0;
      }
    }
  }
}

export function computeCamera(targetX, viewW, levelW) {
  return Math.max(0, Math.min(Math.max(0, levelW - viewW), targetX - viewW / 2));
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
