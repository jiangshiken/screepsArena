import { getTicks } from "game/utils";
import { Visual } from "game/visual";

import { overallMap } from "../gameObjects/overallMap";
import { Event, Event_Number } from "./Event";
import { leftRate } from "./game";
import { d2 } from "./JS";
import { HasPos, Pos, pos00, Pos_C } from "./Pos";
import { PL } from "./print";

/**
 * the list of SAVis
 */
export let SAVisList: SAVis[];
export let visual_layer10: Visual;
export let visual_layer9: Visual;
/**
 * should be call at first tick
 */
export function firstInit_visual() {
  SAVisList = [];
}
/**
 *  represent a Visual of SA text
 */
export class SAVis extends Visual implements HasPos {
  readonly data_x: number;
  readonly data_y: number;
  readonly startTick: Event;
  readonly invokeTick: number = getTicks();
  /** the text to show */
  sayText = "";
  /** the pos of text */
  readonly textPos: Pos;
  /** the Visual of the line */
  readonly sayLine: Visual;
  constructor(pos: Pos, layer: number) {
    super(layer, false);
    this.data_x = pos.x;
    this.data_y = pos.y;
    this.startTick = new Event();
    this.textPos = getSATextPos(pos);
    this.sayLine = drawLineComplex(pos, this.textPos, 0.5, "#0000ff");
    //
    overallMap.get(pos).push(this);
    SAVisList.push(this);
  }
  get x(): number {
    return this.data_x;
  }
  get y(): number {
    return this.data_y;
  }
}
//functions
export let largeSizeText: string = "";
export function append_largeSizeText(s: string) {
  largeSizeText += s;
}
/**
 * should be call every start of the tick
 */
export function loopStart_visual() {
  SAVisList = [];
  consoleNum = 0;
  largeSizeText = "";
  visual_layer10 = new Visual(10, false);
  visual_layer9 = new Visual(9, false);
}
/**
 * should be call every end of the tick
 */
export function loopEnd_visual() {
  drawAllSAViss();
  drawLargeSizeText();
}
export function drawLargeSizeText() {
  drawText(new Pos_C(50, 1), largeSizeText, 2);
}
/**
 *
 */
function getSATextPos(pos: Pos): Pos {
  const len = 5;
  const tarX = Math.floor(pos.x / len) * len;
  const tarY = pos.y + (pos.x % len) / len;
  const tarPos = { x: tarX, y: tarY };
  return tarPos;
}
/**
 * fill a circle
 */
export function fillCircle(
  pos: Pos,
  color: string,
  radius: number,
  opacity: number
): Visual | undefined {
  return visual_layer10.circle(pos, {
    fill: color,
    radius: radius,
    opacity: opacity,
  });
}
/**
 * draw a light line
 */
export function drawLineLight(pos1: Pos, pos2: Pos): Visual | undefined {
  return drawLineComplex(pos1, pos2, 0.25, "#ffffff");
}
export const dashed = "dashed";
export type type_dashed = "dashed";
export const dotted = "dotted";
export type type_dotted = "dotted";
/**
 * draw a line
 */
export function drawLineComplex(
  pos1: Pos,
  pos2: Pos,
  opacity: number,
  color: string,
  lineStyle?: type_dashed | type_dotted | undefined
): Visual {
  try {
    return visual_layer10.line(pos1, pos2, {
      width: 0.1,
      color: color,
      opacity: opacity,
      lineStyle: lineStyle,
    });
  } catch (ex) {
    P(ex);
    return visual_layer10.line(pos00, pos00, {
      width: 0.1,
      color: "#ffffff",
      opacity: 1,
      lineStyle: undefined,
    });
  }
}

/**
 * {@link sayAppend} an error
 */
export function SAE(pos: Pos, ex: Error): void {
  SA(pos, "ERR" + ex.message);
}
/**
 * draw a text
 */
export function drawText(
  pos: Pos,
  s: string,
  size: number = 0.5,
  color: string = "#ffffff"
): Visual | undefined {
  return visual_layer10.text(s, pos, {
    font: size,
    opacity: 1,
    color: color,
    // backgroundColor: "#808000",
    // backgroundPadding: 0.1,
  });
}
/**
 * return a SAVis of a specific layer
 */
export function getSAVis(pos: Pos, layer: number): SAVis {
  try {
    const oList = overallMap.get(pos);
    const vis = <SAVis | undefined>(
      oList.find(i => i instanceof SAVis && i.layer === layer)
    );
    if (vis) return vis;
    else return new SAVis(pos, layer);
  } catch (e) {
    PL(e);
    PL(pos.x + " " + pos.y);
    return new SAVis(pos00, 10);
  }
}
/**
 * print a text on a position of the game map ,the same position will be print at one line
 */
export function sayAppend(pos: Pos, str: string): void {
  const vis: SAVis = getSAVis(pos, 10);
  vis.sayText += str;
}
export let consoleNum = 0;
export function P(s: any) {
  PL(s);
  if (getTicks() >= 2) {
    const pos00 = { x: consoleNum % 5, y: Math.floor(consoleNum / 5) };
    consoleNum++;
    SA(pos00, "" + s);
  }
}
/**
 * the same as {@link sayAppend},but add space at start and end
 */
export function SA(cre: Pos, str: string): void {
  return sayAppend(cre, " " + str + " ");
}
export function SAN(cre: Pos, str: string, n: number): void {
  return SA(cre, str + "=" + d2(n));
}
/**
 * draw a solid line
 */
export function drawLine(pos1: Pos, pos2: Pos): Visual | undefined {
  return drawLineComplex(pos1, pos2, 1, "#ffffff");
}
/**
 * draw a light poly line
 */
export function drawPolyLight(path: Pos[]): Visual | undefined {
  return drawPoly(path, 0.25, "#ffffff");
}
/**
 * draw a poly line
 */
export function drawPoly(
  path: Pos[],
  opacity: number,
  color: string
): Visual | undefined {
  try {
    return visual_layer10.poly(path, {
      stroke: color,
      opacity: opacity,
    });
  } catch (ex) {
    P(ex);
    return;
  }
}
/**
 * draw 4 line that represent a range
 */
export function drawRange(
  cre: Pos,
  rad: number,
  color: string = "#ffffff"
): (Visual | undefined)[] {
  return drawRangeComplex(cre, rad, 1, color);
}
/**
 * draw 4 line that represent a range,but have more args
 */
export function drawRangeComplex(
  cre: Pos,
  rad: number,
  opacity: number,
  color: string
): (Visual | undefined)[] {
  const cx = cre.x;
  const cy = cre.y;
  const leftTop = { x: cx - rad, y: cy - rad };
  const rightTop = { x: cx + rad, y: cy - rad };
  const leftBottom = { x: cx - rad, y: cy + rad };
  const rightBottom = { x: cx + rad, y: cy + rad };
  const rtn: (Visual | undefined)[] = [];
  const op = opacity;
  rtn.push(drawLineComplex(leftTop, rightTop, op, color));
  rtn.push(drawLineComplex(rightTop, rightBottom, op, color));
  rtn.push(drawLineComplex(rightBottom, leftBottom, op, color));
  rtn.push(drawLineComplex(leftBottom, leftTop, op, color));
  return rtn;
}
/**
 * draw all SAVis
 */
function drawAllSAViss(): void {
  for (let vis of SAVisList) {
    const tarPos = vis.textPos;
    vis.clear().text(
      vis.sayText,
      tarPos, // above the creep
      {
        color: "#eeeeee",
        font: "0.2",
        opacity: 1,
        // backgroundColor: "#808080"
        // backgroundPadding: 0.0,
      }
    );
  }
}
/**
 * draw a rectangle,that is filled with color
 */
export function drawRect(
  pos: Pos,
  w: number,
  h: number,
  color: string,
  opacity: number
): Visual | undefined {
  return visual_layer10.rect(pos, w, h, {
    fill: color,
    opacity: opacity,
  });
}
// export let displayPos: Pos = pos00
let displayAccumulate: Event_Number = new Event_Number(0);
export function displayPos(): Pos {
  if (!displayAccumulate.validEvent()) {
    displayAccumulate = new Event_Number(0);
  }
  displayAccumulate.num++;
  const acc = displayAccumulate.num;
  const xBias = Math.floor((50 + leftRate() * 40) / 5) * 5;
  const yBias = 50;
  return { x: xBias + (acc % 5), y: yBias + Math.floor(acc / 5) };
}
