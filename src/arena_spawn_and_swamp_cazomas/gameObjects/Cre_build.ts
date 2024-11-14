import {
  CARRY,
  CreepActionReturnCode,
  ERR_NOT_IN_RANGE,
  OK,
  WORK,
} from "game/constants";
import { StructureRampart } from "game/prototypes";
import { Event } from "../utils/Event";
import { InShotRan, atPos } from "../utils/Pos";
import { findTask } from "../utils/Task";
import { SA, drawLineLight } from "../utils/visual";
import { Cre, Task_Cre } from "./Cre";
import { Cre_battle } from "./Cre_battle";
import { hasEnemyAround } from "./CreTool";
import { getMaxWorthCSS } from "./CS";
import { S } from "./export";
import { CS, myCSs } from "./GameObjectInitialize";
import { overallMap } from "./overallMap";
import { energyFull, energylive, inRampart } from "./UnitTool";

export class Cre_build extends Cre_battle {
  isProducer: boolean = false;
  getIsWorking() {
    const bt = <BuildingTask | undefined>findTask(this, BuildingTask);
    return bt !== undefined && bt.isWorking;
  }
  setIsWorking(b: boolean): void {
    const bt = <BuildingTask | undefined>findTask(this, BuildingTask);
    if (bt) {
      bt.isWorking = b;
    } else {
      const nt = new BuildingTask(this);
      nt.isWorking = b;
    }
  }
  getIsBuilding(): boolean {
    const bt = <BuildingTask | undefined>findTask(this, BuildingTask);
    return bt !== undefined && bt.isBuilding;
  }

  setIsBuilding(b: boolean) {
    const bt = <BuildingTask | undefined>findTask(this, BuildingTask);
    if (bt) {
      bt.isBuilding = b;
    } else {
      const nt = new BuildingTask(this);
      nt.isBuilding = b;
    }
  } /** move and build target */
  directBuild(tar: CS): boolean {
    SA(this.master, "directBuild=" + S(tar));
    drawLineLight(this.master, tar);
    if (atPos(this.master, tar)) {
      this.randomMove();
    }
    if (hasEnemyAround(tar, 0)) {
      return false;
    }
    const buildRtn = this.normalBuild(tar);
    if (buildRtn === ERR_NOT_IN_RANGE) {
      this.MTJ(tar);
      return true;
    } else if (buildRtn === OK) {
      this.stop();
      return true;
    } else return false;
  }
  /**
   * refresh the decayEvent of {@link CS} ,
   * the {@link CS} that long time not be build
   * will have a low worth
   */
  normalBuild(cs: CS): CreepActionReturnCode | -6 {
    SA(this, "normalBuild");
    SA(this, "theCreep=" + S(this));
    SA(this, "cs=" + S(cs));
    let rtn = this.master.build(cs.master);
    SA(this, "rtn=" + rtn);
    if (rtn === OK) {
      (<CS>cs).decayEvent = new Event();
    }
    return rtn;
  }

  /**build standard*/
  build_std() {
    const css = myCSs.filter(i => canBeBuildByCre(i, this));
    const cs = getMaxWorthCSS(css);
    this.buildStatic();
    if (cs && !InShotRan(cs, this.master)) {
      this.MTJ(cs);
    } else {
      this.stop();
    }
  }
  /** build static*/
  buildStatic(): CS | undefined {
    const css = myCSs.filter(
      i => InShotRan(i, this.master) && canBeBuildByCre(i, this)
    );
    const cs = getMaxWorthCSS(css);
    if (cs) SA(cs, "buildStatic cs here");
    else SA(this.master, "no cs");
    if (cs) {
      if (this.getIsBuilding()) {
        SA(this.master, "normalBuild");
        this.normalBuild(cs);
      } else {
        SA(this.master, "withDrawStatic");
        if (!this.withDrawStatic()) {
          this.setIsBuilding(true);
        }
      }
    }
    return cs;
  }
}

export function isWorkingBuilder(cre: Cre_build): boolean {
  return (
    cre.getHealthyBodyPartsNum(CARRY) >= 1 &&
    cre.getHealthyBodyPartsNum(WORK) >= 1 &&
    cre.getIsWorking() &&
    cre.getIsBuilding()
  );
}
/**if can be build by Cre which has no enemy or friend at pos
 *  and no block object at pos
 * and can be build when its multi-rampart*/
export function canBeBuildByCre(cs: CS, cre: Cre): boolean {
  // SA(cre, "cs.structure=" + S(cs.structure))
  // SA(cre, "isBlockGameObject(cs.structure)=" + isBlockGameObject(cs.structure))
  if (hasEnemyAround(cs, 0)) {
    return false;
  }
  const workNum = cre.getBodyPartsNum(WORK);
  const limitProgress: number = 200 - workNum * 5;
  return canBeBuild(cs, limitProgress);
}

/**
 * if has other CS Rampart <limit && this.progress>=limit
 * that cannot be build
 * @param cs must be rampart
 * @param limitProgress the limitProgress often is 200-workNum*5
 */
export function canBeBuild(cs: CS, limitProgress: number): boolean {
  if (cs.master.structure instanceof StructureRampart) {
    if (inRampart(cs)) {
      return false;
    } else {
      if (cs.progress < limitProgress) {
        return true;
      } else {
        const findRtn = overallMap
          .get(cs)
          .find(
            i =>
              i instanceof CS &&
              i !== cs &&
              i.master.structure instanceof StructureRampart &&
              i.progress < limitProgress
          );
        return !findRtn;
      }
    }
  } else {
    return true;
  }
}

/** used to judge if is in build state*/
export class BuildingTask extends Task_Cre {
  isBuilding: boolean = false;
  isWorking: boolean = false;
  constructor(master: Cre) {
    super(master);
  }
  loop_task() {
    let cc = this.master;
    if (this.isBuilding && !energylive(cc)) {
      this.isBuilding = false;
    }
    if (!this.isBuilding && energyFull(cc)) {
      this.isBuilding = true;
    }
  }
}
