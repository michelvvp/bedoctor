// Fumaça do desenho: roda as funções de render com um contexto 2D falso (Node
// não tem canvas) num estado de cirurgia cheio, para pegar exceção no caminho.

import { describe, expect, it } from 'vitest';
import { drawInstrument } from '../src/render/instruments';
import { drawScene } from '../src/render/scene';
import { drawSurgical } from '../src/render/surgical';
import { View } from '../src/render/view';
import { TOOL_ORDER } from '../src/sim';
import { click, drag, sandbox, straightIncision } from './helpers';

function fakeContext(): { ctx: CanvasRenderingContext2D; calls: Map<string, number> } {
  const calls = new Map<string, number>();
  const props: Record<string, unknown> = {};
  const ctx = new Proxy(props, {
    get(target, key: string) {
      if (key in target) return target[key];
      return (..._args: unknown[]) => {
        calls.set(key, (calls.get(key) ?? 0) + 1);
      };
    },
    set(target, key: string, value) {
      target[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

describe('render', () => {
  it('desenha cena, cirurgia em andamento e todos os instrumentos sem erro', () => {
    const sim = sandbox({
      incisions: [straightIncision('a', -90, 90, 0, 3), straightIncision('b', -60, 60, 70, 1, 1)],
      sutureMarks: [{ incision: 'b', count: 3 }],
      organs: [{ id: 'ap', kind: 'appendix', x: 0, y: 0, halfLength: 14, radius: 5 }],
      structures: [{ id: 'v', kind: 'vessel', organ: 'ap', a: { x: 14, y: 0 }, b: { x: 30, y: 8 }, bleedRate: 5 }],
    });
    for (let i = 0; i < 3; i++) {
      drag(sim, 'scalpel', [
        { x: -90, y: 0 },
        { x: 90, y: 0 },
      ]);
    }
    drag(sim, 'scalpel', [
      { x: -60, y: -60 },
      { x: 60, y: -60 },
    ]);
    drag(sim, 'retractor', [
      { x: 0, y: -3 },
      { x: 0, y: -40 },
    ]);
    click(sim, 'scissors', 22, 4);
    click(sim, 'cautery', 100, -90);
    const s = sim.state.incisions[1]!.stitches[0]!;
    click(sim, 'needleDriver', s.left.x, s.left.y);
    click(sim, 'needleDriver', s.right.x, s.right.y);
    click(sim, 'needleDriver', sim.state.incisions[1]!.stitches[1]!.left.x, sim.state.incisions[1]!.stitches[1]!.left.y);
    sim.step({ tool: 'forceps', x: 0, y: 0, down: false });
    sim.step({ tool: 'forceps', x: 0, y: 0, down: true });
    sim.step({ tool: 'forceps', x: 0, y: -25, down: true });
    expect(sim.state.nicks.length).toBeGreaterThan(0);
    expect(sim.state.bleeders.length).toBeGreaterThan(0);

    const { ctx, calls } = fakeContext();
    drawScene(ctx);
    drawSurgical(ctx, sim.state, 1.5);
    for (const tool of TOOL_ORDER) {
      drawInstrument(ctx, tool, 100, 100, false);
      drawInstrument(ctx, tool, 100, 100, true);
    }
    expect(calls.get('fill')).toBeGreaterThan(10);
    expect(calls.get('stroke')).toBeGreaterThan(10);
    expect(calls.get('clip')).toBeGreaterThan(0);
  });

  it('a câmera ida e volta entre tela e mundo', () => {
    const view = new View();
    view.fit(1280, 800);
    expect(view.toWorldX(view.toScreenX(37))).toBeCloseTo(37, 9);
    expect(view.toWorldY(view.toScreenY(-12))).toBeCloseTo(-12, 9);
    expect(view.toScreenX(0)).toBe(640);
  });
});
