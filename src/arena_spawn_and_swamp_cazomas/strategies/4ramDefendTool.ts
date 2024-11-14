import { spawn } from "arena_spawn_and_swamp_cazomas/gameObjects/GameObjectInitialize";
import { createCS, supplyCS } from "../gameObjects/CS";
import {
  spawnCleared,
  spawnCreep,
  spawnCreepInFront,
} from "../gameObjects/spawn";
import { builder4Ram, builderTurtle } from "../roles/builder";
import { TB } from "../utils/autoBodys";
import { displayPos, SA } from "../utils/visual";
import { spawnStartHarvester } from "./strategyTool";

import { CARRY } from "game/constants";
import { StructureRampart } from "game/prototypes";
import { enemyAWeight } from "../gameObjects/CreTool";
import { friends } from "../gameObjects/GameObjectInitialize";
import { baseLoseRampart } from "../gameObjects/ramparts";
import { defender_rampart } from "../roles/defender";
import { harvester } from "../roles/harvester";
import { leftRate } from "../utils/game";
import { sum } from "../utils/JS";
import { getRangePoss, Pos_C } from "../utils/Pos";
/**use a standard mode of turtling at base*/
export function useStandardTurtling(st: number, strength: number = 0) {
  SA(displayPos(), "standardTurtling strength=" + strength);
  if (st === 0) {
    if (strength === 0) {
      spawnCreep(TB("AWCM"), builderTurtle); //200
    } else if (strength === 1) {
      spawnCreep(TB("ARWCM"), builderTurtle); //200
    } else {
      spawnCreep(TB("3A2R2WCM"), builderTurtle); //200
    }
    if (strength >= 2) {
      createCS(spawn, StructureRampart, 10, false, true);
    }
    createCS(spawn, StructureRampart, 10, false, true);
  }
  supplyCS(new Pos_C(spawn.x, spawn.y + 1), StructureRampart, 10);
  supplyCS(new Pos_C(spawn.x, spawn.y - 1), StructureRampart, 10);
  if (strength > 0) {
    supplyCS(new Pos_C(spawn.x + leftRate(), spawn.y), StructureRampart, 10);
  }
  supplyCS(new Pos_C(spawn.x - leftRate(), spawn.y), StructureRampart, 10);
  // supply
  supplyHarvester(st);
  //
  const startRebuildTick = 200;
  // let transRebuildTime: number;
  // if (strength === 0) {
  //   transRebuildTime = 600;
  // } else if (strength === 1) {
  //   transRebuildTime = 400;
  // } else if (strength === 2) {
  //   transRebuildTime = 200;
  // } else {
  //   transRebuildTime = 200;
  // }
  if (st >= startRebuildTick) {
    reBuildBaseRampart();
  }
  if (st === 370) {
    //defender
    const AW = enemyAWeight();
    if (strength === 0) {
      if (AW < 0.2) {
        spawnCreep(TB("2rm"), defender_rampart);
      } else {
        spawnCreep(TB("2arm"), defender_rampart);
      }
    } else if (strength === 1) {
      if (AW < 0.2) {
        //450+50
        spawnCreep(TB("3rm"), defender_rampart);
      } else {
        spawnCreep(TB("6am"), defender_rampart);
      }
    } else {
      //320+450+100
      spawnCreep(TB("3a3rm"), defender_rampart);
      spawnCreep(TB("2a4rm"), defender_rampart);
    }
  }
  if (st >= 550) {
    const ranPoss = getRangePoss(spawn);
    ranPoss.forEach(pos => supplyCS(pos, StructureRampart));
  }
}
/**use 4 ramparts to defend the base*/
export function use4RamDefend(st: number, exposeSpawnSimple: boolean = false) {
  SA(displayPos(), "use4RamDefend");
  supplyCS(spawn, StructureRampart, 10);
  supplyCS({ x: spawn.x, y: spawn.y + 1 }, StructureRampart, 10);
  supplyCS({ x: spawn.x, y: spawn.y - 1 }, StructureRampart, 10);
  supplyCS({ x: spawn.x - leftRate(), y: spawn.y }, StructureRampart, 10);
  supplyBuilder();
  spawnStartHarvester(1, true);
}
function supplyBuilder() {
  if (
    spawnCleared(spawn) &&
    friends.find(i => i.role === builder4Ram) === undefined
  ) {
    spawnCreep(TB("2C5MCW"), builder4Ram);
  }
}
export function supplyHarvester(st: number) {
  //supply harvester
  if (st >= 2 && st <= 300 && spawnCleared(spawn)) {
    let carryNum = sum(
      friends.filter(i => i.role === harvester),
      i => i.getBodyPartsNum(CARRY)
    );
    if (carryNum < 2) {
      spawnCreepInFront(TB("CM"), harvester);
    }
  }
}
/**rebuild the base rampart
 * if not in my rampart ,create a `StructureRampart` at pos
 */
export function reBuildBaseRampart() {
  if (baseLoseRampart()) {
    supplyCS(spawn, StructureRampart, 10, false, false);
  }
}
