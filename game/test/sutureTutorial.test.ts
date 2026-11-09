import { describe, expect, it } from 'vitest';
import { fieldBlood, Simulation, spilledBlood, type SimState, type ToolId } from '../src/sim';
import { SURGERIES } from '../src/surgeries';
import { sutureTutorial } from '../src/surgeries/sutureTutorial';
import { click, drag, hold } from './helpers';

/** Segura o botão `steps` passos em (x, y), soltando antes (trocar de instrumento apertado não age). */
function press(sim: Simulation, tool: ToolId, x: number, y: number, steps: number): void {
  hold(sim, tool, x, y, false);
  hold(sim, tool, x, y, true, steps);
  hold(sim, tool, x, y, false);
}

/** Esfrega a gaze num zigue-zague em volta de (x, y) até a poça sumir (ou desistir). */
function rubUntilClean(sim: Simulation, x: number, y: number, clean: (s: SimState) => boolean): void {
  for (let i = 0; i < 20 && !clean(sim.state); i++) {
    drag(
      sim,
      'gauze',
      [
        { x: x - 8, y: y - 4 },
        { x: x + 8, y: y + 4 },
        { x: x - 8, y: y + 4 },
        { x: x + 8, y: y - 4 },
      ],
      6,
    );
  }
}

/** Joga o tutorial inteiro como o jogador faria, conferindo cada etapa. */
function playTutorial(): Simulation {
  const sim = new Simulation(sutureTutorial);
  const stains = sim.state.bleeders.filter((b) => !b.active).map((b) => ({ x: b.x, y: b.y }));
  const oozes = sim.state.bleeders.filter((b) => b.active).map((b) => ({ x: b.x, y: b.y }));
  expect(stains).toHaveLength(3);
  expect(oozes).toHaveLength(2);

  // 1. Gaze nas manchas da pele.
  expect(sim.state.stepIndex).toBe(0);
  for (const p of stains) rubUntilClean(sim, p.x, p.y, (s) => s.stepIndex > 0);
  expect(sim.state.stepIndex).toBe(1);
  // A gaze não encostou nos pontos que sangram: continuam ativos para o cautério.
  expect(sim.state.bleeders.filter((b) => b.active)).toHaveLength(2);

  // 2. Aspirador nas poças dentro do corte.
  for (const p of oozes) press(sim, 'suction', p.x, p.y, 60);
  expect(sim.state.stepIndex).toBe(2);

  // 3. Cautério em cada ponto.
  for (const p of oozes) click(sim, 'cautery', p.x, p.y);
  expect(sim.state.stepIndex).toBe(3);
  expect(sim.state.errors.burn).toBe(0);

  // 4. Pinça na borda, puxando para fora.
  drag(
    sim,
    'forceps',
    [
      { x: 0, y: -3 },
      { x: 0, y: -12 },
    ],
    20,
  );
  expect(sim.state.stepIndex).toBe(4);
  expect(sim.state.incisions[0]!.heldOpen).toBe(0);

  // 5. Cinco pontos com o porta-agulha.
  const stitches = sim.state.incisions[0]!.stitches;
  expect(stitches).toHaveLength(5);
  for (const s of stitches) {
    click(sim, 'needleDriver', s.left.x, s.left.y);
    click(sim, 'needleDriver', s.right.x, s.right.y);
  }
  expect(sim.state.stepIndex).toBe(5);

  // 6. Tesoura no meio da sobra do fio.
  const thread = sim.state.structures.find((s) => s.id === 'fio')!;
  expect(thread.kind).toBe('thread');
  click(sim, 'scissors', (thread.ax + thread.bx) / 2, (thread.ay + thread.by) / 2);
  return sim;
}

describe('cirurgia 1: sutura de corte (tutorial)', () => {
  it('é a primeira da lista e a Teste não aparece para o jogador', () => {
    expect(SURGERIES[0]).toBe(sutureTutorial);
    expect(SURGERIES.some((s) => s.id === 'teste')).toBe(false);
    expect(sutureTutorial.site).toBe('forearm');
    expect(sutureTutorial.steps.map((s) => s.tool)).toEqual([
      'gauze',
      'suction',
      'cautery',
      'forceps',
      'needleDriver',
      'scissors',
    ]);
  });

  it('começa com vitais estáveis, sangrando devagar, sem bisturi nem afastador', () => {
    const sim = new Simulation(sutureTutorial);
    expect(sim.state.site).toBe('forearm');
    expect(sim.state.incisions[0]!.depth).toBe(1);
    expect(spilledBlood(sim.state)).toBeGreaterThan(0);
    // Parado 2 minutos sem fazer nada: perde pouco sangue e continua estável.
    hold(sim, 'gauze', 0, -80, false, 120 * 60);
    expect(sim.state.outcome).toBe('running');
    expect(sim.state.vitals.status).toBe('stable');
    expect(sim.state.vitals.bloodLost).toBeLessThan(100);
    expect(sutureTutorial.steps.some((s) => s.tool === 'scalpel' || s.tool === 'retractor')).toBe(false);
  });

  it('roteiro completo: gaze, aspirador, cautério, pinça, 5 pontos e tesoura terminam em vitória', () => {
    const sim = playTutorial();
    expect(sim.state.outcome).toBe('complete');
    expect(fieldBlood(sim.state)).toBeLessThan(10);
    const score = sim.state.score!;
    expect(score.outcome).toBe('complete');
    expect(score.errors).toBe(0);
    expect(score.stars).toBe(3);
    expect(score.score).toBeGreaterThanOrEqual(85);
    // Resultado na saída do teste, para conferir o tuning sem abrir o jogo.
    console.log(
      `Tutorial concluído: nota ${score.score}, ${score.stars} estrelas, ` +
        `${score.timeSec.toFixed(1)} s, ${score.bloodLostMl.toFixed(1)} ml perdidos`,
    );
  });

  it('é tolerante: estancar um ponto com a gaze não trava o roteiro', () => {
    const sim = new Simulation(sutureTutorial);
    // Gaze apertada em cima de um ponto que sangra estanca (vazão lenta).
    const ooze = sim.state.bleeders.find((b) => b.active)!;
    press(sim, 'gauze', ooze.x, ooze.y, 120);
    expect(ooze.active).toBe(false);
    // Limpa tudo com a gaze; a etapa do aspirador e a do cautério continuam possíveis.
    for (const b of [...sim.state.bleeders]) rubUntilClean(sim, b.x, b.y, (s) => s.stepIndex > 0);
    expect(sim.state.stepIndex).toBeGreaterThanOrEqual(1);
    const left = sim.state.bleeders.find((b) => b.active)!;
    press(sim, 'suction', left.x, left.y, 90);
    press(sim, 'suction', ooze.x, ooze.y, 30);
    expect(sim.state.stepIndex).toBe(2);
    click(sim, 'cautery', left.x, left.y);
    expect(sim.state.stepIndex).toBe(3);
  });
});
