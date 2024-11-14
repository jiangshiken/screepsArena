import { createConstructionSite } from "game";
import { StructureRampart } from "game/prototypes";
import { getTicks } from "game/utils";

import { best } from "../utils/JS";
import { atPos, Pos } from "../utils/Pos";
import { SA } from "../utils/visual";
import { S } from "./export";
import { GameObj } from "./GameObj";
import { CS, CSs, myCSs } from "./GameObjectInitialize";
import { findGO_lambda } from "./overallMap";
import { inMyRampart } from "./ramparts";

/**has a construction site of specific type at a pos*/
export function hasConstructionSiteByType(pos: Pos, type: any): boolean {
  return (
    CSs.find(
      i => i.my && atPos(i, pos) && i.master.structure instanceof type
    ) !== undefined
  );
}
/**has a construction site of rampart at a pos*/
export function hasConstructionSite_rampart(pos: Pos): boolean {
  return hasConstructionSiteByType(pos, StructureRampart);
}
/**has a construction site of not rampart at a pos*/
export function hasConstructionSite_notRampart(pos: Pos): boolean {
  return (
    CSs.find(
      i =>
        i.my &&
        atPos(i, pos) &&
        !(i.master.structure instanceof StructureRampart)
    ) !== undefined
  );
}
/**has a construction site at a pos*/
export function hasConstructionSite(pos: Pos): boolean {
  return CSs.find(i => atPos(i, pos)) !== undefined;
}
/** same as createCS ,but wait CS num<9*/
export function supplyCS(
  pos: Pos,
  type: any,
  worth: number = 1,
  useDecay: boolean = false,
  allowMultiRampart: boolean = false
): boolean {
  if (
    !findGO_lambda(
      pos,
      i => i instanceof GameObj && i.master instanceof type
    ) ||
    (allowMultiRampart && type === StructureRampart)
  ) {
    return createCS_wait(pos, type, worth, useDecay, allowMultiRampart);
  } else {
    return false;
  }
}
const csLimitBias = 9;
/** same as createCS ,but wait CS num<9*/
export function createCS_wait(
  pos: Pos,
  type: any,
  worth: number = 1,
  useDecay: boolean = false,
  allowMultiRampart: boolean = false
): boolean {
  if (myCSs.length < csLimitBias) {
    return createCS(pos, type, worth, useDecay, allowMultiRampart);
  } else {
    return false;
  }
}
/**
 * create a {@link ConstructionSite} ,if has the same `ConstructionSite`
 * at the position ,it will not work.rampart and no rampart will be seperate,
 * that you can create an rampart `ConstructionSite` and a no rampart `ConstructionSite`
 * at same position at most.if the number of `ConstructionSite` on this map is over 10,
 * it will remove one of it of the lest of the {@link CS}
 */
export function createCS(
  pos: Pos,
  type: any,
  worth: number = 1,
  useDecay: boolean = false,
  allowMultiRampart: boolean = false
): boolean {
  //if can create CS
  SA(pos, "createCS:" + S(type));
  let ifCreate: boolean;
  if (type === StructureRampart) {
    if (inMyRampart(pos)) {
      ifCreate = false;
    } else {
      if (allowMultiRampart) {
        ifCreate = true;
      } else {
        ifCreate = !hasConstructionSite_rampart(pos);
      }
    }
  } else {
    ifCreate = !hasConstructionSite_notRampart(pos);
  }
  if (ifCreate) {
    if (myCSs.length >= csLimitBias) {
      //cancel other ,find the min worth of cs on the map and remove it
      const minWorthCS = best(myCSs, myCS => {
        const basicBonus = myCS.worth;
        const progressRateBonus = 1 + 2 * myCS.progressRate;
        const decayReduce = myCS.useDecay ? getCSDecayReduce(myCS) : 1;
        return basicBonus * progressRateBonus * decayReduce;
      });
      if (minWorthCS) {
        minWorthCS.master.remove();
      }
    }
    SA(pos, "create cons");
    const rtn = createConstructionSite(pos.x, pos.y, type);
    SA(pos, "rtnErr=" + rtn.error);
    SA(pos, "rtnObj=" + S(rtn.object));
    const rtnObj = rtn.object;
    if (rtn && rtnObj) {
      (<any>rtnObj).useDecay = useDecay;
      (<any>rtnObj).worth = worth;
      return true;
    }
  }
  return false;
}
/**
 * if not build {@link CS} a mount of time ,it will get decay of `worth`
 */
export function getCSDecayReduce(cs: CS) {
  const decay_event = cs.decayEvent;
  if (decay_event === undefined) {
    SA(cs, "ERR decayEvent undefined");
    return 1 / 10;
  } else {
    const passTime: number = getTicks() - decay_event.invokeTick;
    return 1 / (1 + 0.01 * passTime);
  }
}
/**
 * get the {@link CS} that is the max `worth`
 */
export function getMaxWorthCSS(css: CS[]): CS | undefined {
  return best(css, i => i.worth);
}
