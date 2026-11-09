import { describe, expect, it } from 'vitest';
import { click, drag, hold, sandbox, straightIncision } from './helpers';

function wound() {
  return sandbox({
    incisions: [straightIncision('a', -80, 80, 0, 1, 1)],
    sutureMarks: [{ incision: 'a', count: 3 }],
  });
}

describe('sutura', () => {
  it('três pontos fecham a incisão', () => {
    const sim = wound();
    const inc = sim.state.incisions[0]!;
    expect(inc.stitches).toHaveLength(3);
    for (const s of inc.stitches) {
      click(sim, 'needleDriver', s.left.x, s.left.y);
      expect(sim.state.tool.pendingStitch).not.toBeNull();
      click(sim, 'needleDriver', s.right.x + 1, s.right.y);
      expect(s.done).toBe(true);
    }
    expect(inc.sutured).toBe(true);
    expect(sim.state.errors.stitchMiss).toBe(0);
  });

  it('segundo furo longe da marca é ponto errado', () => {
    const sim = wound();
    const s = sim.state.incisions[0]!.stitches[0]!;
    click(sim, 'needleDriver', s.right.x, s.right.y);
    click(sim, 'needleDriver', s.left.x + 40, s.left.y);
    expect(s.done).toBe(false);
    expect(sim.state.errors.stitchMiss).toBe(1);
    expect(sim.state.tool.pendingStitch).toBeNull();
  });

  it('não sutura com o afastador aberto', () => {
    const sim = wound();
    drag(sim, 'retractor', [
      { x: 0, y: -3 },
      { x: 0, y: -30 },
    ]);
    const s = sim.state.incisions[0]!.stitches[1]!;
    hold(sim, 'needleDriver', s.left.x, s.left.y, false);
    hold(sim, 'needleDriver', s.left.x, s.left.y, true);
    expect(sim.events.map((e) => e.type)).toContain('stitchBlocked');
    expect(sim.state.tool.pendingStitch).toBeNull();
  });
});
