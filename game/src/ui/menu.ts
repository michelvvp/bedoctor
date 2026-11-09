// Menu inicial: logo, lista de cirurgias com recordes e a tabela de controles.

import type { GameApi, GameState, SurgeryInfo } from '../game/api';
import { button, clock, el, stars, type View } from './dom';

function surgeryCard(s: SurgeryInfo, game: GameApi): HTMLElement {
  const record =
    s.bestScore === null
      ? el('span', 'badge', 'Sem recorde')
      : el('span', 'record', stars(s.bestStars ?? 1), el('span', 'badge badge--accent', `Nota ${s.bestScore}`), el('span', 'badge', `${clock(s.bestTimeSec ?? 0)}`));
  return el(
    'div',
    'card surgery-card',
    el(
      'div',
      'surgery-body',
      el('h3', 'surgery-name', s.name),
      el('p', 'text-muted', s.description),
      el('div', 'surgery-meta', el('span', 'badge', `${s.stepCount} etapas`), el('span', 'badge', `Referência ${clock(s.parTimeSec)}`)),
    ),
    el('div', 'surgery-side', record, button('btn', 'Operar', () => game.startSurgery(s.id))),
  );
}

/** Modal com a tabela de controles; as teclas dos instrumentos vêm do estado. */
function controlsModal(): { overlay: HTMLElement; open(state: GameState): void } {
  const body = el('tbody');
  const overlay = el('div', 'modal-overlay');
  overlay.hidden = true;
  const modal = el('div', 'modal');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'controls-title');
  modal.tabIndex = -1;
  let opener: HTMLElement | null = null;

  const close = (): void => {
    overlay.hidden = true;
    opener?.focus();
  };
  const title = el('h3', '', 'Controles');
  title.id = 'controls-title';
  modal.append(
    title,
    el('div', 'card table-card', el('div', 'table-wrap', el('table', 'table', el('thead', '', el('tr', '', el('th', '', 'Tecla'), el('th', '', 'Ação'))), body))),
    el('div', 'row end', button('btn', 'Fechar', close)),
  );
  overlay.append(modal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  });

  return {
    overlay,
    open(state) {
      const row = (key: string, text: string): HTMLElement => el('tr', '', el('td', '', el('kbd', 'key', key)), el('td', '', text));
      body.replaceChildren(
        ...state.tools.map((t) => row(t.key, `${t.name} — ${t.hint}`)),
        row('M', 'Liga/desliga o som'),
        row('Esc', 'Pausa a cirurgia'),
        row('Mouse', 'Aponte e segure o botão esquerdo para usar o instrumento'),
      );
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      overlay.hidden = false;
      modal.focus();
    },
  };
}

export function createMenu(game: GameApi): View {
  const root = el('div', 'screen menu-screen');
  const list = el('div', 'surgery-list');
  const controls = controlsModal();
  let latest: GameState | null = null;
  let shown: readonly SurgeryInfo[] | null = null;

  const controlsLink = button('btn btn--ghost', 'Controles', () => latest && controls.open(latest));
  root.append(
    el(
      'div',
      'page page--center menu-page',
      el('h1', 'logo', 'be', el('span', '', 'Doctor')),
      el('p', 'page-sub', 'Escolha uma cirurgia e mãos à obra.'),
      list,
      controlsLink,
    ),
    controls.overlay,
  );

  return {
    root,
    update(state) {
      latest = state;
      if (shown === state.surgeries) return;
      shown = state.surgeries;
      list.replaceChildren(
        ...(state.surgeries.length === 0
          ? [el('div', 'alert alert--info', el('div', '', el('span', 'alert-title', 'Nenhuma cirurgia disponível'), el('p', '', 'Ainda não há cirurgias cadastradas.')))]
          : state.surgeries.map((s) => surgeryCard(s, game))),
      );
    },
  };
}
