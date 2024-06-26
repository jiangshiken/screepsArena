/**
 Module: resourceDestroyer
 Author: 820491047
 CreateDate:   2023.1.10
 UpDateDate:   2023.1.10
 version 0.0.0
*/
import { WORK } from "game/constants"
import { Resource, StructureExtension } from "game/prototypes"
import { findClosestByRange } from "game/utils"

import { cpuBreakJudge, fleeWeakComplex, givePositionToImpartantFriend } from "../army"
import { hasResourceOnGround, inOppoRampart } from "../util_attackable"
import { Cre, enemies, getEnergy, getExist, hasEnemyAround_lamb, isMyTick, Role } from "../util_Cre"
import { S } from "../util_export"
import { tick } from "../util_game"
import { oppoExtensions, resources } from "../util_gameObjectInitialize"
import { divideReduce } from "../util_JS"
import { COO, getRangePoss, MGR, midPoint } from "../util_pos"
import { SA } from "../util_visual"
import { maxWorth } from "../util_WT"

/**Used to drop and decay the energy that enemy builder has.
 * Withdraw the energy from the enemy extensions
*/
export const resourceDestroyer: Role = new Role("resourceDestroyer", resourceDestroyerJob)
export function resourceDestroyerJob(cre: Cre) {
	SA(cre, "I'm resourceDestroyer")

	let fleeing: boolean = fleeWeakComplex(cre)
	if (!fleeing) {
		SA(cre, "resourceDestroyer work")
		if (cpuBreakJudge(cre)) {
			return;
		}
		givePositionToImpartantFriend(cre)
		if (isMyTick(cre, 5)) {
			const enemyExtensionsFilled = oppoExtensions.filter(i =>
				getEnergy(i) > 0
				&& !inOppoRampart(i)
			)
			const extComparers: { target: StructureExtension | Resource, worth: number }[]
				= enemyExtensionsFilled.map(ext => {
					const range = MGR(ext, cre)
					const staticBias = cre.upgrade.target === ext ? 1.5 : 1
					const worth = 4 * staticBias * divideReduce(range, 10)
					SA(cre, "extCom=" + COO(ext) + " w=" + worth)
					return { target: ext, worth: worth }
				})
			const tarResources = resources.filter(i =>
				hasEnemyAround_lamb(j => j.getBodiesNum(WORK) > 0, i, 1)
				&& i.amount >= 50
			)
			const resComparers: { target: StructureExtension | Resource, worth: number }[]
				= tarResources.map(res => {
					const range = MGR(res, cre)
					const staticBias = cre.upgrade.target === res ? 1.5 : 1
					const worth = 1 * staticBias * divideReduce(range, 10)
					SA(cre, "resCom=" + COO(res) + " w=" + worth)
					return { target: res, worth: worth }
				})
			const compareList: { target: StructureExtension | Resource | undefined, worth: number }[] =
				extComparers.concat(resComparers)
			cre.upgrade.target = maxWorth(compareList).target
		}
		// const target=compareList.reduce((a,b)=>a.worth>b.worth?a:b,{target:undefined,worth:-Infinity}).target
		// const target=findClosestByRange(cre,enemyExtensionsFilled)
		const target = getExist(cre.upgrade.target)
		if (target) {
			SA(cre, "target=" + S(target))
			//if already has Energy
			if (getEnergy(cre) > 0) {
				cre.dropEnergy()
				const fitPos = getRangePoss(target, 1).find(i => MGR(i, cre) <= 1 && !hasResourceOnGround(i, 75))
				const nextPos = fitPos ? fitPos : cre
				cre.MTJ_follow(nextPos)
			} else {
				if (MGR(cre, target) <= 1) {
					cre.macro.withDrawTarget(target)
					cre.stop()
				} else {
					cre.MTJ(target)
				}
			}
		} else if (tick <= 75) {
			cre.MTJ(midPoint)
		} else {
			const enBuilders = enemies.filter(i => i.getBodiesNum(WORK) > 0)
			const enBuilder = findClosestByRange(cre, enBuilders)
			if (enBuilder) {
				cre.MTJ_stopAtPos(enBuilder)
			} else {
				cre.MTJ_stopAtPos(midPoint)
			}
		}
		//TODO
	}
}
