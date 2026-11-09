// Fundo: chão, mesa, paciente coberto pelo campo verde e a janela de pele.
// Muda conforme a parte do corpo operada (abdome ou antebraço).

import { SKIN_HALF_HEIGHT, SKIN_HALF_WIDTH } from '../sim/tuning';
import type { BodySite } from '../sim/types';
import { COLORS } from './palette';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Desenha em coordenadas de mundo (mm). */
export function drawScene(ctx: CanvasRenderingContext2D, site: BodySite = 'abdomen'): void {
  if (site === 'forearm') drawForearm(ctx);
  else drawAbdomen(ctx);
  drawSkinWindow(ctx);
  if (site === 'abdomen') drawNavel(ctx);
  else drawLimbShading(ctx);
  drawFieldClamps(ctx);
}

/** Paciente deitado, campo cobrindo o corpo, janela no abdome. */
function drawAbdomen(ctx: CanvasRenderingContext2D): void {
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
}

/**
 * Braço estendido na tala de braço, vindo da esquerda (do corpo): campo
 * cobrindo o braço, mão de fora à direita, janela no antebraço.
 */
function drawForearm(ctx: CanvasRenderingContext2D): void {
  // Mesa do corpo, à esquerda, coberta pelo campo.
  ctx.fillStyle = COLORS.tableRim;
  roundRect(ctx, -1400, -1000, 1060, 2000, 30);
  ctx.fill();
  ctx.fillStyle = COLORS.drape;
  roundRect(ctx, -1400, -1000, 1040, 2000, 40);
  ctx.fill();

  // Tala de braço.
  ctx.fillStyle = COLORS.tableRim;
  roundRect(ctx, -400, -158, 860, 316, 30);
  ctx.fill();
  ctx.fillStyle = COLORS.table;
  roundRect(ctx, -400, -148, 850, 296, 24);
  ctx.fill();

  // Mão saindo do campo (palma para cima): punho, palma, dedos e polegar.
  ctx.save();
  ctx.translate(-36, 0);
  ctx.lineCap = 'round';
  ctx.strokeStyle = COLORS.skinShade;
  ctx.lineWidth = 24;
  drawFingers(ctx);
  ctx.strokeStyle = COLORS.skin;
  ctx.lineWidth = 20;
  drawFingers(ctx);
  ctx.fillStyle = COLORS.skinShade;
  roundRect(ctx, 236, -62, 70, 124, 20);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(336, 0, 54, 64, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.skin;
  roundRect(ctx, 238, -59, 68, 118, 18);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(336, 0, 51, 61, 0, 0, Math.PI * 2);
  ctx.fill();
  // Linhas da palma.
  ctx.strokeStyle = COLORS.skinShade;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(312, -30);
  ctx.quadraticCurveTo(338, 0, 318, 34);
  ctx.moveTo(330, -42);
  ctx.quadraticCurveTo(366, -18, 372, 18);
  ctx.stroke();
  ctx.restore();

  // Campo cobrindo o braço até o punho.
  ctx.fillStyle = COLORS.drapeDark;
  roundRect(ctx, -1400, -128, 1636, 264, 36);
  ctx.fill();
  ctx.fillStyle = COLORS.drape;
  roundRect(ctx, -1400, -134, 1630, 262, 36);
  ctx.fill();
  // Dobras.
  ctx.strokeStyle = COLORS.drapeDark;
  ctx.lineWidth = 3;
  for (const [x0, y0, x1, y1] of [
    [-260, -120, -230, 110],
    [196, -118, 214, -20],
    [204, 30, 222, 112],
    [-420, -500, -390, -250],
    [-430, 260, -385, 470],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2 + 10, (y0 + y1) / 2, x1, y1);
    ctx.stroke();
  }
  ctx.strokeStyle = COLORS.drapeLight;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-1380, -124);
  ctx.lineTo(220, -124);
  ctx.stroke();
}

/** Quatro dedos para a direita e o polegar para cima (traço grosso, ponta redonda). */
function drawFingers(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  for (const [y, length] of [
    [-36, 62],
    [-12, 72],
    [12, 68],
    [36, 54],
  ] as const) {
    ctx.moveTo(370, y);
    ctx.lineTo(370 + length, y + y * 0.12);
  }
  ctx.moveTo(320, -50);
  ctx.lineTo(352, -96);
  ctx.stroke();
}

/** Janela de pele aberta no campo, com o iodo por cima. */
function drawSkinWindow(ctx: CanvasRenderingContext2D): void {
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
}

/** Sombra nas bordas de cima e de baixo da janela: o antebraço é roliço. */
function drawLimbShading(ctx: CanvasRenderingContext2D): void {
  const w = SKIN_HALF_WIDTH;
  const h = SKIN_HALF_HEIGHT;
  ctx.fillStyle = COLORS.skinShade;
  for (const [band, alpha] of [
    [34, 0.25],
    [18, 0.35],
  ] as const) {
    ctx.globalAlpha = alpha;
    roundRect(ctx, -w, -h, 2 * w, band, 10);
    ctx.fill();
    roundRect(ctx, -w, h - band, 2 * w, band, 10);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawNavel(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLORS.skinShade;
  ctx.beginPath();
  ctx.ellipse(0, -62, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 70, 40, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, -61, 3, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
}

/** Pinças de campo nos cantos da janela. */
function drawFieldClamps(ctx: CanvasRenderingContext2D): void {
  const w = SKIN_HALF_WIDTH;
  const h = SKIN_HALF_HEIGHT;
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
