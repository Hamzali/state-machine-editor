import Color from 'color';
import { v1 as uuidv1 } from 'uuid';
import ColorHash from 'color-hash';

const colorHash = new ColorHash();

export const genID = (): string => uuidv1();

export const mapText2Color = (txt: string): string => colorHash.hex(txt);

export enum ObjectEvent {
  MouseOut = 'mouseout',
  MouseOver = 'mouseover',
  MouseDown = 'mousedown',
  MouseUp = 'mouseup',
  MouseDoubleClick = 'mousedblclick',
  Moving = 'moving',
}

export interface StateRule {
  metadata: { x: number; y: number };
  events: Record<string, string>;
}

export interface StateMachine {
  initialState: string;
  rules: Record<string, StateRule>;
}

export const ELEMENT_EVENTS = {
  stateMachineChange: 'statemachine:change',
  state: {
    click: 'state:click',
    rightClick: 'state:rightclick',
    over: 'state:over',
    out: 'state:out',
    doubleClick: 'state:doubleclick',
  },
  transition: {
    click: 'transition:click',
    rightClick: 'transition:rightclick',
    over: 'transition:over',
    out: 'transition:out',
    doubleClick: 'transition:doubleclick',
  },
  canvas: {
    click: 'canvas:click',
    rightClick: 'canvas:rightclick',
    doubleClick: 'canvas:doubleclick',
  },
};

export const EDITOR_DEFAULTS = {
  stateFill: new Color('#180019'),
  stateStroke: new Color('#C5CBD3'),
  initialStateStroke: new Color('orange'),
  currentStateFill: new Color('#400042'),
  textStroke: new Color('white'),
  backgroundColor: new Color('#330031'),
  selectionColor: new Color(),
  selfLinkHeight: 100,
  stateRadius: 30,
  maxZoom: 20,
  minZoom: 0.01,
  selectableStates: true,
};

export interface EditorOptions {
  stateRadius?: number;
  stateFill?: Color;
  stateStroke?: Color;
  initialStateStroke?: Color;
  currentStateFill?: Color;
  textStroke?: Color;
  backgroundColor?: Color;
  selectionColor?: Color;
  selfLinkHeight?: number;
  selectableStates?: boolean;
  maxZoom?: number;
  minZoom?: number;
}
