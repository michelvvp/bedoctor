// Teclado vira ação do jogo (puro, testável sem navegador).

export type KeyAction =
  /** Trocar para o instrumento de índice `index` (tecla 1 = 0). */
  | { type: 'tool'; index: number }
  | { type: 'mute' }
  /** Pausar ou retomar. */
  | { type: 'pause' };

const TOOL_KEYS: Record<string, number> = {};
for (let i = 0; i < 8; i++) {
  TOOL_KEYS[`Digit${i + 1}`] = i;
  TOOL_KEYS[`Numpad${i + 1}`] = i;
}

export function keyAction(code: string): KeyAction | null {
  const index = TOOL_KEYS[code];
  if (index !== undefined) return { type: 'tool', index };
  if (code === 'KeyM') return { type: 'mute' };
  if (code === 'Escape' || code === 'KeyP') return { type: 'pause' };
  return null;
}
