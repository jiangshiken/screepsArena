/**
 Module: constructionSite
 Author: 820491047
 CreateDate:   2023.1.10
 UpDateDate:   2023.1.10
 version 0.0.0
*/
import { createConstructionSite } from "game";
import { ConstructionSite, StructureRampart } from "game/prototypes";
import { getTicks } from "game/utils";

import { my } from "./util_Cre";
import { Event, Event_C } from "./util_event";
import { S } from "./util_export";
import { myConstructionSites } from "./util_gameObjectInitialize";
import { invalid } from "./util_JS";
import { findGO } from "./util_overallMap";
import { atPos, COO, Pos } from "./util_pos";
import { drawLineComplex, SA } from "./util_visual";
import { wc, WT, WT_C } from "./util_WT";

// export let CSs: CS[] = []
/** extend of ConstructionSite */
export class CS extends ConstructionSite {
	inited: boolean | undefined
	decayEvent: Event | undefined;
	useDecay: boolean | undefined;
	wt: WT_C | undefined
}
/**initiate all constructionSites to CS*/
export function initCS(cs: CS) {
	if (!cs.inited) {
		cs.wt = wc(0)
		cs.useDecay = true
		cs.inited = true
	}
}
/**get all CSs of yours*/
export function getMyCSs() {
	return myConstructionSites.map(i => <CS>i)
}
/**has a construction site of specific type at a pos*/
export function hasConstructionSiteByType(pos: Pos, type: any): boolean {
	return getMyCSs().find(i => atPos(i, pos) && i.structure instanceof type) !== undefined;
}
/**has a construction site of rampart at a pos*/
export function hasConstructionSite_rampart(pos: Pos): boolean {
	return hasConstructionSiteByType(pos, StructureRampart)
}
/**has a construction site of not rampart at a pos*/
export function hasConstructionSite_notRampart(pos: Pos): boolean {
	return getMyCSs().find(i => atPos(i, pos) && !(i.structure instanceof StructureRampart)) !== undefined;
}
/**has a construction site at a pos*/
export function hasConstructionSite(pos: Pos): boolean {
	return getMyCSs().find(i => atPos(i, pos)) !== undefined;
}
/**get the worth of CS*/
export function getCSWT(cs: CS): WT {
	return cs.wt ? cs.wt : wc(0)
}
/**init an action Sequence*/
export function initActionSequence(...actions: (() => void)[]): {
	complete: boolean,
	action: () => void
}[] {
	return actions.map(i => { return { complete: false, action: i } })
}
/**create CS by action Sequence.If you call it every tick,
 * it will trigger the action(almost createCS()) one by one.
 * Every action will only trigger once.If your constructionSites
 * is over 8 ,the action will be pass.
 */
export function createCSInSequence(
	actionTasks: {
		complete: boolean,
		action: () => void
	}[]) {
	for (let actionTask of actionTasks) {
		if (!actionTask.complete) {
			if (myConstructionSites.length <= 8) {
				actionTask.action()
				actionTask.complete = true
				break;
			}
		}
	}
}
/** same as createCS ,but wait CS num<9*/
export function supplyCS(pos: Pos,
	type: any,
	worth: number = 1,
	useDecay: boolean = false,
	allowMultiRampart: boolean = false,
	print: boolean = false
): boolean {
	if (print) {
		SA(pos, "supplyCS " + type)
	}
	if (!findGO(pos, type) || allowMultiRampart && type === StructureRampart) {
		if (print) {
			SA(pos, "createCS_wait")
		}
		return createCS_wait(pos, type, worth, useDecay, allowMultiRampart, print)
	} else {
		return false
	}
}
const csLimitBias = 9
/** same as createCS ,but wait CS num<9*/
export function createCS_wait(pos: Pos,
	type: any,
	worth: number = 1,
	useDecay: boolean = false,
	allowMultiRampart: boolean = false,
	print: boolean = false
): boolean {
	if (myConstructionSites.length < csLimitBias) {
		if (print) {
			SA(pos, "createCS")
		}
		return createCS(pos, type, worth, useDecay, allowMultiRampart)
	} else {
		return false
	}
}
/**
 * create a {@link ConstructionSite} ,if has the same `ConstructionSite`
 * at the position ,it will not work.rampart and no rampart will be seperate,
 * that you can create an rampart `ConstructionSite` and a no rampart `ConstructionSite`
 * at same position at most.if the number of `ConstructionSite` on this map is over 10,
 * it will remove one of it of the lest {@link CS.wt} of the {@link CS}
 */
export function createCS(
	pos: Pos,
	type: any,
	worth: number = 1,
	useDecay: boolean = false,
	allowMultiRampart: boolean = false
): boolean {
	//if can create CS
	SA(pos, "createCS:" + S(type))
	let b: boolean;
	if (type === StructureRampart) {
		if (inMyRampart(pos)) {
			b = false;
		} else {
			if (allowMultiRampart) {
				b = true;
			} else {
				b = !hasConstructionSite_rampart(pos);
			}
		}
	} else {
		b = !hasConstructionSite_notRampart(pos);
	}
	if (b) {
		const myCSs = myConstructionSites
		if (myCSs.length >= csLimitBias) {
			//cancel other ,find the min worth of cs on the map and remove it
			let minWorth = Infinity;
			let minCS: CS = <CS>myCSs[0];
			for (let cs of myCSs) {
				const myCS = <CS>cs;
				let csw: number;
				if (invalid(myCS))
					csw = 0;
				else
					csw = getCSWT(myCS).w
				//progressRate bonus
				const pr = getProgressRate(myCS); //0~1
				const prBonus = 1 + 2 * pr;
				csw *= prBonus;
				//decay reduce
				if (myCS.useDecay) {
					let dr = getCSDecayReduce(myCS);
					csw *= dr;
				}
				if (csw < minWorth) {
					minWorth = csw;
					minCS = myCS;
				}
			}
			if (minCS) {
				drawLineComplex(pos, minCS, 0.8, "#aabbff")
				SA(minCS, "remove min worth CS by action " + COO(pos) + " " + type)
				minCS.remove();
			}
		}
		SA(pos, "create cons");
		let rtn = createConstructionSite(pos.x, pos.y, type);
		SA(pos, "rtnErr=" + rtn.error);
		SA(pos, "rtnObj=" + S(rtn.object));
		let rtnObj: CS = <CS><any>rtn.object;
		if (rtn && rtnObj) {
			rtnObj.decayEvent = new Event_C();
			rtnObj.useDecay = useDecay;
			rtnObj.wt = wc(worth);
			rtnObj.inited = true
			return true;
		}
	}
	return false;
}
function inMyRampart(pos: Pos): boolean {
	const ram = findGO(pos, StructureRampart)
	return ram !== undefined && my(<StructureRampart>ram)
}
// /***/
// export function getCSs(): CS[] {
// 	return CSs;
// }

/**
 * if not build {@link CS} a mount of time ,it will get decay of `worth`
 */
export function getCSDecayReduce(cs: CS) {
	let e = cs.decayEvent;
	let rtn;
	if (e === undefined) {
		SA(cs, "ERR decayEvent undefined");
		rtn = 1 / 10;
	} else {
		let passTime: number = getTicks() - e.invokeTick;
		rtn = 1 / (1 + 0.01 * passTime);
	}
	return rtn;
}
/**
 * get the {@link CS} that is the max `worth`
 */
export function getMaxWorthCSS(css: CS[]): CS | undefined {
	let maxWorth: number = -Infinity;
	let rtn;
	for (let cs of css) {
		let w = getCSWT(cs).w
		if (w === undefined) w = 0;
		if (w > maxWorth) {
			maxWorth = w;
			rtn = cs;
		}
	}
	return <CS | undefined>rtn;
}

// /**rebuild the ramparts around the base*/
// export function reBuildAroundRampart(range: number = 1) {
// 	let poss = getRangePoss(spawn, range);
// 	for (let pos of poss) {
// 		const successCreate = createCS(pos, StructureRampart);
// 		if (successCreate) {
// 			break;
// 		}
// 	}
// }
// /**
//  * rebuild rampart top ,bottom, left and right of the spawn
//  */
// export function reBuildCrossRampart(range: number = 1) {
// 	let poss = getRangePoss(spawn, range);
// 	for (let pos of poss) {
// 		if (absRange(pos, spawn) === range) {
// 			let successCreate = createCS(pos, StructureRampart);
// 			if (successCreate) {
// 				break;
// 			}
// 		}
// 	}
// }
/**the progress of a construction site*/
export function progress(cs: ConstructionSite): number {
	if (cs.progress) {
		return cs.progress;
	} else {
		return 0;
	}
}
/**the progress total of a construction site*/
export function progressTotal(cs: ConstructionSite): number {
	if (cs.progressTotal) {
		return cs.progressTotal;
	} else {
		return 0;
	}
}
/**
 * get the progress rate of a `ConstructionSite`
 */
export function getProgressRate(cs: ConstructionSite): number {
	if (cs) {
		return progress(cs) / progressTotal(cs);
	} else
		return 0;
}
