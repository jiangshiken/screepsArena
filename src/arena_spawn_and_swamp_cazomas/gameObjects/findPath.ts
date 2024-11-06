import { CARRY, MOVE } from "game/constants";
import { CostMatrix, FindPathResult, searchPath } from "game/path-finder";
import {
  area_bottom,
  area_left,
  area_right,
  area_top,
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
import { divide0 } from "../utils/JS";
import { Pos, Pos_C, atPos } from "../utils/Pos";
import { P, drawLineComplex, drawPoly, drawPolyLight } from "../utils/visual";
import { Cre } from "./Cre";
import { isTerrainRoad } from "./CreCommands";
import { getCapacity, getEnergy, moveBlockCostMatrix } from "./UnitTool";

/** search the closest path of multiple targets ,like findPath but will
 * calculate terrain cost by this creep
 */
export function searchPathByCreCost(
  cre: Cre,
  tar: Pos,
  useWorkerCost: boolean = true
): FindPathResult {
  let plainCost, swampCost;
  if (useWorkerCost && cre.onlyHasMoveAndCarry()) {
    plainCost = 1;
    swampCost = 2;
  } else {
    plainCost = getMoveTimeByTerrain([cre], 0, true);
    swampCost = getMoveTimeByTerrain([cre], 0, false, true);
  }
  return searchPath_noArea(cre, tar, undefined, plainCost, swampCost);
}
export function getMoveAndFatigueNum_single(
  cre: Cre,
  extraEnergy: number = 0,
  purePlain: boolean = false,
  pureSwamp: boolean = false,
  terrainPos: Pos | undefined = undefined
): {
  moveNum: number;
  bodyNum: number;
  fatigueNum: number;
} {
  const tarBody = cre.master.body;
  if (tarBody) {
    const moveNum = cre.getHealthyBodyParts(MOVE).length;
    const tarBodyNum = tarBody.filter(
      i => i.type !== MOVE && i.type !== CARRY
    ).length;
    const tarEnergy = Math.min(getEnergy(cre) + extraEnergy, getCapacity(cre));
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
        scanPos = cre;
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
    return {
      moveNum: 0,
      bodyNum: 0,
      fatigueNum: 0,
    };
  }
}
/** get move and fatigue number of a creep ,all pulling and bePulled will
 *  be calculate too
 */
export function getMoveAndFatigueNum(
  pullList: Cre[],
  extraEnergy: number = 0,
  purePlain: boolean = false,
  pureSwamp: boolean = false
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
      const mfRtn = getMoveAndFatigueNum_single(
        tar,
        extraEnergy,
        purePlain,
        pureSwamp
      );
      moveNum += mfRtn.moveNum;
      bodyNum += mfRtn.bodyNum;
      fatigueNum += mfRtn.fatigueNum;
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
  extraEnergy: number = 0,
  purePlain: boolean = false,
  pureSwamp: boolean = false
): number {
  const mb = getMoveAndFatigueNum(pullList, extraEnergy, purePlain, pureSwamp);
  const moveNum = mb.moveNum;
  const fatiugeNum = mb.fatigueNum;
  const time = Math.max(
    1,
    Math.ceil(divide0(fatiugeNum, 2 * moveNum, Infinity))
  );
  return time;
}
export function getMoveTime(pullList: Cre[], extraEnergy: number = 0): number {
  return getMoveTimeByTerrain(pullList, extraEnergy);
}
export function getMoveTime_general(pullList: Cre[]): number {
  const timeOnTerrain = getMoveTimeByTerrain(pullList);
  const timeOnSawmp = getMoveTimeByTerrain(pullList);
  return 0.5 * timeOnTerrain + 0.5 * timeOnSawmp;
}
export function getSpeed(pullList: Cre[]): number {
  return 1 / getMoveTime(pullList);
}
export function getSpeed_general(pullList: Cre[]): number {
  return 1 / getMoveTime_general(pullList);
}
export function isFullSpeed(pullList: Cre[]): boolean {
  return getMoveTime(pullList) === 1;
}
export const def_plainCost = 1;
export const def_swampCost = 3;
export function searchPath_area(
  ori: Pos,
  tar: Pos,
  costMatrix: CostMatrix | undefined = moveBlockCostMatrix,
  plainCost: number = def_plainCost,
  swampCost: number = def_swampCost
): FindPathResult {
  // drawLineComplex(ori, tar, 1, "#22ffff", dashed);
  const newTar: Pos = getNewTarByArea(ori, tar);
  // drawLineComplex(ori, newTar, 1, "#ff22ff");
  let SR1 = searchPath_noArea(ori, newTar, costMatrix, plainCost, swampCost);
  let SR2: FindPathResult | undefined;
  let SR3: FindPathResult | undefined;
  // SA(ori,"area0")
  if (!atPos(newTar, tar)) {
    // SA(ori,"area1")
    const newTar2 = getNewTarByArea(newTar, tar);
    SR2 = searchPath_noArea(newTar, newTar2, costMatrix, plainCost, swampCost);
    if (!atPos(newTar2, tar)) {
      // SA(ori,"area2")
      SR3 = searchPath_noArea(newTar2, tar, costMatrix, plainCost, swampCost);
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
  plainCost: number = def_plainCost,
  swampCost: number = def_swampCost
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
  tars: Pos[],
  range: number,
  costMatrix: CostMatrix | undefined = moveBlockCostMatrix,
  plainCost: number = def_plainCost,
  swampCost: number = def_swampCost
): FindPathResult {
  const tarRangeArr = tars.map(i => {
    return { pos: i, range: range };
  });
  const rtn = searchPath(ori, tarRangeArr, {
    flee: true,
    costMatrix: costMatrix,
    plainCost: plainCost,
    swampCost: swampCost,
    maxOps: 2000,
  });
  drawPolyLight(rtn.path);
  return rtn;
}
/**
 * path len from `ori` to `tar`
 */
export function pathLen(ori: Pos, tar: Pos) {
  let p = searchPath_area(ori, tar);
  if (p) {
    return p.path.length;
  } else return Infinity;
}

/**
 * get the step target from cre to tar,if cre is your spawn and tar is enemy's spawn
 * that it will search path to the first gate ,then the next gate ,and then search to
 * the enemy spawn
 */
export function getNewTarByArea(cre: Pos, tar: Pos): Pos {
  let newTar = tar;
  const creArea = getArea(cre, leftBorder1, rightBorder2, midBorder);
  const tarArea = getArea(tar, leftBorder1, rightBorder2, midBorder);

  // SA(cre, "creArea=" + creArea); //
  // SA(cre, "tarArea=" + tarArea); //
  const yAxis_top = topY;
  const yAxis_bottom = bottomY;
  if (creArea === area_left && tarArea === area_right) {
    //go left top
    if (startGateUp) newTar = new Pos_C(leftBorder2, yAxis_top);
    else newTar = new Pos_C(leftBorder2, yAxis_bottom);
  } else if (creArea === area_right && tarArea === area_left) {
    //go right bottom
    if (startGateUp) newTar = new Pos_C(rightBorder1, yAxis_top);
    else newTar = new Pos_C(rightBorder1, yAxis_bottom);
  } else if (creArea === area_right && tarArea === area_top)
    newTar = new Pos_C(leftBorder2, yAxis_top);
  else if (creArea === area_top && tarArea === area_left)
    newTar = new Pos_C(leftBorder1, yAxis_top);
  else if (creArea === area_left && tarArea === area_bottom)
    newTar = new Pos_C(leftBorder2, yAxis_bottom);
  else if (creArea === area_bottom && tarArea === area_left)
    newTar = new Pos_C(leftBorder1, yAxis_bottom);
  else if (creArea === area_right && tarArea === area_bottom)
    newTar = new Pos_C(rightBorder1, yAxis_bottom);
  else if (creArea === area_bottom && tarArea === area_right)
    newTar = new Pos_C(rightBorder2, yAxis_bottom);
  else if (creArea === area_right && tarArea === area_top)
    newTar = new Pos_C(rightBorder1, yAxis_top);
  else if (creArea === area_top && tarArea === area_right)
    newTar = new Pos_C(rightBorder2, yAxis_top);
  drawLineComplex(cre, newTar, 0.25, "#222222");
  return newTar;
}
export function getMoveStepDef(pullList: Cre[]): number {
  return 10 * getMoveTime(pullList);
}