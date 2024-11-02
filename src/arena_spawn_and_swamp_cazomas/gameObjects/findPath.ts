import { CARRY, MOVE } from "game/constants";
import {
  CostMatrix,
  FindPathOpts,
  FindPathResult,
  searchPath,
} from "game/path-finder";
import { findClosestByRange } from "game/utils";
import { ct, et } from "../utils/CPU";
import {
  bottomY,
  getArea,
  isTerrainSwamp,
  leftBorder1,
  leftBorder2,
  midBorder,
  rightBorder1,
  rightBorder2,
  startGateUp,
  topY,
} from "../utils/game";
import { divide0, last, valid } from "../utils/JS";
import { GR, Pos, atPos, getRangePoss } from "../utils/Pos";
import {
  P,
  SA,
  drawLineComplex,
  drawLineLight,
  drawPolyLight,
} from "../utils/visual";
import { Cre, Task_Cre, calEventNumberCPUTime, isMyTick } from "./Cre";
import { isTerrainRoad } from "./CreTool";
import { blocked, getCapacity, getEnergy } from "./UnitTool";

export const defFindPathResult: FindPathResult = {
  path: [],
  ops: 0,
  cost: 0,
  incomplete: true,
};
export const moveBlockCostMatrix: CostMatrix = new CostMatrix();
/** search the closest path of multiple targets ,like findPath but will
 * calculate terrain cost by this creep
 */
export function searchPathByCost(
  cre: Cre,
  tar: Pos,
  useWorkerCost: boolean = true
): FindPathResult {
  let plainCost, swampCost;
  if (useWorkerCost && cre.onlyHasMoveAndCarry()) {
    plainCost = 1;
    swampCost = 2;
  } else {
    plainCost = getMoveTimeByTerrain(cre, false);
    swampCost = getMoveTimeByTerrain(cre, true);
  }
  return searchPath_noArea(cre, tar, undefined, plainCost, swampCost);
}
/** search the path to the target.
 * calculate terrain cost by this creep
 */
export function getDecideSearchRtnByCre(
  tar: Pos,
  op?: FindPathOpts | undefined
): FindPathResult {
  const ifWorker = this.master.onlyHasMoveAndCarry(); //if worker set 1 and 2
  let plainCost, swampCost;
  if (ifWorker) {
    plainCost = 1;
    swampCost = 2;
  } else {
    plainCost = this.master.getMoveTimeByTerrain(false);
    swampCost = this.master.getMoveTimeByTerrain(true);
  }
  let ops: FindPathOpts;
  if (op !== undefined) {
    ops = op;
    if (ops.plainCost === undefined) ops.plainCost = plainCost;
    if (ops.swampCost === undefined) ops.swampCost = swampCost;
  } else {
    ops = {
      plainCost: plainCost,
      swampCost: swampCost,
    };
  }
  const rtn: FindPathResult = getDecideSearchRtn(this.master, tar, ops);
  return rtn;
}
/** get move and fatigue number of a creep ,all pulling and bePulled will
 *  be calculate too
 */
export function getMoveAndFatigueNum(
  pullList: Cre[],
  extraEnergy: number = 0
): {
  moveNum: number;
  bodyNum: number;
  fatigueNum: number;
} {
  try {
    const pl = pullList;
    let moveNum = 0;
    let fatigueNum = 0;
    let bodyNum = 0;
    for (let tar of pl) {
      const tarBody = tar.master.body;
      if (tarBody) {
        const tarMoveNum = tar.getHealthyBodyParts(MOVE).length;
        const tarBodyNum = tarBody.filter(
          i => i.type !== MOVE && i.type !== CARRY
        ).length;
        const tarEnergy = Math.min(
          getEnergy(tar) + extraEnergy,
          getCapacity(tar)
        );
        const notEmptyCarryNum = Math.ceil(tarEnergy / 50);
        moveNum += tarMoveNum;
        const heavyBodyNum = tarBodyNum + notEmptyCarryNum;
        bodyNum += heavyBodyNum;
        if (isTerrainSwamp(tar)) {
          fatigueNum += 10 * heavyBodyNum;
        } else if (isTerrainRoad(tar)) {
          fatigueNum += 1 * heavyBodyNum;
        } else {
          fatigueNum += 2 * heavyBodyNum;
        }
      }
    }
    const rtn = {
      moveNum: moveNum,
      bodyNum: bodyNum,
      fatigueNum: fatigueNum,
    };
    return rtn;
  } catch (ex) {
    P(ex);
    throw new ReferenceError();
  }
}
export function getMoveTimeByTerrain(
  pullList: Cre[],
  isSwamp: boolean,
  isRoad: boolean = false,
  extraEnergy: number = 0
): number {
  const mb = getMoveAndFatigueNum(pullList, extraEnergy);
  const moveNum = mb.moveNum;
  const bodyNum = mb.bodyNum;
  let fatigueMax: number;
  if (isRoad) fatigueMax = bodyNum;
  else if (isSwamp) fatigueMax = bodyNum * 10;
  else fatigueMax = bodyNum * 2;
  const time = Math.max(
    1,
    Math.ceil(divide0(fatigueMax, 2 * moveNum, Infinity))
  );
  return time;
}
export function getMoveTime(extraEnergy: number = 0): number {
  return this.getMoveTimeByTerrain(
    isTerrainSwamp(this),
    isTerrainRoad(this),
    extraEnergy
  );
}
export function getMoveTime_general(): number {
  const timeOnTerrain = this.getMoveTimeByTerrain(false);
  const timeOnSawmp = this.getMoveTimeByTerrain(true);
  return 0.5 * timeOnTerrain + 0.5 * timeOnSawmp;
}
export function getSpeed(): number {
  return 1 / this.getMoveTime();
}
export function getSpeed_general(): number {
  return 1 / this.getMoveTime_general();
}
export function isFullSpeed(): boolean {
  return this.getMoveTime() === 1;
}
/**
 * a task used to move
 */
export class MoveTask extends Task_Cre {
  /** target position */
  tar: Pos;
  /** memoryed path*/
  path: Pos[];
  constructor(master: Cre, tar: Pos, path: Pos[] = []) {
    super(master);
    this.tar = tar;
    this.path = path;
    //cancel old task
    let pt = this.master.tasks.find(
      task => task instanceof MoveTask && task != this
    );
    if (pt) pt.end();
  }
  loop_task(): void {
    // SA(this.master, "MoveTask")
    drawLineLight(this.master, this.tar);
    if (this.pause) return;
    if (this.path.length > 0) {
      let tempTar: Pos = this.path[0];
      drawLineComplex(this.master, tempTar, 0.75, "#777777");
      // SA(tempTar,"moveTo tempTar="+COO(tempTar))
      this.master.crePathFinder?.moveTo_Basic(tempTar);
      this.master.wantMove = new Event_C();
      //
      if (GR(this.master, tempTar) <= 1) {
        this.path.shift();
      }
    } else {
      this.end();
    }
  }
  end(): void {
    super.end();
  }
}
/**
 * get the target by {@link FindPathResult},it will return the closest target of the last position of the path
 */
export function getTargetBySRtn<T extends Pos>(
  ori: Pos,
  sRtn: FindPathResult,
  tars: searchPathTarOOA<T>
): T | undefined {
  //ERR
  // SA(cre,"sRtn="+S(sRtn))
  if (valid(sRtn)) {
    // SA(cre,"sRtn.path="+S(sRtn.path))
    if (sRtn.path) {
      // SA(cre,"sRtn.path.length="+S(sRtn.path.length))
      let newOri: Pos | undefined = ori;
      if (sRtn.path.length > 0) {
        newOri = last(sRtn.path);
      }
      if (newOri) {
        let target: T;
        if (Array.isArray(tars)) {
          const tars2 = <(T | { pos: T; range: number })[]>tars;
          target = findClosestByRange(ori, <T[]>tars2);
        } else target = <T>tars;
        return target;
      }
    }
  }
  return;
}

export function getDecideSearchRtn(
  ori: Pos,
  tar: Pos,
  op?: FindPathOpts | undefined
): FindPathResult {
  let newTar: Pos;
  newTar = getNewTarByArea(ori, tar);
  let SR1 = searchPath_noArea(ori, newTar, op);
  let SR2: FindPathResult | undefined;
  let SR3: FindPathResult | undefined;
  // SA(ori,"area0")
  if (!atPos(newTar, tar)) {
    // SA(ori,"area1")
    let newTar2 = getNewTarByArea(newTar, tar);
    SR2 = searchPath_noArea(newTar, newTar2, op);
    if (!atPos(newTar2, tar)) {
      // SA(ori,"area2")
      SR3 = searchPath_noArea(newTar2, tar, op);
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
  let rtn = {
    path: newPath,
    ops: newOps,
    cost: newCost,
    incomplete: newIncomplete,
  };
  return rtn;
}

/**
 * search the path do not use area will use the default search options by
 * {@link getStandardOps} and `CostMatrix` of {@link moveMatrix}
 */
export function searchPath_noArea(
  ori: Pos,
  tar: Pos,
  costMatrix: CostMatrix | undefined = undefined,
  plainCost: number,
  swampCost: number
): FindPathResult {
  const rtn = searchPath(ori, tar, {
    costMatrix: costMatrix,
    plainCost: plainCost,
    swampCost: swampCost,
    maxOps: 1000,
  });
  drawPolyLight(rtn.path);
  return rtn;
}
export function searchPath_flee(
  ori: Pos,
  tar: Pos,
  range: number,
  costMatrix: CostMatrix | undefined = undefined,
  plainCost: number,
  swampCost: number
): FindPathResult {
  const rtn = searchPath(
    ori,
    { pos: tar, range: range },
    {
      flee: true,
      costMatrix: costMatrix,
      plainCost: plainCost,
      swampCost: swampCost,
      maxOps: 2000,
    }
  );
  drawPolyLight(rtn.path);
  return rtn;
}
/**
 * path len from `ori` to `tar`
 */
export function pathLen(ori: Pos, tar: Pos) {
  let p = getDecideSearchRtn(ori, tar);
  if (p) {
    return p.path.length;
  } else return Infinity;
}

/**
 * get the step target from cre to tar,if cre is your spawn and tar is enemy's spawn
 * that it will search path to the first gate ,then the next gate ,and then search to
 * the enemy spawn
 */
export function getNewTarByArea(cre: Pos, tar: Pos) {
  let newTar = tar;
  let creArea = getArea(cre, leftBorder1, rightBorder2, midBorder);
  let tarArea = getArea(tar, leftBorder1, rightBorder2, midBorder);
  //
  let top = topY;
  let bottom = bottomY;
  if (creArea === "left" && tarArea === "right") {
    //go left top
    if (startGateUp) newTar = { x: leftBorder2, y: top };
    else newTar = { x: leftBorder2, y: bottom };
  } else if (creArea === "right" && tarArea === "left") {
    //go right bottom
    if (startGateUp) newTar = { x: rightBorder1, y: top };
    else newTar = { x: rightBorder1, y: bottom };
  } else if (creArea === "left" && tarArea === "top")
    newTar = { x: leftBorder2, y: top };
  else if (creArea === "top" && tarArea === "left")
    newTar = { x: leftBorder1, y: top };
  else if (creArea === "left" && tarArea === "bottom")
    newTar = { x: leftBorder2, y: bottom };
  else if (creArea === "bottom" && tarArea === "left")
    newTar = { x: leftBorder1, y: bottom };
  else if (creArea === "right" && tarArea === "bottom")
    newTar = { x: rightBorder1, y: bottom };
  else if (creArea === "bottom" && tarArea === "right")
    newTar = { x: rightBorder2, y: bottom };
  else if (creArea === "right" && tarArea === "top")
    newTar = { x: rightBorder1, y: top };
  else if (creArea === "top" && tarArea === "right")
    newTar = { x: rightBorder2, y: top };
  drawLineComplex(cre, newTar, 0.25, "#222222");
  return newTar;
}
/** move to a position ,will findPath every `findPathStep` ticks*/
export class FindPathAndMoveTask extends MoveTask {
  findPathStep: number;
  op: FindPathOpts | undefined;
  /** the temparary target ,it will reFindPath if close to it*/
  tempTar: Pos;
  /** default `findPathStep` */
  constructor(
    master: Cre,
    tar: Pos,
    step: number = getMoveStepDef(master),
    op?: FindPathOpts | undefined
  ) {
    super(master, tar);
    this.op = op;
    this.path = this.findPath_task(master, tar);
    //for initialize
    if (this.path.length > 0) {
      let lp = last(this.path);
      if (lp) {
        this.tempTar = lp;
      } else {
        this.tempTar = tar;
      }
    } else this.tempTar = tar;
    //
    this.findPathStep = step;
    // SA(master,"pathLen="+this.path.length)
    // drawPoly(this.path,1,"#aaffaa")
  }
  loop_task(): void {
    let st = ct();
    // SA(this.master, "findPath loop")
    if (!this.tar) {
      this.end();
    }
    if (
      isMyTick(this.master, this.findPathStep) ||
      GR(this.tempTar, this.master) <= 1 ||
      GR(this.tar, this.master) <= 1 ||
      (this.path.length > 0 && blocked(this.path[0]))
    ) {
      this.path = this.findPath_task(this.master, this.tar);
    }
    super.loop_task();
    let t = et(st);
    if (this.master.role) calEventNumberCPUTime(this.master.role, t, false);
  }
  findPath_task(master: Cre, tar: Pos): Pos[] {
    SA(this.master, "findPath_task");
    const sRtn: FindPathResult = master.crePathFinder
      ? master.crePathFinder.getDecideSearchRtnByCre(this.tar, this.op)
      : defFindPathResult;
    const path: Pos[] = sRtn.path;
    if (path.length > 0) {
      const lp = last(path);
      if (lp) {
        this.tempTar = lp;
      } else {
        this.tempTar = tar;
      }
    } else this.tempTar = tar;
    return path;
  }
}
// //PATH FINDER
// /** searchPath target*/
// export type searchPathTarOOA<T extends Pos> =
//   | T
//   | { pos: T; range: number }
//   | (T | { pos: T; range: number })[];

export function aroundBlock(pos: Pos) {
  //if has no empty around
  return getRangePoss(pos, 1).find(i => !blocked(i)) === undefined;
}
export function getMoveStepDef(cre: Cre): number {
  return 10 * cre.getMoveTime();
}
