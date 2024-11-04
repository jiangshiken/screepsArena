import { createCS, supplyCS } from "../gameObjects/CS";
import {
  spawn,
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
import { enemyAWeight } from "../gameObjects/Cre";
import { friends } from "../gameObjects/GameObjectInitialize";
import { baseLoseRampart } from "../gameObjects/ramparts";
import { defender_rampart } from "../roles/defender";
import { harvester } from "../roles/harvester";
import { leftRate } from "../utils/game";
import { sum } from "../utils/JS";
/**use a standard mode of turtling at base*/
export function useStandardTurtling(st: number, strength: number = 0) {
  SA(displayPos(), "Citilize strength=" + strength);
  if (st === 1) {
    if (strength === 0) {
      spawnCreep(TB("AWCM"), builderTurtle); //200
    } else if (strength === 1) {
      spawnCreep(TB("ARWCM"), builderTurtle); //200
    } else {
      spawnCreep(TB("3A2R2WCM"), builderTurtle); //200
    }
    //240+300+300+100+150
    // spawnCreep([ATTACK,ATTACK,ATTACK,RANGED_ATTACK,RANGED_ATTACK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE],builder);//200

    if (strength >= 2) {
      createCS(spawn, StructureRampart, 10, false, true);
    }
    createCS(spawn, StructureRampart, 10, false, true);
  }
  supplyCS({ x: spawn.x, y: spawn.y + 1 }, StructureRampart, 10);
  supplyCS({ x: spawn.x, y: spawn.y - 1 }, StructureRampart, 10);
  if (strength > 0) {
    supplyCS({ x: spawn.x + leftRate(), y: spawn.y }, StructureRampart, 10);
  }
  supplyCS({ x: spawn.x - leftRate(), y: spawn.y }, StructureRampart, 10);
  // supply
  supplyHarvester(st);
  //
  const startRebuildTick = 200;
  let transRebuildTime: number;
  let transRebuildTimeRange2: number = 2000;
  if (strength <= 0) {
    transRebuildTime = 600;
  } else if (strength <= 1) {
    transRebuildTime = 400;
  } else if (strength <= 2) {
    transRebuildTime = 200;
  } else {
    transRebuildTime = 200;
    transRebuildTimeRange2 = 500;
  }
  if (st >= startRebuildTick && st <= transRebuildTime) {
    reBuildBaseRampart();
  }
  // if (st >= transRebuildTime) {
  // 	let leftRate = sasVariables.leftRate();
  // 	supplyCS({ x: spawn.x - leftRate, y: spawn.y + 1 }, StructureRampart, 9);
  // 	supplyCS({ x: spawn.x - leftRate, y: spawn.y - 1 }, StructureRampart, 9);
  // 	supplyCS({ x: spawn.x + leftRate, y: spawn.y + 1 }, StructureRampart, 8);
  // 	supplyCS({ x: spawn.x + leftRate, y: spawn.y - 1 }, StructureRampart, 8);
  // }
  if (st === 370) {
    //defender
    const AW = enemyAWeight();
    if (strength === 0) {
      if (AW < 0.2) {
        spawnCreepInFront(TB("2rm"), defender_rampart);
      } else {
        spawnCreepInFront(TB("2arm"), defender_rampart);
      }
      // spawnCreepInFront(
      // 	TB("2arm"),
      // 	defender_rampart
      // );
    } else if (strength === 1) {
      if (AW < 0.2) {
        //450+50
        spawnCreepInFront(TB("3rm"), defender_rampart);
      } else {
        spawnCreepInFront(TB("6am"), defender_rampart);
      }
    } else {
      //320+450+100
      spawnCreepInFront(TB("3a3rm"), defender_rampart);
      spawnCreepInFront(TB("2a4rm"), defender_rampart);
    }
  }
}
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
    createCS(spawn, StructureRampart, 10);
  }
}
