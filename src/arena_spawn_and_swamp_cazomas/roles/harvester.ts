import { StructureContainer } from "game/prototypes";

import {
  Cre,
  getEmptyCapacity,
  getEnergy,
  getFreeEnergy,
  HasStore,
  id,
  isMyTick,
  live,
  Producer,
  Role,
  Task_Cre,
} from "../units/Cre";
import { containers, Harvable } from "../units/gameObjectInitialize";
import {
  Cont,
  getContWorth,
  getRess,
  getWildConts,
  setResourceDrop,
  validRes,
} from "../units/HasHits";
import { inMyBaseRan, spawn } from "../units/spawn";
import { S } from "../utils/export";
import { inResourceArea } from "../utils/game";
import { COO, GR } from "../utils/Pos";
import { findTask } from "../utils/Task";
import { drawPoly, SA } from "../utils/visual";

/**get the move time assume its capacity is full*/
export function getTimeAfterFull(cre: Cre) {
  return cre.getMoveTime(getEmptyCapacity(cre));
}
// /***/
// export function getHarveWorthAndTargets(cre: Cre) {
// 	let producers = getMyProducers();
// 	let sRtnP = getDecideSearchRtnNoArea(cre, producers);
// 	let costP = sRtnP.cost;
// 	let targetP = getTargetBySRtn(cre, sRtnP, producers);
// 	//
// 	let harvestables = getHarvables();
// 	let sRtnH = getDecideSearchRtnNoArea(cre, harvestables);
// 	let costH = sRtnH.cost;
// 	let targetH = getTargetBySRtn(cre, sRtnP, harvestables);
// 	//
// 	if (targetH) {
// 		if (MGR(targetH, spawn) <= 7) {
// 			// SA(cre,"costH+=20");
// 			costH += 20;
// 		}
// 	}
// 	// SA(cre,"targetH="+targetH);
// 	// SA(cre,"costP="+costP);
// 	// SA(cre,"MGR(targetH,spawn)="+MGR(targetH,spawn));
// 	// SA(cre,"costH="+costH);
// 	let costT = costP + costH;
// 	let worth = 1 / costT;
// 	return { worth: worth, targetP: targetP, targetH: targetH };
// }
/**the task used on harvester.Will auto pick drop when it moves too slow*/
export class HarvestTask extends Task_Cre {
  targetHarvable: Harvable;
  targetProducer: Producer;
  constructor(master: Cre, targetHarvable: Harvable, targetProducer: HasStore) {
    super(master);
    this.targetHarvable = targetHarvable;
    this.targetProducer = targetProducer;
  }
  withDrawMode() {
    const cre = this.master;
    SA(cre, "withDrawMode");
    if (cre.macro.withDrawTarget(this.targetHarvable)) {
      //if correct withdraw
      if (getTimeAfterFull(cre) <= 3) {
        //if walk time after full energy need less than 3 tick
        SA(cre, "quickly transToProducers");
        cre.macro.transToProducers();
      } else {
        //if over 3 tick
        SA(cre, "stop");
        cre.stop();
      }
    } else {
      SA(cre, "cre.MTJ(this.targetHarvable);");
      cre.MTJ(this.targetHarvable);
    }
  }
  loop_task() {
    const cre = this.master;
    SA(cre, "HarvestTask");
    if (
      !this.targetHarvable ||
      !this.targetProducer ||
      !live(this.targetHarvable)
    ) {
      SA(cre, "END HAVE TASK");
      this.end();
    }
    //if have not energy
    if (getEnergy(cre) === 0) {
      SA(cre, "no energy");
      //find around energy
      // let ress = getRess()
      // for (let r of ress) {
      // 	SA(r, "ress")
      // 	SA(r, "validRes(r)=" + validRes(r))
      // }
      // let frtn = eventList[tick - 1].find(i => i instanceof ResourceDropEvent)
      // SA(cre, "findRTN=" + frtn)
      // if (frtn) {
      // 	SA(cre, "coo " + COO((<ResourceDropEvent>frtn).pos))
      // }
      const targetResources = getRess().find(
        i => GR(i, cre) <= 1 && !validRes(i)
      );
      if (targetResources) {
        SA(cre, "with draw dropped resource");
        cre.macro.withDrawTarget(targetResources);
        cre.stop();
      } else {
        this.withDrawMode();
      }
      //if have energy
    } else {
      SA(cre, "have energy");
      let transTarget: Producer | StructureContainer;
      if (this.targetProducer === spawn && getFreeEnergy(spawn) === 0) {
        const spawnAroundFreeContainer = containers.find(
          i => GR(i, spawn) <= 1 && getFreeEnergy(i) > 0
        );
        if (spawnAroundFreeContainer) {
          transTarget = spawnAroundFreeContainer;
        } else {
          transTarget = this.targetProducer;
        }
      } else {
        transTarget = this.targetProducer;
      }
      const tRtn = cre.macro.transToTargetProducer(transTarget);
      const moveTimeTooMuch: boolean = cre.getMoveTime() > 2;
      if (tRtn) {
        //if trans success
        this.withDrawMode();
      } else if (moveTimeTooMuch) {
        //if trans not success
        SA(cre, "moveTimeTooMuch");
        cre.dropEnergy(); //drop it on ground
        setResourceDrop(cre);
        cre.MTJ(transTarget);
      } else {
        SA(cre, "normal move to " + id(transTarget));
        const sRtn = cre.getDecideSearchRtnByCre(transTarget);
        if (inMyBaseRan(cre)) {
          drawPoly(sRtn.path, 0.8, "#8822aa");
          SA(cre, "path " + S(sRtn.path));
          SA(cre, "incomplete " + sRtn.incomplete);
        }
        cre.MTJ(transTarget);
      }
    }
  }
}
/**harvester.Used to transport energy from harvables to producers*/
export const harvester: Role = new Role("harvester", harvesterJob);
export let harvesterNotFleeAtStart: boolean = false;
export function set_harvesterNotFleeAtStart(b: boolean) {
  harvesterNotFleeAtStart = b;
}
/**job of harvester.It will flee from threat enemies,find the fit harvable
 * and producer,new a HarvestTask when it hasn't.
 */
export function harvesterJob(cre: Cre) {
  if (!harvesterNotFleeAtStart && cre.battle.flee(5, 10)) {
    SA(cre, "flee");
    cre.dropEnergy();
    findTask(cre, HarvestTask)?.end();
  } else {
    SA(cre, "harve");
    const contDropScanRange = 20;
    const targetCont = getWildConts().find(
      i =>
        GR(i, cre) <= contDropScanRange &&
        getContWorth(i) > 0 &&
        getEnergy(i) > 0 &&
        cre.macro.reachableHarvable(i)
    );
    SA(cre, "targetCont=" + COO(targetCont));
    if (inResourceArea(cre) && targetCont) {
      dropCont(cre, targetCont);
      findTask(cre, HarvestTask)?.end();
    } else if (!findTask(cre, HarvestTask) || isMyTick(cre, 20)) {
      SA(cre, "scan fit harvable and producer");
      const targetHarvable = cre.macro.findFitHarvable();
      const targetProducer = cre.macro.findFitProducer();
      findTask(cre, HarvestTask)?.end();
      if (targetHarvable && targetProducer) {
        SA(cre, " new HarvestTask");
        new HarvestTask(cre, targetHarvable, targetProducer);
      }
    }
  }
}
/**drop the wild container */
function dropCont(cre: Cre, cont: Cont) {
  SA(cre, "dropCont");
  if (GR(cre, cont) <= 1) {
    cre.stop();
    if (getEnergy(cre) > 0) {
      cre.dropEnergy();
    } else {
      cre.macro.withDrawTarget(cont);
    }
  } else {
    cre.dropEnergy();
    cre.MTJ_follow(cont);
  }
}
