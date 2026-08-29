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
    n1: { speaker: '{name}', text: 'Enfim chegamos na fase final, vamos enfrentar o Arnaldinho, faixa preta de jiu-jitsu e faixa preta em ser babaca!.', next: null }
  }
};

// =====================================================================
// Boss final: Arnaldinho -- o rei dos babacas
// =====================================================================

// Barra de vida REALMENTE enorme -- e como ele nunca é derrotado de
// verdade (ver hitBoss), esse número só define quanto dá pra bater até a
// primeira "quebra" da barra.
const BASE_HP = 700;
// As porradas dele tiram 20% do HP MÁXIMO do jogador, não um número fixo --
// por isso não vem de enemyAttackForLevel como todo o resto do jogo, e sim
// recalculado a cada quadro dentro de stepBoss (ver mais abaixo).
const DAMAGE_PCT_OF_PLAYER_MAXHP = 0.2;

export function createBoss(level) {
  return {
    name: 'Arnaldinho',
    // um pouco mais alto que o protagonista (h 44), não um gigante
    x: 6500, y: GROUND_Y - 58, w: 34, h: 58, vx: 0, vy: 0, onGround: false,
    facing: -1,
    hp: enemyHpForLevel(BASE_HP, level),
    maxHp: enemyHpForLevel(BASE_HP, level),
    cotoveladaDmg: 0,
    raspagemDmg: 0,
    mataleaoDmg: 0,
    state: 'approach',
    stateTimer: 0,
    actionCount: 0,
    hitDone: false,
    dashHitDone2: false,
    alive: true,
    defeated: false,
    asleep: true,
    knockbackTimer: 0,
    knockbackVx: 0,
    firstDepletionDone: false,
    pendingDialogue: null,
    pendingMessage: null,
    onDialogueResolved: null
  };
}

var BOSS_KNOCKBACK_SPEED = 170;
var BOSS_KNOCKBACK_DURATION = 0.16;

// Golpes bem mais rápidos e frequentes que qualquer outro boss do jogo --
// menos tempo de telegraph/recover entre uma ação e outra.
var TELEGRAPH_COTOVELADA = 0.18;
var ACTIVE_COTOVELADA = 0.12;
var RECOVER_COTOVELADA = 0.14;
var TELEGRAPH_RASPAGEM = 0.22;
var ACTIVE_RASPAGEM = 0.32;
var RECOVER_RASPAGEM = 0.18;
var RASPAGEM_SPEED = 420; // investida bem mais rápida que a de qualquer outro boss
var TELEGRAPH_MATALEAO = 0.3;
var ACTIVE_MATALEAO = 0.2;
var RECOVER_MATALEAO = 0.28;
var AJEITANDOFAIXA_TIME = 1.1;
var APPROACH_SPEED = 145; // bem mais rápido que o jogador -- difícil de escapar
var ENGAGE_RANGE = 52; // dentro do alcance real da cotovelada (~52 do centro)

function setState(boss, state, duration) {
  boss.state = state;
  boss.stateTimer = duration;
  boss.hitDone = false;
  boss.dashHitDone2 = false;
}

export function stepBoss(boss, player, platforms, dt) {
  if (!boss.alive || boss.asleep) return;

  // dano recalculado todo quadro como % do HP máximo do jogador -- se o
  // jogador subir de nível e ganhar mais HP no meio da fase, o peso do
  // golpe acompanha
  var pctDmg = Math.round(player.maxHp * DAMAGE_PCT_OF_PLAYER_MAXHP);
  boss.cotoveladaDmg = pctDmg;
  boss.raspagemDmg = pctDmg;
  boss.mataleaoDmg = pctDmg;

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
    case 'active-raspagem': {
      // vários dashes pra frente numa única janela: avança, freia rápido,
      // avança de novo -- em vez de uma investida só
      var elapsed = ACTIVE_RASPAGEM - boss.stateTimer;
      var burst1 = ACTIVE_RASPAGEM * 0.4;
      var pause = ACTIVE_RASPAGEM * 0.18;
      if (elapsed < burst1) {
        boss.vx = boss.facing * RASPAGEM_SPEED;
      } else if (elapsed < burst1 + pause) {
        boss.vx = 0;
      } else {
        boss.vx = boss.facing * RASPAGEM_SPEED;
      }
      if (boss.stateTimer <= 0) setState(boss, 'recover-raspagem', RECOVER_RASPAGEM);
      break;
    }
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

// Diálogo mostrado uma única vez, na primeira vez que a barra de vida do
// Arnaldinho esgota -- depois disso ela só enche de novo em silêncio (com
// um toast), pra não repetir a mesma caixa de diálogo toda hora.
var fearTauntDialogue = {
  start: 'f1',
  nodes: {
    f1: { speaker: 'Arnaldinho', text: 'EU ADORO CHEIRO DE MEDO!', next: null }
  }
};

// O Arnaldinho é o verdadeiro chefão final: ele NUNCA é derrotado de
// verdade. Quando a vida chega a zero, a barra enche de novo (infinitas
// vezes) -- na primeira vez com uma fala de efeito, depois em silêncio.
// boss.alive/boss.defeated nunca viram true, então o game.js nunca conta
// essa luta como vencida -- ela só termina quando o jogador morre.
export function hitBoss(boss, damage, knockbackDir) {
  if (!boss.alive) return;
  boss.hp = Math.max(0, boss.hp - Math.round(damage * bossDamageMultiplier(boss)));
  if (boss.hp <= 0) {
    if (!boss.firstDepletionDone) {
      boss.firstDepletionDone = true;
      boss.pendingDialogue = fearTauntDialogue;
      boss.onDialogueResolved = function () { boss.hp = boss.maxHp; };
    } else {
      boss.hp = boss.maxHp;
      boss.pendingMessage = 'Arnaldinho se recupera!';
    }
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
    p1: { speaker: '{name}', text: 'Você é o último a ser derrotado.', next: 'p2' },
    p2: { speaker: 'Arnaldinho', text: 'Eu sou inevitável!', next: null }
  }
};

// Essa luta não tem victoryDialogue de propósito -- ela é matematicamente
// impossível de vencer (ver hitBoss acima). O único jeito de "terminar" a
// fase é o jogador morrer, e nesse caso o game.js mostra uma tela especial
// de derrota (sem opção de continuar -- ver finalGameOverTitle/Text).
export var finalGameOverText1 = 'Fui eu que fiz o jogo, você achou mesmo que iria me derrotar???';
export var finalGameOverText2 = 'Um jogo babaca, feito por um babaca... e se você está jogando isso é porque também é um grande babaca!';

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

  // pernas (calca de kimono) -- só um pouco mais alto que o protagonista
  drawLimb(ctx, -9, -34, -10 + strideB, -2, 8, gi, '#0d0a0b');
  drawLimb(ctx, 8, -34, 9 - strideB, -2, 8, gi, '#0d0a0b');

  // bracos
  var reachOut = 0;
  if (b.state === 'telegraph-cotovelada') reachOut = 6;
  if (b.state === 'active-cotovelada') reachOut = 24;
  var mataleaoReach = 0;
  if (b.state === 'telegraph-mataleao') mataleaoReach = 4;
  if (b.state === 'active-mataleao') mataleaoReach = 20;
  drawLimb(ctx, -10, -60, -15 + strideB * 0.4 - mataleaoReach * 0.3, -38, 7, skin, null);
  drawLimb(ctx, 10, -60, 17 + reachOut + mataleaoReach, -50, 7, skin, null);

  // tronco (kimono aberto, faixa preta amarrada)
  ctx.fillStyle = gi;
  roundRect(ctx, -11, -64, 22, 32, 5);
  ctx.fill();
  ctx.fillStyle = faixa;
  ctx.fillRect(-11, -38, 22, 5);
  ctx.fillRect(4, -38, 3.4, 11);
  ctx.fillRect(-2, -38, 3.4, 11);
  // peitoral a mostra por baixo do kimono aberto
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(-3, -62); ctx.lineTo(2, -53); ctx.lineTo(-1, -40); ctx.lineTo(-5, -48);
  ctx.closePath();
  ctx.fill();

  // cabeca com pescoco curto
  ctx.fillStyle = skin;
  ctx.fillRect(-5, -72, 10, 9);
  ctx.beginPath(); ctx.arc(0, -76, 9, 0, Math.PI * 2); ctx.fill();

  // cabelo curto/raspado, expressao serena
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.arc(0, -80, 9, Math.PI * 0.88, Math.PI * 2.12); ctx.fill();

  // faixa na testa (detalhe de campeao)
  ctx.fillStyle = faixa;
  ctx.fillRect(-8, -78, 16, 2.8);

  // olhar sereno e confiante
  ctx.strokeStyle = '#2a2320';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(2, -77); ctx.lineTo(6.5, -77); ctx.stroke();

  ctx.restore();

  if (b.state.indexOf('active') === 0) {
    ctx.strokeStyle = 'rgba(255,93,115,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + b.facing * 34, baseY - 48, 13, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (adjusting) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '16px sans-serif';
    ctx.fillText('🥋', cx - 8, baseY - 90);
  }

  drawMiniHpBar(ctx, b.x - 4, b.y - 42, b.w + 8, b.hp / b.maxHp, '#ff5d73');
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

  // pernas -- tudo de preto
  ctx.strokeStyle = '#100d0a';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-5, -22); ctx.lineTo(-6 + stride, -1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5, -22); ctx.lineTo(6 - stride, -1); ctx.stroke();

  // bracos (mangas pretas, luvas)
  ctx.strokeStyle = '#181414';
  ctx.lineWidth = 4.8;
  ctx.beginPath(); ctx.moveTo(7, -34); ctx.lineTo(12, -24); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-7, -34); ctx.lineTo(-11, -24); ctx.stroke();

  // moletom/jaqueta preta
  ctx.fillStyle = '#181414';
  roundRect(ctx, -8, -40, 16, 22, 4);
  ctx.fill();

  // caveira -- cabeca branco-ossea com orbitas e nariz pretos
  ctx.fillStyle = '#e8e4d8';
  ctx.beginPath(); ctx.arc(0, -44, 7.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#100d0a';
  ctx.beginPath(); ctx.ellipse(-3, -45, 1.9, 2.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3, -45, 1.9, 2.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -42.5); ctx.lineTo(-1.2, -40); ctx.lineTo(1.2, -40); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#100d0a';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-3, -38.5); ctx.lineTo(3, -38.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-1.5, -38.5); ctx.lineTo(-1.5, -37.2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(1.5, -38.5); ctx.lineTo(1.5, -37.2); ctx.stroke();

  // capuz preto por cima da caveira
  ctx.fillStyle = '#181414';
  ctx.beginPath(); ctx.arc(0, -47, 7.8, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();

  ctx.restore();

  drawMiniHpBar(ctx, g.x - 2, g.y - 20, g.w + 4, g.hp / g.maxHp, '#ff5d73');
}
