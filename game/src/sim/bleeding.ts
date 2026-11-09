// Sangramentos, poças e os instrumentos que lidam com sangue: gaze, aspirador e
// cautério.

import type { SimCore } from './core';
import {
  CAUTERY_MAX_POOL,
  CAUTERY_RADIUS,
  GAUZE_ABSORB_RATE,
  GAUZE_PRESSURE_FACTOR,
  GAUZE_RADIUS,
  GAUZE_RUB_MIN_MOVE,
  GAUZE_STILL_FACTOR,
  GAUZE_STOP_MAX_RATE,
  GAUZE_STOP_TIME,
  POOL_MAX_ML,
  POOL_RADIUS_BASE,
  POOL_RADIUS_PER_SQRT_ML,
  SKIN_HALF_HEIGHT,
  SKIN_HALF_WIDTH,
  SUCTION_RADIUS,
  SUCTION_RATE,
} from './tuning';
import type { Bleeder, SimState } from './types';
import { distance } from './vec';

export function addBleeder(core: SimCore, x: number, y: number, rate: number): Bleeder {
  const state = core.state;
  const bleeder: Bleeder = {
    id: state.nextBleederId++,
    x,
    y,
    rate,
    active: true,
    pool: 0,
    pressure: 0,
  };
  state.bleeders.push(bleeder);
  core.emit('bleedStart', x, y, rate);
  return bleeder;
}

export function poolRadius(pool: number): number {
  return pool > 0 ? POOL_RADIUS_BASE + POOL_RADIUS_PER_SQRT_ML * Math.sqrt(pool) : 0;
}

/** Sangue (ml) espalhado no campo, somando as poças. */
export function fieldBlood(state: Readonly<SimState>): number {
  let total = 0;
  for (const b of state.bleeders) total += b.pool;
  return total;
}

export function activeBleeders(state: Readonly<SimState>): number {
  let count = 0;
  for (const b of state.bleeders) if (b.active) count++;
  return count;
}

export function onSkin(x: number, y: number): boolean {
  return Math.abs(x) <= SKIN_HALF_WIDTH && Math.abs(y) <= SKIN_HALF_HEIGHT;
}

/**
 * Um passo de sangramento: os ativos enchem a poça e somam à perda; a gaze
 * apertada em cima segura a vazão e, se for pequena, estanca com o tempo.
 */
export function updateBleeding(core: SimCore, dt: number): void {
  const state = core.state;
  const tool = state.tool;
  const gauzeDown = tool.tool === 'gauze' && tool.down;
  let bleedRate = 0;
  for (const b of state.bleeders) {
    if (!b.active) continue;
    let rate = b.rate;
    if (gauzeDown && distance(tool.x, tool.y, b.x, b.y) <= GAUZE_RADIUS) {
      rate *= GAUZE_PRESSURE_FACTOR;
      b.pressure += dt;
      if (b.rate <= GAUZE_STOP_MAX_RATE && b.pressure >= GAUZE_STOP_TIME) {
        b.active = false;
        core.emit('gauzeStop', b.x, b.y);
        continue;
      }
    } else {
      b.pressure = 0;
    }
    bleedRate += rate;
    state.vitals.bloodLost += rate * dt;
    b.pool = Math.min(POOL_MAX_ML, b.pool + rate * dt);
  }
  state.vitals.bleedRate = bleedRate;
}

/** Tira `rate * dt` de cada poça ao alcance (raio + tamanho da poça). */
function drainPools(state: SimState, x: number, y: number, radius: number, amount: number): void {
  for (const b of state.bleeders) {
    if (b.pool <= 0) continue;
    if (distance(x, y, b.x, b.y) <= radius + poolRadius(b.pool)) {
      b.pool = Math.max(0, b.pool - amount);
    }
  }
}

/** Gaze apertada: absorve as poças, mais rápido esfregando. */
export function useGauze(core: SimCore, prevX: number, prevY: number, dt: number): void {
  const tool = core.state.tool;
  const moved = distance(prevX, prevY, tool.x, tool.y) >= GAUZE_RUB_MIN_MOVE;
  const amount = GAUZE_ABSORB_RATE * dt * (moved ? 1 : GAUZE_STILL_FACTOR);
  drainPools(core.state, tool.x, tool.y, GAUZE_RADIUS, amount);
}

/** Aspirador apertado: puxa as poças ao alcance. */
export function useSuction(core: SimCore, dt: number): void {
  const tool = core.state.tool;
  drainPools(core.state, tool.x, tool.y, SUCTION_RADIUS, SUCTION_RATE * dt);
}

/**
 * Clique do cautério: estanca o sangramento ativo mais próximo ao alcance. Sem
 * sangramento ali, queima tecido sadio (erro leve).
 */
export function pressCautery(core: SimCore): void {
  const state = core.state;
  const { x, y } = state.tool;
  let best: Bleeder | null = null;
  let bestDistance = CAUTERY_RADIUS;
  for (const b of state.bleeders) {
    if (!b.active) continue;
    const d = distance(x, y, b.x, b.y);
    if (d <= bestDistance) {
      best = b;
      bestDistance = d;
    }
  }
  if (best) {
    if (best.pool > CAUTERY_MAX_POOL) {
      core.emit('cauteryBlocked', best.x, best.y);
      return;
    }
    best.active = false;
    best.pressure = 0;
    core.emit('cauterize', best.x, best.y);
    return;
  }
  if (onSkin(x, y)) {
    state.errors.burn++;
    state.burns.push({ x, y });
    core.emit('burn', x, y);
  }
}

/** Descarta os sangramentos estancados e já limpos. */
export function pruneBleeders(state: SimState): void {
  for (let i = state.bleeders.length - 1; i >= 0; i--) {
    const b = state.bleeders[i]!;
    if (!b.active && b.pool <= 0) state.bleeders.splice(i, 1);
  }
}
