// HUD da cirurgia: bandeja de instrumentos (esquerda), instrução da etapa
// (canto superior esquerdo), cronômetro/pausa/som (topo) e monitor de sinais
// vitais (canto superior direito). Nada fica no meio da mesa.

import type { GameApi, GameState, ToolId, VitalsStatus } from '../game/api';
import { button, clock, el, svg, type View } from './dom';
import { ICON_PAUSE, ICON_SOUND_OFF, ICON_SOUND_ON, TOOL_ICONS } from './icons';

/** Amostras do ECG por ponto de largura do monitor (o buffer do jogo tem 240). */
const ECG_BUFFER = 256;
/** Recarrega as cores do tema a cada N quadros (troca de tema do SO). */
const COLOR_REFRESH_FRAMES = 60;

const STATUS: Record<VitalsStatus, { text: string; badge: string }> = {
  stable: { text: 'Estável', badge: 'badge--success' },
  warning: { text: 'Alerta', badge: 'badge--warning' },
  critical: { text: 'Crítico', badge: 'badge--danger' },
  arrest: { text: 'Parada', badge: 'badge--danger' },
};

const FEEDBACK_ALERT = { info: 'alert--info', success: 'alert--success', error: 'alert--danger' } as const;

function readout(label: string): { root: HTMLElement; value: HTMLElement; unit: HTMLElement } {
  const value = el('span', 'readout-value', '--');
  const unit = el('span', 'readout-unit');
  return { root: el('div', 'readout', el('span', 'readout-label', label), el('span', 'readout-line', value, unit)), value, unit };
}

function createTray(game: GameApi): { root: HTMLElement; update(state: GameState): void } {
  const root = el('div', 'card tray');
  root.setAttribute('role', 'toolbar');
  root.setAttribute('aria-label', 'Instrumentos');
  let built: GameState['tools'] | null = null;
  let buttons: { id: ToolId; node: HTMLButtonElement }[] = [];

  return {
    root,
    update(state) {
      if (built !== state.tools) {
        built = state.tools;
        buttons = state.tools.map((t) => {
          const node = button('tool', svg(TOOL_ICONS[t.id], 24), () => game.selectTool(t.id));
          node.append(el('kbd', 'tool-key', t.key), el('span', 'tool-name', t.name));
          node.setAttribute('aria-label', `${t.name} (tecla ${t.key})`);
          node.dataset.tooltip = `${t.name} — ${t.hint}`;
          // Mantém o foco fora do botão: Espaço/Enter não devem reacionar o instrumento.
          node.addEventListener('mousedown', (e) => e.preventDefault());
          return { id: t.id, node };
        });
        root.replaceChildren(...buttons.map((b) => b.node));
      }
      const suggested = state.step?.suggestedTool;
      for (const b of buttons) {
        b.node.classList.toggle('is-active', b.id === state.tool);
        b.node.classList.toggle('is-suggested', b.id === suggested && b.id !== state.tool);
        b.node.setAttribute('aria-pressed', String(b.id === state.tool));
      }
    },
  };
}

function createMonitor(game: GameApi): { root: HTMLElement; update(state: GameState): void } {
  const hr = readout('FC');
  const bp = readout('PA');
  const blood = readout('Sangue perdido');
  hr.unit.textContent = 'bpm';
  bp.unit.textContent = 'mmHg';
  blood.unit.textContent = 'ml';
  const status = el('span', 'badge', '');
  const bleeding = el('span', 'badge badge--danger', 'Sangrando');
  bleeding.hidden = true;
  const canvas = el('canvas', 'ecg');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Traçado do eletrocardiograma');
  const root = el(
    'div',
    'card monitor',
    el('div', 'monitor-head', el('span', 'widget-label', 'Monitor'), el('span', 'monitor-badges', bleeding, status)),
    canvas,
    el('div', 'monitor-readouts', hr.root, bp.root, blood.root),
  );
  root.setAttribute('aria-label', 'Sinais vitais');

  const samples = new Float32Array(ECG_BUFFER);
  const ctx = canvas.getContext('2d');
  let statusNow: VitalsStatus = 'stable';
  let colors = { line: '#000', grid: '#000' };
  let frames = 0;

  const readColors = (): void => {
    const css = getComputedStyle(root);
    const pick = (name: string): string => css.getPropertyValue(name).trim() || 'currentColor';
    const token = statusNow === 'stable' ? '--success' : statusNow === 'warning' ? '--warning' : '--danger';
    colors = { line: pick(token), grid: pick('--glass-border') };
  };

  const draw = (): void => {
    requestAnimationFrame(draw);
    if (!ctx || !canvas.offsetParent) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    if (frames++ % COLOR_REFRESH_FRAMES === 0) readColors();
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = dpr;
    ctx.beginPath();
    for (let i = 1; i < 4; i++) {
      const y = Math.round((h * i) / 4) + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    const n = game.readEcg(samples);
    if (n < 2) return;
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 2 * dpr;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * w;
      // -0,3 … 1 → base … topo, com folga nas bordas.
      const y = h * 0.9 - ((samples[i] ?? 0) + 0.3) * (h * 0.8) / 1.3;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };
  requestAnimationFrame(draw);

  return {
    root,
    update(state) {
      const v = state.vitals;
      if (!v) return;
      hr.value.textContent = String(v.heartRate);
      bp.value.textContent = `${v.systolic}/${v.diastolic}`;
      blood.value.textContent = String(v.bloodLostMl);
      const s = STATUS[v.status];
      status.className = `badge ${s.badge}`;
      status.textContent = s.text;
      bleeding.hidden = !v.bleeding;
      root.classList.toggle('is-critical', v.status === 'critical' || v.status === 'arrest');
      if (statusNow !== v.status) {
        statusNow = v.status;
        readColors();
      }
    },
  };
}

export function createHud(game: GameApi): View {
  const tray = createTray(game);
  const monitor = createMonitor(game);

  const surgeryName = el('span', 'widget-label');
  const stepBadge = el('span', 'badge badge--accent');
  const instruction = el('p', 'instruction');
  const hint = el('p', 'text-muted instruction-hint');
  const feedbackText = el('div');
  const feedback = el('div', 'alert', feedbackText);
  feedback.setAttribute('role', 'status');
  feedback.hidden = true;
  const guide = el('div', 'card guide', el('div', 'guide-head', stepBadge, surgeryName), instruction, hint, feedback);
  guide.setAttribute('aria-live', 'polite');

  const timer = el('span', 'timer', '0:00');
  timer.setAttribute('role', 'timer');
  timer.setAttribute('aria-label', 'Tempo de cirurgia');
  const soundIcon = el('span', 'icon-slot');
  const sound = button('icon-btn', soundIcon, () => game.toggleMute());
  const pause = button('icon-btn', svg(ICON_PAUSE, 20), () => game.pause());
  pause.setAttribute('aria-label', 'Pausar (Esc)');
  pause.dataset.tooltip = 'Pausar (Esc)';
  for (const b of [sound, pause]) b.addEventListener('mousedown', (e) => e.preventDefault());
  const bar = el('div', 'card topbar', timer, sound, pause);

  const root = el('div', 'screen hud', guide, bar, monitor.root, tray.root);
  let mutedShown: boolean | null = null;

  return {
    root,
    update(state) {
      tray.update(state);
      monitor.update(state);
      surgeryName.textContent = state.surgery?.name ?? '';
      if (state.step) {
        stepBadge.textContent = `Etapa ${state.step.index + 1}/${state.step.count}`;
        instruction.textContent = state.step.instruction;
      }
      const tool = state.tools.find((t) => t.id === state.tool);
      hint.textContent = tool ? `${tool.name}: ${tool.hint}` : '';
      timer.textContent = clock(state.timeSec);
      if (mutedShown !== state.muted) {
        mutedShown = state.muted;
        soundIcon.replaceChildren(svg(state.muted ? ICON_SOUND_OFF : ICON_SOUND_ON, 20));
        const label = state.muted ? 'Ligar o som (M)' : 'Desligar o som (M)';
        sound.setAttribute('aria-label', label);
        sound.dataset.tooltip = label;
      }
      const f = state.feedback;
      feedback.hidden = !f;
      if (f) {
        feedback.className = `alert ${FEEDBACK_ALERT[f.kind]}`;
        feedbackText.textContent = f.text;
      }
    },
  };
}
