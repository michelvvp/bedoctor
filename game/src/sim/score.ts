// Nota da cirurgia: precisão (desvio da guia e erros), tempo e sangue perdido.

import {
  ARREST_BLOOD_LOSS,
  BLOOD_FREE_LOSS,
  DEVIATION_ZERO_SCORE,
  ERROR_PENALTY,
  SCORE_WEIGHT_BLOOD,
  SCORE_WEIGHT_PRECISION,
  SCORE_WEIGHT_TIME,
  STARS_2_MIN,
  STARS_3_MIN,
  TIME_ZERO_FACTOR,
} from './tuning';
import type { ErrorCounts, ScoreResult, SimState } from './types';

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Número com vírgula decimal. */
function fmt(value: number, digits = 0): string {
  return value.toFixed(digits).replace('.', ',');
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function totalErrors(errors: ErrorCounts): number {
  return errors.offGuide + errors.burn + errors.stitchMiss + errors.protectedCut;
}

export function averageDeviation(state: Readonly<SimState>): number {
  return state.cut.length > 0 ? state.cut.deviationSum / state.cut.length : 0;
}

/** Precisão 0–1: desvio médio da guia menos o desconto dos erros. */
export function precisionScore(state: Readonly<SimState>): number {
  const deviation = clamp01(1 - averageDeviation(state) / DEVIATION_ZERO_SCORE);
  const e = state.errors;
  const penalty =
    e.offGuide * ERROR_PENALTY.offGuide +
    e.burn * ERROR_PENALTY.burn +
    e.stitchMiss * ERROR_PENALTY.stitchMiss +
    e.protectedCut * ERROR_PENALTY.protectedCut;
  return clamp01(deviation - penalty);
}

/** Tempo 0–1: inteiro até o de referência, cai até zero em TIME_ZERO_FACTOR vezes ele. */
export function timeScore(timeSec: number, parTimeSec: number): number {
  if (timeSec <= parTimeSec) return 1;
  return clamp01(1 - (timeSec - parTimeSec) / (parTimeSec * (TIME_ZERO_FACTOR - 1)));
}

/** Sangue 0–1: inteiro até BLOOD_FREE_LOSS, zero na perda de parada. */
export function bloodScore(bloodLost: number): number {
  return clamp01(1 - (bloodLost - BLOOD_FREE_LOSS) / (ARREST_BLOOD_LOSS - BLOOD_FREE_LOSS));
}

export function computeScore(state: Readonly<SimState>, parTimeSec: number): ScoreResult {
  const precision = precisionScore(state);
  const time = timeScore(state.time, parTimeSec);
  const blood = bloodScore(state.vitals.bloodLost);
  const deviation = averageDeviation(state);
  const errors = totalErrors(state.errors);
  const arrest = state.outcome === 'arrest';
  const score = arrest
    ? 0
    : Math.round(
        100 *
          clamp01(
            SCORE_WEIGHT_PRECISION * precision + SCORE_WEIGHT_TIME * time + SCORE_WEIGHT_BLOOD * blood,
          ),
      );
  const stars: ScoreResult['stars'] = arrest
    ? 0
    : score >= STARS_3_MIN
      ? 3
      : score >= STARS_2_MIN
        ? 2
        : 1;

  const reasons: string[] = [];
  if (arrest) reasons.push('O paciente teve parada cardíaca por perda de sangue.');
  if (state.cut.length > 0) {
    reasons.push(
      deviation <= 2
        ? 'Corte em cima da linha.'
        : `O corte desviou em média ${fmt(deviation, 1)} mm da linha.`,
    );
  }
  const e = state.errors;
  if (e.offGuide > 0) reasons.push(`${plural(e.offGuide, 'corte', 'cortes')} fora da linha.`);
  if (e.burn > 0) reasons.push(`${plural(e.burn, 'queimadura', 'queimaduras')} de cautério em tecido sadio.`);
  if (e.stitchMiss > 0) reasons.push(`${plural(e.stitchMiss, 'ponto errado', 'pontos errados')}.`);
  if (e.protectedCut > 0) {
    reasons.push(
      `${plural(e.protectedCut, 'corte', 'cortes')} onde não devia (estrutura a preservar, órgão ou coto sem ligadura).`,
    );
  }
  if (!arrest) {
    reasons.push(
      time >= 1
        ? `Dentro do tempo (${fmt(state.time)} s de ${fmt(parTimeSec)} s).`
        : `Passou do tempo de referência (${fmt(state.time)} s; referência ${fmt(parTimeSec)} s).`,
    );
  }
  const lost = Math.round(state.vitals.bloodLost);
  reasons.push(lost <= BLOOD_FREE_LOSS ? `Perdeu só ${lost} ml de sangue.` : `Perdeu ${lost} ml de sangue.`);

  return {
    outcome: arrest ? 'arrest' : 'complete',
    score,
    stars,
    precision,
    timeScore: time,
    bloodScore: blood,
    timeSec: state.time,
    bloodLostMl: state.vitals.bloodLost,
    averageDeviation: deviation,
    errors,
    reasons,
  };
}
