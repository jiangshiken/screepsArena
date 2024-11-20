import { ConstructionSite } from "game/prototypes";

import { mySpawn } from "arena_spawn_and_swamp_cazomas/gameObjects/GameObjectInitialize";
import { Task_Role } from "../gameObjects/Cre";
import { Cre_battle } from "../gameObjects/Cre_battle";
import {
  attackWeakRampart,
  defendTheRampart,
} from "../gameObjects/CreCommands";
import { getEnemyThreats, Role } from "../gameObjects/CreTool";
import { enemies } from "../gameObjects/GameObjectInitialize";
import { findGO } from "../gameObjects/overallMap";
import { tick } from "../utils/game";
import { Adj, closest } from "../utils/Pos";
import { SA } from "../utils/visual";

//role
/**the defender that hide in rampart*/
export const defender_rampart: Role = new Role(
  "defender_rampart",
  cre => new defender_RampartJob(<Cre_battle>cre)
);

/**the job of defender_rampart.It will hide in the rampart,attack my own
 * rampart when it near broken and hide into a new one when the rampart on it
 * is near broken.It will trying to approach the closest enemy while it can reach
 * it only pass the healthy rampart of mine.
 */
export class defender_RampartJob extends Task_Role {
  master: Cre_battle;
  constructor(master: Cre_battle) {
    super(master);
    this.master = master;
    this.cancelOldTask(defender_RampartJob);
  }
  loop_task(): void {
    const cre = this.master;
    SA(cre, "defender_RampartJob");
    cre.fight();
    const EnemyAroundSpawn = getEnemyThreats().filter(i => Adj(i, mySpawn));
    if (
      EnemyAroundSpawn.length > 0 &&
      ((tick > 1950 && !findGO(mySpawn, ConstructionSite)) || tick > 1965)
    ) {
      SA(cre, "final protect mode");
      const tar = closest(cre, EnemyAroundSpawn);
      if (tar && !Adj(cre, tar)) {
        SA(cre, "MTJ_follow");
        cre.MT(tar);
      } else {
        SA(cre, "stop");
        cre.stop();
      }
    } else {
      // const hasEnemyAround = enemies.find(i => GR(i, cre) <= 4) !== undefined;
      // if (!hasEnemyAround) {
      //   // if (cpuBreakJudge(cre)) {
      //   //   return;
      //   // }
      // }
      const roundEn = enemies.filter(i => Adj(i, cre));
      if (roundEn.length === 0) {
        attackWeakRampart(cre);
      }
      if (cre.appointMovementIsActived(1)) {
        cre.useAppointMovement();
      } else {
        defendTheRampart(cre);
      }
    }
  }
}
