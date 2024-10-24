
import { ATTACK, RANGED_ATTACK, WORK } from "game/constants";
import { CostMatrix } from "game/path-finder";
import { StructureRampart } from "game/prototypes";
import { findClosestByRange } from "game/utils";

import { spawnPos } from "../utils/util_attackable";
import { rangeBonus } from "../utils/util_bonus";
import { blocked, Cre, enemies, enRamAroundCost, friends, getDecideSearchRtnNoArea, getEnemyArmies, getOtherFriends, hasOppoUnitsAround, hits, my } from "../utils/util_Cre";
import { Event_C } from "../utils/util_event";
import { tick } from "../utils/util_game";
import { myRamparts, oppoRamparts } from "../utils/util_gameObjectInitialize";
import { last, relu, sum, valid } from "../utils/util_JS";
import { findGO, overallMap } from "../utils/util_overallMap";
import { atPos, COO, getRangePoss, GR, myGetRange, Pos } from "../utils/util_pos";
import { dotted, drawLineComplex, drawPolyLight, SA } from "../utils/util_visual";
import { moveMap } from "./maps";
import { enemySpawn, spawn } from "./spawn";

export function myRampartAt(pos: Pos): StructureRampart {
	return <StructureRampart>findGO(pos, StructureRampart)
}
export function myRoundRamparts(cre: Pos, range: number): StructureRampart[] {
	let rp = myRamparts
	let inR = rp.filter(i => myGetRange(i, cre) <= range);
	return inR;
}
// export const rampartHealthBias0: number = 750;
export const rampartHealthBias0: number = 1000;
export function enemyRampartIsHealthy(ram: StructureRampart, print: boolean = false) {
	return rampartIsHealthy(ram, false, true, print)
}
export function setRamMoveMapValue() {
	//cal en rams
	const enRams = oppoRamparts.filter(
		i => enemyRampartIsHealthy(i, true) && !atPos(i, enemySpawn)
	);
	for (let ram of enRams) {
		// SA(ram, "try cal ram")
		const roundPoss = getRangePoss(ram, 1);
		const creepInRam: Cre | undefined = <Cre>(
			overallMap.get(ram).find(i => i instanceof Cre)
		);
		let deltaCost: number = enRamAroundCost;
		if (creepInRam) {
			const aNum = creepInRam.getBodiesNum(ATTACK)
			if (aNum > 0) {
				deltaCost *= aNum
				for (let pos of roundPoss) {
					moveMap.set(pos, moveMap.get(pos) + deltaCost);
					// SA(pos, "mmIncre " + moveMap[pos.x][pos.y].toFixed(2));
				}
			}
		}
	}
}
export function rampartIsHealthy(ram: StructureRampart, isMy: boolean = true, useExtra: boolean = true, print: boolean = false) {
	if (hasOppoUnitsAround(ram, 3)) {
		//has enemy around
		let around1Enemies = isMy ? enemies.filter(i => GR(i, ram) <= 1) : friends.filter(i => GR(i, ram) <= 1)
		let around3Enemies = isMy ? enemies.filter(i => GR(i, ram) <= 3) : friends.filter(i => GR(i, ram) <= 3)
		const RANum = sum(around3Enemies, i => i.getHealthyBodiesNum(RANGED_ATTACK))
		const ANum = sum(around1Enemies, i => i.getHealthyBodiesNum(ATTACK))
		const extraBias = 37 * ANum + 13 * RANum;
		const extraBiasSafeReduce = 400
		// const extraBias = 50 * ANum + 16 * RANum;
		if (print) {
			// SA(ram, "extraBias=" + extraBias);
		}
		if (useExtra) {
			return hits(ram) >= rampartHealthBias0 + relu(extraBias - extraBiasSafeReduce);
		} else {
			return hits(ram) >= rampartHealthBias0;
		}
	} else {
		//no enemy around
		return hits(ram) >= rampartHealthBias0;
	}
}

export function moveToAllEmptyRampart(cre: Cre) {
	SA(cre, " select all empty ");
	const healthyRamparts = myRamparts.filter(i => rampartIsHealthy(i));
	const emptyRamparts = healthyRamparts.filter(i => !blocked(i));
	const rampart = findClosestByRange(cre, emptyRamparts);
	if (rampart) {
		cre.MTJ(rampart);
	} else
		SA(cre, " can not find rampart ");
}
export function inMyRampart(pos: Pos): boolean {
	const ram = findGO(pos, StructureRampart)
	return ram !== undefined && my(<StructureRampart>ram)
}

export function baseLoseRampart(): boolean {
	return !inMyRampart(spawn);
}
export function baseLoseRampartAround(): boolean {
	let roundPos = getRangePoss(spawn, 1);
	let emptyPos = roundPos.find(i => !inMyRampart(i));
	return valid(emptyPos);
}
export function inMyHealthyRampart(pos: Pos) {
	var oList = overallMap.get(pos);
	var br = oList.find(
		i => i instanceof StructureRampart && my(i) && rampartIsHealthy(i)
	);
	return valid(br);
}

export let ramSaveCostMatrix_Event: Event_C = new Event_C();
export let ramSaveCostMatrix: CostMatrix | undefined;
export function defendTheRampart(cre: Cre) {
	const scanRange = 20;
	const enemyArmys = getEnemyArmies().filter((i) => GR(i, cre) <= scanRange);
	let maxWorth: number = -Infinity;
	let tarEnemy: Cre | undefined;
	for (let en of enemyArmys) {
		const aroundRam = myRamparts.find(i => GR(i, en) <= 1);
		const aroundRam2 = myRamparts.find(i => GR(i, en) <= 2);
		const aroundRam3 = myRamparts.find(i => GR(i, en) <= 3);
		const aroundBonus = aroundRam ? 4 : (aroundRam2 ? 2.4 : (aroundRam3 ? 1.6 : 1))
		const RANum = en.getHealthyBodiesNum(RANGED_ATTACK)
		const inBaseRange3 = GR(en, spawn) <= 3;
		const shotBaseBonus = inBaseRange3 ? 1 + 0.5 * RANum : 1;
		const baseRangeBonus = rangeBonus(GR(en, spawnPos), 2, 1.5)
		const w = shotBaseBonus * aroundBonus * baseRangeBonus * rangeBonus(GR(en, cre), 2, 4);
		if (w > maxWorth) {
			maxWorth = w;
			tarEnemy = en;
		}
	}
	if (tarEnemy) {
		drawLineComplex(cre, tarEnemy, 0.8, "#cc8822", dotted)
	}
	moveToRampart(cre, tarEnemy);
}
export function refreshRampartSaveCostMatrix(pos: Pos, range: number) {
	// if (validEvent(ramSaveCostMatrix_Event, 0)) {
	// SA(pos, "already freshed");
	// } else {
	SA(pos, "refreshed CM");
	const rangePoss = getRangePoss(pos, range);
	for (let pos of rangePoss) {
		let cost: number;
		if (inMyHealthyRampart(pos)) {
			if (blocked(pos)) {
				cost = 40;
			} else {
				cost = 1
			}
		} else {
			cost = 200
		}
		if (!ramSaveCostMatrix) {
			ramSaveCostMatrix = new CostMatrix();
		}
		ramSaveCostMatrix.set(pos.x, pos.y, cost);
	}
	ramSaveCostMatrix_Event.freshTick();
	// }
}
export function moveToRampart(cre: Cre, enemy: Pos | undefined) {
	SA(cre, "move to rampart ,enemy=" + COO(enemy));
	let ramparts = myRamparts;
	let healthyRamparts = ramparts.filter((i) => rampartIsHealthy(i));
	let emptyHealthyRamparts = healthyRamparts.filter((i) => !blocked(i));
	//if enemy exist
	if (enemy) {
		SA(cre, "has enemy")
		//find enemy closest rampart
		let targetRampart = findClosestByRange(enemy, emptyHealthyRamparts);
		if (targetRampart) {
			SA(cre, "targetRampart=" + COO(targetRampart))
			drawLineComplex(cre, targetRampart, 0.8, "#123456");
			//if already in it
			if (inMyHealthyRampart(cre) && GR(targetRampart, enemy) >= GR(cre, enemy)) {
				SA(cre, "already in it")
				cre.stop();
			} else {
				gotoTargetRampart(cre, targetRampart);
			}
		}
	} else {
		//if no enemy
		let targetRampart = findClosestByRange(cre, emptyHealthyRamparts);
		if (inMyHealthyRampart(cre)) {
			//do nothing
			SA(cre, "already in healthy rampart");
			cre.stop();
		} else {
			//go in rampart
			gotoTargetRampart(cre, targetRampart);
		}
	}
}
export function gotoTargetRampart(cre: Cre, targetRampart: Pos) {
	SA(cre, "gotoTargetRampart " + COO(targetRampart));
	refreshRampartSaveCostMatrix(cre, 20);
	let sRtn = getDecideSearchRtnNoArea(cre, targetRampart, { costMatrix: ramSaveCostMatrix });
	let cost = sRtn.cost;
	let path = sRtn.path;
	drawPolyLight(path);
	// SA(cre, "cost=" + cost);
	let lastPos = last(path);
	if (lastPos && !inMyHealthyRampart(lastPos)) {
		cost += 80;
	}
	if (inMyHealthyRampart(cre)) {
		if (path.length > 0) {
			let firstPos = path[0];
			if (!inMyHealthyRampart(firstPos) || cost > 50) {
				SA(cre, "path out of ram");
				const tarFriends = getOtherFriends(cre).filter(i =>
					GR(i, cre) <= 1
					&& inMyHealthyRampart(i)
					&& !(
						cre.getBodiesNum(WORK) > 0
							&& cre.macro ? cre.macro.getIsWorking() : false
					)
					&& i.getHealthyBodiesNum(ATTACK) <
					cre.getHealthyBodiesNum(ATTACK)
				);
				if (tarFriends.length > 0) {
					const tarFriend = findClosestByRange(targetRampart, tarFriends)
					SA(cre, "exchangePos_A " + COO(tarFriend));
					cre.exchangePos_setAppointment(tarFriend)
				}
			} else {
				SA(cre, "goto target rampart " + COO(firstPos));
				const blockFri: Cre | undefined = <Cre | undefined>findGO(firstPos, Cre)
				if (blockFri) {
					cre.exchangePos_setAppointment(blockFri)
				} else {
					cre.moveToNormal(firstPos);
				}
			}
		} else {
			SA(cre, "no path");
		}
	} else {
		SA(cre, "quickly go into rampart");
		// let aroundRams = getAroundMyHealthyRams(cre).filter((i) => !blocked(i, false, true));
		// let aroundRam = findClosestByRange(cre, aroundRams);
		// if (aroundRam) {
		goinRampartAssign(cre, [spawn, cre]);
		// goinRampartAssign(cre, aroundRam,[spawn,cre]);
		// } else {
		// 	cre.MTJ(targetRampart, { costMatrix: ramSaveCostMatrix });
		// }
	}
}
export function getMyHealthyRamparts(): StructureRampart[] {
	return myRamparts.filter((i) => rampartIsHealthy(i));
}
export function getAroundMyHealthyRams(cre: Pos): StructureRampart[] {
	let aroundRams = getMyHealthyRamparts().filter((i) => GR(i, cre) <= 1);
	return aroundRams;
}
export function goinRampartAssign(cre: Cre, calBlocked: Pos[]) {
	SA(cre, "goinRampartAssign " + COO(cre));
	// cre.moveToNormal(ram);
	// const blockFriend = findFriendAtPos(ram);
	// if (blockFriend) {
	// 	SA(blockFriend, "blockFriend=" + COO(blockFriend));
	const aroundRams = getAroundMyHealthyRams(cre)
	const aroundEmptyRams = aroundRams.filter(i => !blocked(i, false));
	const aroundEmptyRam = last(aroundEmptyRams);
	if (aroundRams.length > 0) {
		if (aroundEmptyRam) {
			SA(cre, "go around empty ram" + COO(aroundEmptyRam));
			cre.moveToNormal_setAppointment(aroundEmptyRam);
		} else if (calBlocked.length < 6) {
			SA(cre, "need assign again");
			const aroundRamNotCaled = aroundRams.find(i => {
				return calBlocked.find(j => atPos(j, i)) === undefined
			})
			if (aroundRamNotCaled) {
				const tarFriends = tick <= 400 ? friends.filter(i =>
					i.getBodiesNum(ATTACK) > 0
					|| i.getBodiesNum(RANGED_ATTACK) > 0
				) : friends
				const newFriend = tarFriends.find(i => atPos(i, aroundRamNotCaled))
				if (newFriend) {
					SA(cre, "new friend:" + COO(newFriend))
					calBlocked.push(newFriend)
					drawLineComplex(cre, newFriend, 0.8, "#654321")
					cre.moveToNormal_setAppointment(aroundRamNotCaled);
					goinRampartAssign(newFriend, calBlocked)
				} else {
					SA(cre, "no new friend " + COO(aroundRamNotCaled));
				}
			} else {
				SA(cre, "assign over");
			}
		} else {
			SA(cre, "assign out of limit");
		}
	} else {
		SA(cre, "MTJ ram")
		const ram = findClosestByRange(cre, getMyHealthyRamparts())
		if (ram) {
			cre.MTJ(ram)
		} else {
			SA(cre, "no ram")
		}
	}
}
export function attackWeakRampart(cre: Cre) {
	SA(cre, "try attackWeakRampart");
	let myRamAround = myRamparts.filter(i => GR(i, cre) <= 1);
	let weakMyRamAround = myRamAround.find(i => !rampartIsHealthy(i, true, false) && !atPos(i, spawnPos));
	if (weakMyRamAround) {
		SA(cre, "attacking WeakRampart");
		cre.battle?.attackNormal(weakMyRamAround);
	}
}
