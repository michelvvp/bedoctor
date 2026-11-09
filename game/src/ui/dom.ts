// Helpers de DOM e formatação da ui/. Só a marcação do design system passa por aqui.

import type { GameState } from '../game/api';

export type Child = Node | string | null | false | undefined;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const child of children) {
    if (child === null || child === false || child === undefined) continue;
    node.append(child);
  }
  return node;
}

export function button(className: string, label: Child, onClick: () => void): HTMLButtonElement {
  const b = el('button', className, label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

/** Ícone SVG inline (traço em currentColor) a partir do miolo do `<svg>`. */
export function svg(inner: string, size = 24): SVGSVGElement {
  const wrap = document.createElement('span');
  wrap.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  return wrap.firstElementChild as SVGSVGElement;
}

/** 83 → "1:23". */
export function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Estrelas (n de 3) com rótulo acessível. */
export function stars(n: number): HTMLElement {
  const node = el('span', 'stars');
  node.setAttribute('role', 'img');
  node.setAttribute('aria-label', `${n} de 3 estrelas`);
  for (let i = 0; i < 3; i++) node.append(el('span', i < n ? 'star is-on' : 'star', '★'));
  return node;
}

/** Uma tela da ui/: a raiz fica montada e `update` reflete o estado. */
export interface View {
  root: HTMLElement;
  update(state: GameState): void;
}
