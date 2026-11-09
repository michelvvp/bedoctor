// O que os módulos de instrumento recebem da simulação.

import type { SimEventType } from './events';
import type { Rng } from './rng';
import type { SimState } from './types';

export interface SimCore {
  readonly state: SimState;
  readonly rng: Rng;
  emit(type: SimEventType, x: number, y: number, value?: number): void;
}
