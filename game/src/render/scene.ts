// Fundo: chão, mesa, paciente coberto pelo campo verde e a janela de pele.

import { SKIN_HALF_HEIGHT, SKIN_HALF_WIDTH } from '../sim/tuning';
import { COLORS } from './palette';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Desenha em coordenadas de mundo (mm). */
export function drawScene(ctx: CanvasRenderingContext2D): void {
  // Mesa.
  ctx.fillStyle = COLORS.tableRim;
  roundRect(ctx, -300, -1000, 600, 2000, 30);
  ctx.fill();
  ctx.fillStyle = COLORS.table;
  roundRect(ctx, -288, -1000, 576, 2000, 24);
  ctx.fill();

  // Cabeça (acima do campo) com touca.
  ctx.fillStyle = COLORS.skin;
  ctx.beginPath();
  ctx.ellipse(0, -520, 75, 90, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.cap;
  ctx.beginPath();
  ctx.ellipse(0, -555, 80, 70, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Campo cirúrgico cobrindo o corpo.
  ctx.fillStyle = COLORS.drapeDark;
  roundRect(ctx, -262, -412, 524, 1300, 40);
  ctx.fill();
  ctx.fillStyle = COLORS.drape;
  roundRect(ctx, -255, -420, 510, 1300, 40);
  ctx.fill();
  // Dobras.
  ctx.strokeStyle = COLORS.drapeDark;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const [x0, y0, x1, y1] of [
    [-230, -300, -200, -170],
    [215, -330, 235, -190],
    [-225, 180, -195, 330],
    [205, 170, 230, 320],
    [-90, 220, -40, 360],
    [80, -250, 120, -160],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2 + 12, (y0 + y1) / 2, x1, y1);
    ctx.stroke();
  }
  ctx.strokeStyle = COLORS.drapeLight;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-250, -380);
  ctx.lineTo(250, -380);
  ctx.stroke();

  // Janela de pele.
  const w = SKIN_HALF_WIDTH;
  const h = SKIN_HALF_HEIGHT;
  ctx.fillStyle = COLORS.drapeDark;
  roundRect(ctx, -w - 8, -h - 8, 2 * w + 16, 2 * h + 16, 14);
  ctx.fill();
  ctx.fillStyle = COLORS.skin;
  roundRect(ctx, -w, -h, 2 * w, 2 * h, 10);
  ctx.fill();
  ctx.fillStyle = COLORS.iodine;
  ctx.fill();
  // Umbigo.
  ctx.fillStyle = COLORS.skinShade;
  ctx.beginPath();
  ctx.ellipse(0, -62, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 70, 40, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, -61, 3, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();

  // Pinças de campo nos cantos.
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    const x = sx * (w + 4);
    const y = sy * (h + 4);
    ctx.strokeStyle = COLORS.metalDark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + sx * 26, y + sy * 18);
    ctx.stroke();
    ctx.fillStyle = COLORS.metal;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.metal;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + sx * 30, y + sy * 20, 5, 0, Math.PI * 2);
    ctx.stroke();
  }
}
