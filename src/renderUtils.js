// Helpers de desenho no canvas, compartilhados entre o jogador (game.js) e
// os personagens específicos de cada fase (src/levels/*.js).

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawMiniHpBar(ctx, x, y, w, pct, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * pct, 5);
}

// Desenha um membro (perna/braço) como uma linha, com um "pé" oval opcional
// na ponta (sandália, sapato, etc.) quando footColor é passado.
export function drawLimb(ctx, x1, y1, x2, y2, width, color, footColor) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  if (footColor) {
    ctx.fillStyle = footColor;
    ctx.beginPath();
    ctx.ellipse(x2 + (x2 > x1 ? 5 : -5), y2, 8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Fileira de "prédios" triangulares em paralaxe, usada como camada de fundo.
export function drawBuildingLayer(ctx, camX, camFactor, levelW, baseY, wallColor, roofColor, seed, count) {
  var spacing = (levelW + 500) / count;
  for (var i = -1; i < count; i++) {
    var hx = i * spacing - (camX * camFactor) % spacing - 120;
    var hseed = Math.abs(Math.sin(seed + i * 12.9898)) % 1;
    var w = 140 + hseed * 60;
    var h = 110 + hseed * 70;
    ctx.fillStyle = wallColor;
    ctx.fillRect(hx, baseY - h, w, h);
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(hx - 10, baseY - h);
    ctx.lineTo(hx + w / 2, baseY - h - 46);
    ctx.lineTo(hx + w + 10, baseY - h);
    ctx.closePath();
    ctx.fill();
  }
}
