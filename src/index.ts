import { fabric } from 'fabric';

import State from './state';
import Transition, { TransitionOption } from './transition';

import { StateRule, EDITOR_DEFAULTS, StateMachine, ELEMENT_EVENTS, ObjectEvent } from './common';

export default class StateMachineEditor extends HTMLElement {
  // html and canvas elements
  #root: ShadowRoot;
  #canvasElement: HTMLCanvasElement;
  #canvas: fabric.Canvas;

  // internal state
  #isDragging = false;
  #newTransition: Transition | null = null;
  #lastPosX = 0;
  #lastPosY = 0;
  stateMachineRules: Record<string, StateRule> = {};
  #initialState = '';
  #currentState = '';
  #transitions: Transition[] = [];
  #statesMap: Record<string, State> = {};

  // configuration
  #backgroundColor = EDITOR_DEFAULTS.backgroundColor;
  #maxZoom = EDITOR_DEFAULTS.maxZoom;
  #minZoom = EDITOR_DEFAULTS.minZoom;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    this.#canvasElement = document.createElement('canvas');
    this.#root.appendChild(this.#canvasElement);
    this.#canvas = this.#canvas = new fabric.Canvas(this.#canvasElement, {
      backgroundColor: this.#backgroundColor.toString(),
      selection: false,
      fireRightClick: true,
      stopContextMenu: true,
    });
    this.#canvas.on('mouse:down', this.handleMouseDown.bind(this));
    this.#canvas.on('mouse:up', this.handleMouseUp.bind(this));
    this.#canvas.on('mouse:wheel', this.handleMouseWheel.bind(this));
    this.#canvas.on('mouse:move', this.handleMouseMove.bind(this));
    this.#canvas.on('mouse:dblclick', this.handleDoubleClick.bind(this));
  }

  connectedCallback(): void {
    this.setCanvasSize(
      Number(this.getAttribute('width')) || 100,
      Number(this.getAttribute('height')) || 100
    );
  }

  get stateMachine(): StateMachine {
    return this.getStateMachine();
  }

  set stateMachine(value) {
    this.setStateMachine(value);
  }

  get currentState(): string | null {
    return this.getAttribute('currentstate');
  }

  set currentState(value) {
    if (value) {
      this.setAttribute('currentstate', value);
    }
  }

  get width(): string | null {
    return this.getAttribute('width');
  }

  set width(newWidth) {
    if (newWidth == null) {
      return;
    }
    this.setWidth(Number(newWidth));
    this.setAttribute('width', newWidth);
  }

  get height(): string | null {
    return this.getAttribute('height');
  }

  set height(newHeight) {
    if (newHeight == null) return;
    this.setHeight(Number(newHeight));
    this.setAttribute('height', newHeight);
  }

  static get observedAttributes(): string[] {
    return ['width', 'height', 'currentstate'];
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string): void {
    switch (name) {
      case 'width':
        this.setWidth(Number(newValue));
        break;
      case 'height':
        this.setHeight(Number(newValue));
        break;
      case 'currentstate':
        this.setCurrentState(newValue);
        break;
      default:
        console.log('defalut case');
        break;
    }
  }

  private initialRender(): void {
    // clear old render
    this.#transitions = [];
    this.#statesMap = {};
    this.#canvas.clear();
    this.#canvas.setBackgroundColor(this.#backgroundColor.toString(), () => {
      console.log('cleaerd');
    });
    // new render
    const stateList = Object.entries(this.stateMachineRules);
    stateList.forEach(
      ([
        stateName,
        {
          metadata: { x, y },
        },
      ]) => {
        this.drawState(stateName, x, y);
      }
    );

    stateList.forEach(([stateName, { events }]) => {
      const eventKeys = Object.keys(events);
      const src = this.#statesMap[stateName];
      eventKeys.forEach((event: string) => {
        const destStateName = events[event];
        const dest = this.#statesMap[destStateName];
        this.drawTransition(event, { src, dest });
      });
    });
  }

  // ACTIONS

  setCurrentState(value: string): void {
    const oldState = this.#statesMap[this.#currentState];
    if (oldState) {
      oldState.active = false;
    }
    const newState = this.#statesMap[value];
    if (newState) {
      newState.active = true;
      this.#currentState = value;
    }
  }

  setStateMachine({ initialState, rules }: StateMachine): void {
    this.stateMachineRules = rules;
    this.#initialState = initialState;
    this.initialRender();
    this.setCurrentState(initialState);
  }

  addState(name: string, x: number, y: number): void {
    if (typeof name !== 'string' || this.stateMachineRules[name] != null) {
      throw new Error('State Already Exists');
    }

    this.stateMachineRules[name] = {
      metadata: { x, y },
      events: {},
    };

    this.drawState(name, x, y);
    this.handleStateMachineChange();
  }

  setInitialState(name: string): void {
    const newInitialState = this.#statesMap[name];
    const oldInitialState = this.#statesMap[this.#initialState];
    if (newInitialState) newInitialState.initial = true;
    if (oldInitialState) oldInitialState.initial = false;
    this.#initialState = name;
  }

  deleteState(name: string): void {
    if (this.#statesMap[name] == null) {
      throw new Error('Invalid State Item');
    }

    // clear state instance
    this.#statesMap[name].remove();
    delete this.#statesMap[name];

    // clear transition instances
    this.#transitions = this.#transitions.filter((transition) => {
      if (transition.src?.name === name || transition.dest?.name === name) {
        transition.remove();
        return false;
      }
      return true;
    });

    this.handleStateMachineChange();
  }

  deleteTransition(id: string): void {
    this.#transitions = this.#transitions.filter((transition) => {
      if (transition.id === id && transition.src) {
        transition.remove();
        return false;
      }

      return true;
    });
    this.handleStateMachineChange();
  }

  startAddTransition(event: string, srcName: string, destX: number, destY: number): void {
    if (this.#statesMap[srcName] == null) {
      throw new Error('Invalid State Item');
    }

    if (this.#newTransition != null) {
      throw new Error('Already adding transition');
    }

    const src = this.#statesMap[srcName];
    this.#newTransition = this.drawTransition(event, {
      src,
      defaultX: destX,
      defaultY: destY,
    });
  }

  stopAddTransition(): void {
    if (this.#newTransition == null) return;
    this.#newTransition.remove();
    this.#newTransition = null;
  }

  setCanvasSize(width: number, height: number): void {
    this.#canvas.setWidth(width);
    this.#canvas.setHeight(height);
  }

  setHeight(height: number): void {
    this.#canvas.setHeight(height);
  }

  setWidth(width: number): void {
    this.#canvas.setWidth(width);
  }

  setHoverCursor(cursor: string): void {
    this.#canvas.hoverCursor = cursor;
  }

  getStateMachine(): StateMachine {
    const newDef: Record<string, StateRule> = {};
    for (const state of Object.values(this.#statesMap)) {
      newDef[state.name] = { metadata: state.position, events: {} };
    }
    this.#transitions.forEach((transition) => {
      if (transition.src && transition.dest) {
        newDef[transition.src.name].events[transition.name] = transition.dest.name;
      }
    });
    this.stateMachineRules = newDef;
    return JSON.parse(JSON.stringify(this.stateMachineRules));
  }

  // CANVAS EVENT HANDLERS

  private dispatchCustomEvent(name: string, detail: any): void {
    this.dispatchEvent(
      new CustomEvent(name, {
        detail,
      })
    );
  }

  private updateAllObjects(): void {
    this.#canvas.requestRenderAll();
    Object.values(this.#statesMap).forEach((state: State) => state.setCoords());
    this.#transitions.forEach((transition) => {
      transition.setCoords();
    });
  }

  private handleMouseWheel({ e }: fabric.IEvent): void {
    e.preventDefault();
    e.stopPropagation();
    const { offsetX, offsetY, deltaY } = e as MouseWheelEvent;
    let zoom = this.#canvas.getZoom() + deltaY / 200;
    if (zoom > this.#maxZoom) zoom = this.#maxZoom;
    if (zoom < this.#minZoom) zoom = this.#minZoom;
    this.#canvas.zoomToPoint(new fabric.Point(offsetX, offsetY), zoom);
    this.updateAllObjects();
  }

  private handleMouseDown({ button, target, e, absolutePointer }: fabric.IEvent): void {
    const { altKey, clientX, clientY } = e as MouseEvent;
    if (target != null) return;
    if (altKey) {
      this.#isDragging = true;
      this.#lastPosX = clientX;
      this.#lastPosY = clientY;
      return;
    }

    const detail = {
      event: e as MouseEvent,
      canvas: { x: absolutePointer?.x, y: absolutePointer?.y },
    };

    if (button === 3) {
      this.dispatchCustomEvent(ELEMENT_EVENTS.canvas.rightClick, detail);
    } else {
      this.dispatchCustomEvent(ELEMENT_EVENTS.canvas.click, detail);
    }
  }

  private handleMouseUp(): void {
    this.#isDragging = false;
  }

  private handleMouseMove({ absolutePointer, e }: fabric.IEvent): void {
    if (this.#isDragging) {
      const { clientX, clientY } = e as MouseEvent;

      if (
        this.#canvas.viewportTransform &&
        this.#canvas.viewportTransform[4] &&
        this.#canvas.viewportTransform[5]
      ) {
        this.#canvas.viewportTransform[4] += clientX - this.#lastPosX;
        this.#canvas.viewportTransform[5] += clientY - this.#lastPosY;
      }
      this.#lastPosX = clientX;
      this.#lastPosY = clientY;

      this.updateAllObjects();
    }

    // update new transition destination
    if (this.#newTransition == null || absolutePointer == null) return;
    if (this.#newTransition.src && this.#newTransition.dest == null) {
      this.#newTransition.defaultDest = {
        x: absolutePointer.x,
        y: absolutePointer.y,
      };
    }
  }

  private handleDoubleClick({ absolutePointer, target, e: event }: fabric.IEvent): void {
    if (target != null) return;
    this.dispatchCustomEvent(ELEMENT_EVENTS.canvas.doubleClick, {
      canvas: { x: absolutePointer?.x, y: absolutePointer?.y },
      event: event as MouseEvent,
    });
  }

  // STATE EVENTS

  private handleStateMachineChange(): void {
    this.dispatchCustomEvent(ELEMENT_EVENTS.stateMachineChange, {
      stateMachine: this.getStateMachine(),
    });
  }

  private handleStateMove(_opt: fabric.IEvent, state: State): void {
    this.#transitions.forEach((transition): void => {
      if (transition.dest && transition.dest.name === state.name) {
        transition.dest = state;
      }

      if (transition.src && transition.src.name === state.name) {
        transition.src = state;
      }

      transition.setCoords();
    });
    state.setCoords();
  }

  private handleStateDoubleClick({ absolutePointer, e: event }: fabric.IEvent, state: State): void {
    const {
      name,
      position: { x, y },
    } = state;
    this.dispatchCustomEvent(ELEMENT_EVENTS.state.doubleClick, {
      state: { name, x, y },
      canvas: { x: absolutePointer?.x, y: absolutePointer?.y },
      event: event as MouseEvent,
    });
  }

  private handleStateMouseOver({ e: event }: fabric.IEvent, state: State): void {
    const {
      position: { x, y },
      name,
    } = state;
    this.dispatchCustomEvent(ELEMENT_EVENTS.state.over, {
      state: { name, x, y },
      event: event as MouseEvent,
    });

    if (this.#newTransition) {
      this.#newTransition.dest = state;
    }
  }

  private handleStateMouseOut({ e }: fabric.IEvent, state: State): void {
    const {
      position: { x, y },
      name,
    } = state;

    this.dispatchCustomEvent(ELEMENT_EVENTS.state.out, {
      state: { name, x, y },
      event: e as MouseEvent,
    });

    if (this.#newTransition == null) return;
    if (this.#newTransition.dest) {
      this.#newTransition.dest = null;
    }
  }

  private handleStateClick({ button, e }: fabric.IEvent, state: State): void {
    const {
      position: { x, y },
      name,
    } = state;

    const detail = {
      state: { name, x, y },
      event: e as MouseEvent,
    };

    if (button === 3) {
      this.dispatchCustomEvent(ELEMENT_EVENTS.state.rightClick, detail);
    } else {
      this.dispatchCustomEvent(ELEMENT_EVENTS.state.click, detail);
    }

    if (this.#newTransition == null) return;
    if (this.#newTransition.src && this.#newTransition.dest) {
      this.stateMachineRules[this.#newTransition.src.name].events[
        this.#newTransition.name
      ] = this.#newTransition.dest.name;
      this.#transitions.push(this.#newTransition);
      this.#newTransition = null;
      this.handleStateMachineChange();
    }
  }

  private handleStateMouseUp(): void {
    this.handleStateMachineChange();
  }

  // TRANSITION

  private handleTransitionClick({ button, e }: fabric.IEvent, transition: Transition): void {
    const detail = {
      transition,
      event: e as MouseEvent,
    };

    if (button === 3) {
      this.dispatchCustomEvent(ELEMENT_EVENTS.transition.rightClick, detail);
    } else {
      this.dispatchCustomEvent(ELEMENT_EVENTS.transition.click, detail);
    }
  }

  private handleTransitionOver({ e: event }: fabric.IEvent, transition: Transition): void {
    const detail = {
      transition,
      event: event as MouseEvent,
    };
    this.dispatchCustomEvent(ELEMENT_EVENTS.transition.over, detail);
  }

  private handleTransitionOut({ e: event }: fabric.IEvent, transition: Transition): void {
    const detail = {
      transition,
      event: event as MouseEvent,
    };
    this.dispatchCustomEvent(ELEMENT_EVENTS.transition.over, detail);
  }

  private handleTransitionDoubleClick({ e: event }: fabric.IEvent, transition: Transition): void {
    const detail = {
      transition,
      event: event as MouseEvent,
    };
    this.dispatchCustomEvent(ELEMENT_EVENTS.transition.doubleClick, detail);
  }

  // DRAW METHODS
  private drawState(name: string, x: number, y: number): State {
    const state = new State(this.#canvas, name, x, y, {
      initial: this.#initialState === name,
      active: this.#currentState === name,
    });
    state.on(ObjectEvent.MouseOut, this.handleStateMouseOut.bind(this));
    state.on(ObjectEvent.MouseOver, this.handleStateMouseOver.bind(this));
    state.on(ObjectEvent.MouseDown, this.handleStateClick.bind(this));
    state.on(ObjectEvent.MouseUp, this.handleStateMouseUp.bind(this));
    state.on(ObjectEvent.MouseDoubleClick, this.handleStateDoubleClick.bind(this));
    state.on(ObjectEvent.Moving, this.handleStateMove.bind(this));
    state.render();
    this.#statesMap[name] = state;
    return state;
  }

  private drawTransition(event: string, options: TransitionOption): Transition {
    const transition = new Transition(this.#canvas, event, options);
    transition.on(ObjectEvent.MouseOver, this.handleTransitionOver.bind(this));
    transition.on(ObjectEvent.MouseOut, this.handleTransitionOut.bind(this));
    transition.on(ObjectEvent.MouseDown, this.handleTransitionClick.bind(this));
    transition.on(ObjectEvent.MouseDoubleClick, this.handleTransitionDoubleClick.bind(this));
    this.#transitions.push(transition);
    return transition;
  }
}

if (!window.customElements.get('state-machine-editor')) {
  window.customElements.define('state-machine-editor', StateMachineEditor);
}

// new StateMachineEditor("canvasid", sm)
