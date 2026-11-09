// Ícones simples dos instrumentos (miolo de um SVG 24×24, traço em currentColor).

import type { ToolId } from '../game/api';

export const TOOL_ICONS: Record<ToolId, string> = {
  // Lâmina e cabo.
  scalpel: '<path d="M4 20 15 9"/><path d="M15 9l5-5-1 6-4 1z"/><path d="M4 20l2-5"/>',
  // Duas garras abrindo.
  retractor: '<path d="M12 3v9"/><path d="M12 12 6 20"/><path d="M12 12l6 8"/><path d="M6 20H4M18 20h2"/>',
  // Pinça: dois braços unidos no topo.
  forceps: '<path d="M7 3l5 18"/><path d="M17 3l-5 18"/><path d="M9.5 13h5"/>',
  // Tesoura: argolas e lâminas cruzadas.
  scissors: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 16 18 4"/><path d="M16 16 6 4"/>',
  // Gaze: quadrado dobrado.
  gauze: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 12h16M12 4v16"/>',
  // Aspirador: tubo com ponta e gota.
  suction: '<path d="M4 20 14 10"/><path d="M14 10l3-3 3 3-3 3z"/><path d="M5 5c1.5 2 2 3 2 4a2 2 0 0 1-4 0c0-1 .5-2 2-4z"/>',
  // Porta-agulha: agulha curva com fio.
  needleDriver: '<path d="M5 19c0-8 5-14 14-14"/><path d="M19 5l-2 .5M19 5l-.5 2"/><path d="M5 19c-1 1-2 1-2 2"/>',
  // Cautério: ponta com faíscas.
  cautery: '<path d="M4 20 13 11"/><path d="M13 11l3-3"/><path d="M18 3v3M21 6h-3M17 9l2 2M20 3l-1.5 1.5"/>',
};

export const ICON_PAUSE = '<path d="M9 5v14M15 5v14"/>';
export const ICON_SOUND_ON = '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>';
export const ICON_SOUND_OFF = '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l4 6M21 9l-4 6"/>';
export const ICON_HEART = '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.600-7 10-7 10z"/>';
