// Estado completo da simulação. Tudo aqui é dado puro: o render lê, o sim
// escreve, os testes conferem.

import type { ToolId } from './tools';
import type { Vec2 } from './vec';

/** Um ponto de sutura: um par de marcas, uma de cada lado da incisão. */
export interface Stitch {
  /** Posição ao longo da guia (0–1). */
  t: number;
  /** Marca do lado 1 (normal da guia) e do lado -1. */
  left: Vec2;
  right: Vec2;
  done: boolean;
}

export interface Incision {
  id: string;
  /** Linha-guia tracejada que o jogador deve seguir com o bisturi. */
  guide: Vec2[];
  /** Comprimento da guia (mm). */
  length: number;
  /** Quantas camadas esta incisão deve abrir (1 = só pele, 3 = até a cavidade). */
  maxDepth: number;
  /** Camadas já abertas (0 = intacta). */
  depth: number;
  /** Trechos da guia já cortados na camada atual (1 = cortado). */
  bins: Uint8Array;
  /** Traços do bisturi em cima da guia, para desenhar ([x0, y0, x1, y1, …]). */
  strokes: number[][];
  /** Meia-largura (mm) que o afastador mantém aberta. */
  openWidth: number;
  /** Meia-largura (mm) que a pinça está segurando aberta agora. */
  heldOpen: number;
  /**
   * Bordas em que o afastador foi puxado para fora: bit 1 = lado 1 (normal da
   * guia), bit 2 = lado -1. Zera quando o afastador fecha de todo.
   */
  retractedSides: number;
  stitches: Stitch[];
  /** Todos os pontos dados. */
  sutured: boolean;
}

export interface Bleeder {
  id: number;
  x: number;
  y: number;
  /** Vazão (ml/s) enquanto ativo. */
  rate: number;
  active: boolean;
  /** Sangue (ml) acumulado na poça em volta. */
  pool: number;
  /** Tempo (s) de pressão contínua da gaze. */
  pressure: number;
}

export type OrganKind = 'bowel' | 'appendix' | 'generic';

/** Órgão na cavidade: uma cápsula (segmento com raio). */
export interface Organ {
  id: string;
  kind: OrganKind;
  x: number;
  y: number;
  /** Posição original (dentro da cavidade). */
  homeX: number;
  homeY: number;
  /** Ângulo (rad) do eixo da cápsula. */
  angle: number;
  halfLength: number;
  radius: number;
  /** Quanto (mm) o órgão sai da posição enquanto estiver preso por estruturas. */
  tether: number;
  /** Pode ser retirado do corpo depois de solto. */
  removable: boolean;
  removed: boolean;
  /** Vazão (ml/s) do sangramento se a tesoura cortar o órgão (lesão, erro grave). 0 = a tesoura não faz nada. */
  injuryRate: number;
}

/**
 * - `vessel`, `band`: vaso e ligamento/meso, dentro da cavidade.
 * - `thread`: sobra de fio de sutura, em cima da pele (alcançável sempre).
 */
export type StructureKind = 'vessel' | 'band' | 'thread';

/** Algo que se corta com tesoura (vaso, ligamento, meso, fio). Segmento a–b. */
export interface Structure {
  id: string;
  kind: StructureKind;
  /** Se presente, o ponto `a` é relativo ao centro deste órgão e a estrutura o prende. */
  organId: string | null;
  ax: number;
  ay: number;
  bx: number;
  by: number;
  /** Vazão (ml/s) do sangramento se cortada sem ligar. */
  bleedRate: number;
  /** Pode ser ligada com o porta-agulha. */
  ligatable: boolean;
  /** Cortar é erro grave (estrutura a preservar). */
  protected: boolean;
  /** Marca (0–1 ao longo de a–b) onde a ligadura deve ser feita; -1 = em qualquer ponto. */
  ligateAt: number;
  ligated: boolean;
  /** Onde está o nó (0–1 ao longo de a–b). */
  ligatedAt: number;
  cut: boolean;
  /** Onde foi cortada (0–1 ao longo de a–b). */
  cutAt: number;
  /** Ponto do corte na mesa, na hora do corte: o coto (até `b`) fica parado ali. */
  cutX: number;
  cutY: number;
  /** Do ponto `a` até o corte, na hora do corte: o pedaço que acompanha o órgão. */
  pieceDx: number;
  pieceDy: number;
}

export type Grab =
  /**
   * `startDistance`: distância da guia ao pegar; `startOpen`: abertura ao pegar;
   * `side`: lado da guia pego (1 ou -1).
   */
  | { kind: 'retractor' | 'edge'; incision: number; startDistance: number; startOpen: number; side: number }
  | { kind: 'organ'; organ: number; dx: number; dy: number };

export interface PendingStitch {
  incision: number;
  stitch: number;
  /** Lado já furado: 1 = `left`, -1 = `right`. */
  side: number;
}

export interface ToolState {
  tool: ToolId;
  x: number;
  y: number;
  down: boolean;
  grab: Grab | null;
  pendingStitch: PendingStitch | null;
  /** O bisturi está num trecho fora da guia. */
  offGuide: boolean;
  /** mm cortados fora da guia desde o último sangramento criado. */
  offGuideRun: number;
  /** mm cortados desde o último evento de som. */
  cutSoundRun: number;
  /** Traço do bisturi em andamento na guia (dentro de `Incision.strokes`). */
  stroke: number[] | null;
  /** Corte fora da guia em andamento (dentro de `SimState.nicks`). */
  nick: number[] | null;
  /** Trocou de instrumento com o botão apertado: espera soltar antes de agir. */
  awaitRelease: boolean;
}

export type VitalsStatus = 'stable' | 'warning' | 'critical' | 'arrest';

export interface Vitals {
  heartRate: number;
  systolic: number;
  diastolic: number;
  /** Sangue perdido (ml). */
  bloodLost: number;
  /** Vazão total (ml/s) dos sangramentos ativos agora. */
  bleedRate: number;
  status: VitalsStatus;
  /** Fase (0–1) do batimento atual, para o traçado. */
  beatPhase: number;
  /** Traçado do ECG em anel: amostra por passo, -0,3 a 1. */
  ecg: Float32Array;
  /** Próxima posição a escrever em `ecg`. */
  ecgHead: number;
}

export interface ErrorCounts {
  offGuide: number;
  burn: number;
  stitchMiss: number;
  /** Corte onde não devia: estrutura a preservar, órgão (lesão) ou coto sem ligadura. */
  protectedCut: number;
}

export interface CutStats {
  /** mm cortados em cima da guia. */
  length: number;
  /** Soma de desvio × comprimento (mm²): desvio médio = deviationSum / length. */
  deviationSum: number;
}

export type Outcome = 'running' | 'complete' | 'arrest';

/** Parte do corpo operada: o render desenha a mesa e o paciente de acordo. */
export type BodySite = 'abdomen' | 'forearm';

export interface ScoreResult {
  outcome: Exclude<Outcome, 'running'>;
  /** Nota 0–100. */
  score: number;
  /** 0 na derrota; 1–3 ao concluir. */
  stars: 0 | 1 | 2 | 3;
  /** Partes da nota, 0–1. */
  precision: number;
  timeScore: number;
  bloodScore: number;
  timeSec: number;
  bloodLostMl: number;
  /** Desvio médio (mm) do corte em relação à guia. */
  averageDeviation: number;
  errors: number;
  /** Motivos da nota, em português. */
  reasons: string[];
}

export interface SimState {
  /** Parte do corpo operada (vem de `ProcedureDef.site`). */
  site: BodySite;
  /** Tempo de cirurgia (s). */
  time: number;
  outcome: Outcome;
  /** Etapa atual (índice em `steps`). */
  stepIndex: number;
  incisions: Incision[];
  bleeders: Bleeder[];
  /** Id do próximo sangramento criado. */
  nextBleederId: number;
  organs: Organ[];
  structures: Structure[];
  /** Cortes fora da guia, para desenhar ([x0, y0, x1, y1, …] por traço). */
  nicks: number[][];
  /** Queimaduras do cautério em tecido sadio. */
  burns: Vec2[];
  tool: ToolState;
  vitals: Vitals;
  cut: CutStats;
  errors: ErrorCounts;
  score: ScoreResult | null;
}
