// Liga simulação, render, entrada e áudio, e implementa a GameApi da ui/.

import { SoundBoard } from '../audio/soundBoard';
import { Input } from '../input/input';
import type { KeyAction } from '../input/keys';
import { Renderer, type CursorView } from '../render/renderer';
import { readEcg, Simulation, TOOL_ORDER, type ProcedureDef, type SimEvent, type ToolId, type ToolInput } from '../sim';
import { activeBleeders } from '../sim/bleeding';
import { STARS_2_MIN, STARS_3_MIN, SYSTOLIC_BASE } from '../sim/tuning';
import { SURGERIES, findSurgery } from '../surgeries';
import type {
  FeedbackInfo,
  GameApi,
  GamePhase,
  GameState,
  ResultInfo,
  StepInfo,
  SurgeryInfo,
  VitalsInfo,
} from './api';
import { FixedLoop } from './loop';
import { loadProgress, recordResult, type StorageLike } from './progress';
import { eventFeedback, toolInfos } from './texts';

/** Intervalo (s) entre alarmes com vitais críticos. */
const ALARM_INTERVAL = 1.4;
/** Maior quadro (s) considerado (aba que volta do segundo plano). */
const MAX_FRAME = 0.25;
/** Semente da simulação: a mesma cirurgia sangra sempre nos mesmos pontos. */
const SIM_SEED = 1;

const TOOLS = toolInfos(TOOL_ORDER);

/** Estrelas de uma nota salva (as mesmas faixas da nota da cirurgia). */
function starsFor(score: number | undefined): 1 | 2 | 3 | null {
  if (score === undefined) return null;
  return score >= STARS_3_MIN ? 3 : score >= STARS_2_MIN ? 2 : 1;
}

export class Game implements GameApi {
  private readonly renderer: Renderer;
  private readonly input: Input;
  private readonly sound = new SoundBoard();
  private readonly loop = new FixedLoop();
  private readonly listeners = new Set<(state: GameState) => void>();
  private readonly toolInput: ToolInput = { tool: 'scalpel', x: 0, y: 0, down: false };
  private readonly cursor: CursorView = { x: 0, y: 0, inside: false, tool: 'scalpel', down: false, visible: false };

  private sim: Simulation | null = null;
  private procedure: ProcedureDef | null = null;
  private phase: GamePhase = 'menu';
  private tool: ToolId = 'scalpel';
  private muted = false;
  private feedback: FeedbackInfo | null = null;
  private feedbackSeq = 0;
  private result: ResultInfo | null = null;
  private surgeries: SurgeryInfo[];
  private state: GameState;
  private lastFrame = -1;
  private alarmTimer = 0;
  private dirty = true;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly storage: StorageLike | null,
  ) {
    this.renderer = new Renderer(canvas);
    this.input = new Input(
      canvas,
      (action) => this.onKey(action),
      () => this.sound.unlock(),
    );
    this.surgeries = this.buildSurgeries();
    this.state = this.buildState();
    requestAnimationFrame((t) => this.frame(t));
  }

  // --- GameApi ------------------------------------------------------------------

  getState(): GameState {
    return this.state;
  }

  subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  readEcg(out: Float32Array): number {
    if (!this.sim) {
      out.fill(0);
      return out.length;
    }
    return readEcg(this.sim.state.vitals, out);
  }

  startSurgery(id: string): void {
    const procedure = findSurgery(id);
    if (!procedure) throw new Error(`Cirurgia desconhecida: ${id}`);
    this.procedure = procedure;
    this.sim = new Simulation(procedure, SIM_SEED);
    this.tool = procedure.steps[0]?.tool ?? 'scalpel';
    this.result = null;
    this.feedback = null;
    this.alarmTimer = 0;
    this.loop.reset();
    this.phase = 'playing';
    this.dirty = true;
  }

  pause(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.sound.setSuction(false);
    this.dirty = true;
  }

  resume(): void {
    if (this.phase !== 'paused') return;
    this.phase = 'playing';
    this.loop.reset();
    this.dirty = true;
  }

  exit(): void {
    this.sim = null;
    this.procedure = null;
    this.result = null;
    this.feedback = null;
    this.phase = 'menu';
    this.sound.setSuction(false);
    this.dirty = true;
  }

  restart(): void {
    if (this.procedure) this.startSurgery(this.procedure.id);
  }

  selectTool(tool: ToolId): void {
    if (tool === this.tool) return;
    this.tool = tool;
    this.dirty = true;
  }

  toggleMute(): void {
    this.muted = !this.muted;
    this.sound.setMuted(this.muted);
    this.dirty = true;
  }

  // --- Quadro ---------------------------------------------------------------------

  private onKey(action: KeyAction): void {
    switch (action.type) {
      case 'tool': {
        const tool = TOOL_ORDER[action.index];
        if (tool && this.phase === 'playing') this.selectTool(tool);
        break;
      }
      case 'mute':
        this.toggleMute();
        break;
      case 'pause':
        if (this.phase === 'playing') this.pause();
        else if (this.phase === 'paused') this.resume();
        break;
    }
  }

  private frame(now: number): void {
    const seconds = this.lastFrame < 0 ? 0 : Math.min(MAX_FRAME, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    const sim = this.sim;
    const playing = this.phase === 'playing' && sim !== null;

    if (playing) {
      this.loop.advance(seconds, () => this.stepSim(sim));
      this.updateAlarm(sim, seconds);
    } else {
      this.loop.reset();
    }
    this.sound.setSuction(this.phase === 'playing' && this.tool === 'suction' && this.input.down);

    const cursor = this.cursor;
    cursor.x = this.input.x;
    cursor.y = this.input.y;
    cursor.inside = this.input.inside;
    cursor.tool = this.tool;
    cursor.down = this.input.down;
    cursor.visible = this.phase === 'playing';
    this.renderer.draw(sim?.state ?? null, cursor, now / 1000);

    this.refresh();
    requestAnimationFrame((t) => this.frame(t));
  }

  private stepSim(sim: Simulation): void {
    if (this.phase !== 'playing') return;
    const view = this.renderer.view;
    const input = this.toolInput;
    input.tool = this.tool;
    input.x = view.toWorldX(this.input.x);
    input.y = view.toWorldY(this.input.y);
    input.down = this.input.down && this.input.inside;
    sim.step(input);
    for (const event of sim.events) this.onEvent(event, sim);
    if (sim.state.outcome !== 'running') this.finish(sim);
  }

  private onEvent(event: SimEvent, sim: Simulation): void {
    const sound = this.sound;
    switch (event.type) {
      case 'beat':
        sound.beep(sim.state.vitals.systolic / SYSTOLIC_BASE);
        break;
      case 'cut':
        sound.cut();
        break;
      case 'cauterize':
      case 'burn':
        sound.cauterize();
        break;
      case 'stitchStart':
      case 'stitch':
      case 'ligate':
        sound.stitch();
        break;
      case 'stepComplete':
        sound.stepComplete();
        break;
      default:
        break;
    }
    if (
      event.type === 'cutMiss' ||
      event.type === 'burn' ||
      event.type === 'stitchMiss' ||
      event.type === 'protectedCut'
    ) {
      sound.error();
    }
    const message = eventFeedback(event);
    if (message) {
      this.feedback = { id: ++this.feedbackSeq, ...message };
      this.dirty = true;
    }
  }

  private updateAlarm(sim: Simulation, seconds: number): void {
    if (sim.state.vitals.status !== 'critical') {
      this.alarmTimer = 0;
      return;
    }
    this.alarmTimer -= seconds;
    if (this.alarmTimer <= 0) {
      this.sound.alarm();
      this.alarmTimer = ALARM_INTERVAL;
    }
  }

  private finish(sim: Simulation): void {
    const score = sim.state.score;
    const procedure = this.procedure;
    if (!score || !procedure) return;
    let best = { newBestScore: false, newBestTime: false };
    if (score.outcome === 'complete') {
      best = recordResult(this.storage, procedure.id, score.score, Math.round(score.timeSec));
      this.sound.success();
    } else {
      this.sound.failure();
    }
    this.result = {
      outcome: score.outcome,
      score: score.score,
      stars: score.stars,
      precision: Math.round(score.precision * 100),
      timeScore: Math.round(score.timeScore * 100),
      bloodScore: Math.round(score.bloodScore * 100),
      timeSec: Math.round(score.timeSec),
      bloodLostMl: Math.round(score.bloodLostMl),
      reasons: score.reasons,
      ...best,
    };
    this.phase = score.outcome === 'complete' ? 'won' : 'lost';
    this.sound.setSuction(false);
    this.surgeries = this.buildSurgeries();
    this.dirty = true;
  }

  // --- Estado para a ui/ ------------------------------------------------------------

  private buildSurgeries(): SurgeryInfo[] {
    const progress = loadProgress(this.storage);
    return SURGERIES.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      stepCount: s.steps.length,
      parTimeSec: s.parTimeSec,
      bestScore: progress[s.id]?.bestScore ?? null,
      bestStars: starsFor(progress[s.id]?.bestScore),
      bestTimeSec: progress[s.id]?.bestTimeSec ?? null,
    }));
  }

  private buildStep(): StepInfo | null {
    const sim = this.sim;
    const procedure = this.procedure;
    if (!sim || !procedure) return null;
    const index = Math.min(sim.state.stepIndex, procedure.steps.length - 1);
    const step = procedure.steps[index];
    if (!step) return null;
    return { index, count: procedure.steps.length, instruction: step.instruction, suggestedTool: step.tool };
  }

  private buildVitals(): VitalsInfo | null {
    const sim = this.sim;
    if (!sim) return null;
    const v = sim.state.vitals;
    return {
      heartRate: Math.round(v.heartRate),
      systolic: Math.round(v.systolic),
      diastolic: Math.round(v.diastolic),
      bloodLostMl: Math.round(v.bloodLost),
      bleeding: activeBleeders(sim.state) > 0,
      status: v.status,
    };
  }

  private buildState(): GameState {
    const procedure = this.procedure;
    return {
      phase: this.phase,
      surgeries: this.surgeries,
      surgery: procedure ? (this.surgeries.find((s) => s.id === procedure.id) ?? null) : null,
      step: this.buildStep(),
      tool: this.tool,
      tools: TOOLS,
      vitals: this.buildVitals(),
      timeSec: this.sim ? Math.floor(this.sim.state.time) : 0,
      muted: this.muted,
      feedback: this.feedback,
      result: this.result,
    };
  }

  /** Publica estado novo se algo visível mudou (vitais e tempo arredondados). */
  private refresh(): void {
    const s = this.state;
    const sim = this.sim;
    if (!this.dirty && sim && this.phase === 'playing') {
      const v = sim.state.vitals;
      const sv = s.vitals;
      this.dirty =
        !sv ||
        Math.floor(sim.state.time) !== s.timeSec ||
        sim.state.stepIndex !== s.step?.index ||
        Math.round(v.heartRate) !== sv.heartRate ||
        Math.round(v.systolic) !== sv.systolic ||
        Math.round(v.diastolic) !== sv.diastolic ||
        Math.round(v.bloodLost) !== sv.bloodLostMl ||
        v.status !== sv.status ||
        activeBleeders(sim.state) > 0 !== sv.bleeding;
    }
    if (!this.dirty) return;
    this.dirty = false;
    this.state = this.buildState();
    for (const listener of this.listeners) listener(this.state);
  }
}
