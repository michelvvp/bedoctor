// Pausa e tela de resultado (modais do design system).

import type { GameApi, ResultInfo } from '../game/api';
import { button, clock, el, stars, type View } from './dom';

function modalShell(title: string, titleId: string): { overlay: HTMLElement; modal: HTMLElement } {
  const overlay = el('div', 'modal-overlay');
  overlay.hidden = true;
  const modal = el('div', 'modal');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', titleId);
  modal.tabIndex = -1;
  const h = el('h3', '', title);
  h.id = titleId;
  modal.append(h);
  overlay.append(modal);
  return { overlay, modal };
}

export function createPause(game: GameApi): View {
  const { overlay, modal } = modalShell('Pausado', 'pause-title');
  const resume = button('btn', 'Retomar', () => game.resume());
  modal.append(
    el('p', 'text-muted', 'O tempo está parado.'),
    el('div', 'stack', resume, button('btn btn--secondary', 'Reiniciar', () => game.restart()), button('btn btn--ghost', 'Sair para o menu', () => game.exit())),
  );
  let open = false;
  return {
    root: overlay,
    update(state) {
      const now = state.phase === 'paused';
      overlay.hidden = !now;
      if (now && !open) resume.focus();
      open = now;
    },
  };
}

function metric(label: string, value: string, extra?: HTMLElement): HTMLElement {
  return el('div', 'card widget metric', el('span', 'widget-label', label), el('p', 'widget-value', value), extra);
}

export function createResult(game: GameApi): View {
  const { overlay, modal } = modalShell('', 'result-title');
  const title = modal.querySelector('h3') as HTMLElement;
  const body = el('div', 'result-body');
  const again = button('btn', 'Repetir', () => game.restart());
  modal.append(body, el('div', 'stack', again, button('btn btn--ghost', 'Menu', () => game.exit())));
  modal.classList.add('modal--result');
  let shown: ResultInfo | null = null;

  return {
    root: overlay,
    update(state) {
      const r = state.result;
      const visible = (state.phase === 'won' || state.phase === 'lost') && r !== null;
      overlay.hidden = !visible;
      if (!visible || !r || shown === r) {
        if (!visible) shown = null;
        return;
      }
      shown = r;
      const won = r.outcome === 'complete';
      title.textContent = won ? 'Cirurgia concluída!' : 'Parada cardíaca';
      const badges = [r.newBestScore && el('span', 'badge badge--success', 'Novo recorde de nota'), r.newBestTime && el('span', 'badge badge--success', 'Novo recorde de tempo')];
      const reasons = won
        ? r.reasons.length > 0
          ? el('ul', 'result-reasons', ...r.reasons.map((reason) => el('li', '', reason)))
          : null
        : el(
            'div',
            'alert alert--danger',
            el('div', '', el('span', 'alert-title', 'O paciente não resistiu'), el('p', '', 'Controle o sangramento mais cedo e tente de novo.')),
          );
      body.replaceChildren(
        el('div', 'result-hero', stars(r.stars), el('p', 'result-score', String(r.score), el('span', 'result-max', '/100')), el('div', 'row center', ...badges)),
        el('div', 'result-grid', metric('Tempo', clock(r.timeSec)), metric('Sangue perdido', `${r.bloodLostMl} ml`)),
        el('div', 'result-parts', partMeter('Precisão', r.precision), partMeter('Tempo', r.timeScore), partMeter('Sangue', r.bloodScore)),
        ...(reasons ? [reasons] : []),
        ...(!won && r.reasons.length > 0 ? [el('ul', 'result-reasons', ...r.reasons.map((reason) => el('li', '', reason)))] : []),
      );
      again.focus();
    },
  };
}

function partMeter(label: string, value: number): HTMLElement {
  const meter = el('div', 'meter', el('div', 'meter-fill'));
  meter.setAttribute('role', 'progressbar');
  meter.setAttribute('aria-label', label);
  meter.setAttribute('aria-valuemin', '0');
  meter.setAttribute('aria-valuemax', '100');
  meter.setAttribute('aria-valuenow', String(value));
  meter.style.setProperty('--meter-value', `${value}%`);
  return el('div', 'part', el('span', 'part-label', label), meter, el('span', 'part-value', `${value}%`));
}
