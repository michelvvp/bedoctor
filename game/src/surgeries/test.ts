// Cirurgia "Teste": só prova o formato das etapas (cortar a linha e dar 3
// pontos). Não aparece no menu: é usada só nos testes.

import { isSutured, noActiveBleeding, incisionDepth, type ProcedureDef } from '../sim';

export const testSurgery: ProcedureDef = {
  id: 'teste',
  name: 'Teste',
  description: 'Corte a pele na linha e feche com 3 pontos.',
  parTimeSec: 60,
  setup: {
    incisions: [
      {
        id: 'corte',
        guide: [
          { x: -80, y: 10 },
          { x: 80, y: 10 },
        ],
        maxDepth: 1,
      },
    ],
  },
  steps: [
    {
      id: 'cortar',
      instruction: 'Corte a pele com o bisturi seguindo a linha tracejada.',
      tool: 'scalpel',
      done: (s) => incisionDepth(s, 'corte') >= 1,
    },
    {
      id: 'estancar',
      instruction: 'Estanque os sangramentos com o cautério (aspire se a poça cobrir o vaso).',
      tool: 'cautery',
      done: noActiveBleeding,
    },
    {
      id: 'suturar',
      instruction: 'Dê 3 pontos com o porta-agulha: clique numa marca e depois na do outro lado.',
      tool: 'needleDriver',
      setup: { sutureMarks: [{ incision: 'corte', count: 3 }] },
      done: (s) => isSutured(s, 'corte'),
    },
  ],
};
