/**
 Module: util_pos
 Author: 820491047
 CreateDate:   2022.5.25
 UpDateDate:   2022.7.20
 version 0.0.1
*/
import { BOTTOM, BOTTOM_LEFT, BOTTOM_RIGHT, DirectionConstant, LEFT, RIGHT, TOP, TOP_LEFT, TOP_RIGHT } from "game/constants";
import { CostMatrix } from "game/path-finder";
import { GameObject, RoomPosition } from "game/prototypes";
import { getDirection, getRange } from "game/utils";

import { ERR } from "./util_game";
import { divide0, inIntRange, invalid } from "./util_JS";

/**
 * represent a position type
 */
export type Pos = { x: number; y: number } | GameObject | Pos_C;
/**
 * represent a position of the map
 */
export class Pos_C implements RoomPosition {
	x: number;
	y: number;
	constructor(pos: Pos) {
		this.x = pos.x;
		this.y = pos.y;
	}
}

//const

export const midPoint: Pos_C = { x: 50, y: 50 };
export const pos00: Pos_C = { x: 0, y: 0 };
export const poshh: Pos_C = { x: 100, y: 100 };

//functions
export function inRange<E extends Pos>(poss: E[], ori: Pos, range: number): E[] {
	return poss.filter(i => MGR(i, ori) <= range)
}
export function inRangeVector(vec: Pos, maxRange: number): Pos {
	const x = vec.x;
	const y = vec.y;
	const ax = Math.abs(x)
	const ay = Math.abs(y)
	if (ax <= maxRange && ay <= maxRange) {
		return { x: x, y: y }
	} else if (ax > ay) {
		const rate = divide0(maxRange, ax)
		return multiplyVector(vec, rate)
	} else {
		const rate = divide0(maxRange, ay)
		return multiplyVector(vec, rate)
	}
}
export function roundVector(vec: Pos): Pos {
	return { x: Math.round(vec.x), y: Math.round(vec.y) }
}
/**
 * return -`vec`
 */
export function oppoVector(vec: Pos): Pos {
	return { x: -vec.x, y: -vec.y };
}
export function getDirectionByPos(posFrom: Pos, posTo: Pos): DirectionConstant {
	return getDirection(posTo.x - posFrom.x, posTo.y - posFrom.y)
}
/**
 * add a direction constant to a `Pos`
 */
export function AddDirection(pos: Pos, dir: DirectionConstant): Pos {
	if (dir == TOP) return { x: pos.x, y: pos.y - 1 };
	else if (dir == TOP_RIGHT) return { x: pos.x + 1, y: pos.y - 1 };
	else if (dir == RIGHT) return { x: pos.x + 1, y: pos.y };
	else if (dir == BOTTOM_RIGHT) return { x: pos.x + 1, y: pos.y + 1 };
	else if (dir == BOTTOM) return { x: pos.x, y: pos.y + 1 };
	else if (dir == BOTTOM_LEFT) return { x: pos.x - 1, y: pos.y + 1 };
	else if (dir == LEFT) return { x: pos.x - 1, y: pos.y };
	else if (dir == TOP_LEFT) return { x: pos.x - 1, y: pos.y - 1 };
	else return { x: pos.x, y: pos.y };
}
/**
 * give a list of `Pos` that link the `ori` and `tar`
 */
export function possFromTo(ori: Pos, tar: Pos): Pos[] {
	const rtn: Pos[] = [];
	let nowPos = ori;
	rtn.push(ori);
	const r = myGetRange(ori, tar);
	const deltaX = (tar.x - ori.x) / r;
	const deltaY = (tar.y - ori.y) / r;
	for (let i = 0; i < r; i++) {
		const posX = Math.floor(ori.x + deltaX * i);
		const posY = Math.floor(ori.y + deltaY * i);
		const pos = { x: posX, y: posY };
		if (!atPos(pos, nowPos)) {
			rtn.push(pos);
			nowPos = pos;
		}
	}
	rtn.push(tar);
	return rtn;
}
/**
 * return (`w1`*`v1`+`w2`*`v2`)/(`w1`+`w2`)
 */
export function plusVectorByWeight(
	v1: Pos,
	w1: number,
	v2: Pos,
	w2: number
): Pos {
	const wv1 = w1 / (w1 + w2);
	const wv2 = w2 / (w1 + w2);
	const vt1 = multiplyVector(v1, wv1);
	const vt2 = multiplyVector(v2, wv2);
	return plusVector(vt1, vt2);
}

/**
 * return `n`*`vec`
 */
export function multiplyVector(vec: Pos, n: number): Pos {
	if (invalidPos(vec)) {
		ERR("invalidPos vec");
		return vec;
	} else return { x: vec.x * n, y: vec.y * n };
}
/**
 * return |`ori.x`-`tar.x`|
 */
export function X_axisDistance(ori: Pos, tar: Pos): number {
	if (validPos(ori) && validPos(tar)) {
		return Math.abs(ori.x - tar.x);
	} else {
		return Infinity;
	}
}
/**
 * return |`ori.y`-`tar.y`|
 */
export function Y_axisDistance(ori: Pos, tar: Pos): number {
	if (validPos(ori) && validPos(tar)) {
		return Math.abs(ori.y - tar.y);
	} else {
		return Infinity;
	}
}
/**
 * return |`a.x`-`b.x`|+|`a.y`-`b.y`|
 */
export function absRange(a: Pos, b: Pos): number {
	return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
/**
 *  get a list of `Pos` in range but by step
 *  ,like `pos`= `{x:0,y:0}`,`range`=1,`step`=2 will
 *  return `[{x:-1,y:-1},{x:-1,y:1},{x:1,y:-1},{x:1,y:1}]`
 */
export function getRangePossByStep(
	pos: Pos,
	range: number,
	step: number
): Pos[] {
	if (validPos(pos)) {
		let cx = pos.x;
		let cy = pos.y;
		let rtn: Pos[] = [];
		for (let i = cx - range; i <= cx + range; i += step) {
			for (let j = cy - range; j <= cy + range; j += step) {
				let newPos = { x: i, y: j };
				if (inBorder(newPos)) {
					rtn.push(newPos);
				}
			}
		}
		return rtn;
	} else {
		ERR("invalidPos(pos)");
		return [];
	}
}
/**
 * return `v1`+`v2`
 */
export function plusVector(v1: Pos, v2: Pos): Pos {
	if (invalidPos(v1)) {
		ERR("invalidPos v1");
		return v2;
	} else if (invalidPos(v2)) {
		ERR("invalidPos v2");
		return v1;
	} else return { x: v1.x + v2.x, y: v1.y + v2.y };
}
/** CounterClockWise
 */
export function leftRotate(pos: Pos): Pos {
	return { x: pos.y, y: -pos.x };
}
/**ClockWise
 */
export function rightRotate(pos: Pos): Pos {
	return { x: -pos.y, y: pos.x };
}
/**
 * return `v1`-`v2`
 */
export function minusVector(v1: Pos, v2: Pos): Pos {
	if (invalidPos(v1)) {
		ERR("invalidPos v1");
		return v2;
	} else if (invalidPos(v2)) {
		ERR("invalidPos v2");
		return v1;
	} else return { x: v1.x - v2.x, y: v1.y - v2.y };
}
/**
 * the same as {@link myGetRange}
 */
export function MGR(p1: Pos, p2: Pos): number {
	return myGetRange(p1, p2);
}
export function Adj(p1: Pos, p2: Pos): boolean {
	return MGR(p1, p2) <= 1
}
export function InShotRan(p1: Pos, p2: Pos): boolean {
	return MGR(p1, p2) <= 3
}
export function findFarestByRange(ori: Pos, tars: Pos[]): Pos {
	return tars.sort((a, b) => MGR(ori, b) - MGR(ori, a))[0];
}
/**
 * the same as getRange but will check if undefined or null
 */
export function myGetRange(p1: Pos, p2: Pos): number {
	if (validPos(p1) && validPos(p2)) {
		return getRange(p1, p2);
	} else {
		ERR("myGetRange cre=" + COO(p1) + " tar=" + COO(p2));
		return Infinity;
	}
}
/**
 *  return the print string of a `Pos`
 */
export function coordinate(tar: Pos | undefined): string {
	if (tar) return " {x=" + tar.x + " y=" + tar.y + "} ";
	else return "" + tar;
}
/**
 *  judge if is at the same position
 */
export function atPos(cre: Pos, tar: Pos): boolean {
	if (invalidPos(cre) || invalidPos(tar))
		return false;
	else
		return cre.x === tar.x && cre.y === tar.y;
}
/**
 *  in the border of map
 */
export function inBorder(pos: Pos): boolean {
	return (
		validPos(pos) && inIntRange(pos.x, 0, 100) && inIntRange(pos.y, 0, 100)
	);
}
/**
 * `pos.x` or `pos.y` not undefined or null
 */
export function validPos(pos: Pos): boolean {
	return !invalidPos(pos);
}
/**
 *  obverse to the {@link validPos}
 */
export function invalidPos(pos: Pos): boolean {
	return (
		invalid(pos) ||
		invalid(pos.x) ||
		invalid(pos.y) ||
		isNaN(pos.x) ||
		isNaN(pos.y)
	);
}
/**
 *  the same as {@link coordinate}
 */
export function COO(pos: Pos | undefined): string {
	return coordinate(pos);
}
/**
 *  same as {@link getRangePossByStep},but step is 1
 */
export function getRangePoss(pos: Pos, range: number): Pos[] {
	return getRangePossByStep(pos, range, 1);
}

/**获取反方向 */
export function getReverseDirection(dir: DirectionConstant): DirectionConstant {
	return (dir + 4) % 8 as DirectionConstant;
}

/**
 * 方向顺时针转45°
 * @param dir
 * @returns
 */
export function leftRotateDirection(dir: DirectionConstant): DirectionConstant {
	return (dir + 1) % 8 as DirectionConstant;
}

/**
 * 方向逆时针转45°
 * @param dir
 * @returns
 */
export function rightRotateDirection(dir: DirectionConstant): DirectionConstant {
	return (dir + 7) % 8 as DirectionConstant;
}

export const allDirections: DirectionConstant[] = [1, 2, 3, 4, 5, 6, 7, 8]

/**
 * set a `CostMatrix` by lambda Function
 */
export function setMatrixByLambda(
	matrix: CostMatrix,
	l: (x: number, y: number) => number
) {
	for (let i = 0; i < 100; i++) {
		for (let j = 0; j < 100; j++) {
			let d = l(i, j);
			// if (d != 0) {
			//if 0 that dont set ,cause it's default value
			matrix.set(i, j, d);
			// }
		}
	}//艹，好了，没好
}
