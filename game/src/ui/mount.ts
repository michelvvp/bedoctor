// Monta menus e HUD em cima do canvas. Fala com o jogo só pela GameApi.

import type { GameApi, GameState } from '../game/api';
import { createHud } from './hud';
import { createMenu } from './menu';
import { createPause, createResult } from './overlays';

export function mountUi(root: HTMLElement, game: GameApi): void {
  root.classList.add('ui-root');
  const menu = createMenu(game);
  const hud = createHud(game);
  const pause = createPause(game);
  const result = createResult(game);
  root.replaceChildren(menu.root, hud.root, pause.root, result.root);

  game.subscribe((state: GameState) => {
    const inGame = state.phase === 'playing' || state.phase === 'paused';
    menu.root.hidden = state.phase !== 'menu';
    hud.root.hidden = !inGame;
    menu.update(state);
    if (inGame) hud.update(state);
    pause.update(state);
    result.update(state);
  });
}
