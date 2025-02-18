import { getTicks } from "game/utils";
import { Task_Role } from "../gameObjects/Cre";
import { Cre_build } from "../gameObjects/Cre_build";
import { Role } from "../gameObjects/CreTool";
import { enemySpawn } from "../gameObjects/GameObjectInitialize";
import { spawnCreep } from "../gameObjects/spawn";
import { BuilderStandardTask } from "../roles/builder";
import { TB } from "../utils/autoBodys";
import { addStrategyTick, strategyTick } from "../utils/game";
import { findTask } from "../utils/Task";
import { useStandardTurtling } from "./stdTurtlingTool";

export function useArmedBuilderStrategy() {
  useStandardTurtling(strategyTick, 1);
  if (strategyTick === 0) {
    //250+50+100+560
    spawnCreep(TB("5MCW7A"), armedBuilder);
    for (let i = 0; i < 28; i++) {
      //500+100+200+160
      spawnCreep(TB("10M2C2W2A"), armedBuilder);
      spawnCreep(TB("10M2C2WR"), armedBuilder);
    }
  }
  addStrategyTick();
}
export const armedBuilder: Role = new Role(
  "armedBuilder",
  cre => new armedBuilderJob(<Cre_build>cre)
);
export class armedBuilderJob extends Task_Role {
  master: Cre_build;
  constructor(master: Cre_build) {
    super(master);
    this.master = master;
    this.cancelOldTask(armedBuilderJob);
  }
  loop_task(): void {
    const cre = this.master;
    cre.fight();
    //all arrive =600 tick
    if (cre.tryBreakBlockedContainer()) {
    } else if (getTicks() >= 1850) {
      cre.MT_stop(enemySpawn);
    } else {
      const taskBuilder = findTask(cre, BuilderStandardTask);
      if (taskBuilder) {
      } else {
        new BuilderStandardTask(cre);
      }
    }
  }
}
