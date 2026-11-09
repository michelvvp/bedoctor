import { describe, expect, it } from 'vitest';
import { precisionScore } from '../src/sim/score';
import { CAVITY_DEPTH, RETRACTOR_MAX_OPEN } from '../src/sim/tuning';
import { drag, sandbox, straightIncision } from './helpers';

const line = (y: number) => [
  { x: -80, y },
  { x: 80, y },
];

describe('incisão', () => {
  it('corte em cima da guia abre a pele com precisão máxima', () => {
    const sim = sandbox({ incisions: [straightIncision('a', -80, 80, 0)] });
    drag(sim, 'scalpel', line(0), 60);
    const inc = sim.state.incisions[0]!;
    expect(inc.depth).toBe(1);
    expect(sim.state.errors.offGuide).toBe(0);
    expect(precisionScore(sim.state)).toBeCloseTo(1, 5);
  });

  it('corte desviado da guia abre, mas reduz a precisão', () => {
    const exact = sandbox({ incisions: [straightIncision('a', -80, 80, 0)] });
    drag(exact, 'scalpel', line(0), 60);
    const shifted = sandbox({ incisions: [straightIncision('a', -80, 80, 0)] });
    drag(shifted, 'scalpel', line(7), 60);
    expect(shifted.state.incisions[0]!.depth).toBe(1);
    expect(precisionScore(shifted.state)).toBeLessThan(precisionScore(exact.state));
    expect(precisionScore(shifted.state)).toBeLessThan(0.5);
  });

  it('corte fora da guia é erro, sangra e não abre a incisão', () => {
    const sim = sandbox({ incisions: [straightIncision('a', -80, 80, 0)] });
    drag(sim, 'scalpel', line(0).slice(0, 1).concat([{ x: 0, y: 0 }]), 30); // metade na linha
    const before = precisionScore(sim.state);
    drag(sim, 'scalpel', line(40), 60);
    expect(sim.state.errors.offGuide).toBe(1);
    expect(sim.state.bleeders.length).toBeGreaterThan(0);
    expect(sim.state.nicks.length).toBe(1);
    expect(sim.state.incisions[0]!.depth).toBe(0);
    expect(precisionScore(sim.state)).toBeLessThan(before);
  });

  it('cada passada abre uma camada até a cavidade', () => {
    const sim = sandbox({ incisions: [straightIncision('a', -80, 80, 0, CAVITY_DEPTH)] });
    for (let pass = 1; pass <= 4; pass++) {
      drag(sim, 'scalpel', line(0), 60);
      expect(sim.state.incisions[0]!.depth).toBe(Math.min(pass, CAVITY_DEPTH));
    }
  });

  it('afastador abre, mantém aberto ao soltar e fecha arrastando de volta', () => {
    const sim = sandbox({ incisions: [straightIncision('a', -80, 80, 0, 1, 1)] });
    drag(sim, 'retractor', [
      { x: 0, y: -3 },
      { x: 0, y: -30 },
    ]);
    const inc = sim.state.incisions[0]!;
    expect(inc.openWidth).toBeGreaterThan(20);
    expect(inc.openWidth).toBeLessThanOrEqual(RETRACTOR_MAX_OPEN);
    expect(sim.state.tool.grab).toBeNull();
    drag(sim, 'retractor', [
      { x: 0, y: -inc.openWidth },
      { x: 0, y: 0 },
    ]);
    expect(inc.openWidth).toBe(0);
  });

  it('afastador não pega pele intacta', () => {
    const sim = sandbox({ incisions: [straightIncision('a', -80, 80, 0)] });
    drag(sim, 'retractor', [
      { x: 0, y: -3 },
      { x: 0, y: -30 },
    ]);
    expect(sim.state.incisions[0]!.openWidth).toBe(0);
  });
});
