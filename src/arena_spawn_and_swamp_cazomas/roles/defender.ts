import { ConstructionSite } from "game/prototypes";
import { findClosestByRange } from "game/utils";

import { spawn } from "arena_spawn_and_swamp_cazomas/gameObjects/GameObjectInitialize";
import { Cre_battle } from "../gameObjects/Cre_battle";
import {
  attackWeakRampart,
  cpuBreakJudge,
  defendTheRampart,
} from "../gameObjects/CreCommands";
import { getEnemyThreats, Role } from "../gameObjects/CreTool";
import { enemies } from "../gameObjects/GameObjectInitialize";
import { findGO } from "../gameObjects/overallMap";
import { tick } from "../utils/game";
import { GR } from "../utils/Pos";
import { P, SA } from "../utils/visual";

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
export function defender_RampartJob(cre: Cre_battle) {
  SA(cre, "defender_RampartJob");
  P("defender_RampartJob");
  cre.fight();
  const EnemyAroundSpawn = getEnemyThreats().filter(i => GR(i, spawn) <= 1);
  if (
    EnemyAroundSpawn.length > 0 &&
    ((tick > 1950 && !findGO(spawn, ConstructionSite)) || tick > 1965)
  ) {
    SA(cre, "final protect mode");
    const tar = findClosestByRange(cre, EnemyAroundSpawn);
    if (GR(cre, tar) > 1) {
      SA(cre, "MTJ_follow");
      cre.MT(tar);
    } else {
      SA(cre, "stop");
      cre.stop();
    }
  } else {
    const hasEnemyAround = enemies.find(i => GR(i, cre) <= 4) !== undefined;
    if (!hasEnemyAround) {
      if (cpuBreakJudge(cre)) {
        return;
      }
    }
    let roundEn = enemies.filter(i => GR(i, cre) <= 1);
    if (roundEn.length === 0) {
      attackWeakRampart(cre);
    }
    if (cre.useAppointMovement()) {
      return;
    }
    defendTheRampart(cre);
  }
}
