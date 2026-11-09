import { describe, expect, it } from 'vitest';
import type { SetupDef } from '../src/sim';
import { ORGAN_REMOVE_DISTANCE } from '../src/sim/tuning';
import { click, drag, hold, sandbox, straightIncision } from './helpers';

/** Cavidade aberta (3 camadas) com um órgão preso por um vaso. */
function cavity(open: boolean, extra: Partial<SetupDef> = {}): SetupDef {
  return {
    incisions: [straightIncision('a', -90, 90, 0, 3, open ? 3 : 0)],
    organs: [{ id: 'ap', kind: 'appendix', x: 0, y: 0, halfLength: 14, radius: 5, removable: true }],
    structures: [
      { id: 'vaso', kind: 'vessel', organ: 'ap', a: { x: 14, y: 0 }, b: { x: 30, y: 8 }, bleedRate: 12, ligatable: true },
    ],
    ...extra,
  };
}

function openWide(sim: ReturnType<typeof sandbox>): void {
  drag(sim, 'retractor', [
    { x: 0, y: -3 },
    { x: 0, y: -40 },
  ]);
}

describe('órgãos e estruturas', () => {
  it('pinça só alcança o órgão com a cavidade aberta', () => {
    const closed = sandbox(cavity(false));
    drag(closed, 'forceps', [
      { x: 0, y: 0 },
      { x: 0, y: -20 },
    ]);
    expect(closed.state.organs[0]!.y).toBe(0);

    const sim = sandbox(cavity(true));
    openWide(sim);
    drag(sim, 'forceps', [
      { x: 0, y: 0 },
      { x: 0, y: -20 },
    ]);
    expect(sim.state.organs[0]!.y).toBeCloseTo(-20, 5);
  });

  it('órgão preso não passa da folga e não sai do corpo', () => {
    const sim = sandbox(cavity(true));
    openWide(sim);
    drag(sim, 'forceps', [
      { x: 0, y: 0 },
      { x: 0, y: -150 },
    ]);
    const organ = sim.state.organs[0]!;
    expect(organ.y).toBeCloseTo(-organ.tether, 5);
    expect(organ.removed).toBe(false);
  });

  it('tesoura corta o vaso sem ligar: sangra forte', () => {
    const sim = sandbox(cavity(true));
    openWide(sim);
    click(sim, 'scissors', 22, 4);
    expect(sim.state.structures[0]!.cut).toBe(true);
    expect(sim.state.bleeders.some((b) => b.active && b.rate === 12)).toBe(true);
  });

  it('ligar, cortar e puxar retira o órgão sem sangrar', () => {
    const sim = sandbox(cavity(true));
    openWide(sim);
    click(sim, 'needleDriver', 22, 4);
    expect(sim.state.structures[0]!.ligated).toBe(true);
    // Arrastar a tesoura atravessando o vaso também corta.
    drag(sim, 'scissors', [
      { x: 22, y: -10 },
      { x: 22, y: 15 },
    ]);
    expect(sim.state.structures[0]!.cut).toBe(true);
    expect(sim.state.bleeders.some((b) => b.active)).toBe(false);
    drag(sim, 'forceps', [
      { x: 0, y: 0 },
      { x: 0, y: -(ORGAN_REMOVE_DISTANCE + 10) },
    ]);
    expect(sim.state.organs[0]!.removed).toBe(true);
  });

  it('cortar estrutura a preservar é erro grave', () => {
    const sim = sandbox(
      cavity(true, {
        structures: [{ id: 'nervo', kind: 'band', a: { x: -30, y: -10 }, b: { x: -30, y: 10 }, protected: true }],
      }),
    );
    openWide(sim);
    hold(sim, 'scissors', -30, 0, false);
    hold(sim, 'scissors', -30, 0, true);
    expect(sim.events.map((e) => e.type)).toContain('protectedCut');
    expect(sim.state.errors.protectedCut).toBe(1);
  });
});
