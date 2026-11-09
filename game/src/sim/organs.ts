// Órgãos da cavidade e estruturas que os prendem: pinça (segurar e puxar),
// tesoura (cortar) e porta-agulha (ligar).

import { addBleeder } from './bleeding';
import type { SimCore } from './core';
import type { OrganDef, StructureDef } from './procedure';
import { cavityReachable } from './tissue';
import {
  FORCEPS_GRAB_MARGIN,
  LIGATE_RADIUS,
  ORGAN_LIFT_DISTANCE,
  ORGAN_REMOVE_DISTANCE,
  SCISSORS_RADIUS,
} from './tuning';
import type { Organ, SimState, Structure } from './types';
import { distance, distanceToSegment, segmentCrossing } from './vec';

/** Folga padrão (mm) de um órgão preso. */
const DEFAULT_TETHER = 30;

export function createOrgan(def: OrganDef): Organ {
  return {
    id: def.id,
    kind: def.kind,
    x: def.x,
    y: def.y,
    homeX: def.x,
    homeY: def.y,
    angle: def.angle ?? 0,
    halfLength: def.halfLength,
    radius: def.radius,
    tether: def.tether ?? DEFAULT_TETHER,
    removable: def.removable ?? false,
    removed: false,
  };
}

export function createStructure(def: StructureDef): Structure {
  return {
    id: def.id,
    kind: def.kind,
    organId: def.organ ?? null,
    ax: def.a.x,
    ay: def.a.y,
    bx: def.b.x,
    by: def.b.y,
    bleedRate: def.bleedRate ?? 0,
    ligatable: def.ligatable ?? false,
    protected: def.protected ?? false,
    ligated: false,
    cut: false,
    cutAt: 0,
  };
}

export function findOrgan(state: Readonly<SimState>, id: string): Organ | undefined {
  return state.organs.find((o) => o.id === id);
}

/** Distância de (x, y) ao contorno do órgão (negativa dentro). */
export function organDistance(organ: Organ, x: number, y: number): number {
  const ux = Math.cos(organ.angle) * organ.halfLength;
  const uy = Math.sin(organ.angle) * organ.halfLength;
  return (
    distanceToSegment(x, y, organ.x - ux, organ.y - uy, organ.x + ux, organ.y + uy) - organ.radius
  );
}

/** O órgão foi puxado para fora da cavidade (desenhado por cima da pele). */
export function organLifted(organ: Organ): boolean {
  return distance(organ.x, organ.y, organ.homeX, organ.homeY) > ORGAN_LIFT_DISTANCE;
}

/** Alguma estrutura não cortada ainda prende o órgão. */
export function organAttached(state: Readonly<SimState>, organ: Organ): boolean {
  return state.structures.some((s) => s.organId === organ.id && !s.cut);
}

/** Ponta `a` da estrutura em coordenadas da mesa. */
export function structureA(state: Readonly<SimState>, s: Structure, out: { x: number; y: number }): void {
  const organ = s.organId ? findOrgan(state, s.organId) : undefined;
  out.x = s.ax + (organ ? organ.x : 0);
  out.y = s.ay + (organ ? organ.y : 0);
}

const a = { x: 0, y: 0 };

/** A estrutura está ao alcance neste ponto (cavidade aberta, ou no órgão puxado para fora). */
function structureReachable(state: SimState, s: Structure, x: number, y: number): boolean {
  if (s.organId) {
    const organ = findOrgan(state, s.organId);
    if (organ && organLifted(organ)) return true;
  }
  return cavityReachable(state, x, y);
}

// --- Pinça ------------------------------------------------------------------------

/** Pinça num órgão ao alcance: segura. Devolve `false` se não pegou nenhum. */
export function pressForcepsOrgan(core: SimCore): boolean {
  const state = core.state;
  const { x, y } = state.tool;
  for (let i = state.organs.length - 1; i >= 0; i--) {
    const organ = state.organs[i]!;
    if (organ.removed) continue;
    if (organDistance(organ, x, y) > FORCEPS_GRAB_MARGIN) continue;
    if (!organLifted(organ) && !cavityReachable(state, x, y)) continue;
    state.tool.grab = { kind: 'organ', organ: i, dx: x - organ.x, dy: y - organ.y };
    return true;
  }
  return false;
}

/** Arrasta o órgão seguro; preso por estruturas, não passa da folga. */
export function dragForcepsOrgan(core: SimCore): void {
  const state = core.state;
  const grab = state.tool.grab;
  if (grab?.kind !== 'organ') return;
  const organ = state.organs[grab.organ]!;
  let tx = state.tool.x - grab.dx;
  let ty = state.tool.y - grab.dy;
  if (organAttached(state, organ)) {
    const d = distance(organ.homeX, organ.homeY, tx, ty);
    if (d > organ.tether) {
      tx = organ.homeX + ((tx - organ.homeX) * organ.tether) / d;
      ty = organ.homeY + ((ty - organ.homeY) * organ.tether) / d;
    }
  }
  organ.x = tx;
  organ.y = ty;
}

/** Soltou: órgão solto e puxado longe o bastante sai do corpo. */
export function releaseForcepsOrgan(core: SimCore): void {
  const state = core.state;
  const grab = state.tool.grab;
  if (grab?.kind !== 'organ') return;
  const organ = state.organs[grab.organ]!;
  if (
    organ.removable &&
    !organAttached(state, organ) &&
    distance(organ.x, organ.y, organ.homeX, organ.homeY) >= ORGAN_REMOVE_DISTANCE
  ) {
    organ.removed = true;
    core.emit('organRemoved', organ.x, organ.y);
  }
}

// --- Tesoura ----------------------------------------------------------------------

function cutStructure(core: SimCore, s: Structure, u: number): void {
  const state = core.state;
  structureA(state, s, a);
  const x = a.x + (s.bx - a.x) * u;
  const y = a.y + (s.by - a.y) * u;
  s.cut = true;
  s.cutAt = u;
  core.emit('structureCut', x, y);
  if (s.protected) {
    state.errors.protectedCut++;
    core.emit('protectedCut', x, y);
  }
  if (s.bleedRate > 0 && !s.ligated) addBleeder(core, x, y, s.bleedRate);
}

/**
 * Tesoura apertada: no clique, corta a estrutura sob a ponta; arrastando, corta
 * a que o caminho da ponta cruzar.
 */
export function useScissors(core: SimCore, fromX: number, fromY: number, pressed: boolean): void {
  const state = core.state;
  const { x, y } = state.tool;
  for (const s of state.structures) {
    if (s.cut) continue;
    structureA(state, s, a);
    let u = -1;
    if (pressed) {
      if (distanceToSegment(x, y, a.x, a.y, s.bx, s.by) <= SCISSORS_RADIUS) {
        u = projectU(x, y, a.x, a.y, s.bx, s.by);
      }
    } else {
      u = segmentCrossing(a.x, a.y, s.bx, s.by, fromX, fromY, x, y);
    }
    if (u < 0) continue;
    const px = a.x + (s.bx - a.x) * u;
    const py = a.y + (s.by - a.y) * u;
    if (!structureReachable(state, s, px, py)) continue;
    cutStructure(core, s, u);
    return;
  }
}

function projectU(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return 0;
  return Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / len2));
}

// --- Porta-agulha: ligadura -------------------------------------------------------

/** Clique do porta-agulha numa estrutura ligável e inteira: amarra o fio. */
export function pressNeedleLigate(core: SimCore): boolean {
  const state = core.state;
  const { x, y } = state.tool;
  for (const s of state.structures) {
    if (s.cut || s.ligated || !s.ligatable) continue;
    structureA(state, s, a);
    if (distanceToSegment(x, y, a.x, a.y, s.bx, s.by) > LIGATE_RADIUS) continue;
    if (!structureReachable(state, s, x, y)) continue;
    s.ligated = true;
    core.emit('ligate', x, y);
    return true;
  }
  return false;
}
