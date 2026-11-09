import { describe, expect, it } from 'vitest';
import { ARREST_BLOOD_LOSS, CAUTERY_MAX_POOL, HR_BASE, SYSTOLIC_BASE } from '../src/sim/tuning';
import { click, drag, hold, idle, sandbox } from './helpers';

describe('sangramento e sinais vitais', () => {
  it('sangramento sem tratamento leva à parada cardíaca', () => {
    const sim = sandbox({ bleeders: [{ x: 0, y: 0, rate: 10 }] });
    idle(sim, 60);
    expect(sim.state.outcome).toBe('running');
    expect(sim.state.vitals.heartRate).toBeGreaterThan(HR_BASE + 10);
    expect(sim.state.vitals.systolic).toBeLessThan(SYSTOLIC_BASE);
    idle(sim, 120);
    expect(sim.state.outcome).toBe('arrest');
    expect(sim.state.vitals.status).toBe('arrest');
    expect(sim.state.vitals.bloodLost).toBeGreaterThanOrEqual(ARREST_BLOOD_LOSS);
    expect(sim.state.score?.outcome).toBe('arrest');
    expect(sim.state.score?.stars).toBe(0);
    // Parada encerra: mais passos não mudam nada.
    const lost = sim.state.vitals.bloodLost;
    idle(sim, 5);
    expect(sim.state.vitals.bloodLost).toBe(lost);
  });

  it('vitais pioram em etapas: estável, alerta, crítico', () => {
    const sim = sandbox({ bleeders: [{ x: 0, y: 0, rate: 10 }] });
    const seen = new Set<string>();
    for (let i = 0; i < 60 * 160 && sim.state.outcome === 'running'; i++) {
      hold(sim, 'scalpel', 0, 0, false);
      seen.add(sim.state.vitals.status);
    }
    expect([...seen]).toEqual(['stable', 'warning', 'critical', 'arrest']);
  });

  it('cautério estanca o sangramento e a perda para', () => {
    const sim = sandbox({ bleeders: [{ x: 20, y: 5, rate: 3 }] });
    idle(sim, 2);
    click(sim, 'cautery', 22, 6);
    expect(sim.state.bleeders.every((b) => !b.active)).toBe(true);
    const lost = sim.state.vitals.bloodLost;
    idle(sim, 10, 'cautery');
    expect(sim.state.vitals.bloodLost).toBeCloseTo(lost, 5);
    expect(sim.state.errors.burn).toBe(0);
  });

  it('cautério em tecido sadio é queimadura (erro leve)', () => {
    const sim = sandbox({});
    click(sim, 'cautery', 50, 50);
    expect(sim.state.errors.burn).toBe(1);
    expect(sim.state.burns).toHaveLength(1);
  });

  it('poça grande esconde o vaso: aspira e depois cauteriza', () => {
    const sim = sandbox({ bleeders: [{ x: 0, y: 0, rate: 5 }] });
    idle(sim, 8);
    expect(sim.state.bleeders[0]!.pool).toBeGreaterThan(CAUTERY_MAX_POOL);
    click(sim, 'cautery', 0, 0);
    expect(sim.state.bleeders[0]!.active).toBe(true);
    hold(sim, 'suction', 0, 0, false);
    hold(sim, 'suction', 0, 0, true, 90);
    hold(sim, 'suction', 0, 0, false);
    expect(sim.state.bleeders[0]!.pool).toBeLessThan(CAUTERY_MAX_POOL);
    click(sim, 'cautery', 0, 0);
    expect(sim.state.bleeders[0]!.active).toBe(false);
  });

  it('pressão da gaze estanca sangramento pequeno e a gaze limpa a poça', () => {
    const sim = sandbox({ bleeders: [{ x: 0, y: 0, rate: 1.5 }] });
    idle(sim, 3, 'gauze');
    let stopped = false;
    for (let i = 0; i < 120; i++) {
      hold(sim, 'gauze', 2, 2, true);
      stopped ||= sim.events.some((e) => e.type === 'gauzeStop');
    }
    expect(stopped).toBe(true);
    expect(sim.state.bleeders.every((b) => !b.active)).toBe(true);
    drag(
      sim,
      'gauze',
      [
        { x: -8, y: 0 },
        { x: 8, y: 0 },
        { x: -8, y: 0 },
        { x: 8, y: 0 },
      ],
      30,
    );
    expect(sim.state.bleeders).toHaveLength(0); // estancado e limpo = descartado
  });

  it('gaze não estanca sangramento grande', () => {
    const sim = sandbox({ bleeders: [{ x: 0, y: 0, rate: 8 }] });
    hold(sim, 'gauze', 0, 0, true, 300);
    expect(sim.state.bleeders[0]!.active).toBe(true);
  });

  it('o ECG bate no ritmo da frequência', () => {
    const sim = sandbox({});
    let beats = 0;
    for (let i = 0; i < 60 * 60; i++) {
      hold(sim, 'scalpel', 0, 0, false);
      beats += sim.events.filter((e) => e.type === 'beat').length;
    }
    expect(beats).toBeGreaterThanOrEqual(HR_BASE - 2);
    expect(beats).toBeLessThanOrEqual(HR_BASE + 2);
  });
  it('trocar de instrumento com o botão apertado espera soltar', () => {
    const sim = sandbox({ bleeders: [{ x: 0, y: 0, rate: 3 }] });
    hold(sim, 'retractor', 0, 0, true, 5);
    hold(sim, 'cautery', 0, 0, true, 5);
    expect(sim.state.bleeders[0]!.active).toBe(true);
    click(sim, 'cautery', 0, 0);
    expect(sim.state.bleeders[0]!.active).toBe(false);
  });
});
