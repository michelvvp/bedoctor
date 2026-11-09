// Atalhos para dirigir a simulação nos testes como um jogador faria.

import type { ProcedureDef, SetupDef, ToolId } from '../src/sim';
import { Simulation } from '../src/sim';

/** Cirurgia de uma etapa que nunca termina, com a configuração dada. */
export function sandbox(setup: SetupDef, parTimeSec = 60): Simulation {
  const procedure: ProcedureDef = {
    id: 'sandbox',
    name: 'Sandbox',
    description: '',
    parTimeSec,
    setup,
    steps: [{ id: 'livre', instruction: '', tool: 'scalpel', done: () => false }],
  };
  return new Simulation(procedure);
}

/** Fica `steps` passos parado em (x, y). */
export function hold(sim: Simulation, tool: ToolId, x: number, y: number, down: boolean, steps = 1): void {
  for (let i = 0; i < steps; i++) sim.step({ tool, x, y, down });
}

/** Passos até soltar, sem mexer. */
export function idle(sim: Simulation, seconds: number, tool: ToolId = 'scalpel'): void {
  hold(sim, tool, 0, 0, false, Math.round(seconds * 60));
}

/** Clique: aperta e solta em (x, y). */
export function click(sim: Simulation, tool: ToolId, x: number, y: number): void {
  hold(sim, tool, x, y, false);
  hold(sim, tool, x, y, true);
  hold(sim, tool, x, y, false);
}

/**
 * Arrasta apertado de um ponto ao outro da lista, `stepsPerSegment` passos por
 * trecho, e solta no fim.
 */
export function drag(
  sim: Simulation,
  tool: ToolId,
  points: { x: number; y: number }[],
  stepsPerSegment = 30,
): void {
  const first = points[0]!;
  hold(sim, tool, first.x, first.y, false);
  hold(sim, tool, first.x, first.y, true);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    for (let s = 1; s <= stepsPerSegment; s++) {
      const u = s / stepsPerSegment;
      hold(sim, tool, a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, true);
    }
  }
  const last = points[points.length - 1]!;
  hold(sim, tool, last.x, last.y, false);
}

/** Uma incisão reta horizontal de x0 a x1 em y. */
export function straightIncision(id: string, x0: number, x1: number, y: number, maxDepth = 1, depth = 0) {
  return {
    id,
    guide: [
      { x: x0, y },
      { x: x1, y },
    ],
    maxDepth,
    depth,
  };
}

/** Estanca tudo de uma vez (para isolar o que o teste quer medir). */
export function stopAllBleeding(sim: Simulation): void {
  for (const b of sim.state.bleeders) {
    b.active = false;
    b.pool = 0;
  }
}
