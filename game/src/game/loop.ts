// Passo fixo com acumulador: a simulação anda em FIXED_DT, independente da
// taxa de quadros do requestAnimationFrame.

import { FIXED_DT } from '../sim/tuning';

/** Teto de passos por quadro (aba que volta do segundo plano não trava o jogo). */
export const MAX_STEPS_PER_FRAME = 5;

export class FixedLoop {
  private accumulator = 0;

  /** Soma o tempo do quadro e chama `step` quantas vezes couber. Devolve quantos passos deu. */
  advance(frameSeconds: number, step: () => void): number {
    this.accumulator += Math.max(0, frameSeconds);
    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      step();
      this.accumulator -= FIXED_DT;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0;
    return steps;
  }

  reset(): void {
    this.accumulator = 0;
  }
}
