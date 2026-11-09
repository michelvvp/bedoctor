// Os 8 instrumentos. A ordem é a das teclas 1–8.

export const TOOL_ORDER = [
  'scalpel',
  'retractor',
  'forceps',
  'scissors',
  'gauze',
  'suction',
  'needleDriver',
  'cautery',
] as const;

export type ToolId = (typeof TOOL_ORDER)[number];

/**
 * A entrada da simulação num passo: o instrumento na mão, onde está a ponta
 * (mm, coordenadas da mesa) e se o botão está apertado. A simulação detecta
 * sozinha o aperto e a soltura comparando com o passo anterior.
 */
export interface ToolInput {
  tool: ToolId;
  x: number;
  y: number;
  down: boolean;
}

export function isToolId(value: string): value is ToolId {
  return (TOOL_ORDER as readonly string[]).includes(value);
}
