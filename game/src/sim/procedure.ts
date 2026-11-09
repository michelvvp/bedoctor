// Formato declarativo de uma cirurgia. As definições ficam em `surgeries/`; a
// simulação só conhece estes tipos.

import type { BodySite, OrganKind, SimState, StructureKind } from './types';
import type { ToolId } from './tools';
import type { Vec2 } from './vec';

export interface IncisionDef {
  id: string;
  /** Linha-guia (polilinha, mm). */
  guide: Vec2[];
  /** Camadas a abrir: 1 = só pele, 3 = até a cavidade. */
  maxDepth: number;
  /** Camadas já abertas no começo (ex.: ferida pronta para suturar). */
  depth?: number;
}

export interface SutureMarksDef {
  incision: string;
  /** Quantos pontos. */
  count: number;
  /** Trecho da guia (0–1) onde distribuir os pontos. Padrão: 0–1. */
  from?: number;
  to?: number;
}

export interface OrganDef {
  id: string;
  kind: OrganKind;
  x: number;
  y: number;
  /** Ângulo (rad) do eixo. Padrão 0. */
  angle?: number;
  halfLength: number;
  radius: number;
  /** Quanto pode sair do lugar enquanto preso. Padrão 30 mm. */
  tether?: number;
  removable?: boolean;
}

export interface StructureDef {
  id: string;
  kind: StructureKind;
  /** Órgão que a estrutura prende; `a` passa a ser relativo ao centro dele. */
  organ?: string;
  a: Vec2;
  b: Vec2;
  /** Vazão (ml/s) se cortada sem ligar. Padrão 0. */
  bleedRate?: number;
  ligatable?: boolean;
  protected?: boolean;
}

export interface BleederDef {
  x: number;
  y: number;
  rate: number;
  /** Sangue (ml) já na poça ao aparecer. Padrão 0. */
  pool?: number;
  /** `false` = só sangue derramado, sem sangrar (mancha a limpar). Padrão true. */
  active?: boolean;
}

/** Configuração aplicada ao começar a cirurgia ou uma etapa. */
export interface SetupDef {
  incisions?: IncisionDef[];
  sutureMarks?: SutureMarksDef[];
  organs?: OrganDef[];
  structures?: StructureDef[];
  bleeders?: BleederDef[];
}

export interface StepDef {
  id: string;
  /** Instrução na tela, em português. */
  instruction: string;
  /** Instrumento sugerido para a etapa. */
  tool: ToolId;
  /** Aplicada quando a etapa começa. */
  setup?: SetupDef;
  /** A etapa termina quando isto der verdadeiro (ver `queries.ts`). */
  done: (state: Readonly<SimState>) => boolean;
}

export interface ProcedureDef {
  id: string;
  name: string;
  description: string;
  /** Tempo de referência (s) para a nota de tempo. */
  parTimeSec: number;
  /** Parte do corpo operada. Padrão: abdome. */
  site?: BodySite;
  setup?: SetupDef;
  steps: StepDef[];
}
