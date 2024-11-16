import {
  Task_Cre,
  Task_Role,
} from "arena_spawn_and_swamp_cazomas/gameObjects/Cre";
import { isMyTick, Role } from "../gameObjects/CreTool";
import {
  containers,
  Harvable,
  Producer,
  ress,
} from "../gameObjects/GameObjectInitialize";

import { mySpawn } from "arena_spawn_and_swamp_cazomas/gameObjects/GameObjectInitialize";
import { Cre_findPath } from "../gameObjects/Cre_findPath";
import { Cre_harvest, validRes } from "../gameObjects/Cre_harvest";
import { S } from "../gameObjects/export";
import { inMyBaseRan } from "../gameObjects/spawn";
import { Con } from "../gameObjects/Stru";
import {
  energylive,
  getEmptyCapacity,
  getEnergy,
  getFreeEnergy,
  getWildCons,
} from "../gameObjects/UnitTool";
import { inResourceArea, tick } from "../utils/game";
import { COO, GR } from "../utils/Pos";
import { findTask } from "../utils/Task";
import { drawPoly, SA } from "../utils/visual";

/**get the move time assume its capacity is full*/
export function getTimeAfterFull(cre: Cre_findPath) {
  return cre.getMoveTime(getEmptyCapacity(cre));
}
/**the task used on harvester.Will auto pick drop when it moves too slow*/
export class HarvestTask extends Task_Cre {
  master: Cre_harvest;
  targetHarvable: Harvable;
  targetProducer: Producer;
  constructor(
    master: Cre_harvest,
    targetHarvable: Harvable,
    targetProducer: Producer
  ) {
    super(master);
    this.master = master;
    this.targetHarvable = targetHarvable;
    this.targetProducer = targetProducer;
  }
  withDrawMode() {
    const cre = this.master;
    SA(cre, "withDrawMode");
    if (cre.withDrawTarget(this.targetHarvable)) {
      //if correct withdraw
      if (getTimeAfterFull(cre) <= 3) {
        //if walk time after full energy need less than 3 tick
        SA(cre, "quickly transToProducers");
        cre.transToProducers();
      } else {
        //if over 3 tick
        SA(cre, "stop");
        cre.stop();
      }
    } else {
      SA(cre, "cre.MTJ(this.targetHarvable);");
      cre.MT(this.targetHarvable);
    }
  }
  loop_task() {
    const cre = this.master;
    SA(cre, "HarvestTask");
    if (
      !this.targetHarvable ||
      !this.targetProducer ||
      (this.targetHarvable !== undefined && !energylive(this.targetHarvable))
    ) {
      SA(cre, "END HAVE TASK");
      this.end();
    }
    //if have not energy
    if (getEnergy(cre) === 0) {
      SA(cre, "no energy");

      const targetResources = ress.find(i => GR(i, cre) <= 1 && !validRes(i));
      if (targetResources) {
        SA(cre, "with draw dropped resource");
        cre.withDrawTarget(targetResources);
        cre.stop();
      } else {
        this.withDrawMode();
      }
      //if have energy
    } else {
      SA(cre, "have energy");
      let transTarget: Producer;
      if (this.targetProducer === mySpawn && getFreeEnergy(mySpawn) === 0) {
        const spawnAroundFreeContainer = containers.find(
          i => GR(i, mySpawn) <= 1 && getFreeEnergy(i) > 0
        );
        if (spawnAroundFreeContainer) {
          transTarget = spawnAroundFreeContainer;
        } else {
          transTarget = this.targetProducer;
        }
      } else {
        transTarget = this.targetProducer;
      }
      const tRtn = cre.transToTargetProducer(transTarget);
      const moveTimeTooMuch: boolean = cre.getMoveTime() > 2;
      if (tRtn) {
        //if trans success
        this.withDrawMode();
      } else if (moveTimeTooMuch) {
        //if trans not success
        SA(cre, "moveTimeTooMuch");
        cre.dropEnergy(); //drop it on ground
        // overallMap.set(cre, new ResourceDropEvent(PosToPos_C(cre)));
        cre.MT(transTarget);
      } else {
        SA(cre, "normal move to " + transTarget.id);
        const sRtn = cre.searchPathByCreCost(transTarget);
        if (inMyBaseRan(cre)) {
          drawPoly(sRtn.path, 0.8, "#8822aa");
          SA(cre, "path " + S(sRtn.path));
          SA(cre, "incomplete " + sRtn.incomplete);
        }
        cre.MT(transTarget);
      }
    }
  }
}
/**harvester.Used to transport energy from harvables to producers*/
export const harvester: Role = new Role(
  "harvester",
  cre => new harvesterJob(<Cre_harvest>cre)
);
export let harvesterNotFleeAtStart: boolean = false;
export function set_harvesterNotFleeAtStart(b: boolean) {
  harvesterNotFleeAtStart = b;
}
export let energyStealMode = false;
export function set_energyStealMode(b: boolean) {
  energyStealMode = b;
}
/**job of harvester.It will flee from threat enemies,find the fit harvable
 * and producer,new a HarvestTask when it hasn't.
 */
export class harvesterJob extends Task_Role {
  master: Cre_harvest;
  constructor(master: Cre_harvest) {
    super(master);
    this.master = master;
    this.cancelOldTask(harvesterJob);
  }
  loop_task(): void {
    const cre = this.master;
    if (energyStealMode && tick >= 400) {
      // energyStealerJob(cre);
      return;
    }
    if (!harvesterNotFleeAtStart && cre.flee(5, 10)) {
      SA(cre, "flee");
      cre.dropEnergy();
      findTask(cre, HarvestTask)?.end();
    } else {
      SA(cre, "harve");
      const contDropScanRange = 20;
      const targetCont = getWildCons().find(
        i =>
          GR(i, cre) <= contDropScanRange &&
          i.worth > 0 &&
          getEnergy(i) > 0 &&
          cre.reachableHarvable(i)
      );
      SA(cre, "targetCont=" + COO(targetCont));
      if (inResourceArea(cre) && targetCont) {
        dropCont(cre, targetCont);
        findTask(cre, HarvestTask)?.end();
      } else if (!findTask(cre, HarvestTask) || isMyTick(cre, 20)) {
        SA(cre, "scan fit harvable and producer");
        const targetHarvable = cre.findFitHarvable();
        SA(cre, "targetHarvable " + targetHarvable);
        const targetProducer = cre.findFitProducer();
        SA(cre, "targetProducer " + targetProducer);
        findTask(cre, HarvestTask)?.end();
        if (targetHarvable && targetProducer) {
          SA(cre, " new HarvestTask");
          new HarvestTask(cre, targetHarvable, targetProducer);
        }
      }
    }
  }
}
/**drop the wild container */
function dropCont(cre: Cre_harvest, cont: Con) {
  SA(cre, "dropCont");
  if (GR(cre, cont) <= 1) {
    cre.stop();
    if (getEnergy(cre) > 0) {
      cre.dropEnergy();
    } else {
      cre.withDrawTarget(cont);
    }
  } else {
    cre.dropEnergy();
    cre.MT(cont);
  }
}
