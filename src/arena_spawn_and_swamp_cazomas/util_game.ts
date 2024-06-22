/**
 Module: util_game
 Author: 820491047
 CreateDate:   2023.1.10
 UpDateDate:   2023.1.10
 version 0.0.0
*/
import { CostMatrix } from "game/path-finder";

//variables
export let strategyTick: number = 0;
export function setStrategyTick(n: number): void {
	strategyTick = n;
}

//functions
export function addStrategyTick(): number {
	P("strategyTick=" + strategyTick);
	setStrategyTick(strategyTick + 1);
	return strategyTick;
}
/** the tick*/
export let tick: number;
export function setTick(t: number) {
	tick = t
}
/**
 * print to the console
 */
export function P(s: any) {
	console.log(s);
}

/**
 * print a series of error message
 */
export function ERR(s: string) {
	console.log(new Error(s));
}

export function getCostMatrixHalf(up: boolean): CostMatrix {
	let rtn = new CostMatrix()
	const wallY = up ? 70 : 30
	for (let i = 0; i < 100; i++) {
		rtn.set(i, wallY, 255)
	}
	return rtn
}
