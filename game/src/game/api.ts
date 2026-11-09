// A API que o jogo expõe para a ui/ (menus e HUD). A ui/ importa só este
// arquivo: tudo que ela mostra vem de `GameState` e tudo que ela faz é um
// comando de `GameApi`.

import type { ToolId } from '../sim/tools';
import type { VitalsStatus } from '../sim/types';

export type { ToolId, VitalsStatus };

/**
 * - `menu`: nenhuma cirurgia em andamento (escolher cirurgia).
 * - `playing` / `paused`: cirurgia em andamento.
 * - `won`: cirurgia concluída (`result` preenchido).
 * - `lost`: parada cardíaca (`result` preenchido).
 */
export type GamePhase = 'menu' | 'playing' | 'paused' | 'won' | 'lost';

export interface ToolInfo {
  id: ToolId;
  /** Tecla que seleciona ('1'–'8'). */
  key: string;
  /** Nome na tela. */
  name: string;
  /** Como usar, uma linha. */
  hint: string;
}

export interface SurgeryInfo {
  id: string;
  name: string;
  description: string;
  stepCount: number;
  /** Tempo de referência (s). */
  parTimeSec: number;
  /** Melhor nota salva (null = nunca concluída). */
  bestScore: number | null;
  /** Melhor tempo (s) entre as vezes concluídas. */
  bestTimeSec: number | null;
}

export interface StepInfo {
  /** Índice da etapa atual (0 = primeira). */
  index: number;
  count: number;
  instruction: string;
  suggestedTool: ToolId;
}

export interface VitalsInfo {
  /** bpm, inteiro. */
  heartRate: number;
  /** mmHg, inteiros. */
  systolic: number;
  diastolic: number;
  /** ml, inteiro. */
  bloodLostMl: number;
  /** Há sangramento ativo agora. */
  bleeding: boolean;
  status: VitalsStatus;
}

export interface FeedbackInfo {
  /** Muda a cada mensagem nova (mesmo se o texto repetir). */
  id: number;
  text: string;
  kind: 'info' | 'success' | 'error';
}

export interface ResultInfo {
  outcome: 'complete' | 'arrest';
  /** Nota 0–100. */
  score: number;
  /** 0 na derrota; 1–3 ao concluir. */
  stars: 0 | 1 | 2 | 3;
  /** Partes da nota, 0–100. */
  precision: number;
  timeScore: number;
  bloodScore: number;
  timeSec: number;
  bloodLostMl: number;
  /** Motivos da nota, em português. */
  reasons: readonly string[];
  /** Bateu o recorde de nota / tempo desta cirurgia. */
  newBestScore: boolean;
  newBestTime: boolean;
}

export interface GameState {
  phase: GamePhase;
  /** Cirurgias do menu, com os recordes salvos. */
  surgeries: readonly SurgeryInfo[];
  /** Cirurgia em andamento (ou a que acabou de terminar). */
  surgery: SurgeryInfo | null;
  step: StepInfo | null;
  tool: ToolId;
  tools: readonly ToolInfo[];
  vitals: VitalsInfo | null;
  /** Tempo de cirurgia (s, inteiro). */
  timeSec: number;
  muted: boolean;
  /** Última mensagem do jogo (corte fora da linha, ponto dado…). */
  feedback: FeedbackInfo | null;
  result: ResultInfo | null;
}

export interface GameApi {
  /** Estado atual (objeto novo a cada mudança; não mutar). */
  getState(): GameState;
  /** Chama `listener` já com o estado atual e a cada mudança. Devolve o cancelamento. */
  subscribe(listener: (state: GameState) => void): () => void;
  /**
   * Copia o traçado do ECG (mais antigo primeiro, valores de -0,3 a 1; 4 s a
   * 60 amostras/s) em `out` e devolve quantas amostras escreveu. Chamar a cada
   * quadro para desenhar o monitor.
   */
  readEcg(out: Float32Array): number;
  startSurgery(id: string): void;
  pause(): void;
  resume(): void;
  /** Volta ao menu, abandonando a cirurgia. */
  exit(): void;
  /** Recomeça a cirurgia atual do zero. */
  restart(): void;
  selectTool(tool: ToolId): void;
  toggleMute(): void;
}
