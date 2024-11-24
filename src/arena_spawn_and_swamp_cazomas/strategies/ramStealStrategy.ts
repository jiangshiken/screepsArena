import { Task_Role } from "../gameObjects/Cre";
import { Cre_battle } from "../gameObjects/Cre_battle";
import { Role } from "../gameObjects/CreTool";
import { enemySpawn } from "../gameObjects/GameObjectInitialize";
import { spawnCreep } from "../gameObjects/spawn";
import { friendBlockCostMatrix } from "../gameObjects/UnitTool";
import { jamer } from "../roles/jamer";
import { wormPartJob } from "../roles/wormPart_rush";
import { TB } from "../utils/autoBodys";
import { addStrategyTick, strategyTick, tick } from "../utils/game";
import { useStandardTurtling } from "./stdTurtlingTool";

export function useRamStealStrategy() {
  useStandardTurtling(strategyTick, 1);
  if (strategyTick === 0) {
    for (let i = 0; i < 8; i++) {
      spawnCreep(TB("M"), jamer);
    }
    spawnCreep(TB("10M6A"), ramStealer);
    spawnCreep(TB("10M6A"), ramStealer);
    spawnCreep(TB("13M4A"), ramStealer);
    spawnCreep(TB("13M4A"), ramStealer);
    spawnCreep(TB("15M3A"), ramStealer);
    spawnCreep(TB("15M3A"), ramStealer);
  }
  addStrategyTick();
}
export const ramStealer: Role = new Role(
  "ramStealer",
  cre => new ramStealerJob(<Cre_battle>cre)
);
export class ramStealerJob extends Task_Role {
  master: Cre_battle;
  constructor(master: Cre_battle) {
    super(master);
    this.master = master;
    this.cancelOldTask(wormPartJob);
  }
  loop_task(): void {
    const cre = this.master;
    cre.fight();
    //all arrive =600 tick
    if (tick <= 400) {
      cre.stop();
    } else {
      cre.MT_stop(enemySpawn, 5, friendBlockCostMatrix);
    }
  }
}
