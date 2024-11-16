import { CostMatrix } from "game/path-finder";
import { Task_Role } from "../gameObjects/Cre";
import { Role } from "../gameObjects/CreTool";
import { Cre_harvest } from "../gameObjects/Cre_harvest";
import { oppoExtensions } from "../gameObjects/GameObjectInitialize";
import { blockCost, energylive, inRampart } from "../gameObjects/UnitTool";
import { closest } from "../utils/Pos";
import { border_L1, border_R1, spawn_left } from "../utils/game";
import { SA } from "../utils/visual";

/**tring to attack the enemy spawn when no one noticed*/
export const energyStealer: Role = new Role(
  "energyStealer",
  cre => new energyStealerJob(<Cre_harvest>cre)
);
export const spawnWallCostMatrix: CostMatrix = new CostMatrix();
export function initSpawnWallCostMatrix() {
  for (let i = 0; i < 100; i++) {
    spawnWallCostMatrix.set(spawn_left ? 25 : 75, i, 30);
    spawnWallCostMatrix.set(spawn_left ? 30 : 80, i, 30);
    spawnWallCostMatrix.set(spawn_left ? border_L1 : border_R1, i, blockCost);
  }
}
export class energyStealerJob extends Task_Role {
  master: Cre_harvest;
  constructor(master: Cre_harvest) {
    super(master);
    this.master = master;
    this.cancelOldTask(energyStealerJob);
  }
  loop_task(): void {
    const cre = this.master;
    SA(cre, "i'm stealer");
    // cre.fight();
    if (cre.flee(6, 12, spawnWallCostMatrix)) {
      SA(cre, "flee");
      cre.dropEnergy();
    } else {
      SA(cre, "rush");
      const targets = oppoExtensions.filter(
        i => !inRampart(i) && energylive(i)
      );
      const target = closest(cre, targets);
      if (target) {
        cre.MT_stop(target);
        cre.directWithdrawAndDrop(target);
      }
    }
  }
}
