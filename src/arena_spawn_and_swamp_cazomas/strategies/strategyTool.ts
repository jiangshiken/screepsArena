
import { CARRY, MOVE } from "game/constants";

import { harvester } from "../roles/harvester";
import { spawn, spawnCleared, spawnCreep } from "../units/spawn";
import { displayPos } from "../utils/util_attackable";
import { TB } from "../utils/util_autoBodys";
import { friends } from "../utils/util_Cre";
import { tick } from "../utils/util_game";
import { sum } from "../utils/util_JS";
import { SA } from "../utils/util_visual";

/**spawn the start harvester of every strategy*/
export function spawnStartHarvester(needCarryNum: number, is2C2M: boolean = false) {
	if (tick <= 300
		&& spawnCleared(spawn)
	) {
		const tarHarvesters = friends.filter(i => i.role === harvester
			&& i.getHealthyBodiesNum(MOVE) > 0)
		const carryNum = sum(tarHarvesters, i =>
			i.getHealthyBodiesNum(CARRY))
		SA(displayPos(), "spawnStartHarvester carryNum=" + carryNum)
		if (carryNum < needCarryNum) {
			SA(displayPos(), "supply harvester")
			if (is2C2M) {
				spawnCreep(TB("m2cm"), harvester); //
			} else {
				spawnCreep(TB("cm"), harvester); //
			}
		}
	}
}
