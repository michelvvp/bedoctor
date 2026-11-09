// O que muda durante a cirurgia: guias, incisões e camadas, órgãos,
// estruturas, sangue, queimaduras e sutura. Tudo em coordenadas de mundo (mm).

import { poolRadius } from '../sim/bleeding';
import { organLifted, structureA } from '../sim/organs';
import { openingHalfWidth } from '../sim/tissue';
import { CAVITY_DEPTH, LIGATE_RADIUS } from '../sim/tuning';
import type { Bleeder, Incision, Organ, SimState, Structure } from '../sim/types';
import { samplePolyline } from '../sim/vec';
import { COLORS } from './palette';
import { BASIN_X, BASIN_Y } from './scene';

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

/** Desenha o órgão; `x`, `y` e `angle` trocam a pose (ex.: deitado na cuba). */
function drawOrgan(
  ctx: CanvasRenderingContext2D,
  organ: Organ,
  held: boolean,
  x = organ.x,
  y = organ.y,
  angle = organ.angle,
): void {
  const [fill, dark] = organColors(organ);
  const ux = Math.cos(angle) * organ.halfLength;
  const uy = Math.sin(angle) * organ.halfLength;
  ctx.lineCap = 'round';
  if (held || organLifted(organ) || organ.removed) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = organ.radius * 2 + 2;
    ctx.beginPath();
    ctx.moveTo(x - ux + 3, y - uy + 4);
    ctx.lineTo(x + ux + 3, y + uy + 4);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x - ux, y - uy);
  ctx.lineTo(x + ux, y + uy);
  if (organ.kind === 'appendix') {
    // Inflamado: halo avermelhado em volta.
    ctx.strokeStyle = COLORS.inflamed;
    ctx.lineWidth = organ.radius * 2 + 6;
    ctx.stroke();
  }
  ctx.strokeStyle = dark;
  ctx.lineWidth = organ.radius * 2 + 1.6;
  ctx.stroke();
  ctx.strokeStyle = fill;
  ctx.lineWidth = organ.radius * 2;
  ctx.stroke();
  // Brilho e gomos (cartoon).
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = Math.max(1, organ.radius * 0.35);
  ctx.beginPath();
  const nx = -Math.sin(angle) * organ.radius * 0.45;
  const ny = Math.cos(angle) * organ.radius * 0.45;
  ctx.moveTo(x - ux * 0.7 - nx, y - uy * 0.7 - ny);
  ctx.lineTo(x + ux * 0.7 - nx, y + uy * 0.7 - ny);
  ctx.stroke();
  if (organ.kind === 'bowel') {
    ctx.strokeStyle = dark;
    ctx.lineWidth = 0.8;
    const segments = Math.max(2, Math.round(organ.halfLength / organ.radius));
    for (let i = 1; i < segments; i++) {
      const u = (i / segments) * 2 - 1;
      const cx = x + ux * u;
      const cy = y + uy * u;
      ctx.beginPath();
      ctx.moveTo(cx - nx * 2, cy - ny * 2);
      ctx.lineTo(cx + nx * 2, cy + ny * 2);
      ctx.stroke();
    }
  }
}

/** Meia-folga (mm) desenhada de cada lado do corte de uma estrutura. */
const CUT_GAP = 1.5;

/** Traço de (x0, y0) a (x1, y1), encurtado `trim0`/`trim1` mm em cada ponta. */
function trimmedLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  trim0: number,
  trim1: number,
): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len <= trim0 + trim1) return;
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  ctx.moveTo(x0 + ux * trim0, y0 + uy * trim0);
  ctx.lineTo(x1 - ux * trim1, y1 - uy * trim1);
}

/**
 * Vaso ou ligamento. Inteiro (`whole`), de `a` a `b`. Cortado, em duas partes:
 * o coto (`stump`), parado do ponto do corte até `b`, e o pedaço (`piece`) que
 * vai junto com o órgão, de `a` até o corte.
 */
function drawStructure(
  ctx: CanvasRenderingContext2D,
  state: SimState,
  s: Structure,
  part: 'whole' | 'stump' | 'piece',
): void {
  structureA(state, s, point);
  const ax = point.x;
  const ay = point.y;
  const vessel = s.kind === 'vessel';
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (part === 'whole') trimmedLine(ctx, ax, ay, s.bx, s.by, 0, 0);
  else if (part === 'stump') trimmedLine(ctx, s.cutX, s.cutY, s.bx, s.by, CUT_GAP, 0);
  else trimmedLine(ctx, ax, ay, ax + s.pieceDx, ay + s.pieceDy, 0, CUT_GAP);
  ctx.strokeStyle = vessel ? COLORS.vessel : COLORS.band;
  ctx.lineWidth = vessel ? 2.4 : 4;
  ctx.stroke();
  if (!vessel) {
    ctx.strokeStyle = COLORS.bandDark;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Marca da ligadura (onde amarrar), enquanto não amarrou.
  if (part === 'whole' && s.ligateAt >= 0 && !s.ligated) {
    ctx.strokeStyle = COLORS.mark;
    ctx.lineWidth = 0.9;
    ctx.setLineDash([2, 1.5]);
    ctx.beginPath();
    ctx.arc(ax + (s.bx - ax) * s.ligateAt, ay + (s.by - ay) * s.ligateAt, LIGATE_RADIUS * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (!s.ligated) return;
  // Nó: na estrutura inteira, ou na parte cortada em que ele ficou.
  let kx: number;
  let ky: number;
  if (part === 'whole') {
    kx = ax + (s.bx - ax) * s.ligatedAt;
    ky = ay + (s.by - ay) * s.ligatedAt;
  } else if (s.ligatedAt <= s.cutAt) {
    if (part !== 'piece') return;
    const f = s.cutAt > 0 ? s.ligatedAt / s.cutAt : 0;
    kx = ax + s.pieceDx * f;
    ky = ay + s.pieceDy * f;
  } else {
    if (part !== 'stump') return;
    // `a` na hora do corte = ponto do corte menos o pedaço.
    const a0x = s.cutX - s.pieceDx;
    const a0y = s.cutY - s.pieceDy;
    kx = a0x + (s.bx - a0x) * s.ligatedAt;
    ky = a0y + (s.by - a0y) * s.ligatedAt;
  }
  ctx.fillStyle = COLORS.thread;
  ctx.beginPath();
  ctx.arc(kx, ky, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Lâminas do afastador nas bordas puxadas (`retractedSides`), no meio da
 * incisão, com o cabo saindo para fora.
 */
function drawRetractor(ctx: CanvasRenderingContext2D, inc: Incision): void {
  if (inc.retractedSides === 0 || inc.openWidth <= 0) return;
  samplePolyline(inc.guide, 0.5, sample);
  const w = openingHalfWidth(inc, 0.5);
  const tx = -sample.ny;
  const ty = sample.nx;
  ctx.lineCap = 'round';
  for (const side of [1, -1] as const) {
    if (!(inc.retractedSides & (side > 0 ? 1 : 2))) continue;
    const nx = sample.nx * side;
    const ny = sample.ny * side;
    const bx = sample.x + nx * (w + 1);
    const by = sample.y + ny * (w + 1);
    for (const [color, width] of [
      [COLORS.metalDark, 5.4],
      [COLORS.metal, 3.6],
    ] as const) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      // Lâmina ao longo da borda, com as pontas viradas para dentro.
      ctx.moveTo(bx - tx * 14 - nx * 3, by - ty * 14 - ny * 3);
      ctx.lineTo(bx - tx * 12, by - ty * 12);
      ctx.lineTo(bx + tx * 12, by + ty * 12);
      ctx.lineTo(bx + tx * 14 - nx * 3, by + ty * 14 - ny * 3);
      // Cabo para fora.
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + nx * 46, by + ny * 46);
      ctx.stroke();
    }
  }
}

/** Órgãos retirados, deitados na cuba (só no abdome, onde há cuba). */
function drawRemovedOrgans(ctx: CanvasRenderingContext2D, state: SimState): void {
  if (state.site !== 'abdomen') return;
  let slot = 0;
  for (const organ of state.organs) {
    if (!organ.removed) continue;
    drawOrgan(ctx, organ, false, BASIN_X + 4, BASIN_Y - 24 + slot * 16, Math.PI / 2 - 0.25);
    slot++;
  }
}

/**
 * Sobra de fio de sutura, de `a` (nó) até `b` (agulha). Cortada, fica só a
 * pontinha junto do nó; o resto sai do campo.
 */
function drawThread(ctx: CanvasRenderingContext2D, state: SimState, s: Structure): void {
  structureA(state, s, point);
  const ax = point.x;
  const ay = point.y;
  const dx = s.bx - ax;
  const dy = s.by - ay;
  const u = s.cut ? Math.min(s.cutAt, 0.15) : 1;
  // Fio levemente curvo (ponto de controle deslocado para o lado).
  const cx = ax + dx * 0.5 * u - dy * 0.08 * u;
  const cy = ay + dy * 0.5 * u + dx * 0.08 * u;
  ctx.strokeStyle = COLORS.thread;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(cx, cy, ax + dx * u, ay + dy * u);
  ctx.stroke();
  if (s.cut) return;
  // Agulha curva na ponta.
  const angle = Math.atan2(dy, dx);
  ctx.strokeStyle = COLORS.metalDark;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(s.bx + Math.cos(angle) * 6, s.by + Math.sin(angle) * 6, 6, angle + Math.PI, angle + Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = COLORS.metal;
  ctx.lineWidth = 1.2;
  ctx.stroke();
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
      if (s.kind === 'thread') return;
      const organ = s.organId ? state.organs.find((o) => o.id === s.organId) : undefined;
      const inside = !organ || (!organLifted(organ) && !organ.removed);
      if (!s.cut) {
        if (inside) drawStructure(ctx, state, s, 'whole');
        return;
      }
      // O coto fica na cavidade; o pedaço vai com o órgão.
      drawStructure(ctx, state, s, 'stump');
      if (inside) drawStructure(ctx, state, s, 'piece');
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
      drawStructure(ctx, state, s, s.cut ? 'piece' : 'whole');
    }
  });
  state.organs.forEach((organ, i) => {
    if (!organ.removed && (organLifted(organ) || i === held)) drawOrgan(ctx, organ, i === held);
  });

  drawRemovedOrgans(ctx, state);
  for (const inc of state.incisions) drawRetractor(ctx, inc);

  for (const b of state.bleeders) drawPool(ctx, b);
  for (const b of state.bleeders) drawBleeder(ctx, b, time);
  state.incisions.forEach((inc, i) => drawStitches(ctx, state, inc, i));
  for (const s of state.structures) if (s.kind === 'thread') drawThread(ctx, state, s);
}
