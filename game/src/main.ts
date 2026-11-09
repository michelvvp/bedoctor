import './style.css';
import { Game } from './game/game';
import type { StorageLike } from './game/progress';
import { mountProvisionalUi } from './ui/provisional';

/** localStorage, se o navegador deixar usar. */
function storage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const canvas = document.getElementById('game');
const uiRoot = document.getElementById('ui');
if (!(canvas instanceof HTMLCanvasElement) || !uiRoot) throw new Error('index.html sem #game ou #ui');

const game = new Game(canvas, storage());
game.subscribe((state) => document.body.classList.toggle('playing', state.phase === 'playing'));
mountProvisionalUi(uiRoot, game);
