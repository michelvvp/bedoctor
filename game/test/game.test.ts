import { describe, expect, it } from 'vitest';
import { FixedLoop, MAX_STEPS_PER_FRAME } from '../src/game/loop';
import { PROGRESS_KEY, loadProgress, recordResult, type StorageLike } from '../src/game/progress';
import { eventFeedback, toolInfos } from '../src/game/texts';
import { keyAction } from '../src/input/keys';
import { TOOL_ORDER } from '../src/sim';
import { FIXED_DT } from '../src/sim/tuning';

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

describe('progresso no localStorage', () => {
  it('guarda melhor nota e melhor tempo separados', () => {
    const storage = memoryStorage();
    expect(recordResult(storage, 'teste', 70, 50)).toEqual({ newBestScore: true, newBestTime: true });
    expect(recordResult(storage, 'teste', 90, 80)).toEqual({ newBestScore: true, newBestTime: false });
    expect(recordResult(storage, 'teste', 60, 40)).toEqual({ newBestScore: false, newBestTime: true });
    expect(loadProgress(storage)).toEqual({ teste: { bestScore: 90, bestTimeSec: 40 } });
  });

  it('ignora dado corrompido e funciona sem storage', () => {
    const storage = memoryStorage();
    storage.data.set(PROGRESS_KEY, '{nada');
    expect(loadProgress(storage)).toEqual({});
    expect(loadProgress(null)).toEqual({});
    expect(recordResult(null, 'teste', 50, 10).newBestScore).toBe(true);
  });
});

describe('loop de passo fixo', () => {
  it('dá um passo por FIXED_DT acumulado, com teto por quadro', () => {
    const loop = new FixedLoop();
    let steps = 0;
    loop.advance(FIXED_DT * 0.5, () => steps++);
    expect(steps).toBe(0);
    loop.advance(FIXED_DT * 0.6, () => steps++);
    expect(steps).toBe(1);
    expect(loop.advance(10, () => steps++)).toBe(MAX_STEPS_PER_FRAME);
  });
});

describe('entrada e textos', () => {
  it('teclas 1–8 escolhem os instrumentos na ordem', () => {
    expect(keyAction('Digit1')).toEqual({ type: 'tool', index: 0 });
    expect(keyAction('Digit8')).toEqual({ type: 'tool', index: 7 });
    expect(keyAction('Digit9')).toBeNull();
    expect(keyAction('KeyM')).toEqual({ type: 'mute' });
    expect(keyAction('Escape')).toEqual({ type: 'pause' });
    const tools = toolInfos(TOOL_ORDER);
    expect(tools.map((t) => t.name)).toEqual([
      'Bisturi',
      'Afastador',
      'Pinça',
      'Tesoura',
      'Gaze',
      'Aspirador',
      'Porta-agulha',
      'Cautério',
    ]);
  });

  it('erros viram mensagem de erro', () => {
    expect(eventFeedback({ type: 'cutMiss', x: 0, y: 0, value: 0 })?.kind).toBe('error');
    expect(eventFeedback({ type: 'beat', x: 0, y: 0, value: 0 })).toBeNull();
  });
});
