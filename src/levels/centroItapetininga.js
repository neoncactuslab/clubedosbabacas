import { GRAVITY, MAX_FALL, moveAndCollide, aabb, clamp } from '../engine.js';
import { enemyHpForLevel, enemyAttackForLevel } from '../balance.js';
import { createGrunt } from '../enemies.js';
import { drawMiniHpBar, drawLimb, roundRect } from '../renderUtils.js';

export const VIEW_W = 960;
export const VIEW_H = 540;
export const GROUND_Y = 460;
export const DEATH_Y = 620;
export const FALL_DAMAGE = 15;

export const LEVEL_NAME = 'Centro de Itapetininga';
export const LEVEL_NUMBER = 8;

// O Rechan já tá limpo -- a fase agora é no centro da cidade, praça
// principal com coreto/banquinhas. Mesmo tamanho da fase anterior
// (LEVEL_W 4700), mas o percurso é bem mais "plano" (uma praça de verdade),
// só com duas subidinhas de coreto no meio do caminho, em vez do zigue-
// zague constante da fase 7 -- pra não parecer reaproveitado.
export const platforms = [
  { x: 0, y: GROUND_Y, w: 560, h: 80 },
  { x: 620, y: GROUND_Y, w: 520, h: 80 },
  { x: 1200, y: GROUND_Y - 30, w: 300, h: 30 },
  { x: 1560, y: GROUND_Y, w: 560, h: 80 },
  { x: 2180, y: GROUND_Y, w: 540, h: 80 },
  { x: 2780, y: GROUND_Y - 30, w: 300, h: 30 },
  { x: 3140, y: GROUND_Y, w: 560, h: 80 },
  { x: 3760, y: GROUND_Y, w: 480, h: 80 },
  // arena final bem mais ampla que uma plataforma normal -- espaço livre,
  // sem buraco no meio, pra dar espaço pro Biit fugir e pro jogador pular
  // os tiros sem risco de cair de plataforma
  { x: 4300, y: GROUND_Y, w: 900, h: 80 }
];

export const checkpoints = [0, 620, 1200, 1560, 2180, 2780, 3140, 3760, 4300];

export const LEVEL_W = 5200;
export const PLAYER_START = { x: 60, y: GROUND_Y - 200 };

export const BOSS_ARENA_X = 4300;
export const BOSS_ARENA_MIN_X = 4300;
export const BOSS_ARENA_MAX_X = 5200;

export var GRUNT_HIT_TOAST = 'Ei, vai comprar ou não?!';
export var PLATFORM_FILL = '#c9b896';
export var PLATFORM_TOP = '#7a95a8';

export function createEnemies(level) {
  return [
    createGrunt({
      name: 'Barraqueiro do Centro', x: 250, y: GROUND_Y - 42, w: 24, h: 42,
      minX: 60, maxX: 500, speed: 100, baseHp: 27, baseAttack: 9
    }, level),
    createGrunt({
      name: 'Barraqueiro do Centro', x: 820, y: GROUND_Y - 42, w: 24, h: 42,
      minX: 660, maxX: 1080, speed: 105, baseHp: 27, baseAttack: 9
    }, level),
    createGrunt({
      name: 'Barraqueiro do Centro', x: 1750, y: GROUND_Y - 42, w: 24, h: 42,
      minX: 1600, maxX: 2060, speed: 108, baseHp: 27, baseAttack: 9
    }, level),
    createGrunt({
      name: 'Barraqueiro do Centro', x: 2350, y: GROUND_Y - 42, w: 24, h: 42,
      minX: 2220, maxX: 2660, speed: 108, baseHp: 27, baseAttack: 9
    }, level),
    createGrunt({
      name: 'Barraqueiro do Centro', x: 3350, y: GROUND_Y - 42, w: 24, h: 42,
      minX: 3180, maxX: 3660, speed: 110, baseHp: 27, baseAttack: 9
    }, level),
    createGrunt({
      name: 'Barraqueiro do Centro', x: 3900, y: GROUND_Y - 42, w: 24, h: 42,
      minX: 3800, maxX: 4200, speed: 110, baseHp: 27, baseAttack: 9
    }, level)
  ];
}

var BOSS_KNOCKBACK_SPEED = 175;
var BOSS_KNOCKBACK_DURATION = 0.18;
var PROJECTILE_SPEED = 110; // devagar de proposito, pra dar pra pular por cima

// ---------- Diálogo de introdução ----------

export var introDialogue = {
  start: 'n1',
  nodes: {
    n1: { speaker: 'Narrador', text: 'De volta a Itapetininga -- o Rechan já tá praticamente limpo. Só resta a própria lei... ou o que sobrou dela. Dois policiais folgados estão de plantão na delegacia central, prontos pra abusar da farda.', next: 'n2' },
    n2: {
      speaker: '{name}', text: 'Vamos mostrar quem manda de verdade nessa cidade!',
      choices: [
        { label: 'Vamos mostrar quem manda de verdade!', next: null },
        { label: 'Farda não é desculpa pra ser babaca...', next: null }
      ]
    }
  }
};

// =====================================================================
// Boss 1: Biit -- começa corpo-a-corpo, saca a arma em 50% de vida
// =====================================================================

const BASE_HP_B = 190;
const SOCO_DMG_B = 10;
const CHUTE_DMG_B = 14;
const TIRO_DMG_B = 13;

export function createBossBiit(level) {
  return {
    name: 'Biit',
    x: 5100, y: GROUND_Y - 50, w: 32, h: 50, vx: 0, vy: 0, onGround: false,
    facing: -1,
    hp: enemyHpForLevel(BASE_HP_B, level),
    maxHp: enemyHpForLevel(BASE_HP_B, level),
    socoDmg: enemyAttackForLevel(SOCO_DMG_B, level),
    chuteDmg: enemyAttackForLevel(CHUTE_DMG_B, level),
    tiroDmg: enemyAttackForLevel(TIRO_DMG_B, level),
    state: 'approach',
    stateTimer: 0,
    actionCount: 0,
    hitDone: false,
    alive: true,
    defeated: false,
    asleep: true,
    knockbackTimer: 0,
    knockbackVx: 0,
    gunDrawn: false,
    gunTriggered: false,
    pendingDialogue: null,
    onDialogueResolved: null,
    projectiles: [],
    rajadaSecondDone: false,
    stuckTimer: 0
  };
}

var TELEGRAPH_SOCO_B = 0.28;
var ACTIVE_SOCO_B = 0.15;
var RECOVER_SOCO_B = 0.26;
var TELEGRAPH_CHUTE_B = 0.36;
var ACTIVE_CHUTE_B = 0.2;
var RECOVER_CHUTE_B = 0.32;
var VEIAS_TIME_B = 1.7;
var APPROACH_SPEED_B = 62;
var ENGAGE_RANGE_B = 44;

var TELEGRAPH_TIRO_B = 0.45;
var ACTIVE_TIRO_B = 0.18;
var RECOVER_TIRO_B = 0.5;
var TELEGRAPH_RAJADA_B = 0.5;
var ACTIVE_RAJADA_B = 0.5;
var RECOVER_RAJADA_B = 0.55;
var FLEE_SPEED_B = 66;
var KEEP_DIST_B = 150;
var STUCK_THRESHOLD_B = 0.5;
var SALTO_TIME_B = 0.5;
var SALTO_VX_B = 190;
var SALTO_VY_B = 230;

var drawGunDialogueBiit = {
  start: 'g1',
  nodes: {
    g1: { speaker: 'Narrador', text: 'Ao estar perdendo a briga, Biit saca a arma.', next: null }
  }
};

function setStateB(boss, state, duration) {
  boss.state = state;
  boss.stateTimer = duration;
  boss.hitDone = false;
}

function spawnProjectile(boss, damage) {
  var muzzleY = boss.y + boss.h * 0.5;
  var muzzleX = boss.facing > 0 ? boss.x + boss.w : boss.x;
  boss.projectiles.push({
    x: muzzleX, y: muzzleY - 5, w: 14, h: 10,
    vx: boss.facing * PROJECTILE_SPEED,
    damage: damage,
    message: 'Bang!',
    hit: false
  });
}

function stepProjectiles(boss, dt, minX, maxX) {
  for (var i = boss.projectiles.length - 1; i >= 0; i--) {
    var pr = boss.projectiles[i];
    pr.x += pr.vx * dt;
    if (pr.hit || pr.x < minX - 150 || pr.x > maxX + 150) {
      boss.projectiles.splice(i, 1);
    }
  }
}

export function stepBossBiit(boss, player, platforms, dt) {
  if (!boss.alive || boss.asleep) return;

  stepProjectiles(boss, dt, BOSS_ARENA_MIN_X, BOSS_ARENA_MAX_X);

  if (!boss.gunDrawn && !boss.gunTriggered && boss.hp <= boss.maxHp * 0.5) {
    boss.gunTriggered = true;
    boss.vx = 0;
    boss.pendingDialogue = drawGunDialogueBiit;
    boss.onDialogueResolved = function () {
      boss.gunDrawn = true;
      boss.actionCount = 0;
      setStateB(boss, 'saltando', SALTO_TIME_B);
      boss.vx = -boss.facing * SALTO_VX_B;
      boss.vy = -SALTO_VY_B;
    };
    return; // congela o Biit até o jogador fechar a caixa de diálogo
  }

  if (boss.stateTimer > 0) boss.stateTimer -= dt;
  var playerCenter = player.x + player.w / 2;
  var bossCenter = boss.x + boss.w / 2;
  boss.facing = playerCenter < bossCenter ? -1 : 1;

  if (!boss.gunDrawn) {
    switch (boss.state) {
      case 'approach': {
        var dist = Math.abs(playerCenter - bossCenter);
        if (dist > ENGAGE_RANGE_B) {
          boss.vx = boss.facing * APPROACH_SPEED_B;
        } else {
          boss.vx = 0;
          boss.actionCount += 1;
          if (boss.actionCount % 3 === 0) {
            setStateB(boss, 'veiasaltadas', VEIAS_TIME_B);
          } else if (boss.actionCount % 2 === 1) {
            setStateB(boss, 'telegraph-soco', TELEGRAPH_SOCO_B);
          } else {
            setStateB(boss, 'telegraph-chute', TELEGRAPH_CHUTE_B);
          }
        }
        break;
      }
      case 'telegraph-soco':
        boss.vx = 0;
        if (boss.stateTimer <= 0) setStateB(boss, 'active-soco', ACTIVE_SOCO_B);
        break;
      case 'active-soco':
        boss.vx = 0;
        if (boss.stateTimer <= 0) setStateB(boss, 'recover-soco', RECOVER_SOCO_B);
        break;
      case 'recover-soco':
        boss.vx = 0;
        if (boss.stateTimer <= 0) setStateB(boss, 'approach', 0);
        break;
      case 'telegraph-chute':
        boss.vx = 0;
        if (boss.stateTimer <= 0) setStateB(boss, 'active-chute', ACTIVE_CHUTE_B);
        break;
      case 'active-chute':
        boss.vx = 0;
        if (boss.stateTimer <= 0) setStateB(boss, 'recover-chute', RECOVER_CHUTE_B);
        break;
      case 'recover-chute':
        boss.vx = 0;
        if (boss.stateTimer <= 0) setStateB(boss, 'approach', 0);
        break;
      case 'veiasaltadas':
        boss.vx = 0;
        if (boss.stateTimer <= 0) setStateB(boss, 'approach', 0);
        break;
    }
  } else {
    switch (boss.state) {
      case 'saltando':
        // nao mexe no vx aqui -- deixa o impulso do salto pra tras rolar,
        // a gravidade (aplicada mais embaixo) cuida da parte vertical
        if (boss.stateTimer <= 0) setStateB(boss, 'afastando', 0);
        break;
      case 'afastando': {
        var distR = Math.abs(playerCenter - bossCenter);
        var cantFleeB = distR < KEEP_DIST_B;
        if (cantFleeB) {
          boss.vx = -boss.facing * FLEE_SPEED_B;
          boss.stuckTimer += dt;
        } else {
          boss.stuckTimer = 0;
        }
        // se o jogador gruda nele (corpo a corpo) e não deixa distância
        // sobrar, ele desiste de fugir depois de um tempinho e atira
        // mesmo à queima-roupa -- sem essa válvula de escape ele fica
        // preso pra sempre tentando fugir e nunca revida
        if (!cantFleeB || boss.stuckTimer > STUCK_THRESHOLD_B) {
          boss.vx = 0;
          boss.stuckTimer = 0;
          boss.actionCount += 1;
          if (boss.actionCount % 3 === 0) {
            setStateB(boss, 'veiasaltadas', VEIAS_TIME_B);
          } else if (boss.actionCount % 2 === 1) {
            setStateB(boss, 'telegraph-tiro', TELEGRAPH_TIRO_B);
          } else {
            boss.rajadaSecondDone = false;
            setStateB(boss, 'telegraph-rajada', TELEGRAPH_RAJADA_B);
          }
        }
        break;
      }
      case 'telegraph-tiro':
        boss.vx = 0;
        if (boss.stateTimer <= 0) setStateB(boss, 'active-tiro', ACTIVE_TIRO_B);
        break;
      case 'active-tiro':
        boss.vx = 0;
        if (!boss.hitDone) { spawnProjectile(boss, boss.tiroDmg); boss.hitDone = true; }
        if (boss.stateTimer <= 0) setStateB(boss, 'recover-tiro', RECOVER_TIRO_B);
        break;
      case 'recover-tiro':
        boss.vx = 0;
        if (boss.stateTimer <= 0) setStateB(boss, 'afastando', 0);
        break;
      case 'telegraph-rajada':
        boss.vx = 0;
        if (boss.stateTimer <= 0) setStateB(boss, 'active-rajada', ACTIVE_RAJADA_B);
        break;
      case 'active-rajada':
        boss.vx = 0;
        if (!boss.hitDone) { spawnProjectile(boss, boss.tiroDmg); boss.hitDone = true; }
        if (!boss.rajadaSecondDone && boss.stateTimer <= ACTIVE_RAJADA_B / 2) {
          spawnProjectile(boss, boss.tiroDmg);
          boss.rajadaSecondDone = true;
        }
        if (boss.stateTimer <= 0) setStateB(boss, 'recover-rajada', RECOVER_RAJADA_B);
        break;
      case 'recover-rajada':
        boss.vx = 0;
        if (boss.stateTimer <= 0) setStateB(boss, 'afastando', 0);
        break;
      case 'veiasaltadas':
        boss.vx = 0;
        if (boss.stateTimer <= 0) setStateB(boss, 'afastando', 0);
        break;
    }
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

export function bossAttackHitboxBiit(boss) {
  if (boss.gunDrawn) return null;
  if (boss.state === 'active-soco') {
    var reach = 24;
    var x = boss.facing > 0 ? boss.x + boss.w : boss.x - reach;
    return { x: x, y: boss.y + 6, w: reach, h: boss.h - 12, damage: boss.socoDmg, message: 'Soco de academia!' };
  }
  if (boss.state === 'active-chute') {
    var reachC = 30;
    var xc = boss.facing > 0 ? boss.x + boss.w : boss.x - reachC;
    return { x: xc, y: boss.y + boss.h * 0.4, w: reachC, h: boss.h * 0.5, damage: boss.chuteDmg, message: 'Chute! SUA IRMÃ!' };
  }
  return null;
}

export function bossProjectileHitboxesBiit(boss) {
  return boss.projectiles;
}

export function bossDamageMultiplierBiit(boss) {
  return boss.state === 'veiasaltadas' ? 1.5 : 1;
}

export function hitBossBiit(boss, damage, knockbackDir) {
  if (!boss.alive) return;
  boss.hp = Math.max(0, boss.hp - Math.round(damage * bossDamageMultiplierBiit(boss)));
  if (boss.hp <= 0) {
    boss.alive = false;
    boss.defeated = true;
    return;
  }
  if (knockbackDir && !boss.gunDrawn) {
    boss.knockbackVx = knockbackDir * BOSS_KNOCKBACK_SPEED;
    boss.knockbackTimer = BOSS_KNOCKBACK_DURATION;
  }
}

export var preBossDialogue = {
  start: 'p1',
  nodes: {
    p1: { speaker: '{name}', text: 'Chega de ficar postando foto no espelho da academia, bora pra porrada!', next: 'p2' },
    p2: { speaker: 'Biit', text: 'SUA IRMÃ! Vem então seu bosta.', next: null }
  }
};

// Depois que o Biit cai, ele pede reforço -- gatilho pro game.js chamar
// createBoss2 com o Luquinha.
export var victoryDialogue = {
  start: 'v1',
  nodes: {
    v1: { speaker: 'Biit', text: 'Copom, solicito reforços...', next: null }
  }
};

// ---------- Desenho: Biit ----------

export function drawBossBiit(ctx, b) {
  if (!b.alive) return;
  var flexing = b.state === 'veiasaltadas';
  var cx = b.x + b.w / 2;
  var baseY = b.y + b.h;

  var skin = '#e8c9a8';
  var uniform = '#2a3a5a';
  var pants = '#1c2438';
  var hair = '#100d0a';

  var walking = (b.state === 'approach' || b.state === 'afastando') && Math.abs(b.vx) > 5;
  var strideB = walking ? Math.sin(b.x * 0.16) * 6 : 0;

  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(b.facing, 1);

  // pernas curtas (estatura baixa)
  drawLimb(ctx, -9, -26, -10 + strideB, -2, 8, pants, '#0d0a0b');
  drawLimb(ctx, 8, -26, 9 - strideB, -2, 8, pants, '#0d0a0b');

  // bracos musculosos
  var punch = 0;
  if (b.state === 'telegraph-soco') punch = 6;
  if (b.state === 'active-soco') punch = 22;
  if (flexing) {
    // pose de flexao (biceps em destaque)
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(-16, -38, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(16, -38, 7, 0, Math.PI * 2); ctx.fill();
    drawLimb(ctx, -10, -46, -18, -30, 7, skin, null);
    drawLimb(ctx, 10, -46, 18, -30, 7, skin, null);
  } else {
    drawLimb(ctx, -10, -46, -14 + strideB * 0.4, -28, 7, skin, null);
    drawLimb(ctx, 10, -46, 12 + punch, -38, 7, skin, null);
  }

  // tronco (farda apertada nos musculos)
  ctx.fillStyle = uniform;
  roundRect(ctx, -11, -50, 22, 26, 6);
  ctx.fill();
  ctx.fillStyle = '#d9c458';
  ctx.beginPath(); ctx.arc(-5, -42, 2.4, 0, Math.PI * 2); ctx.fill();

  // cabeca
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, -56, 9, 0, Math.PI * 2); ctx.fill();

  // cabelo raspado
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.arc(0, -60, 9, Math.PI * 0.9, Math.PI * 2.1); ctx.fill();

  // arma na mao quando sacada
  if (b.gunDrawn) {
    ctx.fillStyle = '#2a2320';
    ctx.fillRect(10, -42, 12, 4);
    ctx.fillRect(19, -42, 3, 7);
  }

  ctx.restore();

  // projeteis (balas lentas, dá pra pular)
  for (var i = 0; i < b.projectiles.length; i++) {
    var pr = b.projectiles[i];
    ctx.fillStyle = '#f2d35d';
    ctx.beginPath(); ctx.ellipse(pr.x + pr.w / 2, pr.y + pr.h / 2, pr.w / 2, pr.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,120,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pr.x + pr.w / 2 - pr.vx * 0.04, pr.y + pr.h / 2);
    ctx.lineTo(pr.x + pr.w / 2, pr.y + pr.h / 2);
    ctx.stroke();
  }

  if (b.state.indexOf('active') === 0 && !b.gunDrawn) {
    ctx.strokeStyle = 'rgba(255,93,115,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + b.facing * 26, baseY - 36, 11, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (flexing) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '16px sans-serif';
    ctx.fillText('💪', cx - 8, baseY - 74);
  }

  drawMiniHpBar(ctx, b.x - 3, b.y - 28, b.w + 6, b.hp / b.maxHp, '#ff5d73');
}

// aliases genéricos exigidos pelo padrão de boss único (createBoss/stepBoss/
// etc.) -- o Biit é o boss "principal" da fase, o Luquinha é o createBoss2
export var createBoss = createBossBiit;
export var stepBoss = stepBossBiit;
export var bossAttackHitbox = bossAttackHitboxBiit;
export var bossProjectileHitboxes = bossProjectileHitboxesBiit;
export var bossDamageMultiplier = bossDamageMultiplierBiit;
export var hitBoss = hitBossBiit;
export var drawBoss = drawBossBiit;

// =====================================================================
// Boss 2: Luquinha -- atira desde o começo, chega depois do Biit
// =====================================================================

const BASE_HP_L = 210;
const TIRO_DMG_L = 15;

export function createBossLuquinha(level) {
  return {
    name: 'Luquinha',
    x: 4600, y: GROUND_Y - 64, w: 28, h: 64, vx: 0, vy: 0, onGround: false,
    facing: -1,
    hp: enemyHpForLevel(BASE_HP_L, level),
    maxHp: enemyHpForLevel(BASE_HP_L, level),
    tiroDmg: enemyAttackForLevel(TIRO_DMG_L, level),
    state: 'afastando',
    stateTimer: 0,
    actionCount: 0,
    hitDone: false,
    alive: true,
    defeated: false,
    asleep: true,
    knockbackTimer: 0,
    knockbackVx: 0,
    projectiles: [],
    rajadaSecondDone: false,
    stuckTimer: 0
  };
}

var TELEGRAPH_TIRO_L = 0.4;
var ACTIVE_TIRO_L = 0.16;
var RECOVER_TIRO_L = 0.46;
var TELEGRAPH_RAJADA_L = 0.46;
var ACTIVE_RAJADA_L = 0.46;
var RECOVER_RAJADA_L = 0.5;
var VEIAS_TIME_L = 1.5;
var FLEE_SPEED_L = 72;
var KEEP_DIST_L = 160;
var STUCK_THRESHOLD_L = 0.5;

function setStateL(boss, state, duration) {
  boss.state = state;
  boss.stateTimer = duration;
  boss.hitDone = false;
}

export function stepBossLuquinha(boss, player, platforms, dt) {
  if (!boss.alive || boss.asleep) return;

  stepProjectiles(boss, dt, BOSS_ARENA_MIN_X, BOSS_ARENA_MAX_X);

  if (boss.stateTimer > 0) boss.stateTimer -= dt;
  var playerCenter = player.x + player.w / 2;
  var bossCenter = boss.x + boss.w / 2;
  boss.facing = playerCenter < bossCenter ? -1 : 1;

  switch (boss.state) {
    case 'afastando': {
      var dist = Math.abs(playerCenter - bossCenter);
      var cantFleeL = dist < KEEP_DIST_L;
      if (cantFleeL) {
        boss.vx = -boss.facing * FLEE_SPEED_L;
        boss.stuckTimer += dt;
      } else {
        boss.stuckTimer = 0;
      }
      // mesma válvula de escape do Biit -- se o jogador não deixar
      // distância sobrar, ele para de tentar fugir e atira mesmo colado
      if (!cantFleeL || boss.stuckTimer > STUCK_THRESHOLD_L) {
        boss.vx = 0;
        boss.stuckTimer = 0;
        boss.actionCount += 1;
        if (boss.actionCount % 3 === 0) {
          setStateL(boss, 'tremendo', VEIAS_TIME_L);
        } else if (boss.actionCount % 2 === 1) {
          setStateL(boss, 'telegraph-tiro', TELEGRAPH_TIRO_L);
        } else {
          boss.rajadaSecondDone = false;
          setStateL(boss, 'telegraph-rajada', TELEGRAPH_RAJADA_L);
        }
      }
      break;
    }
    case 'telegraph-tiro':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateL(boss, 'active-tiro', ACTIVE_TIRO_L);
      break;
    case 'active-tiro':
      boss.vx = 0;
      if (!boss.hitDone) { spawnProjectile(boss, boss.tiroDmg); boss.hitDone = true; }
      if (boss.stateTimer <= 0) setStateL(boss, 'recover-tiro', RECOVER_TIRO_L);
      break;
    case 'recover-tiro':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateL(boss, 'afastando', 0);
      break;
    case 'telegraph-rajada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateL(boss, 'active-rajada', ACTIVE_RAJADA_L);
      break;
    case 'active-rajada':
      boss.vx = 0;
      if (!boss.hitDone) { spawnProjectile(boss, boss.tiroDmg); boss.hitDone = true; }
      if (!boss.rajadaSecondDone && boss.stateTimer <= ACTIVE_RAJADA_L / 2) {
        spawnProjectile(boss, boss.tiroDmg);
        boss.rajadaSecondDone = true;
      }
      if (boss.stateTimer <= 0) setStateL(boss, 'recover-rajada', RECOVER_RAJADA_L);
      break;
    case 'recover-rajada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateL(boss, 'afastando', 0);
      break;
    case 'tremendo':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setStateL(boss, 'afastando', 0);
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

export function bossAttackHitbox2() {
  return null;
}

export function bossProjectileHitboxes2(boss) {
  return boss.projectiles;
}

export function bossDamageMultiplier2(boss) {
  return boss.state === 'tremendo' ? 1.5 : 1;
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
    h1: { speaker: 'Luquinha', text: 'Calma Joe, cheguei!', next: null }
  }
};

// alias exigido pelo padrão sequencial (createBoss2/stepBoss2/etc.)
export var createBoss2 = createBossLuquinha;
export var stepBoss2 = stepBossLuquinha;

// ---------- Desenho: Luquinha ----------

export function drawBoss2(ctx, b) {
  if (!b.alive) return;
  var trembling = b.state === 'tremendo';
  var cx = b.x + b.w / 2;
  var baseY = b.y + b.h;

  var skin = '#e8c9a8';
  var uniform = '#2a3a5a';
  var pants = '#1c2438';
  var hair = '#3a2e22';

  var walking = Math.abs(b.vx) > 5;
  var strideB = walking ? Math.sin(b.x * 0.14) * 7 : 0;
  var shake = trembling ? Math.sin(b.stateTimer * 24) * 2.4 : 0;

  ctx.save();
  ctx.translate(cx + shake, baseY);
  ctx.scale(b.facing, 1);

  // pernas compridas e finas (magro, mais alto que o Biit)
  drawLimb(ctx, -8, -34, -9 + strideB, -2, 6, pants, '#0d0a0b');
  drawLimb(ctx, 7, -34, 8 - strideB, -2, 6, pants, '#0d0a0b');

  // bracos finos
  drawLimb(ctx, -8, -60, -13 + strideB * 0.4, -40, 5.5, skin, null);
  drawLimb(ctx, 8, -60, 13, -46, 5.5, skin, null);

  // tronco magro (farda)
  ctx.fillStyle = uniform;
  roundRect(ctx, -8, -64, 16, 28, 5);
  ctx.fill();
  ctx.fillStyle = '#d9c458';
  ctx.beginPath(); ctx.arc(-3, -56, 2, 0, Math.PI * 2); ctx.fill();

  // cabeca
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, -70, 8, 0, Math.PI * 2); ctx.fill();

  // cabelo
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.arc(0, -74, 8, Math.PI * 0.9, Math.PI * 2.1); ctx.fill();

  // arma sempre na mao
  ctx.fillStyle = '#2a2320';
  ctx.fillRect(9, -48, 11, 3.6);
  ctx.fillRect(17, -48, 2.6, 6);

  ctx.restore();

  // projeteis
  for (var i = 0; i < b.projectiles.length; i++) {
    var pr = b.projectiles[i];
    ctx.fillStyle = '#f2d35d';
    ctx.beginPath(); ctx.ellipse(pr.x + pr.w / 2, pr.y + pr.h / 2, pr.w / 2, pr.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,120,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pr.x + pr.w / 2 - pr.vx * 0.04, pr.y + pr.h / 2);
    ctx.lineTo(pr.x + pr.w / 2, pr.y + pr.h / 2);
    ctx.stroke();
  }

  if (trembling) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '16px sans-serif';
    ctx.fillText('😬', cx - 8, baseY - 88);
  }

  drawMiniHpBar(ctx, b.x - 4, b.y - 30, b.w + 8, b.hp / b.maxHp, '#ff5d73');
}

// ---------- Cenário: praça central de Itapetininga ----------

export function renderBackground(ctx, camX, VIEW_W, VIEW_H) {
  var sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, '#6fb8e8');
  sky.addColorStop(0.6, '#bfe0e8');
  sky.addColorStop(1, '#e8dcb8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  drawTownStrip(ctx, camX, 0.3, VIEW_H - 60, '#e0d0a8', '#b8785a', 33, 11);
  drawClockTower(ctx, camX);
  drawKioskLayer(ctx, camX);
}

function drawTownStrip(ctx, camX, camFactor, baseY, wallColor, roofColor, seed, count) {
  var spacing = (LEVEL_W + 500) / count;
  for (var i = -1; i < count; i++) {
    var hx = i * spacing - (camX * camFactor) % spacing - 100;
    var hseed = Math.abs(Math.sin(seed + i * 12.9898)) % 1;
    var w = 130 + hseed * 60;
    var h = 90 + hseed * 60;
    ctx.fillStyle = wallColor;
    ctx.fillRect(hx, baseY - h, w, h);
    ctx.fillStyle = roofColor;
    ctx.fillRect(hx - 6, baseY - h - 10, w + 12, 12);
    ctx.fillStyle = 'rgba(120,150,170,0.55)';
    var cols = Math.max(1, Math.floor(w / 30));
    var rows = Math.max(1, Math.floor(h / 32));
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (Math.abs(Math.sin(seed + i * 7 + r * 3 + c)) > 0.6) {
          ctx.fillRect(hx + 7 + c * 28, baseY - h + 9 + r * 30, 12, 14);
        }
      }
    }
  }
}

function drawClockTower(ctx, camX) {
  var towerX = VIEW_W * 0.5 - camX * 0.15;
  var baseY = VIEW_H - 60;
  var x = ((towerX % (VIEW_W + 400)) + VIEW_W + 400) % (VIEW_W + 400) - 200;
  ctx.fillStyle = 'rgba(200,190,170,0.7)';
  ctx.fillRect(x - 14, baseY - 160, 28, 160);
  ctx.beginPath();
  ctx.moveTo(x - 18, baseY - 160);
  ctx.lineTo(x, baseY - 190);
  ctx.lineTo(x + 18, baseY - 160);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(240,235,220,0.9)';
  ctx.beginPath(); ctx.arc(x, baseY - 130, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#5a4a3a';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x, baseY - 130); ctx.lineTo(x, baseY - 136); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, baseY - 130); ctx.lineTo(x + 5, baseY - 129); ctx.stroke();
}

function drawKioskLayer(ctx, camX) {
  var spacing = 260;
  var offset = (camX * 0.8) % spacing;
  var baseY = VIEW_H - 4;
  for (var x = -offset - spacing; x < VIEW_W + spacing; x += spacing) {
    ctx.fillStyle = 'rgba(180,90,80,0.4)';
    ctx.fillRect(x, baseY - 30, 46, 30);
    ctx.fillStyle = 'rgba(220,150,90,0.5)';
    ctx.beginPath();
    ctx.moveTo(x - 6, baseY - 30);
    ctx.lineTo(x + 23, baseY - 46);
    ctx.lineTo(x + 52, baseY - 30);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawPlatform(ctx, pl) {
  ctx.fillStyle = PLATFORM_FILL;
  ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
  ctx.fillStyle = PLATFORM_TOP;
  ctx.fillRect(pl.x, pl.y, pl.w, 6);
}

// ---------- Desenho: Barraqueiro do Centro ----------

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
  ctx.strokeStyle = '#c9986b';
  ctx.lineWidth = 4.5;
  ctx.beginPath(); ctx.moveTo(7, -32); ctx.lineTo(12, -22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-7, -32); ctx.lineTo(-11, -22); ctx.stroke();

  // avental de barraqueiro
  ctx.fillStyle = '#3a6b4a';
  roundRect(ctx, -8, -38, 16, 22, 3);
  ctx.fill();
  ctx.fillStyle = '#d9c458';
  ctx.fillRect(-8, -30, 16, 3);

  // cabeca
  ctx.fillStyle = '#c9986b';
  ctx.beginPath(); ctx.arc(0, -42, 7, 0, Math.PI * 2); ctx.fill();

  // bone
  ctx.fillStyle = '#2a2e38';
  ctx.beginPath(); ctx.arc(0, -46, 7.4, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillRect(-7, -48, 5, 3);

  ctx.restore();

  drawMiniHpBar(ctx, g.x - 2, g.y - 20, g.w + 4, g.hp / g.maxHp, '#ff5d73');
}
