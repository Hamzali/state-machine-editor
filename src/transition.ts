import { fabric } from 'fabric';
import State from './state';
import { ObjectEvent, EDITOR_DEFAULTS, mapText2Color, genID } from './common';

export interface TransitionOption {
  src?: State;
  dest?: State;
  defaultX?: number;
  defaultY?: number;
}

export default class NewTransition {
  static selfLinkHeight = EDITOR_DEFAULTS.selfLinkHeight;
  #id: string;
  #name: string;
  #ctx: fabric.Canvas;
  #link: fabric.Path;
  #pointer: fabric.Path;
  #src: State | null;
  #dest: State | null;
  #defaultX: number;
  #defaultY: number;

  get src(): State | null {
    return this.#src;
  }

  set src(value: State | null) {
    this.#src = value;
    this.rerender();
  }

  get dest(): State | null {
    return this.#dest;
  }

  set dest(value: State | null) {
    this.#dest = value;
    this.rerender();
  }

  get name(): string {
    return this.#name;
  }

  get id(): string {
    return this.#id;
  }

  set defaultDest(value: { x: number; y: number }) {
    this.#defaultX = value.x;
    this.#defaultY = value.y;
    this.rerender();
  }

  get defaultDest(): { x: number; y: number } {
    return { x: this.#defaultX, y: this.#defaultY };
  }

  constructor(
    ctx: fabric.Canvas,
    name: string,
    { src, dest, defaultX, defaultY }: TransitionOption = {}
  ) {
    this.#id = genID();
    this.#name = name;
    this.#ctx = ctx;
    this.#src = src ?? null;
    this.#dest = dest ?? null;
    const { link, pointer } = this.render();
    this.#link = link;
    this.#pointer = pointer;
    this.#defaultX = defaultX || 0;
    this.#defaultY = defaultY || 0;
  }

  private render(): { pointer: fabric.Path; link: fabric.Path } {
    const defaultPos = { x: this.#defaultX, y: this.#defaultY };
    const srcPos = this.#src?.position ?? defaultPos;
    const destPos = this.#dest?.position ?? defaultPos;
    const { link, pointer } = this.calcTransitionLink(srcPos.x, srcPos.y, destPos.x, destPos.y, 30);
    const stroke = mapText2Color(this.#name);
    this.#link = new fabric.Path(link, {
      fill: '',
      stroke,
      strokeWidth: 2,
      perPixelTargetFind: true,
      lockMovementX: true,
      lockMovementY: true,
      hasControls: false,
    });
    this.#pointer = new fabric.Path(pointer, {
      stroke,
      fill: stroke,
      hasControls: false,
      selectable: false,
    });
    this.#ctx.add(this.#link, this.#pointer);
    return { link: this.#link, pointer: this.#pointer };
  }

  private rerender(): void {
    this.remove();
    this.render();
    this.#handlers.forEach(({ event, handler }) => {
      this.#link.on(event, (opt) => handler(opt, this));
    });
  }

  remove(): void {
    this.#ctx.remove(this.#pointer);
    this.#ctx.remove(this.#link);
  }

  setCoords(): void {
    this.#pointer.setCoords();
    this.#link.setCoords();
  }

  #handlers: {
    event: ObjectEvent;
    handler: (opt: fabric.IEvent, transition: NewTransition) => void;
  }[] = [];
  on(event: ObjectEvent, handler: (opt: fabric.IEvent, transition: NewTransition) => void): void {
    this.#handlers.push({ event, handler });
    this.#link.on(event, (opt) => handler(opt, this));
  }

  // CALCULATIONS

  private calcLinkPath(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    curve: number
  ): string {
    const midX = fromX + (toX - fromX) / 2;
    const midY = fromY + (toY - fromY) / 2;
    const pX = midX - curve;
    const pY = midY + curve;
    return `M ${fromX} ${fromY} Q ${pX}, ${pY}, ${toX}, ${toY}`;
  }

  private calcPointerPath(x: number, y: number, rotation = 0): string {
    const height = 10;
    const base = 10;
    const side = Math.sqrt((base / 2) ** 2 + height ** 2);
    const rad = Math.atan(base / 2 / height);
    const l1 = `L ${x + Math.cos(rad + rotation) * side} ${y + Math.sin(rad + rotation) * side}`;
    const l2 = `L ${x + Math.cos(-rad + rotation) * side} ${y + Math.sin(-rad + rotation) * side}`;
    return `M ${x} ${y} ${l1} ${l2} z`;
  }

  private calcSelfLinkPath(x: number, y: number): string {
    const bezierY = y - State.stateRadius;
    const y1 = bezierY - NewTransition.selfLinkHeight;
    const x2 = x - NewTransition.selfLinkHeight;
    const y2 = bezierY;
    return `M ${x} ${bezierY} C ${x} ${y1}, ${x2} ${y2}, ${x} ${bezierY}`;
  }

  private calcTransitionLink(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    curve: number
  ): { link: string; pointer: string } {
    if (x1 === x2 && y1 === y2) {
      return {
        link: this.calcSelfLinkPath(x1, y1),
        pointer: this.calcPointerPath(x1, y1 - State.stateRadius, -Math.PI / 2),
      };
    }
    const theta = Math.atan((y2 - y1) / (x2 - x1));
    const sign = (theta > 0 ? -1 : 1) * (y2 > y1 ? -1 : 1);
    const fromX = x1 + sign * Math.cos(theta) * State.stateRadius;
    const fromY = y1 + sign * Math.sin(theta) * State.stateRadius;
    const toX = x2 + sign * -1 * Math.cos(theta) * State.stateRadius;
    const toY = y2 + sign * -1 * Math.sin(theta) * State.stateRadius;
    const midX = fromX + (toX - fromX) / 2;
    const midY = fromY + (toY - fromY) / 2;
    const pX = midX - curve * sign;
    const pY = midY + curve * sign;
    const pointerTheta = Math.atan((toY - pY) / (toX - pX));
    return {
      link: this.calcLinkPath(fromX, fromY, toX, toY, curve * sign),
      pointer: this.calcPointerPath(toX, toY, sign === -1 ? pointerTheta : Math.PI + pointerTheta),
    };
  }
}
