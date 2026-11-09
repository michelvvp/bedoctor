// O que muda durante a cirurgia: guias, incisões e camadas, órgãos,
// estruturas, sangue, queimaduras e sutura. Tudo em coordenadas de mundo (mm).

import { poolRadius } from '../sim/bleeding';
import { organLifted, structureA } from '../sim/organs';
import { openingHalfWidth } from '../sim/tissue';
import { CAVITY_DEPTH } from '../sim/tuning';
import type { Bleeder, Incision, Organ, SimState, Structure } from '../sim/types';
import { samplePolyline } from '../sim/vec';
import { COLORS } from './palette';

/** Pontos ao longo da guia para o contorno da abertura. */
const OUTLINE_SAMPLES = 40;
/** Fração da meia-largura onde aparece cada camada (pele cortada, gordura, músculo, cavidade). */
const LAYER_FRACTION = [1, 0.84, 0.62, 0.42] as const;
const LAYER_COLOR = [COLORS.cutEdge, COLORS.fat, COLORS.muscle, COLORS.cavity] as const;

const sample = { x: 0, y: 0, nx: 0, ny: 0 };
const point = { x: 0, y: 0 };

/** Caminho do contorno da abertura em forma de olho, com a meia-largura × `fraction`. */
function lensPath(ctx: CanvasRenderingContext2D, inc: Incision, fraction: number, newPath = true): void {
  if (newPath) ctx.beginPath();
  for (let i = 0; i <= OUTLINE_SAMPLES; i++) {
    const t = i / OUTLINE_SAMPLES;
    samplePolyline(inc.guide, t, sample);
    const w = openingHalfWidth(inc, t) * fraction;
    const x = sample.x + sample.nx * w;
    const y = sample.y + sample.ny * w;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = OUTLINE_SAMPLES; i >= 0; i--) {
    const t = i / OUTLINE_SAMPLES;
    samplePolyline(inc.guide, t, sample);
    const w = openingHalfWidth(inc, t) * fraction;
    ctx.lineTo(sample.x - sample.nx * w, sample.y - sample.ny * w);
  }
  ctx.closePath();
}

function polyline(ctx: CanvasRenderingContext2D, flat: readonly number[]): void {
  ctx.beginPath();
  ctx.moveTo(flat[0]!, flat[1]!);
  for (let i = 2; i < flat.length; i += 2) ctx.lineTo(flat[i]!, flat[i + 1]!);
  if (flat.length === 2) ctx.lineTo(flat[0]! + 0.5, flat[1]!);
}

function drawGuide(ctx: CanvasRenderingContext2D, inc: Incision): void {
  if (inc.sutured || inc.depth >= inc.maxDepth) return;
  ctx.save();
  ctx.strokeStyle = COLORS.guide;
  ctx.globalAlpha = inc.depth > 0 ? 0.45 : 0.9;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  inc.guide.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

function drawIncision(ctx: CanvasRenderingContext2D, inc: Incision): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (inc.depth === 0) {
    ctx.strokeStyle = COLORS.cutEdge;
    ctx.lineWidth = 1.2;
    for (const stroke of inc.strokes) {
      polyline(ctx, stroke);
      ctx.stroke();
    }
    return;
  }
  for (let layer = 0; layer <= Math.min(inc.depth, CAVITY_DEPTH); layer++) {
    lensPath(ctx, inc, LAYER_FRACTION[layer]!);
    ctx.fillStyle = LAYER_COLOR[layer]!;
    ctx.fill();
  }
  if (inc.depth >= 2) {
    // Fibras do músculo na faixa entre a gordura e a cavidade.
    ctx.save();
    lensPath(ctx, inc, LAYER_FRACTION[2]);
    ctx.clip();
    ctx.strokeStyle = COLORS.muscleFiber;
    ctx.lineWidth = 0.8;
    for (let i = 1; i < 12; i++) {
      samplePolyline(inc.guide, i / 12, sample);
      const w = openingHalfWidth(inc, i / 12);
      ctx.beginPath();
      ctx.moveTo(sample.x + sample.nx * w, sample.y + sample.ny * w);
      ctx.lineTo(sample.x - sample.nx * w, sample.y - sample.ny * w);
      ctx.stroke();
    }
    ctx.restore();
    if (inc.depth >= CAVITY_DEPTH) {
      lensPath(ctx, inc, LAYER_FRACTION[3]);
      ctx.fillStyle = COLORS.cavity;
      ctx.fill();
    }
  }
  ctx.strokeStyle = COLORS.cutEdge;
  ctx.lineWidth = 0.8;
  lensPath(ctx, inc, 1);
  ctx.stroke();
}

function organColors(organ: Organ): [string, string] {
  switch (organ.kind) {
    case 'bowel':
      return [COLORS.bowel, COLORS.bowelDark];
    case 'appendix':
      return [COLORS.appendix, COLORS.appendixDark];
    default:
      return [COLORS.organ, COLORS.organDark];
  }
}

function drawOrgan(ctx: CanvasRenderingContext2D, organ: Organ, held: boolean): void {
  const [fill, dark] = organColors(organ);
  const ux = Math.cos(organ.angle) * organ.halfLength;
  const uy = Math.sin(organ.angle) * organ.halfLength;
  ctx.lineCap = 'round';
  if (held || organLifted(organ)) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = organ.radius * 2 + 2;
    ctx.beginPath();
    ctx.moveTo(organ.x - ux + 3, organ.y - uy + 4);
    ctx.lineTo(organ.x + ux + 3, organ.y + uy + 4);
    ctx.stroke();
  }
  ctx.strokeStyle = dark;
  ctx.lineWidth = organ.radius * 2 + 1.6;
  ctx.beginPath();
  ctx.moveTo(organ.x - ux, organ.y - uy);
  ctx.lineTo(organ.x + ux, organ.y + uy);
  ctx.stroke();
  ctx.strokeStyle = fill;
  ctx.lineWidth = organ.radius * 2;
  ctx.stroke();
  // Brilho e gomos (cartoon).
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = Math.max(1, organ.radius * 0.35);
  ctx.beginPath();
  const nx = -Math.sin(organ.angle) * organ.radius * 0.45;
  const ny = Math.cos(organ.angle) * organ.radius * 0.45;
  ctx.moveTo(organ.x - ux * 0.7 - nx, organ.y - uy * 0.7 - ny);
  ctx.lineTo(organ.x + ux * 0.7 - nx, organ.y + uy * 0.7 - ny);
  ctx.stroke();
  if (organ.kind === 'bowel') {
    ctx.strokeStyle = dark;
    ctx.lineWidth = 0.8;
    const segments = Math.max(2, Math.round(organ.halfLength / organ.radius));
    for (let i = 1; i < segments; i++) {
      const u = (i / segments) * 2 - 1;
      const cx = organ.x + ux * u;
      const cy = organ.y + uy * u;
      ctx.beginPath();
      ctx.moveTo(cx - nx * 2, cy - ny * 2);
      ctx.lineTo(cx + nx * 2, cy + ny * 2);
      ctx.stroke();
    }
  }
}

function drawStructure(ctx: CanvasRenderingContext2D, state: SimState, s: Structure): void {
  structureA(state, s, point);
  const ax = point.x;
  const ay = point.y;
  const dx = s.bx - ax;
  const dy = s.by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const vessel = s.kind === 'vessel';
  ctx.lineCap = 'round';
  ctx.strokeStyle = vessel ? COLORS.vessel : COLORS.band;
  ctx.lineWidth = vessel ? 2.4 : 4;
  ctx.beginPath();
  if (s.cut) {
    const gap = 3 / len;
    const u0 = Math.max(0, s.cutAt - gap);
    const u1 = Math.min(1, s.cutAt + gap);
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + dx * u0, ay + dy * u0);
    ctx.moveTo(ax + dx * u1, ay + dy * u1);
    ctx.lineTo(s.bx, s.by);
  } else {
    ctx.moveTo(ax, ay);
    ctx.lineTo(s.bx, s.by);
  }
  ctx.stroke();
  if (!vessel) {
    ctx.strokeStyle = COLORS.bandDark;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  if (s.ligated) {
    const u = s.cut ? Math.max(0, s.cutAt - 6 / len) : 0.5;
    ctx.fillStyle = COLORS.thread;
    ctx.beginPath();
    ctx.arc(ax + dx * u, ay + dy * u, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Mancha de sangue: círculo com lóbulos fixos por id (não muda de quadro a quadro). */
function drawPool(ctx: CanvasRenderingContext2D, b: Bleeder): void {
  const r = poolRadius(b.pool);
  if (r <= 0) return;
  ctx.fillStyle = COLORS.blood;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
  for (let i = 0; i < 3; i++) {
    const a = b.id * 2.399 + i * 2.1;
    const d = r * 0.65;
    ctx.moveTo(b.x + Math.cos(a) * d + r * 0.5, b.y + Math.sin(a) * d);
    ctx.arc(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, r * 0.5, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = COLORS.bloodLight;
  ctx.beginPath();
  ctx.arc(b.x - r * 0.3, b.y - r * 0.35, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawBleeder(ctx: CanvasRenderingContext2D, b: Bleeder, time: number): void {
  if (!b.active) return;
  const pulse = 0.5 + 0.5 * Math.sin(time * 9 + b.id);
  ctx.fillStyle = COLORS.bleeder;
  ctx.beginPath();
  ctx.arc(b.x, b.y, 1.6 + pulse * (0.6 + b.rate * 0.12), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 0.6;
  ctx.stroke();
}

function drawStitches(ctx: CanvasRenderingContext2D, state: SimState, inc: Incision, index: number): void {
  const pending = state.tool.pendingStitch;
  inc.stitches.forEach((s, j) => {
    if (s.done) {
      ctx.strokeStyle = COLORS.thread;
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.left.x, s.left.y);
      ctx.lineTo(s.right.x, s.right.y);
      ctx.stroke();
      ctx.fillStyle = COLORS.thread;
      ctx.beginPath();
      ctx.arc(s.left.x, s.left.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s.left.x, s.left.y);
      ctx.lineTo(s.left.x + 3, s.left.y - 3);
      ctx.moveTo(s.left.x, s.left.y);
      ctx.lineTo(s.left.x - 3, s.left.y - 3);
      ctx.stroke();
      return;
    }
    const isPending = pending?.incision === index && pending.stitch === j;
    for (const [mark, side] of [
      [s.left, 1],
      [s.right, -1],
    ] as const) {
      ctx.strokeStyle = COLORS.mark;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(mark.x, mark.y, 2, 0, Math.PI * 2);
      if (isPending && pending.side === side) {
        ctx.fillStyle = COLORS.thread;
        ctx.fill();
      }
      ctx.stroke();
    }
  });
  if (pending?.incision === index) {
    const s = inc.stitches[pending.stitch];
    if (!s) return;
    const from = pending.side === 1 ? s.left : s.right;
    ctx.save();
    ctx.strokeStyle = COLORS.thread;
    ctx.lineWidth = 0.9;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(state.tool.x, state.tool.y);
    ctx.stroke();
    ctx.restore();
  }
}

/** Desenha o estado da cirurgia (coordenadas de mundo já aplicadas no ctx). */
export function drawSurgical(ctx: CanvasRenderingContext2D, state: SimState, time: number): void {
  for (const inc of state.incisions) drawGuide(ctx, inc);

  ctx.strokeStyle = COLORS.cutEdge;
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  for (const nick of state.nicks) {
    polyline(ctx, nick);
    ctx.stroke();
  }
  for (const burn of state.burns) {
    ctx.fillStyle = COLORS.burn;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(burn.x, burn.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (const inc of state.incisions) drawIncision(ctx, inc);

  // Dentro da cavidade: órgãos e estruturas recortados pela abertura.
  const held = state.tool.grab?.kind === 'organ' ? state.tool.grab.organ : -1;
  if (state.incisions.some((inc) => inc.depth >= CAVITY_DEPTH)) {
    ctx.save();
    // Todas as cavidades num caminho só: o clip é a união delas.
    ctx.beginPath();
    for (const inc of state.incisions) {
      if (inc.depth >= CAVITY_DEPTH) lensPath(ctx, inc, LAYER_FRACTION[3], false);
    }
    ctx.clip();
    state.structures.forEach((s) => {
      const organ = s.organId ? state.organs.find((o) => o.id === s.organId) : undefined;
      if (!organ || (!organLifted(organ) && !organ.removed)) drawStructure(ctx, state, s);
    });
    state.organs.forEach((organ, i) => {
      if (!organ.removed && !organLifted(organ) && i !== held) drawOrgan(ctx, organ, false);
    });
    ctx.restore();
  }
  // Puxados para fora (ou segurando): por cima de tudo.
  state.structures.forEach((s) => {
    const organ = s.organId ? state.organs.find((o) => o.id === s.organId) : undefined;
    if (organ && !organ.removed && (organLifted(organ) || state.organs.indexOf(organ) === held)) {
      drawStructure(ctx, state, s);
    }
  });
  state.organs.forEach((organ, i) => {
    if (!organ.removed && (organLifted(organ) || i === held)) drawOrgan(ctx, organ, i === held);
  });

  for (const b of state.bleeders) drawPool(ctx, b);
  for (const b of state.bleeders) drawBleeder(ctx, b, time);
  state.incisions.forEach((inc, i) => drawStitches(ctx, state, inc, i));
}
