import {
  CARRY,
  CreepActionReturnCode,
  ERR_NOT_IN_RANGE,
  OK,
  WORK,
} from "game/constants";
import { ConstructionSite, StructureRampart } from "game/prototypes";
import { S } from "../utils/export";
import { GR, atPos } from "../utils/Pos";
import { findTask } from "../utils/Task";
import { SA, drawLineLight } from "../utils/visual";
import { Cre, Task_Cre, hasEnemyAround } from "./Cre";
import { Cre_battle } from "./Cre_battle";
import { CS, getMaxWorthCSS, progress } from "./CS";
import { overallMap } from "./overallMap";
import { getEnergy, getFreeEnergy, inRampart } from "./UnitTool";

export class Cre_build extends Cre_battle {
  isProducer: boolean = false;
}

export function isWorkingBuilder(cre: Cre): boolean {
  return (
    cre.getHealthyBodyPartsNum(CARRY) >= 1 &&
    cre.getHealthyBodyPartsNum(WORK) >= 1 &&
    getIsWorking() &&
    getIsBuilding()
  );
}
/**if can be build by Cre which has no enemy or friend at pos
 *  and no block object at pos
 * and can be build when its multi-rampart*/
export function canBeBuildByCre(cs: CS, cre: Cre): boolean {
  // SA(cre, "cs.structure=" + S(cs.structure))
  // SA(cre, "INS=" + cs.structure instanceof StructureRampart)
  // SA(cre, "isBlockGameObject(cs.structure)=" + isBlockGameObject(cs.structure))
  if (
    hasEnemyAround(cs, 0) ||
    (hasFriendAround(cs, 0) && isBlockGameObject(cs.structure, false, myGO(cs)))
  ) {
    return false;
  }
  let workNum = cre.getBody(WORK).length;
  let limitProgress: number = 200 - workNum * 5;
  return canBeBuild(cs, limitProgress);
}

/**
 * if has other CS Rampart <limit && this.progress>=limit
 * that cannot be build
 * @param cs must be rampart
 * @param limitProgress the limitProgress often is 200-workNum*5
 */
export function canBeBuild(cs: CS, limitProgress: number): boolean {
  if (cs.structure instanceof StructureRampart) {
    if (inRampart(cs)) {
      return false;
    } else {
      if (progress(cs) < limitProgress) {
        return true;
      } else {
        let findRtn = overallMap
          .get(cs)
          .find(
            i =>
              i instanceof ConstructionSite &&
              i !== cs &&
              i.structure instanceof StructureRampart &&
              progress(i) < limitProgress
          );
        return !findRtn;
      }
    }
  } else {
    return true;
  }
}

/**
 * return a state if cre is Building
 */
export function getIsBuilding(cre: Cre): boolean {
  const bt = <BuildingTask | undefined>findTask(cre, BuildingTask);
  if (!bt) {
    new BuildingTask(cre);
    return false;
  } else {
    bt.loop_task();
    return bt.isBuilding;
  }
}
/**set the isBuilding porperty*/
export function setIsBuilding(cre: Cre, b: boolean): boolean {
  const bt = <BuildingTask | undefined>findTask(cre, BuildingTask);
  if (bt) {
    bt.isBuilding = b;
    return true;
  }
  return false;
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
    if (this.isBuilding && getEnergy(cc) === 0) {
      this.isBuilding = false;
    }
    if (!this.isBuilding && getFreeEnergy(cc) === 0) {
      this.isBuilding = true;
    }
  }
  /**if is building*/
  getIsBuilding(): boolean {
    return getIsBuilding(this.master);
  }

  /**
   * refresh the decayEvent of {@link CS} ,
   * the {@link CS} that long time not be build
   * will have a low worth
   */
  normalBuild(cs: ConstructionSite): CreepActionReturnCode | -6 {
    let theCreep = this.master.master;
    SA(theCreep, "normalBuild");
    SA(theCreep, "theCreep=" + S(theCreep));
    SA(theCreep, "cs=" + S(cs));
    let rtn = theCreep.build(cs);
    SA(theCreep, "rtn=" + rtn);
    if (rtn === OK) {
      (<CS>cs).decayEvent = new Event_C();
    }
    return rtn;
  }

  /**build standard*/
  build_std() {
    const css = getMyCSs().filter(i => canBeBuildByCre(i, this.master));
    const cs = getMaxWorthCSS(css);
    this.buildStatic();
    if (cs && GR(cs, this.master) > 3) {
      this.master.MTJ(cs);
    } else {
      this.master.stop();
    }
  }
  /** build static*/
  buildStatic(): CS | undefined {
    const css = getMyCSs().filter(
      i => GR(i, this.master) <= 3 && canBeBuildByCre(i, this.master)
    );
    const cs = getMaxWorthCSS(css);
    if (cs) SA(cs, "buildStatic cs here");
    else SA(this.master, "no cs");
    if (cs) {
      if (getIsBuilding(this.master)) {
        SA(this.master, "normalBuild");
        this.normalBuild(cs);
      } else {
        SA(this.master, "withDrawStatic");
        if (!this.withDrawStatic()) {
          setIsBuilding(this.master, true);
        }
      }
    }
    return cs;
  }

  setIsWorking(b: boolean): void {
    this.findBuildingTask().isWorking = b;
  }
  getIsWorking(): boolean {
    return this.findBuildingTask().isWorking;
  }
  /** find BuildingTask*/
  findBuildingTask(): BuildingTask {
    const cre = this.master;
    const bt = <BuildingTask | undefined>findTask(cre, BuildingTask);
    if (bt === undefined) {
      return new BuildingTask(cre);
    } else {
      return bt;
    }
  }
  /** move and build target */
  directBuild(tar: CS): boolean {
    SA(this.master, "directBuild=" + S(tar));
    drawLineLight(this.master, tar);
    if (atPos(this.master, tar)) {
      this.master.randomMove();
    }
    if (hasEnemyAround(tar, 0)) {
      return false;
    }
    const buildRtn = this.normalBuild(tar);
    if (buildRtn === ERR_NOT_IN_RANGE) {
      this.master.MTJ_follow(tar);
      return true;
    } else if (buildRtn === OK) {
      this.master.stop();
      return true;
    } else return false;
  }
}
