import { describe, expect, it } from 'vitest';
import { drawScene } from '../src/render/scene';
import { drawSurgical } from '../src/render/surgical';
import { organExposed, Simulation, type ToolId } from '../src/sim';
import { structureA } from '../src/sim/organs';
import { precisionScore } from '../src/sim/score';
import { ORGAN_REMOVE_DISTANCE } from '../src/sim/tuning';
import { SURGERIES } from '../src/surgeries';
import { appendectomy, incisionPoint as P } from '../src/surgeries/appendectomy';
import { click, drag, hold, idle } from './helpers';

/** Segura o botão `steps` passos em (x, y), soltando antes e depois. */
function press(sim: Simulation, tool: ToolId, x: number, y: number, steps: number): void {
  hold(sim, tool, x, y, false);
  hold(sim, tool, x, y, true, steps);
  hold(sim, tool, x, y, false);
}

const guide = (sim: Simulation) => sim.state.incisions[0]!;

/** Uma passada do bisturi em cima da guia inteira. */
function scalpelPass(sim: Simulation): void {
  drag(sim, 'scalpel', guide(sim).guide, 90);
}

/** Aspira a poça (se cobrir o vaso) e cauteriza, até nada mais sangrar. */
function stopBleeding(sim: Simulation): void {
  for (let i = 0; i < 80; i++) {
    const b = sim.state.bleeders.find((x) => x.active);
    if (!b) return;
    if (b.pool > 10) press(sim, 'suction', b.x, b.y, 30);
    click(sim, 'cautery', b.x, b.y);
  }
}

/** Afastador: uma borda para fora, depois a outra. */
function retract(sim: Simulation): void {
  drag(sim, 'retractor', [P(0, 3), P(0, 30)]);
  const open = guide(sim).openWidth;
  drag(sim, 'retractor', [P(0, -(open + 1.5)), P(0, -(open + 8))]);
}

/** Pinça: afasta as duas alças para os lados, para longe do apêndice. */
function moveLoops(sim: Simulation): void {
  drag(sim, 'forceps', [P(4, -9), P(4, -25)]);
  drag(sim, 'forceps', [P(8, 11), P(8, 27)]);
}

/** Ponto a `u` (0–1) ao longo da base do apêndice. */
function basePoint(sim: Simulation, u: number): { x: number; y: number } {
  const base = sim.state.structures.find((s) => s.id === 'base')!;
  const a = { x: 0, y: 0 };
  structureA(sim.state, base, a);
  return { x: a.x + (base.bx - a.x) * u, y: a.y + (base.by - a.y) * u };
}

/** Joga até começar a etapa `stepIndex` (0 = pele), como o jogador faria. */
function playUntil(stepIndex: number): Simulation {
  const sim = new Simulation(appendectomy);
  const at = () => sim.state.stepIndex;
  const steps: (() => void)[] = [
    // 1. Pele.
    () => scalpelPass(sim),
    // 2. Gordura e fáscia: mais duas passadas.
    () => {
      scalpelPass(sim);
      scalpelPass(sim);
    },
    // 3. Afastador nas duas bordas.
    () => retract(sim),
    // 4. Estancar tudo (cortes das camadas e os 2 vasos da parede).
    () => stopBleeding(sim),
    // 5. Alças para os lados.
    () => moveLoops(sim),
    // 6. Ligadura na marca da base.
    () => {
      const base = sim.state.structures.find((s) => s.id === 'base')!;
      const mark = basePoint(sim, base.ligateAt);
      click(sim, 'needleDriver', mark.x, mark.y);
    },
    // 7. Tesoura entre o nó e o apêndice; pinça leva o apêndice até a cuba.
    () => {
      const cut = basePoint(sim, 0.3);
      click(sim, 'scissors', cut.x, cut.y);
      const home = P(6, 0);
      drag(sim, 'forceps', [home, { x: 0, y: 10 }, { x: 232, y: 30 }], 40);
    },
    // 8. Fecha o afastador arrastando a borda de volta ao meio.
    () => {
      const open = guide(sim).openWidth;
      drag(sim, 'retractor', [P(0, open + 1.5), P(0, 0)]);
    },
    // 9. Cinco pontos.
    () => {
      for (const s of guide(sim).stitches) {
        click(sim, 'needleDriver', s.left.x, s.left.y);
        click(sim, 'needleDriver', s.right.x, s.right.y);
      }
    },
    // 10. Sobra do fio.
    () => {
      const thread = sim.state.structures.find((s) => s.id === 'fio')!;
      click(sim, 'scissors', (thread.ax + thread.bx) / 2, (thread.ay + thread.by) / 2);
    },
  ];
  for (let i = 0; i < stepIndex; i++) {
    expect(at(), `antes da etapa ${i + 1}`).toBe(i);
    steps[i]!();
    hold(sim, 'forceps', 0, -200, false, 2);
    expect(at(), `depois da etapa ${i + 1} (${appendectomy.steps[i]!.id})`).toBe(i + 1);
  }
  return sim;
}

describe('cirurgia 2: apendicectomia', () => {
  it('é a segunda da lista, no abdome, com o roteiro de 10 etapas', () => {
    expect(SURGERIES[1]).toBe(appendectomy);
    expect(appendectomy.site).toBe('abdomen');
    expect(appendectomy.steps.map((s) => s.tool)).toEqual([
      'scalpel',
      'scalpel',
      'retractor',
      'cautery',
      'forceps',
      'needleDriver',
      'scissors',
      'retractor',
      'needleDriver',
      'scissors',
    ]);
    // Incisão no quadrante inferior direito do paciente: lado esquerdo da tela, abaixo do umbigo.
    for (const p of new Simulation(appendectomy).state.incisions[0]!.guide) {
      expect(p.x).toBeLessThan(-60);
      expect(p.y).toBeGreaterThanOrEqual(-10);
    }
  });

  it('as alças cobrem o apêndice até serem afastadas', () => {
    const sim = playUntil(4);
    expect(organExposed(sim.state, 'apendice')).toBe(false);
    // Clicar no apêndice pega a alça de cima, não ele.
    drag(sim, 'forceps', [P(6, 0), P(6, 4)]);
    const appendix = sim.state.organs.find((o) => o.id === 'apendice')!;
    expect(appendix.x).toBe(appendix.homeX);
    moveLoops(sim);
    expect(organExposed(sim.state, 'apendice')).toBe(true);
    // Presas pelo mesentério: afastam, mas continuam na cavidade.
    for (const id of ['alca1', 'alca2']) {
      const loop = sim.state.organs.find((o) => o.id === id)!;
      expect(Math.hypot(loop.x - loop.homeX, loop.y - loop.homeY)).toBeLessThanOrEqual(loop.tether + 1e-9);
    }
  });

  it('roteiro completo: do corte na pele ao fio cortado, termina em vitória', () => {
    const sim = playUntil(appendectomy.steps.length);
    expect(sim.state.outcome).toBe('complete');
    const appendix = sim.state.organs.find((o) => o.id === 'apendice')!;
    expect(appendix.removed).toBe(true);
    expect(Math.hypot(appendix.x - appendix.homeX, appendix.y - appendix.homeY)).toBeGreaterThan(ORGAN_REMOVE_DISTANCE);
    const score = sim.state.score!;
    expect(score.outcome).toBe('complete');
    expect(score.errors).toBe(0);
    expect(score.score).toBeGreaterThanOrEqual(60);
    expect(score.stars).toBeGreaterThanOrEqual(2);
    // Resultado na saída do teste, para conferir o tuning sem abrir o jogo.
    console.log(
      `Apendicectomia concluída: nota ${score.score}, ${score.stars} estrelas, ` +
        `${score.timeSec.toFixed(1)} s, ${score.bloodLostMl.toFixed(0)} ml perdidos`,
    );
  });

  it('cortar o intestino com a tesoura é erro grave e sangra forte', () => {
    const sim = playUntil(4);
    const before = precisionScore(sim.state);
    const bleeders = sim.state.bleeders.length;
    // Clique em cima da alça de cima, longe de qualquer estrutura.
    hold(sim, 'scissors', P(20, 5).x, P(20, 5).y, false);
    hold(sim, 'scissors', P(20, 5).x, P(20, 5).y, true);
    expect(sim.events.map((e) => e.type)).toContain('protectedCut');
    hold(sim, 'scissors', P(20, 5).x, P(20, 5).y, false);
    expect(sim.state.errors.protectedCut).toBe(1);
    expect(sim.state.bleeders.length).toBe(bleeders + 1);
    const wound = sim.state.bleeders[sim.state.bleeders.length - 1]!;
    expect(wound.active).toBe(true);
    expect(wound.rate).toBeGreaterThanOrEqual(5);
    expect(precisionScore(sim.state)).toBeLessThan(before);
    // O sangramento novo trava o fechamento até ser estancado.
    expect(sim.state.stepIndex).toBe(4);
  });

  it('cortar o apêndice no corpo ou a base abaixo do nó também é erro e sangra', () => {
    const body = playUntil(6);
    click(body, 'scissors', P(10, 0).x, P(10, 0).y);
    expect(body.state.errors.protectedCut).toBe(1);
    expect(body.state.bleeders.some((b) => b.active)).toBe(true);
    expect(body.state.structures.find((s) => s.id === 'base')!.cut).toBe(false);

    const below = playUntil(6);
    const p = basePoint(below, 0.9);
    click(below, 'scissors', p.x, p.y);
    const base = below.state.structures.find((s) => s.id === 'base')!;
    expect(base.cut).toBe(true);
    expect(below.state.errors.protectedCut).toBe(1);
    expect(below.state.bleeders.some((b) => b.active && b.rate >= 8)).toBe(true);

    // Entre o nó e o apêndice: sem erro e sem sangrar.
    const right = playUntil(6);
    const q = basePoint(right, 0.3);
    click(right, 'scissors', q.x, q.y);
    expect(right.state.errors.protectedCut).toBe(0);
    expect(right.state.bleeders.some((b) => b.active)).toBe(false);
  });

  it('o porta-agulha só liga na marca da base', () => {
    const sim = playUntil(5);
    const off = basePoint(sim, 0.1);
    click(sim, 'needleDriver', off.x, off.y);
    expect(sim.state.structures.find((s) => s.id === 'base')!.ligated).toBe(false);
    expect(sim.state.stepIndex).toBe(5);
  });

  it('deixar sangrar leva à parada cardíaca', () => {
    // Abre as camadas e o afastador sem estancar nada; os vasos da parede começam a sangrar.
    const sim = playUntil(3);
    expect(sim.state.vitals.bleedRate).toBeGreaterThan(7);
    // Dá tempo de reagir: meio minuto parado ainda não mata.
    idle(sim, 30);
    expect(sim.state.outcome).toBe('running');
    for (let i = 0; i < 600 && sim.state.outcome === 'running'; i++) idle(sim, 1);
    expect(sim.state.outcome).toBe('arrest');
    expect(sim.state.score!.score).toBe(0);
    expect(sim.state.score!.stars).toBe(0);
    console.log(`Apendicectomia sem estancar: parada aos ${sim.state.time.toFixed(0)} s`);
  });

  it('desenha todas as fases sem erro (cuba, afastador, marca, coto, apêndice na cuba)', () => {
    const calls = new Map<string, number>();
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (t, k: string) => (k in t ? t[k] : () => calls.set(k, (calls.get(k) ?? 0) + 1)),
      set: (t, k: string, v) => ((t[k] = v), true),
    }) as unknown as CanvasRenderingContext2D;
    for (const step of [0, 3, 5, 6, 7, 9]) {
      const sim = playUntil(step);
      drawScene(ctx, sim.state.site);
      drawSurgical(ctx, sim.state, step);
    }
    expect(calls.get('bezierCurveTo')).toBeGreaterThan(0);
    expect(calls.get('clip')).toBeGreaterThan(0);
  });
});
