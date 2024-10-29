
// import { ATTACK, BodyPartConstant, CARRY, HEAL, MOVE, RANGED_ATTACK, TOUGH, WORK } from "game/constants";

// /**
//  * get MOVE body part constant list by single body part ,repeat n times
//  */
// export function GMB(n: number = 1): BodyPartConstant[] {
// 	return GB(MOVE, n);
// }
// export function GAB(n: number = 1): BodyPartConstant[] {
// 	return GB(ATTACK, n);
// }
// export function GRB(n: number = 1): BodyPartConstant[] {
// 	return GB(RANGED_ATTACK, n);
// }
// export function GHB(n: number = 1): BodyPartConstant[] {
// 	return GB(HEAL, n);
// }
// export function GTB(n: number = 1): BodyPartConstant[] {
// 	return GB(TOUGH, n);
// }
// export function GWB(n: number = 1): BodyPartConstant[] {
// 	return GB(WORK, n);
// }
// export function GCB(n: number = 1): BodyPartConstant[] {
// 	return GB(CARRY, n);
// }
// export type BodyCre = {
// 	type: BodyPartConstant;
// 	hits: number;
// };
// /**get body part constant list by single body part ,repeat n times*/
// export function GB(b: BodyPartConstant, n: number): BodyPartConstant[] {
// 	let rtn: BodyPartConstant[] = [];
// 	for (let i = 0; i < n; i++) {
// 		rtn.push(b);
// 	}
// 	return rtn;
// }
