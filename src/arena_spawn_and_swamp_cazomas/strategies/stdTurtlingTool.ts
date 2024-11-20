import { mySpawn } from "arena_spawn_and_swamp_cazomas/gameObjects/GameObjectInitialize";
import { createCS, supplyCS } from "../gameObjects/CS";
import {
  spawnCleared,
  spawnCreep,
  spawnCreepInFront,
} from "../gameObjects/spawn";
import { builderTurtle, builderTurtleInfo } from "../roles/builder";
import { TB } from "../utils/autoBodys";
import { displayPos, SA } from "../utils/visual";

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
import { supplyRoads } from "./turtle";
/**use a standard mode of turtling at base*/
export function useStandardTurtling(st: number, strength: number = 0) {
  SA(displayPos(), "standardTurtling strength=" + strength);
  if (st === 0) {
    const builderInfo = new builderTurtleInfo(true);
    if (strength === 0) {
      spawnCreep(TB("AWCM"), builderTurtle, builderInfo); //200
    } else if (strength === 1) {
      spawnCreep(TB("ARWCM"), builderTurtle, builderInfo); //200
    } else {
      spawnCreep(TB("3A2R2WCM"), builderTurtle, builderInfo); //200
    }
    if (strength >= 2) {
      createCS(mySpawn, StructureRampart, 10, false, true);
    }
    createCS(mySpawn, StructureRampart, 10, false, true);
  }
  supplyCS(new Pos_C(mySpawn.x, mySpawn.y + 1), StructureRampart, 10);
  supplyCS(new Pos_C(mySpawn.x, mySpawn.y - 1), StructureRampart, 10);
  if (strength > 0) {
    supplyCS(
      new Pos_C(mySpawn.x + leftRate(), mySpawn.y),
      StructureRampart,
      10
    );
  }
  supplyCS(new Pos_C(mySpawn.x - leftRate(), mySpawn.y), StructureRampart, 10);
  // supply
  supplyHarvester(st);

  //
  const startRebuildTick = 200;
  if (st >= startRebuildTick) {
    reBuildBaseRampart();
  }
  if (st === 370) {
    //defender
    const AW = enemyAWeight();
    if (strength === 0) {
      if (AW > 0.6) {
        spawnCreep(TB("4AM"), defender_rampart);
      } else if (AW > 0.2) {
        spawnCreep(TB("R2AM"), defender_rampart);
      } else {
        spawnCreep(TB("2RM"), defender_rampart);
      }
    } else if (strength === 1) {
      if (AW > 0.6) {
        spawnCreep(TB("6AM"), defender_rampart);
      } else if (AW > 0.3) {
        //450+50
        spawnCreep(TB("R4AM"), defender_rampart);
      } else if (AW > 0.15) {
        //450+50
        spawnCreep(TB("2R2AM"), defender_rampart);
      } else {
        //450+50
        spawnCreep(TB("3RM"), defender_rampart);
      }
    } else {
      if (AW > 0.6) {
        //320+450+100
        spawnCreep(TB("R8AM"), defender_rampart);
        spawnCreep(TB("R8AM"), defender_rampart);
      } else {
        spawnCreep(TB("3R4AM"), defender_rampart);
        spawnCreep(TB("3R4AM"), defender_rampart);
      }
    }
  }
  if (st >= 550) {
    supplyRoads(1);
    const ranPoss = getRangePoss(mySpawn);
    ranPoss.forEach(pos => supplyCS(pos, StructureRampart));
  }
}
// /**use 4 ramparts to defend the base*/
// export function use4RamDefend(st: number, exposeSpawnSimple: boolean = false) {
//   SA(displayPos(), "use4RamDefend");
//   supplyCS(mySpawn, StructureRampart, 10);
//   supplyCS({ x: mySpawn.x, y: mySpawn.y + 1 }, StructureRampart, 10);
//   supplyCS({ x: mySpawn.x, y: mySpawn.y - 1 }, StructureRampart, 10);
//   supplyCS({ x: mySpawn.x - leftRate(), y: mySpawn.y }, StructureRampart, 10);
//   supplyBuilder();
//   spawnStartHarvester(1, true);
// }
// function supplyBuilder() {
//   if (
//     spawnCleared(mySpawn) &&
//     friends.find(i => i.role === builder4Ram) === undefined
//   ) {
//     spawnCreep(TB("2C5MCW"), builder4Ram);
//   }
// }
export function supplyHarvester(st: number) {
  //supply harvester
  if (st >= 2 && st <= 300 && spawnCleared(mySpawn)) {
    const carryNum = sum(
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
    supplyCS(mySpawn, StructureRampart, 10, false, false);
  }
}
