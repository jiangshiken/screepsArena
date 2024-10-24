/**
 Module: standard
 Author: 820491047
 CreateDate:   2023.1.10
 UpDateDate:   2023.1.10
 version 0.0.0
*/
import { ATTACK, CARRY, MOVE } from "game/constants";

import { builderStandard, isBuilderOutSide } from "../roles/builder";
import { defender_rampart } from "../roles/defender";
import { stdAttacker, stdHealer, stdShoter } from "../roles/fighters_std";
import { harvester } from "../roles/harvester";
import { jamer } from "../roles/jamer";
import { resourceDestroyer } from "../roles/resourceDestroyer";
import { toughDefender } from "../roles/toughDefender";
import { getEnemyForceMapValue, getForceMapValue, getFriendForceMapValue, miniForceMap_fri } from "../units/maps";
import { EEB, spawn, spawnAndExtensionsEnergy } from "../units/spawn";
import { spawnBySpawnTypeList, SpawnType } from "../units/spawnTypeList";
import { displayPos } from "../utils/util_attackable";
import { TB } from "../utils/util_autoBodys";
import { enemy5MABonus, enemyArmyBonus, enemyAttackBonus, enemyAttackReduce, enemyBuilderBonus, enemyHealBonus, enemyHealReduction, enemyMoveSpeedBonus, enemyMoveSpeedReduce, enemyQuickAttackReduce, enemyRABonus, enemyRAReduce, enemyRASlowBonus, enemySlowShoterBonus, enemyWorkerBonus, getSuperior, getSuperiorRate, spawnBlockBonus, spawnDangerousBonus, spawnEnergyAroundBonus, spawnEnergyBonus, ticksBonus, ticksReduce, totalInferiorityBonus, totalSuperiorityBonus, totalSuperiorityRateBonus, totalSuperiorityRateReduce } from "../utils/util_bonus";
import { getCPUPercent, setLowCPUMode, switchCPUModeOn } from "../utils/util_CPU";
import { calculateForce, Cre, cres, enemies, friends, getAllUnits, getTaunt, set_spawnDps, set_spawnExtraTaunt, sumForceByArr } from "../utils/util_Cre";
import { addStrategyTick, strategyTick, tick } from "../utils/util_game";
import { getRangePossByStep, midPoint } from "../utils/util_pos";
import { dotted, drawLineComplex, SA, SAN } from "../utils/util_visual";
import { spawnStartHarvester } from "./strategyTool";

/**if expose the spawn (bait)*/
export let exposeSpawn: boolean = false
export let exposeSpawnSimple: boolean = false
/**use standard strategy*/
export function useStandardStrategy() {
	set_spawnDps(80)
	SA(displayPos(), "displayPos")
	// exposeSpawnSimple=true
	if (getCPUPercent() > 0.7 && switchCPUModeOn) {
		setLowCPUMode(true)
	}
	// for (let cre of friends) {
	// 	SA(cre, "spawning=" + cre.master.spawning)
	// }
	for (let cre of enemies) {
		SAN(cre, "speed_general", cre.getSpeed_general())
		const predictPos = cre.battle.findPredictPos(3, 3)
		drawLineComplex(cre, predictPos, 0.7, "#22ff66", dotted)
	}
	for (let cre of cres) {
		SAN(cre, "force", calculateForce(cre).value)
	}
	// if (tick === 1) {
	// 	init_predictTickList();
	// }
	for (let unit of getAllUnits()) {
		SAN(unit, "taunt_V", getTaunt(unit, true).value);
		SAN(unit, "taunt", getTaunt(unit).value);
	}
	//draw force map
	const drawPoss = getRangePossByStep(midPoint, 50, miniForceMap_fri.scale)
	for (let pos of drawPoss) {
		const friForce = getFriendForceMapValue(pos)
		const enemyForce = getEnemyForceMapValue(pos)
		const force = getForceMapValue(pos)
		if (Math.abs(friForce) + Math.abs(enemyForce) > 4.5) {
			SAN(pos, "force", force);
		}
	}
	const st = strategyTick
	const sp = getSuperior(false, true)
	spawnStartHarvester(1, true)
	// use4RamDefend(st, exposeSpawnSimple);
	if (tick >= 1600) {
		const sr = getSuperiorRate()
		if (sp < -30 && sp < 0.6) {
			set_spawnExtraTaunt(12)
		}
		if (sp > 30 && sp > 2) {
			set_spawnDps(900)
		} else if (sp > 10 && sp > 1.5) {
			set_spawnDps(600)
		}
	}
	const spl = getSpawnTypeList_st();
	spawnBySpawnTypeList(spl);
	addStrategyTick();
}
/**get the alreadyExistRate of main army num*/
function getMainArmyNum(fri: Cre[]): number {
	// const num6A = fri.filter(i => i.getBodiesNum(ATTACK) === 6).length
	// const numOver6A = fri.filter(i => i.getBodiesNum(ATTACK) >= 7).length
	// const supplyAParts = fri.filter(i => inDoubleRange(i.getBodiesNum(ATTACK), 1, 5)).map(i => i.getBodiesNum(ATTACK)).reduce((a, b) => a + b, 0)
	// const rtn = num6A + 1.2 * numOver6A + 0.1 * supplyAParts
	const rtn: number = 0.5 * sumForceByArr(fri.filter(i => i.getBodiesNum(ATTACK) > 0)).value
	// PS("mainArmyNum=" + rtn)
	return rtn
}
/**the spawn type list of standard mode*/
export function getSpawnTypeList_st(): SpawnType[] {
	//tick bonus .active in the first n tick,and decrease to 1 on tick=n
	const TKB1_2 = ticksBonus(100, 2);
	const TKB6_3 = ticksBonus(600, 3);
	const TKB4_3 = ticksBonus(400, 3);
	const TKB4_6 = ticksBonus(400, 6);
	const TKB2_2 = ticksBonus(200, 2);
	const TKR2_4 = ticksReduce(200, 4);
	const TKR2_6 = ticksReduce(200, 6);
	// const nearEndAndSuperiorBonus=tick>1700?3:1
	//enemy army type bonus
	const EB = enemyArmyBonus(2);
	const EB0p5 = enemyArmyBonus(1.5);
	const ERB1p5 = enemyRABonus(1.2);
	const ERB2 = enemyRABonus(2);
	const ERB3 = enemyRABonus(3);
	const ERB4 = enemyRABonus(4);
	const ERSB = enemyRASlowBonus(2);
	const ERR2 = enemyRAReduce(2);
	const ERR1p5 = enemyRAReduce(1.5);
	const EAB = enemyAttackBonus(2);
	const EAB1p1 = enemyAttackBonus(1.1);
	const EAR = enemyAttackReduce(2);
	const EQAR3 = enemyQuickAttackReduce(3);
	const EWB1p5 = enemyWorkerBonus(1.3);
	const EBB1p7 = enemyBuilderBonus(1.7);
	const EHR = 2 * enemyHealReduction(2);
	const EHB = enemyHealBonus(2);
	const ESSB5 = enemySlowShoterBonus(5);
	const ESSB3 = enemySlowShoterBonus(3);
	const ESSB2 = enemySlowShoterBonus(2);
	const EMB2 = enemyMoveSpeedBonus(2);
	const EMB1p2 = enemyMoveSpeedBonus(1.2);
	const EMR2 = enemyMoveSpeedReduce(2);
	const E5MAB = enemy5MABonus(1.4);
	//other bonus
	const TIB = totalInferiorityBonus();
	const TSB = totalSuperiorityBonus();
	const TSRB = totalSuperiorityRateBonus();
	const TSRR = totalSuperiorityRateReduce();
	const SDB = spawnDangerousBonus(2);
	const SBB = spawnBlockBonus();
	const SEB = spawnEnergyBonus();
	const SEAR = 1 / spawnEnergyAroundBonus();
	//bonus of my spawn type
	const supplyBonus = 2.8 * EAB * ERR2
	const defenderBonus = friends.filter(i => i.role === defender_rampart).length >= 3 ? 0 : 1
	//
	SAN(displayPos(), "spawnAndExtEn", spawnAndExtensionsEnergy(spawn, true, true));
	SAN(displayPos(), "TIB", TIB)
	SAN(displayPos(), "TSB", TSB)
	SAN(displayPos(), "EAB", EAB)
	SAN(displayPos(), "ERR2", ERR2)
	SAN(displayPos(), "EMB1p2", EMB1p2)
	const spawnTypeList: SpawnType[] = [
		//50
		new SpawnType(jamer, 6 * EBB1p7 * TSRR * TKB6_3 * EEB(50, 1.2), TB("M"),
			fri => fri.filter(i => i.role === jamer).length),
		//100
		new SpawnType(resourceDestroyer, 4 * EBB1p7 * TSRR * TKB6_3 * EEB(100, 1.2), TB("CM"),
			fri => fri.filter(i => i.role === resourceDestroyer).length),
		//1340
		new SpawnType(stdAttacker, TKB4_6 * supplyBonus * EEB(1340, 9), TB("14M8A"),
			fri => getMainArmyNum(fri), true),
		//1160
		new SpawnType(stdAttacker, TKB4_6 * supplyBonus * EEB(1160, 8), TB("12M7A"),
			fri => getMainArmyNum(fri), true),
		//980
		new SpawnType(stdAttacker, TKB4_6 * supplyBonus * EEB(980, 6), TB("10M6A"),
			fri => getMainArmyNum(fri)),
		//850
		new SpawnType(stdAttacker, supplyBonus * EEB(850, 3.5), TB("9M5A"),
			fri => getMainArmyNum(fri)),
		//670
		new SpawnType(stdAttacker, supplyBonus * EEB(670, 3), TB("7M4A"),
			fri => getMainArmyNum(fri)),
		//490
		new SpawnType(stdAttacker, supplyBonus * EEB(490, 2.8), TB("5M3A"),
			fri => getMainArmyNum(fri)),
		//410
		new SpawnType(stdAttacker, supplyBonus * EEB(410, 2.5), TB("5M2A"),
			fri => getMainArmyNum(fri)),
		//360
		new SpawnType(stdAttacker, supplyBonus * EEB(360, 2), TB("4M2A"),
			fri => getMainArmyNum(fri)),
		//230
		new SpawnType(stdAttacker, supplyBonus * TSRR * EEB(230, 1.4), TB("3MA"),
			fri => getMainArmyNum(fri)),
		//180
		new SpawnType(stdAttacker, supplyBonus * TSRR * EEB(180, 1.1), TB("2MA"),
			fri => getMainArmyNum(fri)),
		//330
		new SpawnType(stdAttacker, 1.1 * E5MAB * EWB1p5 * ERB1p5 * ESSB2 * EEB(330, 2), TB("5MA"),
			fri => fri.filter(i => i.role === stdAttacker && i.getBodiesNum(ATTACK) === 1 && i.getBodiesNum(MOVE) === 5).length),
		// //650+320=970
		// new SpawnType(stdAttacker, 0.8 * TKB4_6 * supplyBonus * EMB1p2 * EEB(970, 6), TB("13M4A"),
		// 	fri => 0.8 * getMainArmyNum(fri) + 0.2 * fri.filter(i => i.role === stdAttacker && i.getSpeed_general() >= 0.6).length),
		//990
		new SpawnType(stdAttacker, 1.2 * TKB4_6 * ESSB5 * EEB(990, 6), TB("15M3A"),
			fri => 0.8 * getMainArmyNum(fri) + 0.2 * fri.filter(i => i.role === stdAttacker && i.getSpeed_general() === 1).length),
		// //960
		// new SpawnType(stdAttacker, 1.2 * TKB4_6 * ERB2 * EEB(960, 6), TB("16M2A"),
		// 	fri => 0.8 * getMainArmyNum(fri) + 0.2 * fri.filter(i => i.role === stdAttacker && i.getSpeed_general() === 1).length),
		//290
		// new SpawnType(defender_rampart, 0.8 * TIB * SDB * defenderBonus * EEB(290, 2.5), TB("3AM"),
		// 	fri => fri.filter(i => i.role === defender_rampart).length),
		//470
		new SpawnType(toughDefender, 0.8 * TIB * SDB * defenderBonus * EEB(510, 2.5), TB("18T3AM"),
			fri => fri.filter(i => i.role === toughDefender).length),
		// //130
		// new SpawnType(defender_rampart, 0.3 * TIB * SDB * defenderBonus * EEB(130, 2), TB("AM"),
		// 	fri => fri.filter(i => i.role === defender_rampart).length),
		// //350
		// new SpawnType(defender_rampart, 0.5 * ERB4 * TIB * SDB * defenderBonus * EEB(350, 2.5), TB("2RM"),
		// 	fri => fri.filter(i => i.role === defender_rampart).length),
		//200
		new SpawnType(defender_rampart, 0.25 * ERB4 * TIB * SDB * defenderBonus * EEB(200, 2), TB("RM"),
			fri => fri.filter(i => i.role === defender_rampart).length),
		//500
		new SpawnType(builderStandard, 2 * TSB * TKR2_6 * TSRB * EEB(500, 2.5), TB("2C5MCW"),
			fri => fri.filter(i => isBuilderOutSide(i.role)).length),
		//350
		new SpawnType(builderStandard, 1.6 * TSB * TKR2_6 * TSRB * EEB(350, 1.5), TB("C3MCW"),
			fri => fri.filter(i => isBuilderOutSide(i.role)).length),
		//300
		new SpawnType(harvester, 1.5 * TKR2_4 * TSRB * EEB(300, 2.5), TB("5CM"),
			fri => fri.filter(i => i.role === harvester && i.getBodiesNum(CARRY) >= 2).length),
		//200
		new SpawnType(harvester, 1.8 * TKR2_4 * TSRB * EEB(200, 1.5), TB("3CM"),
			fri => fri.filter(i => i.role === harvester && i.getBodiesNum(CARRY) >= 2).length),
		// //1000
		// new SpawnType(stdHealer, 1.7 * TKB4_6 * ESSB3 * ERB3 * EEB(1000, 3.5), TB("5M3H"),
		// 	fri => fri.filter(i => i.role === stdHealer).length),
		//500
		new SpawnType(stdHealer, 1.2 * EAB1p1 * TKB2_2 * TKB4_3 * ERB2 * EEB(500, 3.5), TB("5MH"),
			fri => fri.filter(i => i.role === stdHealer).length),
		//400
		new SpawnType(stdHealer, 1 * EAB1p1 * TKB2_2 * TKB4_3 * ESSB2 * ERB2 * EEB(400, 2), TB("3MH"),
			fri => fri.filter(i => i.role === stdHealer).length),
		// //400+450
		// new SpawnType(stdAttacker, 2 * TKB4_6 * EQAR3 * ESSB3 * EHR * EEB(1000, 2), TB("8M3R"),
		// 	fri => fri.filter(i => i.role === stdAttacker).length),
		//400
		new SpawnType(stdShoter, 0.9 * TSRB * EHR * EEB(400, 2), TB("5MR"),
			fri => fri.filter(i => i.role === stdShoter).length),
		//300
		new SpawnType(stdShoter, 0.5 * ERB2 * TSRB * EHR * EEB(300, 1.5), TB("3MR"),
			fri => fri.filter(i => i.role === stdShoter).length),
	];
	return spawnTypeList;
}
