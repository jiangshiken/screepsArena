import { supplyCS } from "../gameObjects/CS";
import { friends } from "../gameObjects/Cre";
import { spawn, spawnCleared, spawnCreep } from "../gameObjects/spawn";
import { builder4Ram } from "../roles/builder";
import { TB } from "../utils/autoBodys";
import { SA } from "../utils/visual";
import { spawnStartHarvester } from "./strategyTool";

import { StructureRampart } from "game/prototypes";
import { displayPos } from "../gameObjects/HasHits";
import { leftRate } from "../utils/game";

/**use 4 ramparts to defend the base*/
export function use4RamDefend(st: number, exposeSpawnSimple: boolean = false) {
  SA(displayPos(), "use4RamDefend");
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
  supplyCS({ x: spawn.x - leftRate(), y: spawn.y }, StructureRampart, 10);
  // }
  supplyBuilder();
  spawnStartHarvester(1, true);
  // if (st >= 2) {
  // 	supplyHarvester(st);
  // 	reBuildBaseRampart();
  // }
}
function supplyBuilder() {
  if (
    spawnCleared(spawn) &&
    friends.find(i => i.role === builder4Ram) === undefined
  ) {
    spawnCreep(TB("2C5MCW"), builder4Ram);
  }
}
