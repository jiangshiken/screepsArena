import { harvester } from "./roles/harvester";
import { spawn, spawnCleared, spawnCreepInFront } from "./units/spawn";
import { bodyCM } from "./utils/util_bodyParts";
import { friends } from "./utils/util_Cre";
import { sum } from "./utils/util_JS";
/**
 Module: strategy_tool
 Author: 820491047
 CreateDate:   2023.1.10
 UpDateDate:   2023.1.10
 version 0.0.0
*/
import { CARRY } from "game/constants";

export function supplyHarvester(st: number) {
	//supply harvester
	if (st >= 2 && st <= 300 && spawnCleared(spawn)) {
		let carryNum = sum(friends.filter(i => i.role === harvester), i => i.getBodiesNum(CARRY))
		if (carryNum < 2) {
			spawnCreepInFront(bodyCM, harvester);
		}
	}
}
