// Consultas sobre o estado para escrever as condições de conclusão das etapas.

import { activeBleeders, fieldBlood } from './bleeding';
import { effectiveOpen } from './tissue';
import type { Incision, SimState } from './types';

export { activeBleeders, fieldBlood };

export function incision(state: Readonly<SimState>, id: string): Incision | undefined {
  return state.incisions.find((i) => i.id === id);
}

/** Camadas abertas da incisão (0 se não existe). */
export function incisionDepth(state: Readonly<SimState>, id: string): number {
  return incision(state, id)?.depth ?? 0;
}

/** Meia-largura (mm) aberta agora na incisão. */
export function incisionOpen(state: Readonly<SimState>, id: string): number {
  const inc = incision(state, id);
  return inc ? effectiveOpen(inc) : 0;
}

export function stitchesDone(state: Readonly<SimState>, id: string): number {
  return incision(state, id)?.stitches.filter((s) => s.done).length ?? 0;
}

export function isSutured(state: Readonly<SimState>, id: string): boolean {
  return incision(state, id)?.sutured ?? false;
}

export function organRemoved(state: Readonly<SimState>, id: string): boolean {
  return state.organs.find((o) => o.id === id)?.removed ?? false;
}

export function structureCut(state: Readonly<SimState>, id: string): boolean {
  return state.structures.find((s) => s.id === id)?.cut ?? false;
}

export function structureLigated(state: Readonly<SimState>, id: string): boolean {
  return state.structures.find((s) => s.id === id)?.ligated ?? false;
}

/** Nenhum sangramento ativo. */
export function noActiveBleeding(state: Readonly<SimState>): boolean {
  return activeBleeders(state) === 0;
}
