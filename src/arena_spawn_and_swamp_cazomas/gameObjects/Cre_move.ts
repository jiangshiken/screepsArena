import { Cre } from "./Cre";

export const defFindPathResult: FindPathResult = {
  path: [],
  ops: 0,
  cost: 0,
  incomplete: true,
};
export class Cre_move extends Cre {
  appointmentMovement: Event_Pos | undefined;

  moveTarget: Event_Pos | undefined;
  moveTargetNextPos: Event_Pos | undefined;
  /** if it want move ,it related to if other Creep will pull it */
  wantMove: Event | undefined;
  /** contains friends that is going to help pull this creep,already pulling one is not calculated in this list*/
  tryPullFatigueFriend: Cre[] = [];
  /** the closest Event that the creep is pulling other*/
  pullTarget: PullEvent | undefined = undefined;
  /** the closest Event that the creep is being pulled*/
  bePulledTarget: PullEvent | undefined = undefined;
  /** if the target of current `MoveTask` is `tar` ,cancel it*/
  appointMovementIsActived(): boolean {
    return validEvent(this.appointmentMovement, 0);
  }
  moveToNormal_setAppointment(tar: Pos, op: FindPathOpts | null = null) {
    this.appointmentMovement = new Event_Pos(tar);
    this.moveToNormal(tar, op);
  }
  exchangePos_setAppointment(tar: Cre) {
    SA(this, "exchangePos_setAppointment " + COO(tar));
    this.moveToNormal_setAppointment(tar);
    tar.moveToNormal_setAppointment(this);
  }
  /** find path and move */
  moveToNormal(tar: Pos, op: FindPathOpts | null = null) {
    // SA(this.master, "moveToNormal" + COO(tar))
    this.wantMove = new Event_C();
    let mop;
    if (op === null) {
      mop = undefined;
    } else {
      mop = op;
    }
    this.stop();
    var tarPath = findPath(this, tar, mop);
    if (tarPath.length > 0) {
      const tar0 = tarPath[0];
      this.crePathFinder?.moveTo_Basic(tar0);
    }
  }
  MTJ_stop(
    tar: Pos,
    op?: FindPathOpts,
    step: number = getMoveStepDef(this)
  ): void {
    if (GR(this, tar) <= 1) {
      this.stop();
    } else {
      this.MTJ(tar, op, step);
    }
  }

  /** get move and fatigue number of a creep ,all pulling and bePulled will
   *  be calculate too
   */
  getMoveAndFatigueNum(extraEnergy: number = 0): {
    moveNum: number;
    bodyNum: number;
    fatigueNum: number;
  } {
    try {
      const pl = this.getAllPullTargetList();
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
  getMoveTimeByTerrain(
    isSwamp: boolean,
    isRoad: boolean = false,
    extraEnergy: number = 0
  ): number {
    const mb = this.getMoveAndFatigueNum(extraEnergy);
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
  getMoveTime(extraEnergy: number = 0): number {
    return this.getMoveTimeByTerrain(
      isTerrainSwamp(this),
      isTerrainRoad(this),
      extraEnergy
    );
  }
  getMoveTime_general(): number {
    const timeOnTerrain = this.getMoveTimeByTerrain(false);
    const timeOnSawmp = this.getMoveTimeByTerrain(true);
    return 0.5 * timeOnTerrain + 0.5 * timeOnSawmp;
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
  MTJ_follow(
    tar: Pos,
    op?: FindPathOpts,
    step: number = getMoveStepDef(this)
  ): void {
    if (GR(this, tar) <= 1) {
      this.moveTo_follow(tar);
    } else {
      this.MTJ(tar, op, step);
    }
  }
  randomMove() {
    const pos: Pos | undefined = getRoundEmptyPos(this);
    if (pos) {
      this.MTJ(pos);
    }
  }
  flee(range: number = 4, FleeRange: number = 7): boolean {
    return this.battle ? this.battle.flee(range, FleeRange) : false;
  }
  searchTars(tars: Pos[]): FindPathResult {
    return this.crePathFinder
      ? this.crePathFinder.searchTars(tars)
      : defFindPathResult;
  }
  getDecideSearchRtnByCre(tar: Pos): FindPathResult {
    return this.crePathFinder
      ? this.crePathFinder.getDecideSearchRtnByCre(tar)
      : defFindPathResult;
  }
  useAppointMovement(validTick: number = 0): boolean {
    const app = this.appointmentMovement;
    if (app && validEvent(app, validTick)) {
      this.MTJ_follow(app.pos);
      return true;
    } else {
      return false;
    }
  }
  stopByTar(tar: Pos) {
    const t = findTaskByFilter(
      this.master,
      i => i instanceof MoveTask && (<MoveTask>i).tar === tar
    );
    if (t) t.end();
  }
  hasMoveTask(): boolean {
    let moveTask = this.master.tasks.find(i => i instanceof MoveTask);
    return valid(moveTask);
  }
  /** cancel the current `MoveTask`*/
  stop() {
    const t = findTask(this.master, MoveTask);
    if (t) t.end();
  }
  /** pause the current `MoveTask`*/
  movePause(): void {
    const t = <MoveTask>findTask(this.master, MoveTask);
    if (t) t.pause = true;
  }
  /** continue the current `MoveTask`*/
  moveContinue(): void {
    const t = <MoveTask>findTask(this.master, MoveTask);
    if (t) t.pause = false;
  }

  /** normal moveTo,but will block to the tile it want to move next tick */
  moveTo_Basic(tar: Pos): void {
    setMoveMapAndMatrixBlock(tar);
    this.master.moveTargetNextPos = new Event_Pos(tar);
    // SA(this.master, "moveTo_Basic=" + COO(tar))
    this.master.master.moveTo(tar);
  }
  //move to ,use move() that use direction,not find path
  moveTo_Basic_Direct(tar: Pos): void {
    setMoveMapAndMatrixBlock(tar);
    this.master.moveTargetNextPos = new Event_Pos(tar);
    const dx = tar.x - this.master.x;
    const dy = tar.y - this.master.y;
    const direc = getDirection(dx, dy);
    SA(this.master, "moveTo_Basic_Direct=" + direc + "tar=" + tar);
    SA(this.master, "dx=" + dx + "dy=" + dy);
    this.master.master.move(direc);
  }

  /** search the closest path of multiple targets ,like findPath but will
   * calculate terrain cost by this creep
   */
  searchTars(tars: Pos[]): FindPathResult {
    const ifWorker = this.master.onlyHasMoveAndCarry(); //if worker set 1 and 2
    let plainCost, swampCost;
    if (ifWorker) {
      plainCost = 1;
      swampCost = 2;
    } else {
      plainCost = this.master.getMoveTimeByTerrain(false);
      swampCost = this.master.getMoveTimeByTerrain(true);
    }
    return getDecideSearchRtnNoArea(this.master, tars, {
      maxOps: 2500,
      plainCost: plainCost,
      swampCost: swampCost,
    });
  }
  /**move to judge most general move action */
  moveToJudge(
    tar: Pos,
    op?: FindPathOpts,
    step: number = getMoveStepDef(this.master)
  ): void {
    // SA(this,"moveTo1="+coordinate(tar));
    drawLineLight(this.master, tar);
    let theSame: boolean = true;
    const currentMoveTask: MoveTask | undefined = findTask(
      this.master,
      MoveTask
    );
    // SA(this,"currentMoveTask="+S(currentMoveTask));
    if (currentMoveTask) {
      if (currentMoveTask instanceof FindPathAndMoveTask) {
        // SA(this,"currentMoveTask.tar="+COO(currentMoveTask.tar));
        // SA(this,"tar="+COO(tar));
        const cop = currentMoveTask.op;
        //if is not the same pos
        if (!atPos(currentMoveTask.tar, tar)) {
          theSame = false;
        } else if (cop && !op) {
          theSame = false;
        } else if (!cop && op) {
          theSame = false;
        } else if (cop && op) {
          if (cop.plainCost !== op.plainCost) {
            theSame = false;
          } else if (cop.swampCost !== op.swampCost) {
            theSame = false;
          }
        }
      } else {
        theSame = false;
      }
    } else theSame = false;
    // SA(this,"theSame="+theSame)
    if (!theSame) {
      //add new move task
      // SA(this,"FindPathAndMoveTask");
      new FindPathAndMoveTask(this.master, tar, step, op);
    } else if (currentMoveTask) {
      currentMoveTask.pause = false;
    }
  }
  /** search the path to the target.
   * calculate terrain cost by this creep
   */
  getDecideSearchRtnByCre(
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
}

//PATH FINDER
/** searchPath target*/
export type searchPathTarOOA<T extends Pos> =
  | T
  | { pos: T; range: number }
  | (T | { pos: T; range: number })[];

export function aroundBlock(pos: Pos) {
  //if has no empty around
  return getRangePoss(pos, 1).find(i => !blocked(i)) === undefined;
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
  let SR1 = getDecideSearchRtnNoArea(ori, newTar, op);
  let SR2: FindPathResult | undefined;
  let SR3: FindPathResult | undefined;
  // SA(ori,"area0")
  if (!atPos(newTar, tar)) {
    // SA(ori,"area1")
    let newTar2 = getNewTarByArea(newTar, tar);
    SR2 = getDecideSearchRtnNoArea(newTar, newTar2, op);
    if (!atPos(newTar2, tar)) {
      // SA(ori,"area2")
      SR3 = getDecideSearchRtnNoArea(newTar2, tar, op);
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
export function getDecideSearchRtnNoArea<T extends Pos>(
  ori: Pos,
  tarOOA: searchPathTarOOA<T>,
  op?: FindPathOpts | undefined
): FindPathResult {
  // SA(ori,"GDSRN")
  let errReturn: FindPathResult = {
    path: [],
    cost: Infinity,
    ops: 0,
    incomplete: true,
  };
  if (Array.isArray(tarOOA)) {
    for (let t of tarOOA) {
      if ("range" in t) {
        if (t.pos) {
          return errReturn;
        }
      } else if (t) {
        return errReturn;
      }
    }
  } else if (valid(tarOOA) && "range" in tarOOA) {
    if (tarOOA.pos) {
      return errReturn;
    }
  }
  let newOp: FindPathOpts | undefined;
  if (op) newOp = op;
  else newOp = {};
  // let defCostMatrix = moveMatrix;
  //
  let so = getStandardOps();
  // if (!newOp.costMatrix) newOp.costMatrix = defCostMatrix;
  if (!newOp.maxOps) newOp.maxOps = so.maxOps;
  if (!newOp.heuristicWeight) newOp.heuristicWeight = so.heuristicWeight;
  if (!newOp.flee) newOp.flee = false;
  let rtn = searchPath(ori, tarOOA, newOp);
  drawPolyLight(rtn.path);
  return rtn;
}

/**
 * find a group of target that is closest
 */
export function findClosestsByPath(cre: Cre, tars: Pos[], n: number): Pos[] {
  let nowTar = tars.slice();
  let rtn: Pos[] = [];
  for (let i = 0; i < n; i++) {
    let select: Pos | null = findClosestByPath(cre, nowTar);
    if (select) {
      rtn.push(select);
      remove(nowTar, select);
    } else {
      break;
    }
  }
  return rtn;
}
/**
 * get all units that can block a tile
 */
export function getBlockUnits(): Unit[] {
  let rtn = units.filter(
    i =>
      !(
        (i instanceof StructureRampart && i.my) ||
        i instanceof StructureContainer
      )
  );
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

//functions
export function moveToRandomEmptyAround(cre: Cre): void {
  SA(cre, "moveToRandomEmptyAround");
  const poss = getRangePoss(cre, 1);
  const empPoss = poss.filter(i => !blocked(i));
  const pos = ranGet(empPoss);
  if (pos) {
    cre.moveToNormal(pos);
  }
}
/**
 * if a friend stand on the position ,move it to random around
 */
export function moveBlockedCreep(pos: Pos): void {
  const creBlock = findFriendAtPos(pos);
  if (creBlock) {
    //move block creep
    moveToRandomEmptyAround(creBlock);
  }
}
export function getStandardOps() {
  return { maxOps: 1000, heuristicWeight: 1.2 };
}
export function getMoveStepDef(cre: Cre): number {
  return 10 * cre.getMoveTime();
}
import { arrayEqual, remove, valid } from "../utils/JS";
import { atPos, GR, Pos } from "../utils/Pos";
import { findTask } from "../utils/Task";
import { SA } from "../utils/visual";
import {
  Cre,
  exist,
  FindPathAndMoveTask,
  moveToRandomEmptyAround,
  Task_Cre,
} from "./Cre";

//functions
/**
 * new a {@link PullTarsTask}, will cancel if already have same task
 */
export function newPullTarsTask(
  master: Cre,
  tarCres: Cre[],
  tarPos: Pos,
  nextStep?: Pos
) {
  let oldT = <PullTarsTask>findTask(master, PullTarsTask);
  let newTask: boolean;
  if (valid(oldT)) {
    if (arrayEqual(oldT.tarCres, tarCres) && oldT.tarPos == tarPos) {
      // SA(master, "samePullTask");
      newTask = false;
    } else {
      newTask = true;
    }
  } else {
    newTask = true;
  }
  if (newTask) {
    new PullTarsTask(master, tarCres, tarPos, nextStep);
  }
}
/**
 * new a {@link PullTask}, will cancel if already have same task
 */
export function newPullTask(
  master: Cre,
  tarCre: Cre,
  tarPos: Pos,
  nextStep?: Pos,
  leaderStop: boolean = false
) {
  let oldT = <PullTask>findTask(master, PullTask);
  let newTask: boolean;
  if (valid(oldT)) {
    if (oldT.tarCre == tarCre && oldT.tarPos == tarPos) {
      // SA(master, "samePullTask");
      newTask = false;
    } else {
      oldT.end();
      newTask = true;
    }
  } else {
    newTask = true;
  }
  if (newTask) {
    new PullTask(master, tarCre, tarPos, nextStep, leaderStop);
  }
}
// export let pullGoSwamp: Boolean = false
// export function setPullGoSwamp(b: Boolean) {
// 	pullGoSwamp = b
// }
// export let pullIgnoreSwamp: Boolean = false
// export function set_pullIgnoreSwamp(b: Boolean) {
// 	pullIgnoreSwamp = b
// }
/**
 * Task of pull ,the creep will pull a creep to a position
 * @param nextStep the pos creep will go next ,
 *  if is undefined the creep will move random at last position of path
 */
export class PullTask extends Task_Cre {
  tarCre: Cre;
  tarPos: Pos;
  nextStep: Pos | undefined;
  moveTask1: FindPathAndMoveTask | undefined = undefined;
  moveTask2: FindPathAndMoveTask | undefined = undefined;
  leaderStop: boolean;
  constructor(
    master: Cre,
    tarCre: Cre,
    tarPos: Pos,
    nextStep?: Pos,
    leaderStop: boolean = false
  ) {
    super(master);
    this.tarCre = tarCre;
    this.tarPos = tarPos;
    this.nextStep = nextStep;
    this.leaderStop = leaderStop;
    //cancel old task
    var ot = this.master.tasks.find(
      task => task instanceof PullTask && task != this
    );
    if (ot) {
      ot.end();
      return this;
    }
    //
    this.moveTask1 = new FindPathAndMoveTask(this.master, this.tarCre);
  }
  end() {
    super.end();
    this.moveTask1?.end();
    this.moveTask2?.end();
  }
  getMaster(): Cre {
    return <Cre>this.master;
  }
  loop_task(): void {
    // SA(this.master, "do PullTask");
    if (
      (this.moveTask1 && this.moveTask1.complete) ||
      GR(this.master, this.tarCre) <= 1
    ) {
      // SA(this.master, "this.moveTask1.complete");
      this.moveTask1?.end();
      let ptRtn = this.master.normalPull(this.tarCre, true);
      if (ptRtn) {
        //if is pulling
        // SA(this.master, "is pulling");
        if (!this.moveTask2) {
          if (this.leaderStop) {
            // SA(this.master, "leaderStop");
          } else {
            this.moveTask2 = new FindPathAndMoveTask(
              this.master,
              this.tarPos,
              1,
              { plainCost: 1, swampCost: 1 }
            );
          }
        } else if (this.moveTask2.complete) {
          //master at pos
          // SA(this.master, "this.moveTask2.complete end");
          if (this.nextStep) this.master.moveToNormal(this.nextStep);
          else moveToRandomEmptyAround(this.master);
          this.end();
        } else if (atPos(this.tarCre, this.tarPos)) {
          //tar at pos
          // SA(this.master, "pull task end");
          this.end();
        } else {
          //wait moveTask2 complete
        }
      } else {
        this.end();
      }
    } else {
      //do mis 1, move to tarCre
      // SA(this.master, "this.tarCre=" + COO(this.tarCre));
    }
  }
}

/** represent a event of pull function */
export class PullEvent extends Event_C {
  /** one who pulled other creep */
  pullOne: Cre;
  /** one who be pulled */
  bePulledOne: Cre;
  constructor(pullOne: Cre, bePulledOne: Cre) {
    super();
    this.pullOne = pullOne;
    this.bePulledOne = bePulledOne;
  }
}

  /** go to a target Creep ,and const it pull this */
  directBePulled(tar: Cre): boolean {
    SA(tar, "directBePulled");
    const tl = tar.getPullingTargetList();
    SA(tar, "getIsPullingTargetList=" + SOA(tl));
    let lastOne = last(tl);
    if (lastOne === undefined) {
      return false;
    }
    if (lastOne === this) {
      //do not need?
      SA(tar, "lastOne==this");
      lastOne = tl[tl.length - 2];
    }
    const pte = this.bePulledTarget;
    if (pte != undefined && validEvent(pte, 1) && pte.pullOne === lastOne) {
      //if is being pulled
      const OneWhoPullCre = pte.pullOne;
      OneWhoPullCre.normalPull(this);
      return true;
    } else {
      // if not being pulled
      if (invalid(lastOne)) {
        return false;
      } else if (GR(this, lastOne) > 1) {
        // SA(this,"MTJ="+COO(lastOne));
        this.MTJ(lastOne);
        return false;
      } else {
        if (lastOne.normalPull(this))
          //lastOne.pullingTarget.target=cre
          return true;
        else return false;
      }
    }
  }
  /** pull  */
  normalPull(tar: Cre, direct: boolean = false): boolean {
    if (GR(this, tar) <= 1) {
      //draw green line
      drawLineComplex(this, tar, 0.5, "#00ff00");
      //pull
      this.master.pull(tar.master);
      //set Event
      const pe = new PullEvent(this, tar);
      this.pullTarget = pe;
      tar.bePulledTarget = pe;
      //tar move this
      if (direct) {
        // tar.moveToDirect(this);
        tar.crePathFinder?.moveTo_Basic_Direct(this);
      } else {
        tar.moveToNormal(this);
      }
      return true;
    } else return false;
  }
  /** move and pull */
  pullTar(tar: Cre): boolean {
    const range = getRange(this, tar);
    if (range > 1) {
      //go to tar
      this.MTJ(tar);
      // sayAppend(this," move to tar ");
      return false;
    } else {
      // pull it
      // MTJ(tar,this);
      this.normalPull(tar);
      this.stopByTar(tar); //TODO
      // sayAppend(this," pulling tar");
      return true;
    }
  }


  /** move and pull */
  moveAndBePulled(tar: Cre): boolean {
    const range = getRange(this, tar);
    if (range > 1) {
      //go to tar
      this.MTJ(tar);
      // sayAppend(this," move to tar ");
      return false;
    } else {
      // pull it
      // MTJ(tar,this);
      tar.normalPull(this);
      this.stopByTar(tar); //TODO
      // sayAppend(this," pulling tar");
      return true;
    }
  }
  /** the Cre[] of this creep is pulling ,include self */
  getPullingTargetList(): Cre[] {
    let pt = this.pullTarget;
    const rtn: Cre[] = [];
    rtn.push(this);
    let w = 20;
    while (pt && validEvent(pt, 1)) {
      w -= 1;
      if (w <= 0) {
        break;
      }
      rtn.push(pt.bePulledOne);
      pt = pt.bePulledOne.pullTarget;
    }
    return rtn;
  }
  /** the Cre[] that is pulling this creep ,include self */
  getBePullingTargetList(): Cre[] {
    let pt = this.bePulledTarget;
    const rtn: Cre[] = [];
    rtn.push(this);
    let w = 10;
    while (pt && validEvent(pt, 1)) {
      w -= 1;
      if (w <= 0) {
        break;
      }
      rtn.push(pt.pullOne);
      pt = pt.pullOne.bePulledTarget;
    }
    return rtn;
  }
  /** all Cre[] pulled this or ,is being pulled by this*/
  getAllPullTargetList(): Cre[] {
    var pt1 = this.getPullingTargetList();
    var pt2 = this.getBePullingTargetList();
    var rtn = pt1.concat(pt2);
    rtn.shift();
    return rtn;
  }
/**
 * pull a group of creep to a position
 * @param nextStep the pos creep will go next ,
 *  if is undefined the creep will move random at last position of path
 */
export class PullTarsTask extends Task_Cre {
  tarCres: Cre[];
  tarPos: Pos;
  nextStep: Pos | undefined;
  useLeaderPull: boolean;
  leaderStop: boolean;
  constructor(
    master: Cre,
    tarCres: Cre[],
    tarPos: Pos,
    nextStep?: Pos,
    useLeaderPull: boolean = true,
    leaderStop: boolean = false //for direct move of leader
  ) {
    super(master);
    SA(master, "new PullTarsTask");
    this.tarCres = tarCres;
    this.tarPos = tarPos;
    this.nextStep = nextStep;
    this.useLeaderPull = useLeaderPull;
    this.leaderStop = leaderStop;
    //cancel old task
    var ot = this.master.tasks.find(
      task => task instanceof PullTarsTask && task != this
    );
    if (ot) {
      ot.end();
      return this;
    }
  }
  end(): void {
    super.end();
    this.master.tasks.find(i => i instanceof PullTask)?.end();
    // for (let tar of this.tarCres) {
    // 	tar.tasks.find(i => i instanceof PullTask)?.end()
    // }
  }
  loop_task(): void {
    // if have pull task
    SA(this.master, "PullTarsTask loop_task");
    let tarCres = this.tarCres;
    let allPulling = true; //if all being pulled
    //remove unexist tar
    for (let tar of tarCres) {
      if (!exist(tar)) {
        remove(tarCres, tar);
      }
    }
    //let tar be linked
    let creIdle = true;
    for (let i = 0; i < tarCres.length - 1; i++) {
      let tar = tarCres[i];
      let tarNext = tarCres[i + 1];
      //
      // SA(this.master, "try pull tar");
      // let pulling=tar.pullTar(tarNext);
      let pulling = tarNext.moveAndBePulled(tar);
      if (!pulling) {
        allPulling = false;
        let tarSpeed = tarNext.getSpeed();
        if (
          this.useLeaderPull &&
          creIdle &&
          (tarSpeed < 1 || !tar.hasMoveBodyPart())
        ) {
          //go pull this tar
          // SA(this.master, "newPullTask");
          // SA(this.master, "tar=" + COO(tar));
          // SA(this.master, "tarNext=" + COO(tarNext));
          newPullTask(this.master, tarNext, tar);
          creIdle = false;
        }
      }
    }
    if (allPulling) {
      //if all pulled
      // SA(this.master, "allPulling");
      // SA(this.master, "tarCres[0]=" + COO(tarCres[0]));
      // SA(this.master, "this.tarPos=" + COO(this.tarPos));
      // SA(this.master, "this.nextStep=" + COO(this.nextStep));
      newPullTask(
        this.master,
        tarCres[0],
        this.tarPos,
        this.nextStep,
        this.leaderStop
      );
    } else if (creIdle) {
      //this is idle,approach first
      this.master.MTJ(tarCres[0]);
    } else {
    }
  }
}
