/**
 Module: util_JS
 Author: 820491047
 CreateDate:   2022.5.25
 UpDateDate:   2023.1.10
 version 0.0.1
*/
// methods
// export type STNumber = number
export function nst(n: number): StNumber {
	return new StNumber(n)
}
export function arrayEquals<E>(a: E[], b: E[]) {
	return a.length === b.length && a.every((val, index) => val === b[index]);
}
/**a number thats value is almost from -1 to 1 ,less value may be out of this range*/
export class StNumber {
	value: number
	constructor(n: number) {
		this.value = n
	}
}
export function pow2(a: number): number {
	return a * a
}
export function sum<E>(arr: E[], sumLambda: (arr: E) => number): number {
	return arr.map(i => sumLambda(i)).reduce((a, b) => a + b, 0)
}
export function exchange<E>(arr: E[], i0: number, i1: number) {
	if (arr.length <= i0 || arr.length <= i1) return;
	else {
		const temp: E = arr[i0];
		arr[i0] = arr[i1];
		arr[i1] = temp;
	}
}
export function randomBool(posibility: number): boolean {
	return Math.random() < posibility;
}
/**
 * get string that is repeat `s` by `n` times
 */
export function repeat(s: string, n: number) {
	let rtn = "";
	for (let i = 0; i < n; i++) {
		rtn += s;
	}
	return rtn;
}
/**
 * get a bonus that is E^x , -`rate` <= x <= `rate`
 */
export function ranBonus(rate: number) {
	return Math.pow(Math.E, ranNumber(-rate, rate));
}
/**
 * get a random number from `min` to `max`
 */
export function ranNumber(min: number, max: number) {
	return min + Math.random() * (max - min);
}
/**
 * return last element of an array
 */
export function last<E>(arr: E[]): E | undefined {
	if (!arr || arr.length == 0) {
		return undefined;
	} else return arr[arr.length - 1];
}
export function first<E>(arr: E[]): E | undefined {
	if (!arr || arr.length == 0) {
		return undefined;
	} else return arr[0];
}
/**
 * remove all element that match the lambda function
 */
export function removeIf<E>(arr: E[], l: (p0: E) => boolean) {
	for (let i = 0; i < arr.length; i++) {
		const e = arr[i];
		if (l(e)) {
			removeByInd(arr, i);
			i--;
		}
	}
}
/**
 * if a number is NaN
 */
export function isNaN(value: number) {
	return Number.isNaN(value);
}
/**
 * return a integer number between 0 to i-1
 */
export function ran(i: number): number {
	return Math.floor(Math.random() * i);
}
export function ranBool(n:number):boolean{
	return Math.random()<n
}
/**
 * return a random element from the array
 */
export function ranGet<E>(arr: E[]): E | undefined {
	if (arr && arr.length > 0) {
		const i = ran(arr.length);
		return arr[i];
	}
	return;
}
/**
 * if two array the same of every element,will not judge the attribute of the element
 */
export function equal1<E>(a1: E[], a2: E[]): boolean {
	if (a1.length != a2.length) return false;
	for (const i in a1) {
		if (a1[i] != a2[i]) {
			return false;
		}
	}
	return true;
}
/**
 * remove the specific element by index
 */
export function removeByInd(arr: any[], i: number) {
	arr.splice(i, 1);
}
/**
 * remove the specific element from the array
 */
export function remove<E>(arr: E[], tar: E) {
	for (const i in arr) {
		const e = arr[i];
		if (e == tar) {
			arr.splice(<any>i, 1);
			break;
		}
	}
}
/**
 * get the name of a class
 */
export function getClassName(c: any): string {
	try {
		if (valid(c)) return new c().constructor.name;
		else return c;
	} catch (ex) {
		return c;
	}
}
/**
 * 取2位小数 Take 2 decimal places
 */
export function DND2(num: number): number {
	return Math.floor(num * 100) / 100;
}
/**
 * give a simple express of the number
 */
export function SNumber(n: number): string {
	if (n >= 10000) return Math.floor(n / 1000) + "K";
	else return "" + DND2(n);
}
/**
 * use the unit of kilo
 */
export function KNumber(n: number) {
	return Math.ceil(n / 1000) + "K";
}
/**
 * go in range , `min` <= `i` <= `max`
 */
export function goInDoubleRange(i: number, min: number, max: number) {
	if (i < min)
		i = min
	else if (i > max)
		i = max
	return i
}
/**
 * go in range , `min` <= `i` <= `max`
 */
export function goInIntRange(i: number, min: number, max: number) {
	if (i < min)
		i = min
	else if (i >= max)
		i = max - 1
	return i
}
/**
 * if a number in range , `min` <= `i` <= `max`
 */
export function inDoubleRange(i: number, min: number, max: number) {
	return i >= min && i <= max;
}
/**
 * if a number in range , `min` <= `i` < `max`
 */
export function inIntRange(i: number, min: number, max: number) {
	return i >= min && i < max;
}
/**
 * is undefined or null
 */
export function invalid(o: any): boolean {
	return !valid(o);
}
export function divideReduce(cost: number, bias: number): number {
	return bias / (cost + bias)
}
/**
 * is not undefined and not null
 */
export function valid(o: any): boolean {
	return o !== undefined && o !== null;
}
/**
 * sigmoid , a function accept a number and return a number from 0 to 1
 */
export function sigmoid(n: number): number {
	return 1 - 1 / (Math.pow(Math.E, n) + 1);
}
/**
 * changed the parameter of sigmoid that the value will from -`height` to `height`
 * and will get a high value at n=`width` , a low value at n=-`width`
 */
export function sigmoidUWH(n: number, width: number, height: number) {
	// sigmoid unsigned width height
	return relu(height * 2 * (sigmoid(n / width) - 0.5));
}
/**
 * change value less than 0 to 0
 */
export function relu(d: number) {
	if (d < 0) return 0;
	else return d;
}
export function relu_oppo(d: number) {
	if (d > 0)
		return 0;
	else
		return d;
}
export function divide0(a: number, b: number): number {
	return divide_ab0(a, b, 0)
}
export function divide_ab0(a: number, b: number, def: number): number {
	if (a === 0 && b === 0) {
		return def
	} else {
		return a / b
	}
}
