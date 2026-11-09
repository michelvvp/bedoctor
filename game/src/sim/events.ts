// Eventos que a simulação emite num passo. A camada `game/` traduz em som e
// em mensagem na tela; a simulação não conhece nenhum dos dois.

export type SimEventType =
  /** Um batimento (bip do monitor). */
  | 'beat'
  /** O bisturi cortou mais um pedaço na guia. */
  | 'cut'
  /** O bisturi saiu da guia (erro). */
  | 'cutMiss'
  /** Uma camada se abriu; `value` = nova profundidade. */
  | 'layerOpened'
  /** Surgiu um sangramento; `value` = vazão (ml/s). */
  | 'bleedStart'
  /** O cautério estancou um sangramento. */
  | 'cauterize'
  /** O cautério não achou o vaso por causa da poça de sangue. */
  | 'cauteryBlocked'
  /** Cautério em tecido sadio (erro). */
  | 'burn'
  /** A pressão da gaze estancou um sangramento. */
  | 'gauzeStop'
  /** O porta-agulha furou o primeiro lado de um ponto. */
  | 'stitchStart'
  /** Ponto fechado; `value` = pontos dados na incisão. */
  | 'stitch'
  /** O segundo furo errou a marca (erro). */
  | 'stitchMiss'
  /** Tentou suturar com a incisão aberta. */
  | 'stitchBlocked'
  /** Todos os pontos da incisão dados. */
  | 'sutured'
  /** Estrutura ligada com fio. */
  | 'ligate'
  /** Estrutura cortada com tesoura. */
  | 'structureCut'
  /** Cortou onde não devia: estrutura a preservar, órgão (lesão) ou coto sem ligadura (erro grave). */
  | 'protectedCut'
  /** Órgão retirado do corpo. */
  | 'organRemoved'
  /** Etapa concluída; `value` = índice da etapa. */
  | 'stepComplete'
  /** Cirurgia concluída. */
  | 'complete'
  /** Parada cardíaca (derrota). */
  | 'arrest';

export interface SimEvent {
  type: SimEventType;
  x: number;
  y: number;
  value: number;
}
