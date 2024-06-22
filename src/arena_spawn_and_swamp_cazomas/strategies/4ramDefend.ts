import { supplyCS } from "../constructionSite";
import { builder4Ram } from "../roles/builder";
import { sasVariables } from "../SASVariables";
import { spawn, spawnCleared, spawnCreep } from "../spawn";
import { TB } from "../util_autoBodys";
import { friends } from "../util_Cre";
import { SA } from "../util_visual";
import { spawnStartHarvester } from "./strategyTool";
/**
 Module: 4ramDefend
 Author: 820491047
 CreateDate:   2023.1.10
 UpDateDate:   2023.1.10
 version 0.0.0
*/
import { StructureRampart } from "game/prototypes";
import { displayPos } from "../util_attackable";

/**use 4 ramparts to defend the base*/
export function use4RamDefend(st: number, exposeSpawnSimple: boolean = false) {
	SA(displayPos(), "use4RamDefend")
	// spawnStartHarvester(3)

	// if (st === 1) {
	// spawnCreep(TB("CM"), harvester); //
	// spawnCreep(TB("CM"), harvester); //
	// spawnCreep(TB("m2cm"), harvester); //
	// if (!exposeSpawnSimple) {
	// }
	supplyCS(spawn, StructureRampart, 10);
	supplyCS({ x: spawn.x, y: spawn.y + 1 }, StructureRampart, 10);
	supplyCS({ x: spawn.x, y: spawn.y - 1 }, StructureRampart, 10);
	supplyCS({ x: spawn.x - sasVariables.leftRate(), y: spawn.y }, StructureRampart, 10);
	// }
	supplyBuilder()
	spawnStartHarvester(1, true)
	// if (st >= 2) {
	// 	supplyHarvester(st);
	// 	reBuildBaseRampart();
	// }
}
function supplyBuilder() {
	if (spawnCleared(spawn) && friends.find(i => i.role === builder4Ram) === undefined) {
		spawnCreep(TB("2C5MCW"), builder4Ram);
	}
}
