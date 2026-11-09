// Sinais vitais: frequência cardíaca, pressão e sangue perdido, com dinâmica
// simples e determinística, e o traçado do ECG.

import type { SimCore } from './core';
import {
  ARREST_BLOOD_LOSS,
  ARREST_TAU,
  CRITICAL_LOSS_FRACTION,
  DIASTOLIC_BASE,
  DIASTOLIC_DROP_AT_ARREST,
  ECG_SAMPLES,
  HR_BASE,
  HR_BLEED_RISE_MAX,
  HR_PER_BLEED_RATE,
  HR_RISE_AT_ARREST,
  SYSTOLIC_BASE,
  SYSTOLIC_CRITICAL,
  SYSTOLIC_DROP_AT_ARREST,
  VITALS_TAU,
  WARNING_LOSS_FRACTION,
} from './tuning';
import type { Vitals } from './types';

export function createVitals(): Vitals {
  return {
    heartRate: HR_BASE,
    systolic: SYSTOLIC_BASE,
    diastolic: DIASTOLIC_BASE,
    bloodLost: 0,
    bleedRate: 0,
    status: 'stable',
    beatPhase: 0,
    ecg: new Float32Array(ECG_SAMPLES),
    ecgHead: 0,
  };
}

/** Uma onda gaussiana do traçado. */
function bump(phase: number, center: number, width: number, height: number): number {
  const d = (phase - center) / width;
  return height * Math.exp(-d * d);
}

/** Forma do ECG num batimento (fase 0–1): P, QRS e T. */
export function ecgWave(phase: number): number {
  return (
    bump(phase, 0.1, 0.03, 0.12) +
    bump(phase, 0.2, 0.012, -0.12) +
    bump(phase, 0.23, 0.014, 1) +
    bump(phase, 0.26, 0.014, -0.28) +
    bump(phase, 0.48, 0.05, 0.28)
  );
}

/**
 * Um passo dos vitais. Lê `bloodLost` e `bleedRate` (já atualizados pelo
 * sangramento) e devolve `true` no passo em que acontece a parada.
 */
export function updateVitals(core: SimCore, dt: number): boolean {
  const v = core.state.vitals;
  let arrested = false;
  if (v.status !== 'arrest' && v.bloodLost >= ARREST_BLOOD_LOSS) {
    v.status = 'arrest';
    arrested = true;
  }

  if (v.status === 'arrest') {
    const k = Math.min(1, dt / ARREST_TAU);
    v.heartRate -= v.heartRate * k;
    v.systolic -= v.systolic * k;
    v.diastolic -= v.diastolic * k;
    writeEcg(v, 0);
    return arrested;
  }

  const loss = Math.min(1, v.bloodLost / ARREST_BLOOD_LOSS);
  const targetHr =
    HR_BASE + HR_RISE_AT_ARREST * loss + Math.min(HR_BLEED_RISE_MAX, HR_PER_BLEED_RATE * v.bleedRate);
  const targetSys = SYSTOLIC_BASE - SYSTOLIC_DROP_AT_ARREST * Math.pow(loss, 1.3);
  const targetDia = DIASTOLIC_BASE - DIASTOLIC_DROP_AT_ARREST * loss;
  const k = Math.min(1, dt / VITALS_TAU);
  v.heartRate += (targetHr - v.heartRate) * k;
  v.systolic += (targetSys - v.systolic) * k;
  v.diastolic += (targetDia - v.diastolic) * k;

  v.status =
    loss >= CRITICAL_LOSS_FRACTION || v.systolic < SYSTOLIC_CRITICAL
      ? 'critical'
      : loss >= WARNING_LOSS_FRACTION
        ? 'warning'
        : 'stable';

  v.beatPhase += (v.heartRate / 60) * dt;
  if (v.beatPhase >= 1) {
    v.beatPhase -= 1;
    core.emit('beat', 0, 0, v.heartRate);
  }
  writeEcg(v, ecgWave(v.beatPhase));
  return false;
}

function writeEcg(v: Vitals, value: number): void {
  v.ecg[v.ecgHead] = value;
  v.ecgHead = (v.ecgHead + 1) % v.ecg.length;
}

/** Copia o traçado em ordem cronológica (mais antigo primeiro). Devolve quantas amostras. */
export function readEcg(v: Vitals, out: Float32Array): number {
  const n = Math.min(out.length, v.ecg.length);
  const start = (v.ecgHead - n + v.ecg.length) % v.ecg.length;
  for (let i = 0; i < n; i++) out[i] = v.ecg[(start + i) % v.ecg.length]!;
  return n;
}
