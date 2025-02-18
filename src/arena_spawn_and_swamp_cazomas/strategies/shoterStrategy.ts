import { getTicks } from "game/utils";
import { Task_Role } from "../gameObjects/Cre";
import { Cre_battle } from "../gameObjects/Cre_battle";
import { Role } from "../gameObjects/CreTool";
import { enemySpawn, mySpawn } from "../gameObjects/GameObjectInitialize";
import { damagedRate } from "../gameObjects/HasHits";
import { spawnCreep } from "../gameObjects/spawn";
import { TB } from "../utils/autoBodys";
import { addStrategyTick, strategyTick } from "../utils/game";
import { useStandardTurtling } from "./stdTurtlingTool";

export function useShoterStrategy() {
  useStandardTurtling(strategyTick, 1);
  if (strategyTick === 0) {
    //250+50+100+560
    spawnCreep(TB("10M6A"), healShoter);
    for (let i = 0; i < 28; i++) {
      //600+250+150
      spawnCreep(TB("10M2R"), healShoter);
      spawnCreep(TB("10M2H"), healShoter);
      spawnCreep(TB("15M3A"), healShoter);
    }
  }
  addStrategyTick();
}
export const healShoter: Role = new Role(
  "healShoter",
  cre => new healShoterJob(<Cre_battle>cre)
);
export class healShoterJob extends Task_Role {
  master: Cre_battle;
  constructor(master: Cre_battle) {
    super(master);
    this.master = master;
    this.cancelOldTask(healShoterJob);
  }
  loop_task(): void {
    const cre = this.master;
    cre.fight();
    //all arrive =600 tick
    if (cre.tryBreakBlockedContainer()) {
    } else if (getTicks() >= 1850) {
      cre.MT_stop(enemySpawn);
    } else {
      if (damagedRate(cre) > 0.1) {
        cre.MT_stop(mySpawn);
      } else {
        cre.MT_stop(enemySpawn);
        // const tar=closest(cre,enemies)
        // if(tar){
        //   cre.
        // }else{

        // }
      }
    }
  }
}
