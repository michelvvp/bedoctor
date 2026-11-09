// Recordes por cirurgia (melhor nota e melhor tempo) no localStorage.

export const PROGRESS_KEY = 'bedoctor.progress.v1';

export interface SurgeryRecord {
  bestScore: number;
  /** Melhor tempo (s) entre as vezes concluídas. */
  bestTimeSec: number;
}

/** O pedaço do `Storage` que o progresso usa (dá para testar sem navegador). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type Progress = Record<string, SurgeryRecord>;

export function loadProgress(storage: StorageLike | null): Progress {
  if (!storage) return {};
  try {
    const raw = storage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return {};
    const progress: Progress = {};
    for (const [id, value] of Object.entries(data)) {
      const r = value as Partial<SurgeryRecord>;
      if (typeof r.bestScore === 'number' && typeof r.bestTimeSec === 'number') {
        progress[id] = { bestScore: r.bestScore, bestTimeSec: r.bestTimeSec };
      }
    }
    return progress;
  } catch {
    return {};
  }
}

/** Registra uma cirurgia concluída e diz o que virou recorde. */
export function recordResult(
  storage: StorageLike | null,
  surgeryId: string,
  score: number,
  timeSec: number,
): { newBestScore: boolean; newBestTime: boolean } {
  const progress = loadProgress(storage);
  const old = progress[surgeryId];
  const newBestScore = !old || score > old.bestScore;
  const newBestTime = !old || timeSec < old.bestTimeSec;
  progress[surgeryId] = {
    bestScore: newBestScore ? score : old.bestScore,
    bestTimeSec: newBestTime ? timeSec : old.bestTimeSec,
  };
  try {
    storage?.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Armazenamento cheio ou bloqueado: o jogo segue sem salvar.
  }
  return { newBestScore, newBestTime };
}
