/**
 Module: util_visual
 Author: 820491047
 CreateDate:   2022.5.25
 UpDateDate:   2023.1.10
 version 0.0.0
*/
import { RoomPosition } from "game/prototypes";
import { getTicks } from "game/utils";
import { Visual } from "game/visual";

import { Event } from "./util_event";
import { P } from "./util_game";
import { DND2, goInDoubleRange } from "./util_JS";
import { MyMap } from "./util_MyMap";
import { overallMap } from "./util_overallMap";
import { atPos, COO, invalidPos, Pos, pos00, validPos } from "./util_pos";

/**
 * the list of SAVis
 */
export let SAVisList: SAVis[];
export let visual10: Visual
export let visual9: Visual
/**
 * should be call at first tick
 */
export function firstInit_visual() {
	SAVisList = [];
}
//classes
/**
 *  represent a Visual of SA text
 */
export class SAVis extends Visual implements Event, RoomPosition {
	x: number;
	y: number;
	invokeTick: number = getTicks();
	/** the text to show */
	sayText = "";
	/** the pos of text */
	textPos: Pos;
	/** the Visual of the line */
	sayLine: Visual | undefined;
	constructor(pos: Pos, layer: number) {
		super(layer, false);
		this.x = pos.x;
		this.y = pos.y;
		this.textPos = getSATextPos(pos);
		this.sayLine = drawLineComplex(pos, this.textPos, 0.5, "#0000ff");
		//
		overallMap.get(pos).push(this);
		SAVisList.push(this);
	}
}
//functions
export let largeSizeText: string = ""
export function append_largeSizeText(s: string) {
	largeSizeText += s
}
/**
 * should be call every start of the tick
 */
export function loopStart_visual() {
	SAVisList = [];
	consoleNum = 0
	largeSizeText = ""
	visual10 = new Visual(10, false)
	visual9 = new Visual(9, false)
}
/**
 * should be call every end of the tick
 */
export function loopEnd_visual() {
	drawAllSAViss();
	drawLargeSizeText();
}
export function drawLargeSizeText() {
	drawText({ x: 50, y: 1 }, largeSizeText, 2)
}
/**
 *  draw MyMap in the specific border that in rectangle pos1 to pos2
 * @param mm the MyMap
 * @param l the lambda funciton that judge if the text will be show
 */
export function drawMyMap(
	mm: MyMap<number>,
	pos1: Pos,
	pos2: Pos,
	l?: ((pos: Pos, d: number) => boolean) | undefined
): void {
	mm.setByLambda_area(
		pos => {
			let d = mm.get(pos);
			let lRtn = l ? l(pos, d) : true;
			if (lRtn) {
				let s = DND2(d);
				drawText(pos, "" + s);
			}
			return d;
		},
		pos1,
		pos2
	);
}
/**
 *
 */
export function getSATextPos(pos: Pos): Pos {
	const len = 5;
	const tarX = Math.floor(pos.x / len) * len;
	const tarY = pos.y + (pos.x % len) / len;
	const tarPos = { x: tarX, y: tarY };
	// P(coordinate(cre)+" getSATarPos="+S(tarPos));
	return tarPos;
}
// /**
//  * draw a circle
//  */
// export function drawCircle(
// 	pos: Pos,
// 	color: string,
// 	radius: number,
// 	// opacity: number = 1,
// 	lineStyle?: "dashed" | "dotted" | "solid" | undefined
// ): Visual | undefined {
// 	if (validPos(pos)) {
// 		return visual10.circle(pos, {
// 			fill: undefined,
// 			// opacity: goInDoubleRange(opacity, 0, 1),
// 			radius: radius,
// 			stroke: color,
// 			lineStyle: lineStyle
// 		});
// 	} else return;
// }
/**
 * fill a circle
 */
export function fillCircle(
	pos: Pos,
	color: string,
	radius: number,
	opacity: number
): Visual | undefined {
	if (validPos(pos)) {
		return visual10.circle(pos, {
			fill: color,
			radius: radius,
			opacity: goInDoubleRange(opacity, 0, 1),
		});
	} else return;
}
/**
 * draw a light line
 */
export function drawLineLight(pos1: Pos, pos2: Pos): Visual | undefined {
	return drawLineComplex(pos1, pos2, 0.25, "#ffffff");
}
// class LS implements LineStyle {
//     width?: number;
//     color?: string;
//     opacity?: number;
//     lineStyle?: "dashed" | "dotted" | undefined;
//     constructor(width?: number,
//         color?: string,
//         opacity?: number,
//         lineStyle?: "dashed" | "dotted" | undefined) {
//         this.width = width
//         this.color = color
//         this.opacity = opacity
//         this.lineStyle = lineStyle
//     }
// }
export function getOpacity(n: number): number {
	return goInDoubleRange(n, 0, 1)
}
export const dashed = "dashed"
export const dotted = "dotted"
/**
 * draw a line
 */
export function drawLineComplex(
	pos1: Pos,
	pos2: Pos,
	opacity: number,
	color: string,
	lineStyle?: "dashed" | "dotted" | undefined
): Visual | undefined {
	if (invalidPos(pos1)) return;
	if (invalidPos(pos2)) return;
	try {
		if (atPos(pos1, pos2)) {
			return;
		}
		return visual10.line(pos1, pos2, {
			width: 0.1,
			color: color,
			opacity: goInDoubleRange(opacity, 0, 1),
			lineStyle: lineStyle
		});
	} catch (ex) {
		P(ex);
		P("pos1=" + COO(pos1) + " pos2=" + COO(pos2));
		return;
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
	size: number = 0.33
): Visual | undefined {
	if (validPos(pos)) {
		return visual9.text(s, pos, {
			font: size,
			opacity: 0.9,
			color: "#ffdddd"
			// backgroundColor: "#808000",
			// backgroundPadding: 0.1,
		});
	} else return;
}
/**
 * return a SAVis of a specific layer
 */
export function getSAVis(pos: Pos, layer: number): SAVis {
	if (invalidPos(pos))
		return new SAVis(pos00, layer);
	var oList = overallMap.get(pos);
	var vis = <SAVis | undefined>(
		oList.find(i => i instanceof SAVis && i.layer == layer)
	);
	if (vis)
		return vis;
	else
		return new SAVis(pos, layer);
}
/**
 * print a text on a position of the game map ,the same position will be print at one line
 */
export function sayAppend(pos: Pos, str: string): void {
	var vis: SAVis = getSAVis(pos, 10);
	vis.sayText += str;
}
export let consoleNum = 0
export function PS(s: any) {
	P(s)
	if (getTicks() >= 2) {
		const pos00 = { x: consoleNum % 5, y: consoleNum / 5 }
		consoleNum++
		SA(pos00, "" + s)
	}
}
/**
 * the same as {@link sayAppend},but add space at start and end
 */
export function SA(cre: Pos, str: string): void {
	return sayAppend(cre, " " + str + " ");
}
export function SAN(cre: Pos, str: string, n: number): void {
	return SA(cre, str + "=" + n.toFixed(2));
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
		return visual10.poly(path, {
			stroke: color,
			opacity: goInDoubleRange(opacity, 0, 1),
		});
	} catch (ex) {
		P(ex);
		return;
	}
}
/**
 * draw 4 line that represent a range
 */
export function drawRange(cre: Pos, rad: number): (Visual | undefined)[] {
	return drawRangeComplex(cre, rad, 1, "#ffffff");
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
	const op = goInDoubleRange(opacity, 0, 1);
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
		let tarPos = vis.textPos;
		if (invalidPos(vis)) {
			P(COO(vis) + " drawSAs problem vis " + COO(vis));
			continue;
		}
		if (invalidPos(tarPos)) {
			P(COO(tarPos) + " drawSAs problem tar" + COO(tarPos));
			continue;
		}
		vis.clear().text(
			vis.sayText,
			tarPos, // above the creep
			{
				color: "#eeeeee",
				font: "0.2",
				opacity: 0.9,
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
	if (validPos(pos)) {
		return visual10.rect(pos, w, h, {
			fill: color,
			opacity: goInDoubleRange(opacity, 0, 1),
		});
	} else {
		return;
	}
}
