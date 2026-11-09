// Textos da tela que saem do jogo: nomes dos instrumentos e mensagens dos
// eventos da simulação.

import type { SimEvent } from '../sim/events';
import type { ToolId } from '../sim/tools';
import type { FeedbackInfo, ToolInfo } from './api';

export const TOOL_TEXTS: Record<ToolId, { name: string; hint: string }> = {
  scalpel: { name: 'Bisturi', hint: 'Arraste em cima da linha tracejada para cortar.' },
  retractor: { name: 'Afastador', hint: 'Arraste a borda do corte para fora para abrir.' },
  forceps: { name: 'Pinça', hint: 'Segure e arraste tecido ou órgão.' },
  scissors: { name: 'Tesoura', hint: 'Clique ou passe por cima da estrutura para cortar.' },
  gauze: { name: 'Gaze', hint: 'Esfregue para absorver; aperte em cima para estancar.' },
  suction: { name: 'Aspirador', hint: 'Segure o botão em cima da poça de sangue.' },
  needleDriver: { name: 'Porta-agulha', hint: 'Clique numa marca e na do outro lado para dar o ponto.' },
  cautery: { name: 'Cautério', hint: 'Clique no sangramento para estancar.' },
};

export function toolInfos(order: readonly ToolId[]): ToolInfo[] {
  return order.map((id, i) => ({ id, key: String(i + 1), ...TOOL_TEXTS[id] }));
}

const LAYER_OPENED = ['', 'Pele aberta.', 'Gordura aberta.', 'Músculo aberto: cavidade exposta.'];

/** Mensagem para um evento, ou null se ele não merece mensagem. */
export function eventFeedback(event: SimEvent): Omit<FeedbackInfo, 'id'> | null {
  switch (event.type) {
    case 'cutMiss':
      return { kind: 'error', text: 'Fora da linha! Corte só em cima do tracejado.' };
    case 'layerOpened':
      return { kind: 'success', text: LAYER_OPENED[event.value] ?? 'Camada aberta.' };
    case 'cauterize':
      return { kind: 'success', text: 'Sangramento estancado.' };
    case 'cauteryBlocked':
      return { kind: 'error', text: 'Sangue demais em cima do vaso: aspire ou use a gaze antes.' };
    case 'burn':
      return { kind: 'error', text: 'Cautério em tecido sadio!' };
    case 'gauzeStop':
      return { kind: 'success', text: 'A pressão da gaze estancou o sangramento.' };
    case 'stitch':
      return { kind: 'success', text: `Ponto dado (${event.value}).` };
    case 'stitchMiss':
      return { kind: 'error', text: 'Ponto errado: o segundo furo vai na marca do outro lado.' };
    case 'stitchBlocked':
      return { kind: 'error', text: 'Feche o afastador antes de suturar.' };
    case 'sutured':
      return { kind: 'success', text: 'Incisão fechada.' };
    case 'ligate':
      return { kind: 'success', text: 'Estrutura ligada.' };
    case 'protectedCut':
      return { kind: 'error', text: 'Essa estrutura não podia ser cortada!' };
    case 'organRemoved':
      return { kind: 'success', text: 'Órgão retirado.' };
    case 'stepComplete':
      return { kind: 'success', text: 'Etapa concluída.' };
    case 'arrest':
      return { kind: 'error', text: 'Parada cardíaca!' };
    default:
      return null;
  }
}
