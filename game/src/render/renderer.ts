// Desenha um quadro: cena, estado da cirurgia e o instrumento no cursor.

import { GAUZE_RADIUS, SUCTION_RADIUS } from '../sim/tuning';
import type { ToolId } from '../sim/tools';
import type { SimState } from '../sim/types';
import { drawInstrument } from './instruments';
import { COLORS } from './palette';
import { drawScene } from './scene';
import { drawSurgical } from './surgical';
import { View } from './view';

export interface CursorView {
  /** Posição em px CSS do canvas. */
  x: number;
  y: number;
  inside: boolean;
  tool: ToolId;
  down: boolean;
  /** Desenhar o instrumento (só durante a cirurgia). */
  visible: boolean;
}

export class Renderer {
  readonly view = new View();
  private readonly ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D indisponível');
    this.ctx = ctx;
  }

  /** Ajusta o canvas ao tamanho da janela (chamar a cada quadro; só mexe se mudou). */
  resize(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (w === this.width && h === this.height && dpr === this.dpr) return;
    this.width = w;
    this.height = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.view.fit(w, h);
  }

  draw(state: SimState | null, cursor: CursorView, time: number): void {
    this.resize();
    const ctx = this.ctx;
    const { dpr, view } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = COLORS.floor;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.cx, dpr * view.cy);
    drawScene(ctx);
    if (state) drawSurgical(ctx, state, time);

    if (cursor.visible && cursor.inside) {
      // Alcance de gaze e aspirador, na escala do mundo.
      const radius = cursor.tool === 'gauze' ? GAUZE_RADIUS : cursor.tool === 'suction' ? SUCTION_RADIUS : 0;
      if (radius > 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(view.toWorldX(cursor.x), view.toWorldY(cursor.y), radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawInstrument(ctx, cursor.tool, cursor.x, cursor.y, cursor.down);
    }
  }
}
