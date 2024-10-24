
import { ATTACK, CARRY, HEAL, MOVE, RANGED_ATTACK, WORK } from "game/constants";
import { getTicks } from "game/utils";

import { spawn, spawnAndExtensionsEnergy, spawnNearBlockedAround } from "../units/spawn";
import { displayPos } from "./util_attackable";
import { calculateForce, enemies, enemyAttackNum, friends, getEnergy, getHarvables, hasThreat, is5MA, sumForceByArr } from "./util_Cre";
import { divide0, divideReduce, relu, sum } from "./util_JS";
import { GR, myGetRange, Pos, X_axisDistance } from "./util_pos";
import { SA } from "./util_visual";

export function rangeBonus(
	range: number,
	bias: number = 1,
	rate: number = 2
): number {

	return 1 + (rate - 1) * divideReduce(range, bias);
}
export function rangeReduce(
	cre: Pos,
	tar: Pos,
	bias: number = 10,
): number {
	return divideReduce(GR(cre, tar), bias)
}
export function rangeDecreaseBonus(
	range: number,
	maxRange: number = 1
): number {
	return relu((maxRange - range) / maxRange);
}
export function enemyWorkerBonus(rate: number) {
	let workNum = sum(enemies, en => en.getBodies(WORK).length)
	let carryNum = sum(enemies, en => en.getBodies(CARRY).length)
	let totalNum = workNum + 0.25 * carryNum
	return 1 + relu(rate - 1) * 0.25 * totalNum;
}
export function enemyBuilderBonus(rate: number) {
	let workNum = sum(enemies, en => en.getBodies(WORK).length)
	return 1 + relu(rate - 1) * 0.25 * workNum;
}
export function myWorkerBonus(rate: number) {
	let workNum = sum(friends, fri => fri.getBodies(WORK).length)
	let carryNum = sum(friends, fri => fri.getBodies(CARRY).length)
	let totalNum = workNum + 0.25 * carryNum
	return 1 + relu(rate - 1) * 0.25 * totalNum;
}
export function getFriendEnemyForceSum(includeRam: boolean = false) {
	let fts = friends.filter((i) => hasThreat(i));
	let ets = enemies.filter((i) => hasThreat(i));
	let ff = sumForceByArr(fts, includeRam);
	let ef = sumForceByArr(ets, includeRam);
	return { friendForceSum: ff, enemyForceSum: ef }
}
export function getSuperiorRate(includeRam: boolean = false) {
	const feRtn = getFriendEnemyForceSum(includeRam)
	let ff = feRtn.friendForceSum.value
	let ef = feRtn.enemyForceSum.value
	return divide0(ff, ef + 1)
}
/** my force -enemy force*/
export function getSuperior(includeRam: boolean = false, detail: boolean = false) {
	const feRtn = getFriendEnemyForceSum(includeRam)
	let ff = feRtn.friendForceSum.value
	let ef = feRtn.enemyForceSum.value
	let rtn = 10 * (ff - ef);
	if (detail) {
		SA(displayPos(), "friendForceSum=" + ff);
		SA(displayPos(), "enemyForceSum=" + ef);
		SA(displayPos(), "sperior=" + rtn);
	}
	return rtn;
}

export function enemyQuickAttackReduce(rate: number) {
	return 1 / enemyQuickAttackBonus(rate)
}
export function enemyQuickAttackBonus(rate: number) {
	const len = enemies.filter(i => i.getBodiesNum(ATTACK) > 0 && i.getSpeed_general() >= 0.5).length
	return 1 + relu(rate - 1) * 0.5 * len
}
export function enemyAttackReduce(rate: number) {
	return 1 / enemyAttackBonus(rate);
}
export function richBonus(rate: number) {
	//en=200 r=1	en=0 r=0.5	en=1000 r=2
	let en = spawnAndExtensionsEnergy(spawn);
	if (en < 200) {
		return 0.5 + rate * 0.0025 * en;
	} else {
		return 0.5 + rate * (0.5 + 0.00125 * (en - 200));
	}
}
export function enemyRAReduce(rate: number) {
	return 1 / enemyRABonus(rate);
}
export function poorBonus(rate: number) {
	let en = spawnAndExtensionsEnergy(spawn);
	return 1 + relu(0.001 * (1000 - en));
}

export function totalInferiorityBonus() {
	let superior = getSuperior();
	if (superior < 0) {
		return 1 + 0.05 * Math.abs(superior);
	} else {
		return 1;
	}
}
export function enemyHealReduction(rate: number) {
	return 1 / enemyHealBonus(rate);
}
export function enemySlowShoterBonus(rate: number) {
	const slowShoters = enemies.filter((i) =>
		i.getSpeed_general() < 1
		&& i.getBodiesNum(RANGED_ATTACK) + i.getBodiesNum(HEAL) > 0
		&& i.getBodiesNum(ATTACK) === 0
	);
	return 1 + relu(rate - 1) * 0.5 * slowShoters.length;
}
export function enemyMoveSpeedReduce(rate: number) {
	return 1 / enemyMoveSpeedBonus(rate)
}
export function enemyMoveSpeedBonus(rate: number) {
	// const moveSum = sum(enemies, i => i.getSpeed_general() * calculateForce(i).value)
	const moveSum = sum(enemies, i => i.getSpeed_general() * calculateForce(i).value)
	return 1 + relu(rate - 1) * 0.25 * moveSum;
}
export function enemy5MABonus(rate: number) {
	// const moveSum = sum(enemies, i => i.getSpeed_general() * calculateForce(i).value)
	const sum = enemies.filter(i => is5MA(i)).length
	return 1 + relu(rate - 1) * 1 * sum;
}
export function enemyHealBonus(rate: number) {
	let sum = 0;
	for (let en of enemies) {
		let healNum = en.getBodies(HEAL).length;
		sum += healNum;
	}
	return 1 + relu(rate - 1) * 0.25 * sum
}
export function spawnEnergyBonus() {
	return 1 + spawnAndExtensionsEnergy(spawn) / 1000;
}
export function spawnEnergyAroundBonus() {
	const harvables = getHarvables().filter((i) => GR(i, spawn) <= 6);
	const totalEnergy = harvables.length === 0 ? 0 : harvables.map((i) => getEnergy(i)).reduce((a, b) => a + b);
	return 1 + (spawnAndExtensionsEnergy(spawn) + totalEnergy) / 1000;
}
export function spawnBlockBonus() {
	let sb3 = spawnNearBlockedAround(spawn, 3);
	let sb2 = spawnNearBlockedAround(spawn, 2);
	let sb1 = spawnNearBlockedAround(spawn, 1);
	if (sb1) return 15;
	else if (sb2) return 10;
	else if (sb3) return 5;
	else return 1;
}
export function enemyArmyReduce(rate: number): number {
	return 1 / enemyArmyBonus(rate)
}
export function enemyArmyBonus(rate: number): number {
	let enemiesThreated = enemies.filter((i) => hasThreat(i));
	let sumForce = sumForceByArr(enemiesThreated);
	return 1 + relu(rate - 1) * 0.5 * sumForce.value;
}
export function getBaseRangeBonus(pos: Pos) {
	return 1 + 25 / myGetRange(pos, spawn);
}
// export function getForceBonus(pos: Pos) {
//     let f = -getForceMapValue(pos);
//     let rtn = 1 + 0.4 * relu(f - 1);
//     return rtn;
// }
/**from strength+1 to 1 by tick=0 to n */
export function ticksBonus(n: number, strength: number = 2) {
	let theTick = getTicks();
	return 1 + relu(strength - 1) * relu((n - theTick) / n);
}
/**from 1/(strength+1) to 1 by tick=0 to n */
export function ticksReduce(n: number, strength: number = 2) {
	return 1 / ticksBonus(n, strength);
}

export function spawnDangerousBonus(rate: number) {
	let ets = enemies.filter((i) => hasThreat(i) && X_axisDistance(i, spawn) <= 10);
	let ef = sumForceByArr(ets).value;
	return 1 + relu(rate - 1) * 3 * ef;
}

export function enemyAttackBonus(rate: number) {
	let sum: number = enemyAttackNum();
	return 1 + relu(rate - 1) * 0.16 * sum;
}
export function enemyRASlowBonus(rate: number) {
	let sum = 0;
	for (let en of enemies) {
		let enemyRangedAttackNum = en.getBodies(RANGED_ATTACK).length;
		let enemyMoveNum = en.getBodies(MOVE).length;
		if (enemyRangedAttackNum * 2 >= enemyMoveNum && enemyRangedAttackNum > 0) {
			sum += enemyRangedAttackNum;
		}
	}
	return 1 + relu(rate - 1) * 0.35 * sum;
}
export function enemyRABonus(rate: number) {
	let sum = 0;
	for (let en of enemies) {
		let enemyRangedAttackNum = en.getBodies(RANGED_ATTACK).length;
		sum += enemyRangedAttackNum;
	}
	return 1 + relu(rate - 1) * 0.25 * sum;
}
export function getTickByBonus(min: number, max: number, bonus: number) {
	let reduce = 1 / bonus;
	let delta = max - min;
	let rtn = min + delta * reduce;
	return rtn;
}
export function totalSuperiorityReduce() {
	return 1 / totalSuperiorityBonus()
}
/**every 2 force add 1 bonus */
export function totalSuperiorityBonus() {
	let superior = getSuperior();
	if (superior > 0) {
		return 1 + 0.05 * Math.abs(superior);
	} else {
		return 1;
	}
}
export function totalSuperiorityRateReduce() {
	return 1 / totalSuperiorityRateBonus()
}
export function totalSuperiorityRateBonus() {
	let superiorRate = getSuperiorRate();
	if (superiorRate > 1) {
		return superiorRate
	} else {
		return 1;
	}
}
