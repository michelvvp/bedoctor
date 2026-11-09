// O instrumento ativo desenhado na ponta do mouse (em pixels de tela). Cada
// desenho tem a ponta na origem e o corpo ao longo de +x; o cursor gira tudo
// para o cabo apontar para baixo e para a direita.

import type { ToolId } from '../sim/tools';
import { COLORS } from './palette';

/** Ângulo do instrumento na tela (rad). */
const CURSOR_ANGLE = 0.6;

function metal(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLORS.metal;
  ctx.strokeStyle = COLORS.metalDark;
  ctx.lineWidth = 1.2;
}

function scalpel(ctx: CanvasRenderingContext2D): void {
  metal(ctx);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(10, -9, 26, -7);
  ctx.lineTo(28, 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.metalMid;
  ctx.beginPath();
  ctx.roundRect(27, -6, 58, 8, 3);
  ctx.fill();
  ctx.stroke();
}

function retractor(ctx: CanvasRenderingContext2D): void {
  metal(ctx);
  ctx.beginPath();
  ctx.roundRect(-3, -12, 7, 24, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.metalMid;
  ctx.beginPath();
  ctx.roundRect(3, -3, 80, 6, 3);
  ctx.fill();
  ctx.stroke();
}

function forceps(ctx: CanvasRenderingContext2D, down: boolean, heavy: boolean): void {
  const spread = down ? 1 : 5;
  ctx.strokeStyle = COLORS.metalDark;
  ctx.lineCap = 'round';
  ctx.lineWidth = heavy ? 5 : 4;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, side * (spread * 0.3));
    ctx.lineTo(70, side * (spread + 4));
    ctx.stroke();
  }
  ctx.strokeStyle = COLORS.metal;
  ctx.lineWidth = heavy ? 3 : 2.4;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, side * (spread * 0.3));
    ctx.lineTo(70, side * (spread + 4));
    ctx.stroke();
  }
}

function scissors(ctx: CanvasRenderingContext2D, down: boolean): void {
  const open = down ? 0.02 : 0.22;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(34, 0);
    ctx.rotate(side * open);
    metal(ctx);
    ctx.beginPath();
    ctx.moveTo(-34, 0);
    ctx.lineTo(0, side * -3);
    ctx.lineTo(0, side * 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = COLORS.metalMid;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(28, side * 9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(34, side * 11, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = COLORS.metalDark;
  ctx.beginPath();
  ctx.arc(34, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

function gauze(ctx: CanvasRenderingContext2D, down: boolean): void {
  const s = down ? 30 : 34;
  ctx.fillStyle = COLORS.gauze;
  ctx.strokeStyle = COLORS.gauzeLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-s / 2, -s / 2, s, s, 4);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    const o = -s / 2 + (s * i) / 4;
    ctx.moveTo(o, -s / 2);
    ctx.lineTo(o, s / 2);
    ctx.moveTo(-s / 2, o);
    ctx.lineTo(s / 2, o);
  }
  ctx.stroke();
}

function suction(ctx: CanvasRenderingContext2D): void {
  metal(ctx);
  ctx.beginPath();
  ctx.roundRect(0, -2, 34, 4, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.metalMid;
  ctx.beginPath();
  ctx.roundRect(32, -5, 40, 10, 4);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(220, 230, 240, 0.85)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(72, 0);
  ctx.bezierCurveTo(100, 0, 95, 30, 125, 35);
  ctx.stroke();
}

function needleDriver(ctx: CanvasRenderingContext2D, down: boolean): void {
  forceps(ctx, down, true);
  ctx.strokeStyle = COLORS.metalDark;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(-1, -6, 6, Math.PI * 0.5, Math.PI * 1.6);
  ctx.stroke();
  ctx.strokeStyle = COLORS.thread;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-1, 0);
  ctx.bezierCurveTo(20, 25, 50, 0, 80, 22);
  ctx.stroke();
}

function cautery(ctx: CanvasRenderingContext2D, down: boolean): void {
  if (down) {
    ctx.fillStyle = 'rgba(255, 138, 61, 0.55)';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = down ? COLORS.hot : COLORS.metalDark;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(12, 0);
  ctx.stroke();
  ctx.fillStyle = COLORS.cautery;
  ctx.strokeStyle = COLORS.metalDark;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(11, -5, 64, 10, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.roundRect(28, -3, 9, 6, 2);
  ctx.fill();
}

/** Desenha `tool` com a ponta em (x, y) px de tela. */
export function drawInstrument(
  ctx: CanvasRenderingContext2D,
  tool: ToolId,
  x: number,
  y: number,
  down: boolean,
): void {
  ctx.save();
  ctx.translate(x, y);
  if (tool !== 'gauze') ctx.rotate(CURSOR_ANGLE);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 6;
  switch (tool) {
    case 'scalpel':
      scalpel(ctx);
      break;
    case 'retractor':
      retractor(ctx);
      break;
    case 'forceps':
      forceps(ctx, down, false);
      break;
    case 'scissors':
      scissors(ctx, down);
      break;
    case 'gauze':
      gauze(ctx, down);
      break;
    case 'suction':
      suction(ctx);
      break;
    case 'needleDriver':
      needleDriver(ctx, down);
      break;
    case 'cautery':
      cautery(ctx, down);
      break;
  }
  ctx.restore();
  // Mira fina na ponta: é ela que conta para o jogo.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}
