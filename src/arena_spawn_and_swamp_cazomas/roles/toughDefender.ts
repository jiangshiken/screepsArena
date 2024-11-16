import { CostMatrix } from "game/path-finder";

import { mySpawn } from "arena_spawn_and_swamp_cazomas/gameObjects/GameObjectInitialize";
import { closest } from "arena_spawn_and_swamp_cazomas/utils/Pos";
import { Task_Role } from "../gameObjects/Cre";
import { Cre_battle } from "../gameObjects/Cre_battle";
import { Role } from "../gameObjects/CreTool";
import { enemies } from "../gameObjects/GameObjectInitialize";
import { blockCost } from "../gameObjects/UnitTool";
import { absRange, getRangePoss, GR } from "../utils/Pos";

/**a defender with tough on the body part instead of building rampart around
 * the base
 */
export const toughDefender: Role = new Role(
  "toughDefender",
  cre => new toughDefenderJob(<Cre_battle>cre)
);
export class toughDefenderJob extends Task_Role {
  master: Cre_battle;
  constructor(master: Cre_battle) {
    super(master);
    this.master = master;
    this.cancelOldTask(toughDefenderJob);
  }
  loop_task(): void {
    const cre = this.master;
    cre.fight();
    const cm = new CostMatrix();
    const rps = getRangePoss(mySpawn, 2);
    for (let pos of rps) {
      if (absRange(pos, mySpawn) === 1) {
        cm.set(pos.x, pos.y, 1);
      } else if (GR(pos, mySpawn) === 1) {
        cm.set(pos.x, pos.y, 5);
      } else {
        cm.set(pos.x, pos.y, blockCost);
      }
    }
    const en = closest(mySpawn, enemies);
    if (en) {
      //if not at spawn dont chase
      if (GR(en, cre) > 1 || GR(en, mySpawn) === 1) {
        cre.MT(en, 1, cm);
      }
    }
  }
}
