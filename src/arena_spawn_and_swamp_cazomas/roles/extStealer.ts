import { CostMatrix } from "game/path-finder";
import { Task_Role } from "../gameObjects/Cre";
import { Role } from "../gameObjects/CreTool";
import { Cre_battle } from "../gameObjects/Cre_battle";
import { oppoExtensions } from "../gameObjects/GameObjectInitialize";
import {
  blockCost,
  inRampart,
  moveBlockCostMatrix,
} from "../gameObjects/UnitTool";
import { closest } from "../utils/Pos";
import { border_L1, border_R1, spawn_left } from "../utils/game";
import { SA } from "../utils/visual";

/**tring to attack the enemy spawn when no one noticed*/
export const extStealer: Role = new Role(
  "extStealer",
  cre => new extStealerJob(<Cre_battle>cre)
);
export let spawnWallCostMatrix: CostMatrix = new CostMatrix();
export function initSpawnWallCostMatrix() {
  spawnWallCostMatrix = moveBlockCostMatrix.clone();
  for (let i = 0; i < 100; i++) {
    spawnWallCostMatrix.set(spawn_left ? 25 : 75, i, 30);
    spawnWallCostMatrix.set(spawn_left ? 30 : 80, i, 30);
    spawnWallCostMatrix.set(spawn_left ? border_L1 : border_R1, i, blockCost);
  }
}
export class extStealerJob extends Task_Role {
  master: Cre_battle;
  constructor(master: Cre_battle) {
    super(master);
    this.master = master;
    this.cancelOldTask(extStealerJob);
  }
  loop_task(): void {
    const cre = this.master;
    SA(cre, "i'm stealer");
    cre.fight();
    if (cre.flee(6, 12, spawnWallCostMatrix)) {
      SA(cre, "flee");
    } else {
      SA(cre, "rush");
      const targets = oppoExtensions.filter(i => !inRampart(i));
      const target = closest(cre, targets);
      if (target) {
        cre.MT_stop(target);
      }
    }
  }
}
