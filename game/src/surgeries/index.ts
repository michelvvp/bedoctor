// Lista das cirurgias disponíveis no menu, na ordem em que aparecem.

import type { ProcedureDef } from '../sim';
import { testSurgery } from './test';

export const SURGERIES: readonly ProcedureDef[] = [testSurgery];

export function findSurgery(id: string): ProcedureDef | undefined {
  return SURGERIES.find((s) => s.id === id);
}
