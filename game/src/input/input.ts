// Mouse e teclado. O mouse vira posição (px do canvas) e botão; o teclado vira
// `KeyAction`. Quem converte para mm e monta o `ToolInput` é o jogo.

import { keyAction, type KeyAction } from './keys';

export class Input {
  /** Posição do mouse em px CSS, relativa ao canvas. */
  x = 0;
  y = 0;
  /** Botão esquerdo apertado. */
  down = false;
  /** Mouse em cima do canvas. */
  inside = false;
  private readonly cleanup: (() => void)[] = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    onKey: (action: KeyAction) => void,
    /** Primeiro gesto do usuário (o áudio só pode começar depois dele). */
    onGesture: () => void,
  ) {
    const move = (e: PointerEvent): void => {
      const rect = this.canvas.getBoundingClientRect();
      this.x = e.clientX - rect.left;
      this.y = e.clientY - rect.top;
      this.inside = this.x >= 0 && this.y >= 0 && this.x <= rect.width && this.y <= rect.height;
    };
    const down = (e: PointerEvent): void => {
      onGesture();
      if (e.button !== 0) return;
      move(e);
      this.down = true;
      e.preventDefault();
    };
    const up = (e: PointerEvent): void => {
      if (e.button === 0) this.down = false;
    };
    const key = (e: KeyboardEvent): void => {
      onGesture();
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const action = keyAction(e.code);
      if (!action) return;
      e.preventDefault();
      onKey(action);
    };
    const blur = (): void => {
      this.down = false;
    };
    const leave = (): void => {
      this.inside = false;
    };
    const noMenu = (e: Event): void => e.preventDefault();
    this.listen(window, 'pointermove', move as EventListener);
    this.listen(canvas, 'pointerdown', down as EventListener);
    this.listen(window, 'pointerup', up as EventListener);
    this.listen(window, 'keydown', key as EventListener);
    this.listen(window, 'blur', blur);
    this.listen(canvas, 'pointerleave', leave);
    this.listen(canvas, 'contextmenu', noMenu);
  }

  private listen(target: EventTarget, type: string, fn: EventListener): void {
    target.addEventListener(type, fn);
    this.cleanup.push(() => target.removeEventListener(type, fn));
  }

  dispose(): void {
    for (const fn of this.cleanup) fn();
  }
}
