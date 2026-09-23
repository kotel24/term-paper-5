import type * as THREE from 'three';
import type { Machine } from '../model/machine';
import type { Stage, View } from '../core/stage';
import type { Sfx } from '../audio/sfx';
import type { Chips } from '../fx/chips';
import type { Hud } from '../ui/hud';

export interface MachineState {
  power: boolean;
  keyInChuck: boolean;
  spinning: boolean;
  coasting: boolean;
  guardClosed: boolean;
  speedIndex: number;
  feedIndex: number;
}

export interface Ctx {
  m: Machine;
  stage: Stage;
  sfx: Sfx;
  chips: Chips;
  hud: Hud;
  state: MachineState;
  focus(view: string, duration?: number): void;
  wait(seconds: number): Promise<void>;
  isDone(actionId: string): boolean;
}

export interface Target {
  obj: THREE.Object3D;
  offset?: THREE.Vector3;
}

export interface Action {
  id: string;
  label: string;
  hint: string;
  target?: string;
  hotspot?: string;
  view?: string;
  auto?: boolean;
  run?: (ctx: Ctx) => Promise<void>;
}

export interface Trap {
  id: string;
  target: string;
  offset?: THREE.Vector3;
  hotspot: string;
  title: string;
  message: string;
  active: (ctx: Ctx) => boolean;
  run?: (ctx: Ctx) => Promise<void>;
}

export interface PanelApi {
  complete(actionId: string): Promise<void>;
  mistake(title: string, message: string): void;
  isDone(actionId: string): boolean;
}

export interface Step {
  id: string;
  title: string;
  intro: string;
  view: string;
  outro?: string;
  ordered: boolean;
  actions: Action[];
  traps?: Trap[];
  panel?: (ctx: Ctx, api: PanelApi) => { close(): void };
  why: string[];
}

export type Views = Record<string, View>;
