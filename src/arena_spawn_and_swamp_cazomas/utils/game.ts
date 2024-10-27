import { findClosestByRange } from "game/utils";
import { inRange_int } from "./JS";
import { Pos, Vec } from "./pos";
import { drawLineComplex } from "./visual";
export type StNumber=number
/** the startGate top or bottom ,true is top,will decide the area search*/
export let startGateUp: boolean = false;
export function set_startGateUp(b:boolean){
	startGateUp=b
}
/** you are at the left or the right of the game map*/
export let left: boolean;
export function set_left(b:boolean){
	left=b
}
export const topY: number = 10;
export const bottomY: number = 89;
export const leftBorder1 = 13;
export const rightBorder1 = 85;
export const leftBorder2 = 14;
export const rightBorder2 = 86;
export const midBorder = 50;
export function leftRate(): number {
	return left ? -1 : 1;
}
export function leftVector(): Vec {
	if (left) {
		return new Vec(-1,0)
	} else {
		return new Vec(1,0)
	}
}
/** you are at the area that will gene container*/
export function inResourceArea(pos: Pos): boolean {
	return inRange_int(pos.x, 13, 87) && inRange_int(pos.y, 2, 98);
}
/** is outside */
export function isOutside(o: Pos): boolean {
	return o.x >= 15 && o.x <= 85;
}
/** get the area by pos and other parameter*/
export function getArea(
	pos: Pos,
	leftBorder: number,
	rightBorder: number,
	midBorder: number
): string {
	if (pos.x <= leftBorder) return "left";
	else if (pos.x >= rightBorder) return "right";
	else if (pos.y < midBorder) return "top";
	else return "bottom";
}
/**
 * get the step target from cre to tar,if cre is your spawn and tar is enemy's spawn
 * that it will search path to the first gate ,then the next gate ,and then search to
 * the enemy spawn
 */
export function getNewTarByArea(cre: Pos, tar: Pos) {
	let newTar = tar;
	let creArea = getArea(cre, leftBorder1, rightBorder2, midBorder);
	let tarArea = getArea(tar, leftBorder1, rightBorder2, midBorder);
	//
	let top = topY;
	let bottom = bottomY;
	if (creArea === "left" && tarArea === "right") {
		//go left top
		if (startGateUp) newTar = { x: leftBorder2, y: top };
		else newTar = { x: leftBorder2, y: bottom };
	} else if (creArea === "right" && tarArea === "left") {
		//go right bottom
		if (startGateUp) newTar = { x: rightBorder1, y: top };
		else newTar = { x: rightBorder1, y: bottom };
	} else if (creArea === "left" && tarArea === "top")
		newTar = { x: leftBorder2, y: top };
	else if (creArea === "top" && tarArea === "left")
		newTar = { x: leftBorder1, y: top };
	else if (creArea === "left" && tarArea === "bottom")
		newTar = { x: leftBorder2, y: bottom };
	else if (creArea === "bottom" && tarArea === "left")
		newTar = { x: leftBorder1, y: bottom };
	else if (creArea === "right" && tarArea === "bottom")
		newTar = { x: rightBorder1, y: bottom };
	else if (creArea === "bottom" && tarArea === "right")
		newTar = { x: rightBorder2, y: bottom };
	else if (creArea === "right" && tarArea === "top")
		newTar = { x: rightBorder1, y: top };
	else if (creArea === "top" && tarArea === "right")
		newTar = { x: rightBorder2, y: top };
	drawLineComplex(cre, newTar, 0.25, "#222222");
	return newTar;
}
export function closest(pos:Pos,arr:Pos[]):Pos|undefined{
	if(arr.length===0){
		return undefined
	}else{
		return findClosestByRange(pos,arr)
	}
}
export function printError<E>(o:E):E{
	// PL(new Error().stack)
	return o
}
/**tick inside strategy to make sure every strategy worked even if time out */
export let strategyTick: number = 0;
export function setStrategyTick(n: number): void {
	strategyTick = n;
}
export function addStrategyTick(): number {
	PL("strategyTick=" + strategyTick);
	setStrategyTick(strategyTick + 1);
	return strategyTick;
}
/** the tick,the same as getTicks()*/
export let tick: number;
export function setTick(t: number) {
	tick = t
}
/**
 * print to the log
 */
export function PL(s: any) {
	console.log(s);
}
/**
 * print a series of error message
 */
export function ERR(s: string) {
	PL(new Error(s));
}
