
import { BOTTOM, BOTTOM_LEFT, BOTTOM_RIGHT, DirectionConstant, LEFT, RIGHT, TOP, TOP_LEFT, TOP_RIGHT } from "game/constants";
import { GameObject, RoomPosition } from "game/prototypes";
import { getDirection, getRange } from "game/utils";

import { printError } from "./game";
import { inRange_int, valid } from "./JS";

/**
 * represent a position type
 */
export type Pos = GameObject | Pos_C;
/**
 * represent a position of the map
 */
export class Pos_C implements RoomPosition {
	readonly x: number;
	readonly y: number;
	constructor(x:number,y:number) {
		this.x = validAxis(x)?x:printError(0);
		this.y = validAxis(y)?y:printError(0);
	}
}
/**
 * represent a position of the map
 */
export class Vec {
	readonly vec_x: number;
	readonly vec_y: number;
	constructor(x:number,y:number) {
		this.vec_x = validNum(x)?x:printError(0);
		this.vec_y = validNum(y)?y:printError(0);
	}
}
export function validNum(x:number):boolean{
	return valid(x) && !isNaN(x)
}
export function validAxis(x:number):boolean{
	return validNum(x) && inRange_int(x, 0, 100)
}
export function PosToPos_C(p:Pos){
	return new Pos_C(p.x,p.y)

}
export const midPoint: Pos_C = new Pos_C(50,50)
export const pos00: Pos_C = new Pos_C(0,0)
export function filterInRange<E extends Pos>(poss: E[], ori: Pos, range: number): E[] {
	return poss.filter(i => GR(i, ori) <= range)
}
/**
 * return -`vec`
 */
export function oppoVector(vec: Vec): Vec {
	return new Vec(-vec.vec_x,-vec.vec_y)
}
export function getDirectionByPos(posFrom: Pos, posTo: Pos): DirectionConstant {
	return getDirection(posTo.x - posFrom.x, posTo.y - posFrom.y)
}
/**
 * add a direction constant to a `Pos`
 */
export function posPlusDirection(pos: Pos, dir: DirectionConstant): Pos {
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
	const r = GR(ori, tar);
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
	v1: Vec,
	w1: number,
	v2: Vec,
	w2: number
): Vec {
	const wv1 = w1 / (w1 + w2);
	const wv2 = w2 / (w1 + w2);
	const vt1 = VecMultiplyConst(v1, wv1);
	const vt2 = VecMultiplyConst(v2, wv2);
	return vecPlusVec(vt1, vt2);
}

/**
 * return `n`*`vec`
 */
export function VecMultiplyConst(vec: Vec, n: number): Vec {
	return new Vec (vec.vec_x * n, vec.vec_y * n)
}
/**
 * return |`ori.x`-`tar.x`|
 */
export function X_axisDistance(ori: Pos, tar: Pos): number {
	return Math.abs(ori.x - tar.x);
}
/**
 * return |`ori.y`-`tar.y`|
 */
export function Y_axisDistance(ori: Pos, tar: Pos): number {
	return Math.abs(ori.y - tar.y);
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
	const cx = pos.x;
	const cy = pos.y;
	let rtn: Pos[] = [];
	for (let i = cx - range; i <= cx + range; i += step) {
		for (let j = cy - range; j <= cy + range; j += step) {
			const newPos = new Pos_C(i, j);
			rtn.push(newPos);
		}
	}
	return rtn;
}
export function posPlusVec(pos:Pos,vec:Vec):Pos{
	return new Pos_C(pos.x+vec.vec_x,pos.y+vec.vec_y)
}
export function deltaPosToVec(pos1:Pos,pos2:Pos):Vec{
	return new Vec(pos2.x-pos1.x,pos2.y-pos1.y)
}
/**
 * return `v1`+`v2`
 */
export function vecPlusVec(v1: Vec, v2: Vec): Vec {
 	return new Vec(v1.vec_x + v2.vec_x, v1.vec_y + v2.vec_y);
}
/** CounterClockWise
 */
export function leftRotate(vec: Vec): Vec {
	return new Vec(vec.vec_y, -vec.vec_x);
}
/**ClockWise
 */
export function rightRotate(vec: Vec): Vec {
	return new Vec(-vec.vec_y,vec.vec_x);
}
/**
 * return `v1`-`v2`
 */
export function minusVector(v1: Vec, v2: Vec): Vec {
	return new Vec( v1.vec_x - v2.vec_x, v1.vec_y - v2.vec_y);
}
/**
 * the same as {@link myGetRange}
 */
export function GR(p1: Pos, p2: Pos): number {
	return getRange(p1, p2);
}
export function Adj(p1: Pos, p2: Pos): boolean {
	return GR(p1, p2) <= 1
}
export function InShotRan(p1: Pos, p2: Pos): boolean {
	return GR(p1, p2) <= 3
}
/**
 *  return the print string of a `Pos`
 */
export function str_coordinate(tar: Pos | undefined): string {
	if (tar)
		return " {x=" + tar.x + " y=" + tar.y + "} ";
	else
		return "" + tar;
}
/**
 *  judge if is at the same position
 */
export function atPos(cre: Pos, tar: Pos): boolean {
	return cre.x === tar.x && cre.y === tar.y;
}
/**
 *  the same as {@link str_coordinate}
 */
export function COO(pos: Pos | undefined): string {
	return str_coordinate(pos);
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
