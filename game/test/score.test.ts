import { describe, expect, it } from 'vitest';
import { computeScore, timeScore, bloodScore } from '../src/sim/score';
import { createState } from '../src/sim';
import { ARREST_BLOOD_LOSS } from '../src/sim/tuning';

describe('nota', () => {
  it('fica sempre entre 0 e 100, com estrelas coerentes', () => {
    const cases = [
      { time: 0, blood: 0, dev: 0, errors: 0 },
      { time: 30, blood: 50, dev: 1, errors: 0 },
      { time: 400, blood: 1400, dev: 40, errors: 30 },
      { time: 1e6, blood: 1e6, dev: 1e6, errors: 1e6 },
    ];
    for (const c of cases) {
      const s = createState();
      s.outcome = 'complete';
      s.time = c.time;
      s.vitals.bloodLost = c.blood;
      s.cut.length = 100;
      s.cut.deviationSum = c.dev * 100;
      s.errors.offGuide = c.errors;
      s.errors.burn = c.errors;
      const r = computeScore(s, 60);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(r.score)).toBe(true);
      expect(r.stars).toBeGreaterThanOrEqual(1);
      expect(r.reasons.length).toBeGreaterThan(0);
    }
  });

  it('cirurgia perfeita tira 100 e 3 estrelas', () => {
    const s = createState();
    s.outcome = 'complete';
    s.time = 20;
    const r = computeScore(s, 60);
    expect(r.score).toBe(100);
    expect(r.stars).toBe(3);
  });

  it('parada cardíaca dá nota 0 e nenhuma estrela', () => {
    const s = createState();
    s.outcome = 'arrest';
    s.vitals.bloodLost = ARREST_BLOOD_LOSS;
    const r = computeScore(s, 60);
    expect(r.score).toBe(0);
    expect(r.stars).toBe(0);
    expect(r.reasons[0]).toMatch(/parada/);
  });

  it('tempo e sangue descem de forma monótona', () => {
    expect(timeScore(60, 60)).toBe(1);
    expect(timeScore(90, 60)).toBeLessThan(1);
    expect(timeScore(180, 60)).toBe(0);
    expect(bloodScore(100)).toBe(1);
    expect(bloodScore(800)).toBeLessThan(bloodScore(400));
    expect(bloodScore(ARREST_BLOOD_LOSS)).toBe(0);
  });
});
