import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/sim';
import { SURGERIES } from '../src/surgeries';
import { testSurgery } from '../src/surgeries/test';
import { click, drag, hold } from './helpers';

/** Joga a cirurgia "Teste" do jeito certo e devolve a simulação no fim. */
function playTest(): Simulation {
  const sim = new Simulation(testSurgery);
  drag(
    sim,
    'scalpel',
    [
      { x: -80, y: 10 },
      { x: 80, y: 10 },
    ],
    90,
  );
  expect(sim.state.stepIndex).toBe(1);
  // Cauteriza cada sangramento que o corte abriu.
  for (const b of [...sim.state.bleeders]) {
    if (b.active) click(sim, 'cautery', b.x, b.y);
  }
  hold(sim, 'cautery', 0, 0, false, 2);
  expect(sim.state.stepIndex).toBe(2);
  const inc = sim.state.incisions[0]!;
  expect(inc.stitches).toHaveLength(3);
  for (const s of inc.stitches) {
    click(sim, 'needleDriver', s.left.x, s.left.y);
    click(sim, 'needleDriver', s.right.x, s.right.y);
  }
  hold(sim, 'needleDriver', 0, 0, false, 2);
  return sim;
}

describe('cirurgias', () => {
  it('toda cirurgia tem etapas com instrução e id únicos', () => {
    const ids = new Set(SURGERIES.map((s) => s.id));
    expect(ids.size).toBe(SURGERIES.length);
    for (const s of SURGERIES) {
      expect(s.steps.length).toBeGreaterThan(0);
      for (const step of s.steps) expect(step.instruction.length).toBeGreaterThan(0);
    }
  });

  it('a cirurgia Teste vai do corte à sutura e dá nota', () => {
    const sim = playTest();
    expect(sim.state.outcome).toBe('complete');
    const score = sim.state.score!;
    expect(score.score).toBeGreaterThanOrEqual(85);
    expect(score.score).toBeLessThanOrEqual(100);
    expect(score.stars).toBe(3);
  });

  it('é determinística: mesmas entradas, mesmo resultado', () => {
    const a = playTest();
    const b = playTest();
    expect(b.state.score).toEqual(a.state.score);
    expect(b.state.vitals.bloodLost).toBe(a.state.vitals.bloodLost);
  });
});
