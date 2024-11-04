import { createConstructionSite } from "game";
import { ConstructionSite, StructureRampart } from "game/prototypes";
import { getTicks } from "game/utils";

import { Event } from "../utils/Event";
import { S } from "../utils/export";
import { best, divide0, invalid } from "../utils/JS";
import { atPos, COO, HasPos, Pos } from "../utils/Pos";
import { drawLineComplex, SA } from "../utils/visual";
import { GameObj } from "./GameObj";
import { CSs, isMyGO, isOppoGO, myCSs } from "./GameObjectInitialize";
import { HasMy } from "./HasMy";
import { findGO } from "./overallMap";
import { inMyRampart } from "./ramparts";

// export let CSs: CS[] = []
/** extend of ConstructionSite */
export class CS extends GameObj implements HasPos, HasMy {
  readonly master: ConstructionSite;
  decayEvent: Event | undefined;
  useDecay: boolean = false;
  wt: number = 0;
  constructor(cons: ConstructionSite) {
    super(cons);
    this.master = cons;
  }
  get my() {
    return isMyGO(this.master);
  }
  get oppo() {
    return isOppoGO(this.master);
  }
  get x(): number {
    return this.master.x;
  }
  get y(): number {
    return this.master.y;
  }
  /**the progress of a construction site*/
  get progress(): number {
    if (this.master.progress) {
      return this.master.progress;
    } else {
      return 0;
    }
  }
  /**the progress total of a construction site*/
  get progressTotal(): number {
    if (this.master.progressTotal) {
      return this.master.progressTotal;
    } else {
      return 0;
    }
  }
  /**
   * get the progress rate of a `ConstructionSite`
   */
  get progressRate(): number {
    return divide0(this.progress, this.progressTotal);
  }
}
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
/**init an action Sequence*/
export function initActionSequence(...actions: (() => void)[]): {
  complete: boolean;
  action: () => void;
}[] {
  return actions.map(i => {
    return { complete: false, action: i };
  });
}
/**create CS by action Sequence.If you call it every tick,
 * it will trigger the action(almost createCS()) one by one.
 * Every action will only trigger once.If your constructionSites
 * is over 8 ,the action will be pass.
 */
export function createCSInSequence(
  actionTasks: {
    complete: boolean;
    action: () => void;
  }[]
) {
  for (let actionTask of actionTasks) {
    if (!actionTask.complete) {
      if (myCSs.length <= 8) {
        actionTask.action();
        actionTask.complete = true;
        break;
      }
    }
  }
}
/** same as createCS ,but wait CS num<9*/
export function supplyCS(
  pos: Pos,
  type: any,
  worth: number = 1,
  useDecay: boolean = false,
  allowMultiRampart: boolean = false,
  print: boolean = false
): boolean {
  if (print) {
    SA(pos, "supplyCS " + type);
  }
  if (!findGO(pos, type) || (allowMultiRampart && type === StructureRampart)) {
    if (print) {
      SA(pos, "createCS_wait");
    }
    return createCS_wait(pos, type, worth, useDecay, allowMultiRampart, print);
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
  allowMultiRampart: boolean = false,
  print: boolean = false
): boolean {
  if (myCSs.length < csLimitBias) {
    if (print) {
      SA(pos, "createCS");
    }
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
  let b: boolean;
  if (type === StructureRampart) {
    if (inMyRampart(pos)) {
      b = false;
    } else {
      if (allowMultiRampart) {
        b = true;
      } else {
        b = !hasConstructionSite_rampart(pos);
      }
    }
  } else {
    b = !hasConstructionSite_notRampart(pos);
  }
  if (b) {
    if (myCSs.length >= csLimitBias) {
      //cancel other ,find the min worth of cs on the map and remove it
      let minWorth = Infinity;
      let minCS: CS = <CS>myCSs[0];
      for (let cs of myCSs) {
        const myCS = <CS>cs;
        let csw: number;
        if (invalid(myCS)) csw = 0;
        else csw = myCS.wt;
        //progressRate bonus
        const pr = myCS.progressRate; //0~1
        const prBonus = 1 + 2 * pr;
        csw *= prBonus;
        //decay reduce
        if (myCS.useDecay) {
          let dr = getCSDecayReduce(myCS);
          csw *= dr;
        }
        if (csw < minWorth) {
          minWorth = csw;
          minCS = myCS;
        }
      }
      if (minCS) {
        drawLineComplex(pos, minCS, 0.8, "#aabbff");
        SA(minCS, "remove min worth CS by action " + COO(pos) + " " + type);
        minCS.master.remove();
      }
    }
    SA(pos, "create cons");
    let rtn = createConstructionSite(pos.x, pos.y, type);
    SA(pos, "rtnErr=" + rtn.error);
    SA(pos, "rtnObj=" + S(rtn.object));
    let rtnObj: CS = <CS>(<any>rtn.object);
    if (rtn && rtnObj) {
      rtnObj.decayEvent = new Event();
      rtnObj.useDecay = useDecay;
      rtnObj.wt = worth;
      return true;
    }
  }
  return false;
}
/**
 * if not build {@link CS} a mount of time ,it will get decay of `worth`
 */
export function getCSDecayReduce(cs: CS) {
  let e = cs.decayEvent;
  let rtn;
  if (e === undefined) {
    SA(cs, "ERR decayEvent undefined");
    rtn = 1 / 10;
  } else {
    let passTime: number = getTicks() - e.invokeTick;
    rtn = 1 / (1 + 0.01 * passTime);
  }
  return rtn;
}
/**
 * get the {@link CS} that is the max `worth`
 */
export function getMaxWorthCSS(css: CS[]): CS | undefined {
  return best(css, i => i.wt);
}
