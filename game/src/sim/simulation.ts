// A simulação de uma cirurgia: recebe a entrada de um passo (instrumento,
// posição, botão) e avança tecido, sangue, vitais e etapas em passo fixo.

import {
  addBleeder,
  pressCautery,
  pruneBleeders,
  updateBleeding,
  useGauze,
  useSuction,
} from './bleeding';
import type { SimCore } from './core';
import type { SimEvent, SimEventType } from './events';
import {
  createOrgan,
  createStructure,
  dragForcepsOrgan,
  pressForcepsOrgan,
  pressNeedleLigate,
  releaseForcepsOrgan,
  useScissors,
} from './organs';
import type { ProcedureDef, SetupDef } from './procedure';
import { Rng } from './rng';
import { computeScore } from './score';
import {
  addSutureMarks,
  createIncision,
  dragForcepsEdge,
  dragRetractor,
  dragScalpel,
  pressForcepsEdge,
  pressNeedleSuture,
  pressRetractor,
  releaseForcepsEdge,
} from './tissue';
import type { ToolInput } from './tools';
import { FIXED_DT } from './tuning';
import type { SimState } from './types';
import { createVitals, updateVitals } from './vitals';

export function createState(): SimState {
  return {
    time: 0,
    outcome: 'running',
    stepIndex: 0,
    incisions: [],
    bleeders: [],
    nextBleederId: 1,
    organs: [],
    structures: [],
    nicks: [],
    burns: [],
    tool: {
      tool: 'scalpel',
      x: 0,
      y: 0,
      down: false,
      grab: null,
      pendingStitch: null,
      offGuide: false,
      offGuideRun: 0,
      cutSoundRun: 0,
      stroke: null,
      nick: null,
      awaitRelease: false,
    },
    vitals: createVitals(),
    cut: { length: 0, deviationSum: 0 },
    errors: { offGuide: 0, burn: 0, stitchMiss: 0, protectedCut: 0 },
    score: null,
  };
}

export class Simulation implements SimCore {
  readonly state: SimState = createState();
  readonly rng: Rng;
  /** Eventos do último passo (a lista é reaproveitada a cada passo). */
  readonly events: SimEvent[] = [];

  constructor(
    readonly procedure: ProcedureDef,
    seed = 1,
  ) {
    this.rng = new Rng(seed);
    if (procedure.setup) this.applySetup(procedure.setup);
    const first = procedure.steps[0];
    if (first?.setup) this.applySetup(first.setup);
  }

  emit(type: SimEventType, x: number, y: number, value = 0): void {
    this.events.push({ type, x, y, value });
  }

  /** Aplica a configuração de uma cirurgia ou etapa. */
  applySetup(setup: SetupDef): void {
    const state = this.state;
    for (const def of setup.incisions ?? []) state.incisions.push(createIncision(def));
    for (const def of setup.sutureMarks ?? []) {
      const inc = state.incisions.find((i) => i.id === def.incision);
      if (!inc) throw new Error(`Incisão desconhecida nas marcas de sutura: ${def.incision}`);
      addSutureMarks(inc, def);
    }
    for (const def of setup.organs ?? []) state.organs.push(createOrgan(def));
    for (const def of setup.structures ?? []) state.structures.push(createStructure(def));
    for (const def of setup.bleeders ?? []) addBleeder(this, def.x, def.y, def.rate);
  }

  /** Avança um passo fixo (FIXED_DT) com a entrada dada. */
  step(input: ToolInput): void {
    this.events.length = 0;
    const state = this.state;
    if (state.outcome !== 'running') return;
    const dt = FIXED_DT;
    const tool = state.tool;
    const prevX = tool.x;
    const prevY = tool.y;

    if (input.tool !== tool.tool) {
      this.release();
      tool.tool = input.tool;
      tool.pendingStitch = null;
      tool.awaitRelease = input.down;
    }
    if (tool.awaitRelease && !input.down) tool.awaitRelease = false;
    const down = input.down && !tool.awaitRelease;
    const pressed = down && !tool.down;
    const released = !down && tool.down;
    tool.x = input.x;
    tool.y = input.y;
    tool.down = down;

    if (released) this.release();
    if (down) this.useTool(prevX, prevY, pressed, dt);

    state.time += dt;
    updateBleeding(this, dt);
    const arrested = updateVitals(this, dt);
    pruneBleeders(state);

    if (arrested) {
      state.outcome = 'arrest';
      this.release();
      state.score = computeScore(state, this.procedure.parTimeSec);
      this.emit('arrest', 0, 0);
      return;
    }
    this.checkStep();
  }

  private useTool(prevX: number, prevY: number, pressed: boolean, dt: number): void {
    const tool = this.state.tool;
    // Ao apertar, a ponta não "anda" desde a posição anterior.
    const fromX = pressed ? tool.x : prevX;
    const fromY = pressed ? tool.y : prevY;
    switch (tool.tool) {
      case 'scalpel':
        dragScalpel(this, fromX, fromY, pressed);
        break;
      case 'retractor':
        if (pressed) pressRetractor(this);
        dragRetractor(this);
        break;
      case 'forceps':
        if (pressed && !pressForcepsOrgan(this)) pressForcepsEdge(this);
        dragForcepsOrgan(this);
        dragForcepsEdge(this);
        break;
      case 'scissors':
        useScissors(this, fromX, fromY, pressed);
        break;
      case 'gauze':
        useGauze(this, prevX, prevY, dt);
        break;
      case 'suction':
        useSuction(this, dt);
        break;
      case 'needleDriver':
        if (pressed && !pressNeedleSuture(this)) pressNeedleLigate(this);
        break;
      case 'cautery':
        if (pressed) pressCautery(this);
        break;
    }
  }

  /** Solta o que o instrumento estiver segurando. */
  private release(): void {
    const tool = this.state.tool;
    releaseForcepsOrgan(this);
    releaseForcepsEdge(this);
    tool.grab = null;
    tool.down = false;
    tool.stroke = null;
    tool.nick = null;
    tool.offGuide = false;
  }

  private checkStep(): void {
    const state = this.state;
    const steps = this.procedure.steps;
    const step = steps[state.stepIndex];
    if (!step || !step.done(state)) return;
    this.emit('stepComplete', 0, 0, state.stepIndex);
    state.stepIndex++;
    const next = steps[state.stepIndex];
    if (next) {
      if (next.setup) this.applySetup(next.setup);
      return;
    }
    state.outcome = 'complete';
    this.release();
    state.score = computeScore(state, this.procedure.parTimeSec);
    this.emit('complete', 0, 0);
  }
}
