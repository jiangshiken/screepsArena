/**
 Module: defender
 Author: 820491047
 CreateDate:   2023.1.10
 UpDateDate:   2023.1.10
 version 0.0.0
*/

import { ConstructionSite } from "game/prototypes";
import { findClosestByRange } from "game/utils";

import { cpuBreakJudge } from "../army";
import { attackWeakRampart, defendTheRampart } from "../ramparts";
import { spawn } from "../spawn";
import { spawnPos } from "../util_attackable";
import { Cre, enemies, getEnemyThreats, Role } from "../util_Cre";
import { tick } from "../util_game";
import { findGO } from "../util_overallMap";
import { MGR } from "../util_pos";
import { PS, SA } from "../util_visual";

//role
/**the defender that hide in rampart*/
export const defender_rampart: Role = new Role(
	"defender_rampart",
	defender_RampartJob
);
/**the job of defender_rampart.It will hide in the rampart,attack my own
 * rampart when it near broken and hide into a new one when the rampart on it
 * is near broken.It will trying to approach the closest enemy while it can reach
 * it only pass the healthy rampart of mine.
*/
export function defender_RampartJob(cre: Cre) {
	SA(cre, "defender_RampartJob")
	PS("defender_RampartJob")
	cre.fight();
	const EnemyAroundSpawn = getEnemyThreats().filter(i => MGR(i, spawn) <= 1)
	if (EnemyAroundSpawn.length > 0
		&& (
			tick > 1950 && !findGO(spawnPos, ConstructionSite)
			|| tick > 1965
		)
	) {
		SA(cre, "final protect mode")
		const tar = findClosestByRange(cre, EnemyAroundSpawn)
		if (MGR(cre, tar) > 1) {
			SA(cre, "MTJ_follow")
			cre.MTJ_follow(tar)
		} else {
			SA(cre, "stop")
			cre.stop()
		}
	} else {
		// cre.MTJ_follow({ x: spawn.x - 4, y: spawn.y + 4 })
		// cre.MTJ_follow({ x: spawn.x - 4, y: spawn.y - 4 })
		const hasEnemyAround = enemies.find(i => MGR(i, cre) <= 4) !== undefined
		if (!hasEnemyAround) {
			if (cpuBreakJudge(cre)) {
				return
			}
		}
		let roundEn = enemies.filter(i => MGR(i, cre) <= 1);
		if (roundEn.length === 0) {
			attackWeakRampart(cre);
		}
		if (cre.useAppointMovement()) {
			return
		}
		defendTheRampart(cre);
	}
}
