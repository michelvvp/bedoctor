// Cirurgia 2, "Apendicectomia": incisão oblíqua no quadrante inferior direito
// (à esquerda da tela: o paciente está de barriga para cima, cabeça no alto),
// três camadas até a cavidade, afastador nas duas bordas, sangramentos, alças
// do intestino por cima do apêndice inflamado, ligadura da base, corte acima
// do nó, retirada para a cuba, fechamento e sutura da pele.
//
// Dificuldade: sangra mais rápido que o tutorial, e a tesoura no lugar errado
// (alça, ceco, apêndice, mesentério ou abaixo do nó) é erro grave e sangra
// forte. Quem segue as instruções vence.

import {
  incisionDepth,
  incisionOpen,
  isSutured,
  noActiveBleeding,
  organExposed,
  organRemoved,
  retractedSides,
  structureCut,
  structureLigated,
  type ProcedureDef,
} from '../sim';
import { STITCH_MAX_OPEN } from '../sim/tuning';
import type { Vec2 } from '../sim/vec';

// --- Geometria ------------------------------------------------------------------

/** Pontas da linha-guia (mm): oblíqua, de cima-fora para baixo-dentro. */
const GUIDE_START: Vec2 = { x: -150, y: 0 };
const GUIDE_END: Vec2 = { x: -75, y: 80 };
const GUIDE_LENGTH = Math.hypot(GUIDE_END.x - GUIDE_START.x, GUIDE_END.y - GUIDE_START.y);
/** Direção da guia e a normal do lado 1 (a mesma de `samplePolyline`). */
const DIR = { x: (GUIDE_END.x - GUIDE_START.x) / GUIDE_LENGTH, y: (GUIDE_END.y - GUIDE_START.y) / GUIDE_LENGTH };
const NORMAL = { x: DIR.y, y: -DIR.x };
/** Ângulo (rad) da guia: as alças e o apêndice ficam deitados nessa direção. */
const AXIS = Math.atan2(DIR.y, DIR.x);
const CENTER = { x: (GUIDE_START.x + GUIDE_END.x) / 2, y: (GUIDE_START.y + GUIDE_END.y) / 2 };

/** Ponto a `u` mm ao longo da guia (a partir do meio) e `v` mm para o lado 1. */
export function incisionPoint(u: number, v: number): Vec2 {
  return {
    x: CENTER.x + DIR.x * u + NORMAL.x * v,
    y: CENTER.y + DIR.y * u + NORMAL.y * v,
  };
}

/** Vetor de `u` mm ao longo da guia e `v` mm para o lado 1 (para pontas relativas a órgãos). */
function offset(u: number, v: number): Vec2 {
  return { x: DIR.x * u + NORMAL.x * v, y: DIR.y * u + NORMAL.y * v };
}

// --- Tuning da cirurgia ---------------------------------------------------------

/** Abertura (meia-largura, mm) do afastador para a etapa de abrir contar. */
const RETRACT_OPEN_OK = 25;
/** Vazão (ml/s) dos 2 vasos da parede que sangram ao abrir (tutorial: 0,3). */
const WALL_BLEED_RATE = 3.5;
/** Sangue (ml) que já está na poça de cada um ao aparecer. */
const WALL_BLEED_POOL = 6;
/** Vazão (ml/s) se a tesoura ferir uma alça ou o ceco. */
const BOWEL_INJURY_RATE = 6;
/** Vazão (ml/s) se a tesoura cortar o corpo do apêndice. */
const APPENDIX_INJURY_RATE = 5;
/** Vazão (ml/s) da base do apêndice cortada sem ligar ou abaixo do nó. */
const BASE_BLEED_RATE = 8;
/** Vazão (ml/s) do mesentério cortado. */
const MESENTERY_BLEED_RATE = 6;
/** Folga (mm) das alças presas pelo mesentério: afastam, mas não saem da cavidade. */
const BOWEL_TETHER = 18;

/** Apêndice: centro, meio-comprimento e onde fica a base (ponta voltada para o ceco). */
const APPENDIX_U = 6;
const APPENDIX_HALF = 13;
/** Base: da ponta do apêndice até o ceco (mm ao longo da guia). */
const BASE_END_U = -30;
/** Marca da ligadura ao longo da base (0 = apêndice, 1 = ceco). */
const LIGATE_AT = 0.55;

/** Quantos pontos na pele. */
const STITCH_COUNT = 5;

// --- Definição ------------------------------------------------------------------

export const appendectomy: ProcedureDef = {
  id: 'apendicectomia',
  name: 'Apendicectomia',
  description: 'Abra o abdome, ache e retire o apêndice inflamado, e feche. Sangra de verdade.',
  parTimeSec: 300,
  site: 'abdomen',
  setup: {
    incisions: [{ id: 'mcburney', guide: [GUIDE_START, GUIDE_END], maxDepth: 3 }],
    // Ordem = de baixo para cima: o ceco, o apêndice e, por cima, as alças.
    organs: [
      {
        id: 'ceco',
        kind: 'bowel',
        ...incisionPoint(-41, 0),
        angle: AXIS + Math.PI / 2,
        halfLength: 10,
        radius: 11,
        tether: 8,
        injuryRate: BOWEL_INJURY_RATE,
      },
      {
        id: 'apendice',
        kind: 'appendix',
        ...incisionPoint(APPENDIX_U, 0),
        angle: AXIS,
        halfLength: APPENDIX_HALF,
        radius: 5,
        removable: true,
        injuryRate: APPENDIX_INJURY_RATE,
      },
      {
        id: 'alca1',
        kind: 'bowel',
        ...incisionPoint(4, -3),
        angle: AXIS,
        halfLength: 24,
        radius: 8,
        tether: BOWEL_TETHER,
        injuryRate: BOWEL_INJURY_RATE,
      },
      {
        id: 'alca2',
        kind: 'bowel',
        ...incisionPoint(8, 5),
        angle: AXIS,
        halfLength: 24,
        radius: 8,
        tether: BOWEL_TETHER,
        injuryRate: BOWEL_INJURY_RATE,
      },
    ],
    structures: [
      // Base do apêndice: liga no roxo, corta entre o nó e o apêndice.
      {
        id: 'base',
        kind: 'band',
        organ: 'apendice',
        a: offset(-APPENDIX_HALF, 0),
        b: incisionPoint(BASE_END_U, 0),
        bleedRate: BASE_BLEED_RATE,
        ligatable: true,
        ligateAt: LIGATE_AT,
      },
      // Mesentérios: prendem as alças e o ceco (não cortar).
      {
        id: 'meso-ceco',
        kind: 'band',
        organ: 'ceco',
        a: offset(-6, 0),
        b: incisionPoint(-62, 0),
        bleedRate: MESENTERY_BLEED_RATE,
        protected: true,
      },
      {
        id: 'meso1',
        kind: 'band',
        organ: 'alca1',
        a: offset(0, -6),
        b: incisionPoint(4, -40),
        bleedRate: MESENTERY_BLEED_RATE,
        protected: true,
      },
      {
        id: 'meso2',
        kind: 'band',
        organ: 'alca2',
        a: offset(0, 6),
        b: incisionPoint(8, 40),
        bleedRate: MESENTERY_BLEED_RATE,
        protected: true,
      },
    ],
  },
  steps: [
    {
      id: 'pele',
      instruction: 'Corte a pele com o bisturi seguindo a linha tracejada, no lado direito da barriga.',
      tool: 'scalpel',
      done: (s) => incisionDepth(s, 'mcburney') >= 1,
    },
    {
      id: 'camadas',
      instruction: 'Aprofunde: passe o bisturi na linha de novo para abrir a gordura e depois a fáscia.',
      tool: 'scalpel',
      done: (s) => incisionDepth(s, 'mcburney') >= 3,
    },
    {
      id: 'afastar',
      instruction: 'Abra com o afastador: puxe uma borda do corte para fora e depois a outra.',
      tool: 'retractor',
      done: (s) => retractedSides(s, 'mcburney') === 2 && incisionOpen(s, 'mcburney') >= RETRACT_OPEN_OK,
    },
    {
      id: 'estancar',
      instruction: 'Estanque o que sangra: aspire a poça e clique com o cautério em cada ponto.',
      tool: 'cautery',
      setup: {
        bleeders: [
          { ...incisionPoint(-22, 16), rate: WALL_BLEED_RATE, pool: WALL_BLEED_POOL },
          { ...incisionPoint(24, -15), rate: WALL_BLEED_RATE, pool: WALL_BLEED_POOL },
        ],
      },
      done: noActiveBleeding,
    },
    {
      id: 'achar',
      instruction: 'Com a pinça, afaste as alças do intestino (rosadas) para os lados até o apêndice vermelho aparecer.',
      tool: 'forceps',
      done: (s) => organExposed(s, 'apendice'),
    },
    {
      id: 'ligar',
      instruction: 'Ligue a base do apêndice: clique com o porta-agulha na marca roxa.',
      tool: 'needleDriver',
      done: (s) => structureLigated(s, 'base'),
    },
    {
      id: 'retirar',
      instruction: 'Corte a base com a tesoura entre o nó e o apêndice; depois arraste o apêndice com a pinça até a cuba.',
      tool: 'scissors',
      done: (s) => organRemoved(s, 'apendice'),
    },
    {
      id: 'fechar',
      instruction: 'Confira que nada sangra e retire o afastador: arraste a borda de volta até o meio do corte.',
      tool: 'retractor',
      done: (s) => incisionOpen(s, 'mcburney') <= STITCH_MAX_OPEN && noActiveBleeding(s),
    },
    {
      id: 'suturar',
      instruction: `Feche a pele: dê ${STITCH_COUNT} pontos com o porta-agulha, numa marca e depois na do outro lado.`,
      tool: 'needleDriver',
      setup: { sutureMarks: [{ incision: 'mcburney', count: STITCH_COUNT }] },
      done: (s) => isSutured(s, 'mcburney'),
    },
    {
      id: 'fio',
      instruction: 'Corte a sobra do fio com a tesoura: clique em cima do fio azul.',
      tool: 'scissors',
      // Sobra do fio saindo do nó do último ponto (ponta da guia, lado 1), com a agulha na ponta.
      setup: {
        structures: [{ id: 'fio', kind: 'thread', a: incisionPoint(46, 10), b: incisionPoint(72, 46) }],
      },
      done: (s) => structureCut(s, 'fio'),
    },
  ],
};
