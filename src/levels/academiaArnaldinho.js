import { GRAVITY, MAX_FALL, moveAndCollide, aabb, clamp } from '../engine.js';
import { enemyHpForLevel, enemyAttackForLevel } from '../balance.js';
import { createGrunt } from '../enemies.js';
import { drawMiniHpBar, drawLimb, roundRect } from '../renderUtils.js';

export const VIEW_W = 960;
export const VIEW_H = 540;
export const GROUND_Y = 460;
export const DEATH_Y = 620;
export const FALL_DAMAGE = 15;

export const LEVEL_NAME = 'Academia do Arnaldinho';
export const LEVEL_NUMBER = 9;

// A FASE FINAL. Ainda em Itapetininga, mas agora é o caminho até a academia
// onde tudo começou -- a mais longa e mais cheia de inimigos do jogo até
// aqui, de propósito, pra desgastar o jogador antes do chefão final.
export const platforms = [
  { x: 0, y: GROUND_Y, w: 480, h: 80 },
  { x: 540, y: GROUND_Y, w: 460, h: 80 },
  { x: 1060, y: GROUND_Y, w: 460, h: 80 },
  { x: 1580, y: GROUND_Y - 30, w: 200, h: 30 },
  { x: 1840, y: GROUND_Y - 60, w: 200, h: 30 },
  { x: 2100, y: GROUND_Y - 30, w: 460, h: 30 },
  { x: 2620, y: GROUND_Y, w: 480, h: 80 },
  { x: 3160, y: GROUND_Y, w: 460, h: 80 },
  { x: 3680, y: GROUND_Y - 30, w: 200, h: 30 },
  { x: 3940, y: GROUND_Y - 60, w: 200, h: 30 },
  { x: 4200, y: GROUND_Y - 30, w: 460, h: 30 },
  { x: 4720, y: GROUND_Y, w: 480, h: 80 },
  { x: 5260, y: GROUND_Y, w: 460, h: 80 },
  // arena final ampla e livre de obstáculo -- lição aprendida da fase 8
  { x: 5780, y: GROUND_Y, w: 900, h: 80 }
];

export const checkpoints = [0, 540, 1060, 1580, 1840, 2100, 2620, 3160, 3680, 3940, 4200, 4720, 5260, 5780];

export const LEVEL_W = 6680;
export const PLAYER_START = { x: 60, y: GROUND_Y - 200 };

export const BOSS_ARENA_X = 5780;
export const BOSS_ARENA_MIN_X = 5780;
export const BOSS_ARENA_MAX_X = 6680;

export var GRUNT_HIT_TOAST = 'Osu!';
export var PLATFORM_FILL = '#8a7a5a';
export var PLATFORM_TOP = '#c1a458';

export function createEnemies(level) {
  return [
    createGrunt({ name: 'Capanga do Arnaldinho', x: 200, y: GROUND_Y - 44, w: 24, h: 44, minX: 60, maxX: 420, speed: 105, baseHp: 30, baseAttack: 10 }, level),
    createGrunt({ name: 'Capanga do Arnaldinho', x: 750, y: GROUND_Y - 44, w: 24, h: 44, minX: 580, maxX: 960, speed: 108, baseHp: 30, baseAttack: 10 }, level),
    createGrunt({ name: 'Capanga do Arnaldinho', x: 1150, y: GROUND_Y - 44, w: 24, h: 44, minX: 1100, maxX: 1280, speed: 110, baseHp: 30, baseAttack: 10 }, level),
    createGrunt({ name: 'Capanga do Arnaldinho', x: 1350, y: GROUND_Y - 44, w: 24, h: 44, minX: 1320, maxX: 1480, speed: 110, baseHp: 30, baseAttack: 10 }, level),
    createGrunt({ name: 'Capanga do Arnaldinho', x: 2200, y: GROUND_Y - 30 - 44, w: 24, h: 44, minX: 2130, maxX: 2520, speed: 112, baseHp: 30, baseAttack: 10 }, level),
    createGrunt({ name: 'Capanga do Arnaldinho', x: 2800, y: GROUND_Y - 44, w: 24, h: 44, minX: 2660, maxX: 3060, speed: 110, baseHp: 30, baseAttack: 10 }, level),
    createGrunt({ name: 'Capanga do Arnaldinho', x: 3250, y: GROUND_Y - 44, w: 24, h: 44, minX: 3200, maxX: 3380, speed: 112, baseHp: 30, baseAttack: 10 }, level),
    createGrunt({ name: 'Capanga do Arnaldinho', x: 3480, y: GROUND_Y - 44, w: 24, h: 44, minX: 3400, maxX: 3580, speed: 112, baseHp: 30, baseAttack: 10 }, level),
    createGrunt({ name: 'Capanga do Arnaldinho', x: 4350, y: GROUND_Y - 30 - 44, w: 24, h: 44, minX: 4230, maxX: 4620, speed: 112, baseHp: 30, baseAttack: 10 }, level),
    createGrunt({ name: 'Capanga do Arnaldinho', x: 4900, y: GROUND_Y - 44, w: 24, h: 44, minX: 4760, maxX: 5160, speed: 112, baseHp: 30, baseAttack: 10 }, level),
    createGrunt({ name: 'Capanga do Arnaldinho', x: 5450, y: GROUND_Y - 44, w: 24, h: 44, minX: 5300, maxX: 5680, speed: 114, baseHp: 30, baseAttack: 10 }, level)
  ];
}

// ---------- Diálogo de introdução ----------

export var introDialogue = {
  start: 'n1',
  nodes: {
    n1: { speaker: 'Narrador', text: 'Ainda em Itapetininga, mas agora no coração do templo onde tudo começou: a academia do lendário Arnaldinho, faixa preta e 15 vezes campeão. Ele foi quem ensinou -- direta ou indiretamente -- cada babaca que esse grupo já enfrentou.', next: 'n2' },
    n2: {
      speaker: '{name}', text: 'Chegou a hora de acabar com o rei dos babacas!',
      choices: [
        { label: 'Chegou a hora de acabar com o rei dos babacas!', next: null },
        { label: 'Vamos ver se a faixa preta segura a porrada...', next: null }
      ]
    }
  }
};

// =====================================================================
// Boss final: Arnaldinho -- o rei dos babacas
// =====================================================================

const BASE_HP = 380;
const COTOVELADA_DMG = 18;
const RASPAGEM_DMG = 24;
const MATALEAO_DMG = 30;

export function createBoss(level) {
  return {
    name: 'Arnaldinho',
    x: 6500, y: GROUND_Y - 78, w: 42, h: 78, vx: 0, vy: 0, onGround: false,
    facing: -1,
    hp: enemyHpForLevel(BASE_HP, level),
    maxHp: enemyHpForLevel(BASE_HP, level),
    cotoveladaDmg: enemyAttackForLevel(COTOVELADA_DMG, level),
    raspagemDmg: enemyAttackForLevel(RASPAGEM_DMG, level),
    mataleaoDmg: enemyAttackForLevel(MATALEAO_DMG, level),
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

var BOSS_KNOCKBACK_SPEED = 170;
var BOSS_KNOCKBACK_DURATION = 0.16;

var TELEGRAPH_COTOVELADA = 0.26;
var ACTIVE_COTOVELADA = 0.14;
var RECOVER_COTOVELADA = 0.24;
var TELEGRAPH_RASPAGEM = 0.34;
var ACTIVE_RASPAGEM = 0.26;
var RECOVER_RASPAGEM = 0.32;
var RASPAGEM_SPEED = 270;
var TELEGRAPH_MATALEAO = 0.5;
var ACTIVE_MATALEAO = 0.3;
var RECOVER_MATALEAO = 0.5;
var AJEITANDOFAIXA_TIME = 1.6;
var APPROACH_SPEED = 68;
var ENGAGE_RANGE = 52; // dentro do alcance real da cotovelada (~52 do centro)

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
        if (boss.actionCount % 4 === 0) {
          setState(boss, 'ajeitandofaixa', AJEITANDOFAIXA_TIME);
        } else {
          var pick = boss.actionCount % 3;
          if (pick === 1) setState(boss, 'telegraph-cotovelada', TELEGRAPH_COTOVELADA);
          else if (pick === 2) setState(boss, 'telegraph-raspagem', TELEGRAPH_RASPAGEM);
          else setState(boss, 'telegraph-mataleao', TELEGRAPH_MATALEAO);
        }
      }
      break;
    }
    case 'telegraph-cotovelada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'active-cotovelada', ACTIVE_COTOVELADA);
      break;
    case 'active-cotovelada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'recover-cotovelada', RECOVER_COTOVELADA);
      break;
    case 'recover-cotovelada':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'approach', 0);
      break;
    case 'telegraph-raspagem':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'active-raspagem', ACTIVE_RASPAGEM);
      break;
    case 'active-raspagem':
      boss.vx = boss.facing * RASPAGEM_SPEED;
      if (boss.stateTimer <= 0) setState(boss, 'recover-raspagem', RECOVER_RASPAGEM);
      break;
    case 'recover-raspagem':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'approach', 0);
      break;
    case 'telegraph-mataleao':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'active-mataleao', ACTIVE_MATALEAO);
      break;
    case 'active-mataleao':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'recover-mataleao', RECOVER_MATALEAO);
      break;
    case 'recover-mataleao':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'approach', 0);
      break;
    case 'ajeitandofaixa':
      boss.vx = 0;
      if (boss.stateTimer <= 0) setState(boss, 'approach', 0);
      break;
  }

  if (boss.knockbackTimer > 0 && boss.state !== 'active-raspagem') {
    boss.vx = boss.knockbackVx;
    boss.knockbackTimer -= dt;
  }

  boss.vy += GRAVITY * dt;
  if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;
  moveAndCollide(boss, platforms, boss.vx * dt, boss.vy * dt);
  boss.x = clamp(boss.x, BOSS_ARENA_MIN_X, BOSS_ARENA_MAX_X - boss.w);
}

export function bossAttackHitbox(boss) {
  if (boss.state === 'active-cotovelada') {
    var reach = 32;
    var x = boss.facing > 0 ? boss.x + boss.w : boss.x - reach;
    return { x: x, y: boss.y + 10, w: reach, h: boss.h - 24, damage: boss.cotoveladaDmg, message: 'Cotovelada!' };
  }
  if (boss.state === 'active-raspagem') {
    return { x: boss.x, y: boss.y, w: boss.w, h: boss.h, damage: boss.raspagemDmg, message: 'Raspagem!' };
  }
  if (boss.state === 'active-mataleao') {
    var reachM = 40;
    var xm = boss.facing > 0 ? boss.x + boss.w : boss.x - reachM;
    return { x: xm, y: boss.y, w: reachM, h: boss.h, damage: boss.mataleaoDmg, message: 'MATA-LEÃO!' };
  }
  return null;
}

export function bossDamageMultiplier(boss) {
  return boss.state === 'ajeitandofaixa' ? 1.5 : 1;
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

export var preBossDialogue = {
  start: 'p1',
  nodes: {
    p1: { speaker: '{name}', text: 'Então você é o Arnaldinho... o cara que ensinou todo mundo a ser babaca.', next: 'p2' },
    p2: { speaker: 'Arnaldinho', text: 'Ensinei todo mundo a lutar. Babaca vocês já eram antes de chegar aqui.', next: 'p3' },
    p3: { speaker: 'Narrador', text: 'Arnaldinho ajusta a faixa preta com calma, sem pressa nenhuma -- ele já venceu essa luta mil vezes na cabeça.', next: null }
  }
};

export var victoryDialogue = {
  start: 'v1',
  nodes: {
    v1: { speaker: 'Arnaldinho', text: 'Tá... acho que dessa vez o aluno superou o mestre. Parabéns, Clube dos Babacas.', next: null }
  }
};

// Tela especial de encerramento -- só é usada se, no momento em que essa
// fase é concluída, ela ainda for a última do array LEVELS (ver
// finishLevel() em game.js).
export var endingTitle = 'Você domou o rei dos babacas!';
export var endingText = 'Obrigado por jogar Clube dos Babacas até o fim. Cada fase, cada boss e cada piada foram feitos com carinho (e um pouco de implicância) pela Neon Cactus Interactive. Até a próxima aventura!';

// ---------- Desenho: Arnaldinho ----------

export function drawBoss(ctx, b) {
  if (!b.alive) return;
  var adjusting = b.state === 'ajeitandofaixa';
  var cx = b.x + b.w / 2;
  var baseY = b.y + b.h;

  var skin = '#c9986b';
  var gi = '#f2f4f6';
  var faixa = '#100d0a';
  var hair = '#100d0a';

  var walking = b.state === 'approach' && Math.abs(b.vx) > 5;
  var strideB = walking ? Math.sin(b.x * 0.13) * 9 : 0;
  var calm = Math.sin(performance.now() / 600) * (adjusting ? 1 : 0.6);

  ctx.save();
  ctx.translate(cx + calm, baseY);
  ctx.scale(b.facing, 1);

  // pernas grossas (calça de kimono)
  drawLimb(ctx, -13, -44, -15 + strideB, -2, 11, gi, '#0d0a0b');
  drawLimb(ctx, 12, -44, 14 - strideB, -2, 11, gi, '#0d0a0b');

  // bracos enormes
  var reachOut = 0;
  if (b.state === 'telegraph-cotovelada') reachOut = 8;
  if (b.state === 'active-cotovelada') reachOut = 34;
  var mataleaoReach = 0;
  if (b.state === 'telegraph-mataleao') mataleaoReach = 6;
  if (b.state === 'active-mataleao') mataleaoReach = 30;
  drawLimb(ctx, -15, -86, -22 + strideB * 0.4 - mataleaoReach * 0.3, -54, 10, skin, null);
  drawLimb(ctx, 15, -86, 24 + reachOut + mataleaoReach, -72, 10, skin, null);

  // tronco largo (kimono aberto, faixa preta amarrada)
  ctx.fillStyle = gi;
  roundRect(ctx, -16, -92, 32, 46, 6);
  ctx.fill();
  ctx.fillStyle = faixa;
  ctx.fillRect(-16, -54, 32, 7);
  ctx.fillRect(6, -54, 5, 16);
  ctx.fillRect(-3, -54, 5, 16);
  // peitoral a mostra por baixo do kimono aberto
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(-4, -90); ctx.lineTo(3, -78); ctx.lineTo(-2, -58); ctx.lineTo(-7, -70);
  ctx.closePath();
  ctx.fill();

  // cabeca com pescoco grosso
  ctx.fillStyle = skin;
  ctx.fillRect(-7, -104, 14, 14);
  ctx.beginPath(); ctx.arc(0, -109, 11, 0, Math.PI * 2); ctx.fill();

  // cabelo curto/raspado, expressao serena
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.arc(0, -114, 11, Math.PI * 0.88, Math.PI * 2.12); ctx.fill();

  // faixa na testa (detalhe de campeao)
  ctx.fillStyle = faixa;
  ctx.fillRect(-11, -112, 22, 3.4);

  // olhar sereno e confiante
  ctx.strokeStyle = '#2a2320';
  ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(2, -110); ctx.lineTo(8, -110); ctx.stroke();

  ctx.restore();

  if (b.state.indexOf('active') === 0) {
    ctx.strokeStyle = 'rgba(255,93,115,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + b.facing * 48, baseY - 68, 17, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (adjusting) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '18px sans-serif';
    ctx.fillText('🥋', cx - 9, baseY - 128);
  }

  drawMiniHpBar(ctx, b.x - 6, b.y - 56, b.w + 12, b.hp / b.maxHp, '#ff5d73');
}

// ---------- Cenário: caminho até a academia ----------

export function renderBackground(ctx, camX, VIEW_W, VIEW_H) {
  var sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, '#5a7fb8');
  sky.addColorStop(0.55, '#8fa8c8');
  sky.addColorStop(1, '#d8c8a0');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  drawTownStrip(ctx, camX, 0.25, VIEW_H - 60, '#7a6a52', '#4a3e30', 17, 14);
  drawDojoBanners(ctx, camX);
}

function drawTownStrip(ctx, camX, camFactor, baseY, wallColor, roofColor, seed, count) {
  var spacing = (LEVEL_W + 600) / count;
  for (var i = -1; i < count; i++) {
    var hx = i * spacing - (camX * camFactor) % spacing - 110;
    var hseed = Math.abs(Math.sin(seed + i * 12.9898)) % 1;
    var w = 130 + hseed * 70;
    var h = 90 + hseed * 90;
    ctx.fillStyle = wallColor;
    ctx.fillRect(hx, baseY - h, w, h);
    ctx.fillStyle = roofColor;
    ctx.fillRect(hx - 6, baseY - h - 10, w + 12, 12);
    ctx.fillStyle = 'rgba(255,210,140,0.4)';
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

function drawDojoBanners(ctx, camX) {
  var spacing = 220;
  var offset = (camX * 0.7) % spacing;
  var baseY = VIEW_H - 4;
  for (var x = -offset - spacing; x < VIEW_W + spacing; x += spacing) {
    ctx.strokeStyle = 'rgba(60,40,30,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x, baseY - 70); ctx.stroke();
    ctx.fillStyle = 'rgba(193,84,88,0.55)';
    ctx.fillRect(x, baseY - 70, 14, 42);
  }
}

export function drawPlatform(ctx, pl) {
  ctx.fillStyle = PLATFORM_FILL;
  ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
  ctx.fillStyle = PLATFORM_TOP;
  ctx.fillRect(pl.x, pl.y, pl.w, 6);
}

// ---------- Desenho: Capanga do Arnaldinho ----------

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
  ctx.strokeStyle = '#f2f4f6';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-5, -22); ctx.lineTo(-6 + stride, -1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5, -22); ctx.lineTo(6 - stride, -1); ctx.stroke();

  // bracos
  ctx.strokeStyle = '#c9986b';
  ctx.lineWidth = 4.5;
  ctx.beginPath(); ctx.moveTo(7, -34); ctx.lineTo(12, -24); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-7, -34); ctx.lineTo(-11, -24); ctx.stroke();

  // gi (kimono branco) com faixa azul
  ctx.fillStyle = '#f2f4f6';
  roundRect(ctx, -8, -40, 16, 22, 4);
  ctx.fill();
  ctx.fillStyle = '#2f5f8a';
  ctx.fillRect(-8, -30, 16, 3.5);

  // cabeca
  ctx.fillStyle = '#c9986b';
  ctx.beginPath(); ctx.arc(0, -44, 7, 0, Math.PI * 2); ctx.fill();

  // cabelo curto
  ctx.fillStyle = '#100d0a';
  ctx.beginPath(); ctx.arc(0, -48, 7.2, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();

  ctx.restore();

  drawMiniHpBar(ctx, g.x - 2, g.y - 20, g.w + 4, g.hp / g.maxHp, '#ff5d73');
}
