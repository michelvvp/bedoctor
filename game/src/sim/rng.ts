// Gerador pseudoaleatório com semente (mulberry32): a mesma semente e as mesmas
// entradas dão sempre a mesma cirurgia.

export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** Número em [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Número em [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }
}
