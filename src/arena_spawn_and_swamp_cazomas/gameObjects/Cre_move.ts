import { Cre } from "./Cre";

export const defFindPathResult: FindPathResult = {
  path: [],
  ops: 0,
  cost: 0,
  incomplete: true,
};
export class Cre_move extends Cre {
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

export function isBlockGameObjectAvoidFriend(
  go: GO,
  containerBlock: boolean = false
) {
  return (
    (go instanceof Structure || (go instanceof Cre && oppo(go))) &&
    !(
      (go instanceof StructureRampart && go.my) ||
      (!containerBlock && go instanceof StructureContainer) ||
      go instanceof StructureRoad
    )
  );
}
export function aroundBlock(pos: Pos) {
  //if has no empty around
  return getRangePoss(pos, 1).find(i => !blocked(i)) === undefined;
}
/**
 * if position is blocked
 */
export function blocked(
  pos: Pos,
  useMoveMatrix: boolean = true,
  avoidFriendBlock: boolean = false,
  avoidEnemyBlock: boolean = false,
  containerBlock: boolean = false
): boolean {
  if (pos.x === 50) {
    SA(pos, "CC");
  }
  if (isTerrainWall(pos)) {
    // SA(pos,"block isTerrainWall");
    return true;
  } else {
    let posList = overallMap[pos.x][pos.y];
    if (avoidFriendBlock) {
      useMoveMatrix = false;
    }
    for (let go of posList) {
      SA(pos, "BB");
      if (avoidFriendBlock) {
        if (isGO(go) && isBlockGameObjectAvoidFriend(<GO>go, containerBlock)) {
          // SA(pos,"block isBlockGameObject");
          return true;
        }
      } else if (avoidEnemyBlock) {
        if (isGO(go) && isBlockGameObjectAvoidEnemy(<GO>go, containerBlock)) {
          // SA(pos,"block isBlockGameObject");
          return true;
        }
      } else {
        if (isGO(go) && isBlockGameObject(<GO>go, containerBlock)) {
          // SA(pos,"block isBlockGameObject");
          return true;
        }
      }
    }
    if (useMoveMatrix) {
      if (moveMatrix.get(pos.x, pos.y) === 255) {
        // SA(pos,"block moveMatrix");
        return true;
      }
    }
    return false;
  }
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
export function isBlockGameObjectAvoidEnemy(
  go: GO,
  containerBlock: boolean = false
) {
  return (
    (go instanceof Structure || (go instanceof Cre && my(go))) &&
    !(
      (go instanceof StructureRampart && go.my) ||
      (!containerBlock && go instanceof StructureContainer) ||
      go instanceof StructureRoad
    )
  );
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
