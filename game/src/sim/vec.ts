// Geometria 2D mínima da simulação: pontos, polilinhas e segmentos.

export interface Vec2 {
  x: number;
  y: number;
}

/** Resultado de projetar um ponto numa polilinha (reaproveitável, sem alocar). */
export interface PolylineHit {
  /** Distância do ponto até a polilinha. */
  distance: number;
  /** Posição ao longo da polilinha, de 0 (início) a 1 (fim), por comprimento. */
  t: number;
  /** Ponto mais próximo na polilinha. */
  x: number;
  y: number;
  /** Lado do ponto: 1 à esquerda do sentido da linha, -1 à direita, 0 em cima. */
  side: number;
}

export function createHit(): PolylineHit {
  return { distance: Infinity, t: 0, x: 0, y: 0, side: 0 };
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

export function polylineLength(line: readonly Vec2[]): number {
  let total = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    total += distance(a.x, a.y, b.x, b.y);
  }
  return total;
}

/** Projeta (px, py) na polilinha e escreve o resultado em `out`. */
export function projectOnPolyline(
  line: readonly Vec2[],
  px: number,
  py: number,
  out: PolylineHit,
): PolylineHit {
  out.distance = Infinity;
  const total = polylineLength(line);
  let walked = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const len = Math.sqrt(len2);
    let u = len2 > 0 ? ((px - a.x) * dx + (py - a.y) * dy) / len2 : 0;
    u = Math.min(1, Math.max(0, u));
    const cx = a.x + dx * u;
    const cy = a.y + dy * u;
    const d = distance(px, py, cx, cy);
    if (d < out.distance) {
      out.distance = d;
      out.x = cx;
      out.y = cy;
      out.t = total > 0 ? (walked + len * u) / total : 0;
      const cross = dx * (py - a.y) - dy * (px - a.x);
      out.side = cross > 0 ? -1 : cross < 0 ? 1 : 0;
    }
    walked += len;
  }
  return out;
}

/**
 * Ponto e normal da polilinha na posição `t` (0–1 por comprimento). A normal é
 * unitária e aponta para o lado 1 de `projectOnPolyline`.
 */
export function samplePolyline(
  line: readonly Vec2[],
  t: number,
  out: { x: number; y: number; nx: number; ny: number },
): void {
  const total = polylineLength(line);
  let target = Math.min(1, Math.max(0, t)) * total;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    const len = distance(a.x, a.y, b.x, b.y);
    if (target <= len || i === line.length - 1) {
      const u = len > 0 ? Math.min(1, target / len) : 0;
      out.x = a.x + (b.x - a.x) * u;
      out.y = a.y + (b.y - a.y) * u;
      const ux = len > 0 ? (b.x - a.x) / len : 1;
      const uy = len > 0 ? (b.y - a.y) / len : 0;
      // Lado 1 = cross(dir, p - a) < 0 em coordenadas de tela (y para baixo).
      out.nx = uy;
      out.ny = -ux;
      return;
    }
    target -= len;
  }
  const only = line[0] ?? { x: 0, y: 0 };
  out.x = only.x;
  out.y = only.y;
  out.nx = 0;
  out.ny = -1;
}

/** Distância de (px, py) ao segmento a–b. */
export function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let u = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  u = Math.min(1, Math.max(0, u));
  return distance(px, py, ax + dx * u, ay + dy * u);
}

/**
 * Posição (0–1 em a–b) em que o segmento a–b cruza c–d, ou -1 se não cruza.
 */
export function segmentCrossing(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): number {
  const rx = bx - ax;
  const ry = by - ay;
  const sx = dx - cx;
  const sy = dy - cy;
  const den = rx * sy - ry * sx;
  if (den === 0) return -1;
  const u = ((cx - ax) * sy - (cy - ay) * sx) / den;
  const v = ((cx - ax) * ry - (cy - ay) * rx) / den;
  return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? u : -1;
}
