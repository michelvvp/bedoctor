// Efeitos sonoros procedurais (Web Audio): bip do monitor, corte, cautério,
// sutura, alarme, sucesso e derrota. Sem arquivo de som e sem música.

/** Volume geral. */
const MASTER_GAIN = 0.5;
/** Frequência (Hz) do bip com pressão normal; cai com a pressão, como no oxímetro. */
const BEEP_BASE_HZ = 980;
const BEEP_MIN_HZ = 520;

export class SoundBoard {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private suctionSource: AudioBufferSourceNode | null = null;
  private suctionGain: GainNode | null = null;
  private muted = false;

  /** Cria o contexto de áudio; só funciona depois de um gesto do usuário. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER_GAIN;
    this.master.connect(ctx.destination);
    // Ruído branco reaproveitado por corte, aspirador e cautério.
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 12345;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      data[i] = (seed / 0x7fffffff) * 2 - 1;
    }
    this.noise = buffer;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : MASTER_GAIN, this.ctx.currentTime, 0.02);
    }
  }

  private tone(
    freq: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine',
    delay = 0,
    endFreq = freq,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  private noiseBurst(duration: number, volume: number, filterHz: number, q = 1): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noise) return;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterHz;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + duration + 0.02);
  }

  /** Bip do monitor. `pressureFactor` 1 = pressão normal, 0 = colapso. */
  beep(pressureFactor: number): void {
    const f = BEEP_MIN_HZ + (BEEP_BASE_HZ - BEEP_MIN_HZ) * Math.min(1, Math.max(0, pressureFactor));
    this.tone(f, 0.09, 0.18);
  }

  cut(): void {
    this.noiseBurst(0.07, 0.35, 3200, 2);
  }

  cauterize(): void {
    this.noiseBurst(0.25, 0.3, 1800, 4);
    this.tone(120, 0.25, 0.08, 'sawtooth');
  }

  stitch(): void {
    this.tone(1400, 0.05, 0.15, 'triangle');
    this.tone(1900, 0.05, 0.12, 'triangle', 0.06);
  }

  /** Erro do jogador (corte fora, queimadura, ponto errado). */
  error(): void {
    this.tone(220, 0.18, 0.2, 'square', 0, 160);
  }

  stepComplete(): void {
    this.tone(660, 0.12, 0.18, 'triangle');
    this.tone(880, 0.18, 0.18, 'triangle', 0.1);
  }

  /** Alarme de vitais críticos (chamar periodicamente enquanto durar). */
  alarm(): void {
    this.tone(880, 0.16, 0.22, 'square');
    this.tone(660, 0.16, 0.22, 'square', 0.2);
  }

  success(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, 0.2, 'triangle', i * 0.12));
  }

  /** Derrota: linha reta do monitor. */
  failure(): void {
    this.tone(BEEP_BASE_HZ, 2.2, 0.16, 'sine');
  }

  /** Chiado contínuo do aspirador. */
  setSuction(active: boolean): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noise) return;
    if (active && !this.suctionSource) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2500;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.gain.setTargetAtTime(0.12, ctx.currentTime, 0.05);
      src.connect(filter).connect(gain).connect(this.master);
      src.start();
      this.suctionSource = src;
      this.suctionGain = gain;
    } else if (!active && this.suctionSource && this.suctionGain) {
      this.suctionGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      this.suctionSource.stop(ctx.currentTime + 0.3);
      this.suctionSource = null;
      this.suctionGain = null;
    }
  }
}
