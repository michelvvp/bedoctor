// Cirurgia 1, "Sutura de corte": o tutorial que ensina os instrumentos. Corte
// já aberto no antebraço, sangrando devagar: limpar, aspirar, cauterizar,
// segurar a borda com a pinça, dar 5 pontos e cortar a sobra do fio. Sem
// bisturi nem afastador (entram na apendicectomia). Tudo tolerante: vitais
// estáveis, vazão bem abaixo do que preocupa.

import {
  fieldBlood,
  incisionOpen,
  isSutured,
  noActiveBleeding,
  spilledBlood,
  structureCut,
  type ProcedureDef,
} from '../sim';

/** Vazão (ml/s) de cada ponto que sangra: lenta, tutorial. */
const OOZE_RATE = 0.3;
/** Sangue (ml) que pode sobrar nas manchas para a etapa da gaze contar como limpa. */
const SPILL_LEFT_OK = 3;
/** Sangue (ml) que pode sobrar no campo para a etapa do aspirador contar como limpa. */
const FIELD_LEFT_OK = 3;
/** Abertura (meia-largura, mm) que a pinça precisa segurar na borda. */
const FORCEPS_OPEN_OK = 5;

export const sutureTutorial: ProcedureDef = {
  id: 'sutura',
  name: 'Sutura de corte',
  description: 'Tutorial: limpe, estanque e feche com pontos um corte no antebraço.',
  parTimeSec: 120,
  site: 'forearm',
  setup: {
    // Corte na pele, já aberto, ao longo do antebraço.
    incisions: [
      {
        id: 'corte',
        guide: [
          { x: -90, y: 0 },
          { x: 90, y: 0 },
        ],
        maxDepth: 1,
        depth: 1,
      },
    ],
    bleeders: [
      // Dois pontos sangrando devagar dentro do corte.
      { x: -40, y: 0.5, rate: OOZE_RATE, pool: 10 },
      { x: 35, y: -0.5, rate: OOZE_RATE, pool: 10 },
      // Sangue que escorreu para a pele em volta (não sangra mais).
      { x: -120, y: 48, rate: 0, pool: 30, active: false },
      { x: 62, y: 52, rate: 0, pool: 25, active: false },
      { x: 128, y: -42, rate: 0, pool: 20, active: false },
    ],
  },
  steps: [
    {
      id: 'gaze',
      instruction: 'Limpe o sangue da pele em volta do corte: esfregue a gaze em cima das manchas.',
      tool: 'gauze',
      done: (s) => spilledBlood(s) <= SPILL_LEFT_OK,
    },
    {
      id: 'aspirar',
      instruction: 'Aspire o sangue que sobrou dentro do corte: segure o botão em cima de cada poça.',
      tool: 'suction',
      done: (s) => fieldBlood(s) <= FIELD_LEFT_OK,
    },
    {
      id: 'cauterizar',
      instruction: 'Estanque os 2 pontos que sangram: clique com o cautério em cima de cada um.',
      tool: 'cautery',
      done: noActiveBleeding,
    },
    {
      id: 'pinca',
      instruction: 'Com a pinça, pegue a borda do corte e puxe um pouco para fora, segurando o botão.',
      tool: 'forceps',
      done: (s) => incisionOpen(s, 'corte') >= FORCEPS_OPEN_OK,
    },
    {
      id: 'suturar',
      instruction: 'Dê 5 pontos com o porta-agulha: clique numa marca e depois na do outro lado.',
      tool: 'needleDriver',
      setup: { sutureMarks: [{ incision: 'corte', count: 5 }] },
      done: (s) => isSutured(s, 'corte'),
    },
    {
      id: 'tesoura',
      instruction: 'Corte a sobra do fio com a tesoura: clique em cima do fio azul.',
      tool: 'scissors',
      // Sobra do fio saindo do nó do último ponto (x = 72), com a agulha na ponta.
      setup: { structures: [{ id: 'fio', kind: 'thread', a: { x: 74, y: -10 }, b: { x: 132, y: -50 } }] },
      done: (s) => structureCut(s, 'fio'),
    },
  ],
};
