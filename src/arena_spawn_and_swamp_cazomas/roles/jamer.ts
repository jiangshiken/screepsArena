/**
 Module: jamer
 Author: 820491047
 CreateDate:   2023.1.10
 UpDateDate:   2023.1.10
 version 0.0.0
*/
import { ATTACK, RANGED_ATTACK, WORK } from "game/constants";
import { ConstructionSite } from "game/prototypes";
import { findClosestByRange } from "game/utils";

import { cpuBreakJudge, fleeWeakComplex, givePositionToImpartantFriend } from "../army";
import { getProgressRate } from "../constructionSite";
import { inOppoRampart } from "../util_attackable";
import { blocked, Cre, enemies, friends, hasEnemyAround_lamb, hasThreat, Role } from "../util_Cre";
import { tick } from "../util_game";
import { oppoConstructionSites } from "../util_gameObjectInitialize";
import { divideReduce } from "../util_JS";
import { Adj, atPos, COO, GR, InShotRan, midPoint } from "../util_pos";
import { SA } from "../util_visual";

/**used to jam the opponent's construction site*/
export const jamer: Role = new Role("jamer", jamerJob)
export function jamerJob(cre: Cre) {
	SA(cre, "I'm jamer "+(cre.role===jamer))
	const use_oldJamer=true
	if(use_oldJamer){
		jamerOldJob(cre)
		return
	}
	const leader=friends.find(i=>i.getBodiesNum(ATTACK)>=9
		||i.getBodiesNum(RANGED_ATTACK)>=5)
	if(leader){
		if(friends.filter(i=>Adj(i,leader) && i.role===jamer).length>=3 && !Adj(cre,leader)){
			if(enemies.filter(i=>hasThreat(i) && InShotRan(i,cre)).length>0){
				fleeWeakComplex(cre)
			}else{
				cre.stop()
			}
		}else{
			if(leader.upgrade.isPush === true){
				cre.MTJ(leader)
			}else{
				cre.moveAndBePulled(leader)
			}
		}
	}else{
		jamerOldJob(cre)
	}
}
export function jamerOldJob(cre: Cre) {
	SA(cre, "I'm jamer")
	if (inOppoRampart(cre)) {
		SA(cre, "inOppoRampart")
		cre.stop()
	} else {
		let fleeing: boolean = fleeWeakComplex(cre)
		if (!fleeing) {
			if (cpuBreakJudge(cre)) {
				return;
			}
			givePositionToImpartantFriend(cre)
			const enemyCSsHasEnemyBuilderAround = oppoConstructionSites.filter(i =>
				hasEnemyAround_lamb(j => j.getBodiesNum(WORK) > 0, i, 3)
				&& !(blocked(i) && !atPos(i, cre))
			)
			const enemyCSComparers: { target: ConstructionSite | undefined, worth: number }[] = enemyCSsHasEnemyBuilderAround.map(cs => {
				const progressRate = getProgressRate(cs)
				const range = GR(cre, cs)
				const worth = progressRate * divideReduce(range, 10)
				return { target: cs, worth: worth }
			})
			const target = enemyCSComparers.reduce((a, b) => a.worth > b.worth ? a : b, {
				target: undefined, worth: -Infinity
			}).target
			// const target=findClosestByRange(cre,enemyCSsHasEnemyBuilderAround)
			SA(cre, "target=" + COO(target))
			if (target) {
				cre.MTJ_stopAtPos(target)
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
		}
	}
}
