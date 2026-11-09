// Tecido em camadas e incisões: bisturi, afastador, pinça na borda e sutura.

import { addBleeder, onSkin } from './bleeding';
import type { SimCore } from './core';
import type { IncisionDef, SutureMarksDef } from './procedure';
import {
  CAVITY_DEPTH,
  CUT_BLEED_CHANCE,
  CUT_BLEED_MAX_RATE,
  CUT_BLEED_MIN_RATE,
  CUT_SAMPLE_STEP,
  CUT_SOUND_SPACING,
  FORCEPS_MAX_OPEN,
  INCISION_BINS,
  INCISION_SLIT,
  LAYER_OPEN_COVERAGE,
  OFF_GUIDE_BLEED_RATE,
  OFF_GUIDE_BLEED_SPACING,
  OFF_GUIDE_MIN,
  ON_GUIDE_MAX,
  ORGAN_ACCESS_MIN_OPEN,
  RETRACTOR_GRAB_MARGIN,
  RETRACTOR_MAX_OPEN,
  STITCH_MAX_OPEN,
  STITCH_RADIUS,
  SUTURE_OFFSET,
} from './tuning';
import type { Incision, SimState, Stitch } from './types';
import { createHit, distance, polylineLength, projectOnPolyline, samplePolyline } from './vec';

const hit = createHit();
const sample = { x: 0, y: 0, nx: 0, ny: 0 };

/** Pontas da incisão que o afastador e a pinça não pegam (fração da guia). */
const EDGE_GRIP_MIN_T = 0.08;
const EDGE_GRIP_MAX_T = 0.92;
/** Folga (mm) além da borda para a pinça pegar a borda. */
const FORCEPS_EDGE_MARGIN = 8;

export function createIncision(def: IncisionDef): Incision {
  return {
    id: def.id,
    guide: def.guide.map((p) => ({ x: p.x, y: p.y })),
    length: polylineLength(def.guide),
    maxDepth: def.maxDepth,
    depth: Math.min(def.depth ?? 0, def.maxDepth),
    bins: new Uint8Array(INCISION_BINS),
    strokes: [],
    openWidth: 0,
    heldOpen: 0,
    stitches: [],
    sutured: false,
  };
}

/** Distribui as marcas de sutura ao longo da guia. */
export function addSutureMarks(incision: Incision, def: SutureMarksDef): void {
  const from = def.from ?? 0;
  const to = def.to ?? 1;
  for (let i = 0; i < def.count; i++) {
    const t = from + ((i + 0.5) * (to - from)) / def.count;
    samplePolyline(incision.guide, t, sample);
    const stitch: Stitch = {
      t,
      left: { x: sample.x + sample.nx * SUTURE_OFFSET, y: sample.y + sample.ny * SUTURE_OFFSET },
      right: { x: sample.x - sample.nx * SUTURE_OFFSET, y: sample.y - sample.ny * SUTURE_OFFSET },
      done: false,
    };
    incision.stitches.push(stitch);
  }
  incision.stitches.sort((a, b) => a.t - b.t);
  incision.sutured = false;
}

/** Meia-largura aberta agora (afastador ou pinça, o que abrir mais). */
export function effectiveOpen(incision: Incision): number {
  return Math.max(incision.openWidth, incision.heldOpen);
}

/**
 * Meia-largura da abertura na posição `t` da guia: forma de olho, fina nas
 * pontas. Zero enquanto a pele estiver intacta.
 */
export function openingHalfWidth(incision: Incision, t: number): number {
  if (incision.depth < 1 || t <= 0 || t >= 1) return 0;
  return (INCISION_SLIT + effectiveOpen(incision)) * Math.pow(Math.sin(Math.PI * t), 0.6);
}

/** O ponto está dentro da abertura da incisão. */
export function insideOpening(incision: Incision, x: number, y: number): boolean {
  projectOnPolyline(incision.guide, x, y, hit);
  return hit.t > 0 && hit.t < 1 && hit.distance <= openingHalfWidth(incision, hit.t);
}

/** Dá para alcançar a cavidade neste ponto: incisão até a cavidade e aberta o bastante. */
export function cavityReachable(state: Readonly<SimState>, x: number, y: number): boolean {
  for (const inc of state.incisions) {
    if (inc.depth < CAVITY_DEPTH || effectiveOpen(inc) < ORGAN_ACCESS_MIN_OPEN) continue;
    if (insideOpening(inc, x, y)) return true;
  }
  return false;
}

/** Fração da guia já cortada na camada atual. */
export function layerCoverage(incision: Incision): number {
  let cut = 0;
  for (const bin of incision.bins) cut += bin;
  return cut / incision.bins.length;
}

// --- Bisturi --------------------------------------------------------------------

/**
 * O bisturi andou de (fromX, fromY) até a posição atual, apertado. Amostra o
 * caminho a cada CUT_SAMPLE_STEP mm: em cima da guia corta a camada atual;
 * longe de qualquer guia, na pele, é corte errado (erro e sangramento).
 */
export function dragScalpel(core: SimCore, fromX: number, fromY: number, pressed: boolean): void {
  const state = core.state;
  const tool = state.tool;
  if (pressed) {
    tool.offGuide = false;
    tool.stroke = null;
    tool.nick = null;
    tool.cutSoundRun = CUT_SOUND_SPACING;
  }
  const length = distance(fromX, fromY, tool.x, tool.y);
  const count = Math.max(1, Math.ceil(length / CUT_SAMPLE_STEP));
  const step = length / count;
  for (let i = 1; i <= count; i++) {
    const u = i / count;
    cutAt(core, fromX + (tool.x - fromX) * u, fromY + (tool.y - fromY) * u, step);
  }
  for (const inc of state.incisions) {
    if (inc.depth < inc.maxDepth && layerCoverage(inc) >= LAYER_OPEN_COVERAGE) {
      inc.depth++;
      inc.bins.fill(0);
      samplePolyline(inc.guide, 0.5, sample);
      core.emit('layerOpened', sample.x, sample.y, inc.depth);
    }
  }
}

function cutAt(core: SimCore, x: number, y: number, step: number): void {
  const state = core.state;
  const tool = state.tool;
  let target: Incision | null = null;
  let nearest = Infinity;
  let nearestT = 0;
  for (const inc of state.incisions) {
    projectOnPolyline(inc.guide, x, y, hit);
    if (hit.distance < nearest) {
      nearest = hit.distance;
      nearestT = hit.t;
      target = inc;
    }
  }

  if (target && nearest <= ON_GUIDE_MAX) {
    tool.offGuide = false;
    tool.nick = null;
    // Incisão já aberta até onde devia (ou suturada): passar por ela não faz nada.
    if (target.depth >= target.maxDepth || target.sutured) return;
    const bin = Math.min(INCISION_BINS - 1, Math.floor(nearestT * INCISION_BINS));
    if (target.bins[bin] === 0) {
      target.bins[bin] = 1;
      const chance = CUT_BLEED_CHANCE[target.depth] ?? 0;
      if (core.rng.next() < chance) {
        samplePolyline(target.guide, (bin + 0.5) / INCISION_BINS, sample);
        const offset = core.rng.range(-INCISION_SLIT, INCISION_SLIT);
        const rate = core.rng.range(CUT_BLEED_MIN_RATE, CUT_BLEED_MAX_RATE);
        addBleeder(core, sample.x + sample.nx * offset, sample.y + sample.ny * offset, rate);
      }
    }
    state.cut.length += step;
    state.cut.deviationSum += nearest * step;
    if (!appendPoint(tool.stroke, x, y)) startStroke(target, tool, x, y);
    tool.cutSoundRun += step;
    if (tool.cutSoundRun >= CUT_SOUND_SPACING) {
      tool.cutSoundRun = 0;
      core.emit('cut', x, y);
    }
    return;
  }

  // Entre ON_GUIDE_MAX e OFF_GUIDE_MIN: folga para não contar erro tremendo na borda.
  if (nearest < OFF_GUIDE_MIN || !onSkin(x, y)) return;
  if (!tool.offGuide) {
    tool.offGuide = true;
    tool.offGuideRun = 0;
    tool.stroke = null;
    tool.nick = [x, y];
    state.nicks.push(tool.nick);
    state.errors.offGuide++;
    core.emit('cutMiss', x, y);
    addBleeder(core, x, y, OFF_GUIDE_BLEED_RATE);
    return;
  }
  tool.offGuideRun += step;
  appendPoint(tool.nick, x, y);
  if (tool.offGuideRun >= OFF_GUIDE_BLEED_SPACING) {
    tool.offGuideRun = 0;
    addBleeder(core, x, y, OFF_GUIDE_BLEED_RATE);
  }
}

/** Mínimo (mm) entre pontos guardados de um traço. */
const STROKE_POINT_SPACING = 2;

function appendPoint(stroke: number[] | null, x: number, y: number): boolean {
  if (!stroke) return false;
  const lx = stroke[stroke.length - 2]!;
  const ly = stroke[stroke.length - 1]!;
  if (distance(lx, ly, x, y) >= STROKE_POINT_SPACING) stroke.push(x, y);
  return true;
}

function startStroke(incision: Incision, tool: SimState['tool'], x: number, y: number): void {
  tool.stroke = [x, y];
  incision.strokes.push(tool.stroke);
}

// --- Afastador e pinça na borda -------------------------------------------------

/** Incisão aberta cuja borda está ao alcance de (x, y), ou -1. */
function incisionEdgeAt(state: SimState, x: number, y: number, margin: number): number {
  let best = -1;
  let bestDistance = Infinity;
  state.incisions.forEach((inc, i) => {
    if (inc.depth < 1 || inc.sutured) return;
    projectOnPolyline(inc.guide, x, y, hit);
    if (hit.t < EDGE_GRIP_MIN_T || hit.t > EDGE_GRIP_MAX_T) return;
    if (hit.distance > openingHalfWidth(inc, hit.t) + margin) return;
    if (hit.distance < bestDistance) {
      best = i;
      bestDistance = hit.distance;
    }
  });
  return best;
}

export function pressRetractor(core: SimCore): void {
  const state = core.state;
  const { x, y } = state.tool;
  const index = incisionEdgeAt(state, x, y, RETRACTOR_GRAB_MARGIN);
  if (index < 0) return;
  const inc = state.incisions[index]!;
  projectOnPolyline(inc.guide, x, y, hit);
  state.tool.grab = {
    kind: 'retractor',
    incision: index,
    startDistance: hit.distance,
    startOpen: inc.openWidth,
  };
}

/** Arrastar o afastador para fora abre; para dentro, fecha. Soltar mantém. */
export function dragRetractor(core: SimCore): void {
  const state = core.state;
  const grab = state.tool.grab;
  if (grab?.kind !== 'retractor') return;
  const inc = state.incisions[grab.incision]!;
  projectOnPolyline(inc.guide, state.tool.x, state.tool.y, hit);
  const open = grab.startOpen + hit.distance - grab.startDistance;
  inc.openWidth = Math.min(RETRACTOR_MAX_OPEN, Math.max(0, open));
}

/** Pinça na borda: segura aberta enquanto o botão estiver apertado. */
export function pressForcepsEdge(core: SimCore): boolean {
  const state = core.state;
  const { x, y } = state.tool;
  const index = incisionEdgeAt(state, x, y, FORCEPS_EDGE_MARGIN);
  if (index < 0) return false;
  const inc = state.incisions[index]!;
  projectOnPolyline(inc.guide, x, y, hit);
  state.tool.grab = { kind: 'edge', incision: index, startDistance: hit.distance, startOpen: 0 };
  return true;
}

export function dragForcepsEdge(core: SimCore): void {
  const state = core.state;
  const grab = state.tool.grab;
  if (grab?.kind !== 'edge') return;
  const inc = state.incisions[grab.incision]!;
  projectOnPolyline(inc.guide, state.tool.x, state.tool.y, hit);
  inc.heldOpen = Math.min(FORCEPS_MAX_OPEN, Math.max(0, hit.distance - grab.startDistance));
}

export function releaseForcepsEdge(core: SimCore): void {
  const grab = core.state.tool.grab;
  if (grab?.kind !== 'edge') return;
  core.state.incisions[grab.incision]!.heldOpen = 0;
}

// --- Porta-agulha: sutura ---------------------------------------------------------

/**
 * Clique do porta-agulha numa marca de sutura. O primeiro clique fura um lado;
 * o segundo, na marca do outro lado do mesmo ponto, fecha o ponto. Devolve
 * `false` se o clique não foi em marca nenhuma (nem havia ponto pela metade).
 */
export function pressNeedleSuture(core: SimCore): boolean {
  const state = core.state;
  const tool = state.tool;
  const { x, y } = tool;
  const pending = tool.pendingStitch;
  if (pending) {
    const inc = state.incisions[pending.incision]!;
    const stitch = inc.stitches[pending.stitch]!;
    const target = pending.side === 1 ? stitch.right : stitch.left;
    const start = pending.side === 1 ? stitch.left : stitch.right;
    tool.pendingStitch = null;
    if (distance(x, y, target.x, target.y) <= STITCH_RADIUS) {
      stitch.done = true;
      let done = 0;
      for (const s of inc.stitches) if (s.done) done++;
      core.emit('stitch', x, y, done);
      if (done === inc.stitches.length) {
        inc.sutured = true;
        core.emit('sutured', x, y);
      }
    } else if (distance(x, y, start.x, start.y) <= STITCH_RADIUS) {
      tool.pendingStitch = pending; // clicou de novo no mesmo furo
    } else {
      state.errors.stitchMiss++;
      core.emit('stitchMiss', x, y);
    }
    return true;
  }

  let found: { incision: number; stitch: number; side: number } | null = null;
  let bestDistance = STITCH_RADIUS;
  state.incisions.forEach((inc, i) => {
    inc.stitches.forEach((s, j) => {
      if (s.done) return;
      const dl = distance(x, y, s.left.x, s.left.y);
      const dr = distance(x, y, s.right.x, s.right.y);
      if (dl <= bestDistance) {
        found = { incision: i, stitch: j, side: 1 };
        bestDistance = dl;
      }
      if (dr <= bestDistance) {
        found = { incision: i, stitch: j, side: -1 };
        bestDistance = dr;
      }
    });
  });
  if (!found) return false;
  const chosen: { incision: number; stitch: number; side: number } = found;
  const inc = state.incisions[chosen.incision]!;
  if (effectiveOpen(inc) > STITCH_MAX_OPEN) {
    core.emit('stitchBlocked', x, y);
    return true;
  }
  tool.pendingStitch = chosen;
  core.emit('stitchStart', x, y);
  return true;
}
