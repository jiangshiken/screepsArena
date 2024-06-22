/**
 Module: strategyTool
 Author: 820491047
 CreateDate:   2023.1.10
 UpDateDate:   2023.1.10
 version 0.0.0
*/
import { CARRY, MOVE } from "game/constants";

import { harvester } from "../roles/harvester";
import { spawn, spawnCleared, spawnCreep } from "../spawn";
import { displayPos } from "../util_attackable";
import { TB } from "../util_autoBodys";
import { friends } from "../util_Cre";
import { tick } from "../util_game";
import { sum } from "../util_JS";
import { SA } from "../util_visual";

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
