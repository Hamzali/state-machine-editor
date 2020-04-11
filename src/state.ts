import { fabric } from 'fabric';
import { EDITOR_DEFAULTS, ObjectEvent, genID } from './common';
import Color from 'color';

// TODO: implement hover effect of state
// over
// target._objects[0].set('stroke', 'red');
//       target._objects[0].animate('radius', 32, {
//         duration: 300,
//         onChange: this.#canvas.renderAll.bind(this.#canvas),
//       });
// out
// const stroke = name === this.#initialState ? this.#initialStateStroke : this.#stateStroke;
// target._objects[0].set('stroke', stroke.toString());
// target._objects[0].animate('radius', 30, {
//   duration: 300,
//   onChange: this.#canvas.renderAll.bind(this.#canvas),
// });

export default class State {
  static initialStateStroke: Color = EDITOR_DEFAULTS.initialStateStroke;
  static activeStateFill: Color = EDITOR_DEFAULTS.currentStateFill;
  static stateStroke: Color = EDITOR_DEFAULTS.stateStroke;
  static stateFill: Color = EDITOR_DEFAULTS.stateFill;
  static textStroke: Color = EDITOR_DEFAULTS.textStroke;
  static stateRadius: number = EDITOR_DEFAULTS.stateRadius;

  #ctx: fabric.Canvas;

  // canvas state
  #group: fabric.Group;
  #circle: fabric.Circle;
  #text: fabric.Text;

  // state properties
  #id: string;
  #name: string;
  #x: number;
  #y: number;
  #initial: boolean;
  #active: boolean;

  get name(): string {
    return this.#name;
  }

  get id(): string {
    return this.#id;
  }

  get position(): { x: number; y: number } {
    this.#x = this.#group.left || 0;
    this.#y = this.#group.top || 0;
    return { x: this.#x, y: this.#y };
  }

  get initial(): boolean {
    return this.#initial;
  }

  set initial(value: boolean) {
    this.#initial = value;
    const stroke = this.#initial ? State.initialStateStroke : State.stateStroke;
    this.#circle.set('stroke', stroke.toString());
    this.#ctx.renderAll();
  }

  get active(): boolean {
    return this.#active;
  }

  set active(value: boolean) {
    this.#initial = value;
    const fill = this.#active ? State.activeStateFill : State.stateFill;
    this.#circle.set('fill', fill.toString());
    this.#ctx.renderAll();
  }

  constructor(
    ctx: fabric.Canvas,
    name: string,
    x: number,
    y: number,
    { initial = false, active = false } = {}
  ) {
    this.#ctx = ctx;
    this.#id = genID();
    this.#name = name;
    this.#x = x;
    this.#y = y;
    this.#initial = initial;
    this.#active = active;
    const stroke = this.#initial ? State.initialStateStroke : State.stateStroke;
    const fill = this.#active ? State.activeStateFill : State.stateFill;
    this.#circle = new fabric.Circle({
      originX: 'center',
      originY: 'center',
      fill: fill.toString(),
      stroke: stroke.toString(),
      radius: State.stateRadius,
      shadow: new fabric.Shadow({
        color: 'rgba(0, 0, 0, 0.5)',
        offsetX: 5,
        offsetY: 5,
      }),
    });
    this.#text = new fabric.Text(name, {
      originX: 'center',
      originY: 'center',
      fontSize: 10,
      stroke: State.textStroke.toString(),
    });
    this.#group = new fabric.Group([this.#circle, this.#text], {
      originX: 'center',
      originY: 'center',
      left: x,
      top: y,
      hasControls: false,
      // TODO: make this configurable
      selectable: true,
      padding: 2,
    });
  }

  on(event: ObjectEvent, handler: (opt: fabric.IEvent, state: State) => void): void {
    this.#group.on(event, (opt) => handler(opt, this));
  }

  remove(): void {
    this.#ctx.remove(this.#group);
    this.#rendered = false;
  }

  #rendered = false;
  render(): void {
    if (this.#rendered) {
      this.remove();
    }
    this.#ctx.add(this.#group);
    this.#rendered = true;
  }

  setCoords(): void {
    this.#group.setCoords();
  }
}
