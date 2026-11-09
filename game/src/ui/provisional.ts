// UI PROVISÓRIA: texto simples só para jogar e testar o motor. O agente
// frontend substitui tudo isto pelos menus e HUD em Liquid Glass. Fala com o
// jogo só pela GameApi.

import type { GameApi, GameState, ToolInfo } from '../game/api';
import './provisional.css';

/** Amostras do ECG desenhadas no monitor provisório. */
const ECG_SAMPLES = 240;

type Child = Node | string | null | false;

function el(tag: string, className: string, ...children: Child[]): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const child of children) {
    if (child === null || child === false) continue;
    node.append(child);
  }
  return node;
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function stars(n: number): string {
  return '★'.repeat(n) + '☆'.repeat(3 - n);
}

const STATUS_TEXT = {
  stable: 'estável',
  warning: 'alerta',
  critical: 'CRÍTICO',
  arrest: 'PARADA',
} as const;

export function mountProvisionalUi(root: HTMLElement, game: GameApi): void {
  root.classList.add('pv-root');
  const ecgCanvas = document.createElement('canvas');
  ecgCanvas.width = ECG_SAMPLES;
  ecgCanvas.height = 60;
  ecgCanvas.className = 'pv-ecg';
  const ecg = new Float32Array(ECG_SAMPLES);

  const toolName = (state: GameState, id: string): string =>
    state.tools.find((t) => t.id === id)?.name ?? id;

  function menu(state: GameState): HTMLElement {
    return el(
      'div',
      'pv-panel pv-center',
      el('h1', '', 'beDoctor'),
      el('p', '', 'Escolha a cirurgia:'),
      ...state.surgeries.map((s) => {
        const best =
          s.bestScore === null ? 'sem recorde' : `recorde: ${s.bestScore} pts, ${clock(s.bestTimeSec ?? 0)}`;
        return el(
          'div',
          'pv-row',
          button(s.name, () => game.startSurgery(s.id)),
          el('span', '', ` ${s.description} (${s.stepCount} etapas; ${best})`),
        );
      }),
      el('p', 'pv-small', 'Teclas 1–8 trocam o instrumento, Esc pausa, M liga/desliga o som.'),
    );
  }

  function toolBar(state: GameState): HTMLElement {
    const item = (t: ToolInfo): HTMLElement => {
      const node = el('span', t.id === state.tool ? 'pv-tool pv-active' : 'pv-tool', `${t.key} ${t.name}`);
      node.addEventListener('click', () => game.selectTool(t.id));
      return node;
    };
    const active = state.tools.find((t) => t.id === state.tool);
    return el('div', 'pv-panel pv-bottom', el('div', '', ...state.tools.map(item)), el('div', 'pv-small', active?.hint ?? ''));
  }

  function hud(state: GameState): HTMLElement[] {
    const step = state.step;
    const v = state.vitals;
    const parts: HTMLElement[] = [];
    parts.push(
      el(
        'div',
        'pv-panel pv-top-left',
        el('div', 'pv-strong', state.surgery?.name ?? ''),
        step ? el('div', '', `Etapa ${step.index + 1}/${step.count}: ${step.instruction}`) : null,
        step ? el('div', 'pv-small', `Sugerido: ${toolName(state, step.suggestedTool)}`) : null,
        el('div', 'pv-small', `Tempo ${clock(state.timeSec)} · som ${state.muted ? 'desligado' : 'ligado'} (M)`),
        state.feedback ? el('div', `pv-feedback pv-${state.feedback.kind}`, state.feedback.text) : null,
      ),
    );
    if (v) {
      parts.push(
        el(
          'div',
          `pv-panel pv-top-right pv-${v.status}`,
          el('div', '', `FC ${v.heartRate} bpm`),
          el('div', '', `PA ${v.systolic}/${v.diastolic} mmHg`),
          el('div', '', `Sangue perdido ${v.bloodLostMl} ml${v.bleeding ? ' · sangrando' : ''}`),
          el('div', 'pv-strong', `Estado: ${STATUS_TEXT[v.status]}`),
          ecgCanvas,
        ),
      );
    }
    parts.push(toolBar(state));
    return parts;
  }

  function paused(): HTMLElement {
    return el(
      'div',
      'pv-panel pv-center',
      el('h2', '', 'Pausado'),
      el(
        'div',
        'pv-row',
        button('Retomar', () => game.resume()),
        button('Reiniciar', () => game.restart()),
        button('Sair', () => game.exit()),
      ),
    );
  }

  function result(state: GameState): HTMLElement {
    const r = state.result;
    if (!r) return el('div', '');
    return el(
      'div',
      'pv-panel pv-center',
      el('h2', '', r.outcome === 'complete' ? 'Cirurgia concluída!' : 'Parada cardíaca'),
      el('div', 'pv-stars', stars(r.stars)),
      el('div', 'pv-strong', `Nota ${r.score}/100${r.newBestScore ? ' (recorde!)' : ''}`),
      el(
        'div',
        'pv-small',
        `Precisão ${r.precision}% · tempo ${r.timeScore}% · sangue ${r.bloodScore}% · ${clock(r.timeSec)}${r.newBestTime ? ' (melhor tempo!)' : ''}`,
      ),
      el('ul', '', ...r.reasons.map((reason) => el('li', '', reason))),
      el(
        'div',
        'pv-row',
        button('Jogar de novo', () => game.restart()),
        button('Menu', () => game.exit()),
      ),
    );
  }

  game.subscribe((state) => {
    const nodes: HTMLElement[] = [];
    switch (state.phase) {
      case 'menu':
        nodes.push(menu(state));
        break;
      case 'playing':
        nodes.push(...hud(state));
        break;
      case 'paused':
        nodes.push(...hud(state), paused());
        break;
      case 'won':
      case 'lost':
        nodes.push(result(state));
        break;
    }
    root.replaceChildren(...nodes);
  });

  // Monitor: redesenha o traçado a cada quadro.
  const ctx = ecgCanvas.getContext('2d');
  const drawEcg = (): void => {
    if (ctx && ecgCanvas.isConnected) {
      const n = game.readEcg(ecg);
      ctx.fillStyle = '#04140f';
      ctx.fillRect(0, 0, ecgCanvas.width, ecgCanvas.height);
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const y = ecgCanvas.height * 0.75 - (ecg[i] ?? 0) * ecgCanvas.height * 0.6;
        if (i === 0) ctx.moveTo(i, y);
        else ctx.lineTo(i, y);
      }
      ctx.stroke();
    }
    requestAnimationFrame(drawEcg);
  };
  requestAnimationFrame(drawEcg);
}
