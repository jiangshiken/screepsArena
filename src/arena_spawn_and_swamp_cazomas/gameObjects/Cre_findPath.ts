import { CARRY, MOVE } from "game/constants";
import { CostMatrix, FindPathResult, searchPath } from "game/path-finder";
import { getDirection } from "game/utils";
import { Event_ori } from "../utils/Event";
import {
  Area,
  Y_bottomGate,
  Y_topGate,
  area_bottom,
  area_left,
  area_right,
  area_top,
  border_L1,
  border_L2,
  border_R1,
  border_R2,
  border_mid,
  getArea,
  isTerrainSwamp,
} from "../utils/game";
import { divide0 } from "../utils/JS";
import { Adj, COO, Pos, Pos_C, atPos } from "../utils/Pos";
import { ERR } from "../utils/print";
import { SA, drawLineComplex, drawPoly, drawPolyLight } from "../utils/visual";
import { Cre } from "./Cre";
import { moveBlockCostMatrix_setBlock } from "./Cre_move";
import { PullEvent } from "./CreTool";
import {
  getCapacity,
  getEnergy,
  isTerrainRoad,
  moveBlockCostMatrix,
} from "./UnitTool";
export const std_maxOps = 1000;
export type type_PSC_Cre = type_PSC | Cre;
export type type_PSC = { plainCost: number; swampCost: number };
export const def_plainCost = 1;
export const def_swampCost = 3;
export const def_PSC = { plainCost: def_plainCost, swampCost: def_swampCost };
export type type_MBF = {
  moveNum: number;
  bodyNum: number;
  fatigueNum: number;
};

export const def_timeOnPlain = 0.6;
export const def_timeOnSwamp = 0.4;
export const def_stepTime = 10;
export class Cre_findPath extends Cre {
  startGateUp: boolean | undefined;
  pullEvent: PullEvent | undefined; //get cre that pulled by this
  bePulledEvent: PullEvent | undefined; //get cre that pull this
  highPriorityMoveTaskEvent: Event_ori | undefined;
  /** pull  */
  normalPull(tar: Cre_findPath): boolean {
    if (Adj(this, tar)) {
      //draw green line
      drawLineComplex(this, tar, 0.7, "#00ff22");
      //pull
      this.master.pull(tar.master);
      //set Event
      const pullEve = new PullEvent(this, tar);
      this.pullEvent = pullEve;
      tar.bePulledEvent = pullEve;
      //tar move this
      SA(tar, "PMTD " + COO(this));
      tar.moveTo_direct(this);
      tar.highPriorityMoveTaskEvent = pullEve;
      return true;
    } else return false;
  }
  moveTo_direct(tar: Pos) {
    SA(this, "DirMove");
    if (atPos(this, tar)) {
      ERR("ERR dirMove atPos");
    } else if (Adj(this, tar)) {
      moveBlockCostMatrix_setBlock(tar);
      const dx = tar.x - this.x;
      const dy = tar.y - this.y;
      const direc = getDirection(dx, dy);
      SA(this, "" + direc);
      this.master.move(direc);
    } else {
      ERR("ERR dirMove");
    }
  }
  getMoveAndFatigueNum(
    extraEnergy: number = 0,
    purePlain: boolean = false,
    pureSwamp: boolean = false,
    terrainPos: Pos | undefined = undefined
  ): type_MBF {
    const tarBody = this.master.body;
    if (tarBody) {
      const moveNum = this.getHealthyBodyParts(MOVE).length;
      const tarBodyNum = tarBody.filter(
        i => i.type !== MOVE && i.type !== CARRY
      ).length;
      const tarEnergy = Math.min(
        getEnergy(this) + extraEnergy,
        getCapacity(this)
      );
      const notEmptyCarryNum = Math.ceil(tarEnergy / 50);
      const bodyNum = tarBodyNum + notEmptyCarryNum;
      let fatigueNum;
      if (pureSwamp) {
        fatigueNum = 10 * bodyNum;
      } else if (purePlain) {
        fatigueNum = 2 * bodyNum;
      } else {
        let scanPos;
        if (terrainPos !== undefined) {
          scanPos = terrainPos;
        } else {
          scanPos = this;
        }
        if (isTerrainSwamp(scanPos)) {
          fatigueNum = 10 * bodyNum;
        } else if (isTerrainRoad(scanPos)) {
          fatigueNum = 1 * bodyNum;
        } else {
          fatigueNum = 2 * bodyNum;
        }
      }
      return {
        moveNum: moveNum,
        bodyNum: bodyNum,
        fatigueNum: fatigueNum,
      };
    } else {
      ERR("no body");
      return {
        moveNum: 0,
        bodyNum: 0,
        fatigueNum: 0,
      };
    }
  }
  /** search the closest path of multiple targets ,like findPath but will
   * calculate terrain cost by this creep
   */
  searchPathByCreCost(tar: Pos, useWorkerCost: boolean = true): FindPathResult {
    let plainCost, swampCost;
    if (useWorkerCost && this.onlyHasMoveAndCarry()) {
      plainCost = 1;
      swampCost = 2;
    } else {
      plainCost = this.getMoveTime(0, true);
      swampCost = this.getMoveTime(0, false, true);
    }
    return searchPath_noArea(
      this,
      tar,
      undefined,
      getPSC(plainCost, swampCost)
    );
  }
  getMoveTime(
    extraEnergy: number = 0,
    purePlain: boolean = false,
    pureSwamp: boolean = false
  ): number {
    const mb = this.getMoveAndFatigueNum(extraEnergy, purePlain, pureSwamp);
    const time = Math.ceil(divide0(mb.fatigueNum, 2 * mb.moveNum, Infinity));
    return Math.max(1, time);
  }
  getMoveTime_general(): number {
    const timeOnPlain = this.getMoveTime(0, true);
    const timeOnSwamp = this.getMoveTime(0, false, true);
    return def_timeOnPlain * timeOnPlain + def_timeOnSwamp * timeOnSwamp;
  }
  getSpeed(): number {
    return 1 / this.getMoveTime();
  }
  getSpeed_general(): number {
    return 1 / this.getMoveTime_general();
  }
  isFullSpeed(): boolean {
    return this.getMoveTime() === 1;
  }
  getMoveStepDef(): number {
    return def_stepTime * this.getMoveTime();
  }
}

export function getPSC(plainCost: number, swampCost: number): type_PSC {
  return { plainCost: plainCost, swampCost: swampCost };
}

export function searchPath_area(
  ori: Pos,
  tar: Pos,
  costMatrix: CostMatrix | undefined = moveBlockCostMatrix,
  PSC: type_PSC = def_PSC
): FindPathResult {
  // drawLineComplex(ori, tar, 1, "#22ffff", dashed);
  const newTar: Pos = getNewTarByArea(ori, tar);
  let SR1 = searchPath_noArea(ori, newTar, costMatrix, PSC);
  let SR2: FindPathResult | undefined;
  let SR3: FindPathResult | undefined;
  if (!atPos(newTar, tar)) {
    const newTar2 = getNewTarByArea(newTar, tar);
    SR2 = searchPath_noArea(newTar, newTar2, costMatrix, PSC);
    if (!atPos(newTar2, tar)) {
      SR3 = searchPath_noArea(newTar2, tar, costMatrix, PSC);
    }
  }
  let newPath: Pos[] = SR1.path;
  let newOps: number = SR1.ops;
  let newCost: number = SR1.cost;
  let newIncomplete: boolean = SR1.incomplete;
  if (SR2) {
    SR2.path.shift(); //remove first ele
    newPath = newPath.concat(SR2.path);
    newOps += SR2.ops;
    newCost += SR2.cost;
    newIncomplete = newIncomplete && SR2.incomplete;
  }
  if (SR3) {
    SR3.path.shift(); //remove first ele
    newPath = newPath.concat(SR3.path);
    newOps += SR3.ops;
    newCost += SR3.cost;
    newIncomplete = newIncomplete && SR3.incomplete;
  }
  drawPoly(newPath, 0.7, "#99ff99");
  return {
    path: newPath,
    ops: newOps,
    cost: newCost,
    incomplete: newIncomplete,
  };
}

/**
 * search the path do not use area will use the default search options by
 * {@link getStandardOps} and `CostMatrix` of {@link moveMatrix}
 */
export function searchPath_noArea(
  ori: Pos,
  tar: Pos,
  costMatrix: CostMatrix | undefined = moveBlockCostMatrix,
  PSC: type_PSC = def_PSC
): FindPathResult {
  const rtn = searchPath(ori, tar, {
    costMatrix: costMatrix,
    plainCost: PSC.plainCost,
    swampCost: PSC.swampCost,
    maxOps: std_maxOps,
  });
  drawPolyLight(rtn.path);
  return rtn;
}
export function searchPath_flee(
  ori: Pos,
  tars: Pos[],
  range: number,
  costMatrix: CostMatrix | undefined = moveBlockCostMatrix,
  PSC: type_PSC = def_PSC
): FindPathResult {
  const tarRangeArr = tars.map(i => {
    return { pos: i, range: range };
  });
  const rtn = searchPath(ori, tarRangeArr, {
    flee: true,
    costMatrix: costMatrix,
    plainCost: PSC.plainCost,
    swampCost: PSC.swampCost,
    maxOps: 2000,
  });
  drawPolyLight(rtn.path);
  return rtn;
}
/**
 * path len from `ori` to `tar`
 */
export function pathLen(ori: Pos, tar: Pos) {
  const p = searchPath_area(ori, tar);
  if (p) {
    return p.path.length;
  } else return Infinity;
}
export function getArea_std(pos: Pos): Area {
  return getArea(pos, border_L1, border_R2, border_mid);
}
export let costLT_RT: number;
export let costLT_RB: number;
export let costLB_RT: number;
export let costLB_RB: number;
export const gate_LT = new Pos_C(border_L1, Y_topGate);
export const gate_LB = new Pos_C(border_L1, Y_bottomGate);
export const gate_RT = new Pos_C(border_R1, Y_topGate);
export const gate_RB = new Pos_C(border_R1, Y_bottomGate);
export function initGateCost(): void {
  costLT_RT = searchPath(gate_LT, gate_RT).cost;
  costLT_RB = searchPath(gate_LT, gate_RB).cost;
  costLB_RT = searchPath(gate_LB, gate_RT).cost;
  costLB_RB = searchPath(gate_LB, gate_RB).cost;
}
export function getStartGate(left: boolean, ori: Pos, tar: Pos): boolean {
  const costOri_T = searchPath(ori, left ? gate_LT : gate_RT).cost;
  const costOri_B = searchPath(ori, left ? gate_LB : gate_RB).cost;
  const costTar_T = searchPath(tar, left ? gate_RT : gate_LT).cost;
  const costTar_B = searchPath(tar, left ? gate_RB : gate_LB).cost;
  const startGate_T_line1 = costOri_T + costLT_RT + costTar_T;
  const startGate_T_line2 =
    costOri_T + (left ? costLT_RB : costLB_RT) + costTar_B;
  const startGate_T = Math.min(startGate_T_line1, startGate_T_line2);
  const startGate_B_line1 = costOri_B + costLB_RB + costTar_B;
  const startGate_B_line2 =
    costOri_B + (left ? costLB_RT : costLT_RB) + costTar_T;
  const startGate_B = Math.min(startGate_B_line1, startGate_B_line2);
  return startGate_T < startGate_B;
}
/**
 * get the step target from cre to tar,if cre is your spawn and tar is enemy's spawn
 * that it will search path to the first gate ,then the next gate ,and then search to
 * the enemy spawn
 */
export function getNewTarByArea(cre: Pos, tar: Pos): Pos {
  let newTar = tar;
  const creArea = getArea_std(cre);
  const tarArea = getArea_std(tar);
  let current_startGateUp = undefined;
  if (cre instanceof Cre_findPath && cre.startGateUp !== undefined) {
    SA(cre, "SG1");
    current_startGateUp = cre.startGateUp;
  }
  const yAxis_top = Y_topGate;
  const yAxis_bottom = Y_bottomGate;
  if (creArea === area_left && tarArea === area_right) {
    //go left top
    // SA(cre, "LR");
    const gateUp = current_startGateUp
      ? current_startGateUp
      : getStartGate(true, cre, tar);
    if (gateUp) newTar = new Pos_C(border_L2, yAxis_top);
    else newTar = new Pos_C(border_L2, yAxis_bottom);
  } else if (creArea === area_right && tarArea === area_left) {
    //go right bottom
    // SA(cre, "RL");
    const gateUp = current_startGateUp
      ? current_startGateUp
      : getStartGate(false, cre, tar);
    if (gateUp) newTar = new Pos_C(border_R1, yAxis_top);
    else newTar = new Pos_C(border_R1, yAxis_bottom);
  } else if (creArea === area_right && tarArea === area_top) {
    // SA(cre, "RT");
    newTar = new Pos_C(border_L2, yAxis_top);
  } else if (creArea === area_top && tarArea === area_left) {
    // SA(cre, "TL");
    newTar = new Pos_C(border_L1, yAxis_top);
  } else if (creArea === area_left && tarArea === area_bottom) {
    // SA(cre, "LB");
    newTar = new Pos_C(border_L2, yAxis_bottom);
  } else if (creArea === area_bottom && tarArea === area_left) {
    // SA(cre, "BL");
    newTar = new Pos_C(border_L1, yAxis_bottom);
  } else if (creArea === area_right && tarArea === area_bottom) {
    // SA(cre, "RB");
    newTar = new Pos_C(border_R1, yAxis_bottom);
  } else if (creArea === area_bottom && tarArea === area_right) {
    // SA(cre, "BR");
    newTar = new Pos_C(border_R2, yAxis_bottom);
  } else if (creArea === area_right && tarArea === area_top) {
    // SA(cre, "RT");
    newTar = new Pos_C(border_R1, yAxis_top);
  } else if (creArea === area_top && tarArea === area_right) {
    // SA(cre, "TR");
    newTar = new Pos_C(border_R2, yAxis_top);
  }
  drawLineComplex(cre, newTar, 0.25, "#222222");
  return newTar;
}
