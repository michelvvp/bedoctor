// Lista das cirurgias disponíveis no menu, na ordem em que aparecem. A
// "Teste" (`test.ts`) fica fora: só prova o formato nos testes.

import type { ProcedureDef } from '../sim';
import { sutureTutorial } from './sutureTutorial';

export const SURGERIES: readonly ProcedureDef[] = [sutureTutorial];

export function findSurgery(id: string): ProcedureDef | undefined {
  return SURGERIES.find((s) => s.id === id);
}
