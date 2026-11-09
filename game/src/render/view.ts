// Câmera 2D: encaixa a área de jogo (mm) no canvas, centrada na janela de pele.

/** Área (mm) que sempre cabe na tela; o que sobrar mostra mais mesa. */
export const VIEW_WIDTH = 560;
export const VIEW_HEIGHT = 380;

export class View {
  /** Pixels (CSS) por mm. */
  scale = 1;
  /** Centro da tela (px CSS), onde fica a origem do mundo. */
  cx = 0;
  cy = 0;

  fit(width: number, height: number): void {
    this.scale = Math.max(0.1, Math.min(width / VIEW_WIDTH, height / VIEW_HEIGHT));
    this.cx = width / 2;
    this.cy = height / 2;
  }

  toWorldX(sx: number): number {
    return (sx - this.cx) / this.scale;
  }

  toWorldY(sy: number): number {
    return (sy - this.cy) / this.scale;
  }

  toScreenX(wx: number): number {
    return this.cx + wx * this.scale;
  }

  toScreenY(wy: number): number {
    return this.cy + wy * this.scale;
  }
}
