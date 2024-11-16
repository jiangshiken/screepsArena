import { CostMatrix, FindPathResult } from "game/path-finder";
import { getDirection } from "game/utils";
import { ct, et } from "../utils/CPU";
import { Event_Pos } from "../utils/Event";
import { last } from "../utils/JS";
import { Adj, COO, GR, Pos, atPos } from "../utils/Pos";
import { findTask } from "../utils/Task";
import { tick } from "../utils/game";
import { ERR } from "../utils/print";
import { SA, drawLineComplex, drawLineLight } from "../utils/visual";
import { Cre, Task_Cre } from "./Cre";
import {
  calEventNumberCPUTime,
  getRoundEmptyPos,
  hasThreat,
  isMyTick,
} from "./CreTool";
import {
  Cre_findPath,
  def_plainCost,
  def_swampCost,
  getMoveStepDef,
  searchPath_area,
  searchPath_flee,
} from "./Cre_findPath";
import { GameObj } from "./GameObj";
import { enemies } from "./GameObjectInitialize";
import {
  blockCost,
  blocked,
  enRamBlockCostMatrix,
  friendBlockCostMatrix,
  moveBlockCostMatrix,
} from "./UnitTool";

export class Cre_move extends Cre_findPath {
  appointmentMovement: Event_Pos | undefined;

  /** if the target of current `MoveTask` is `tar` ,cancel it*/
  appointMovementIsActived(): boolean {
    return (
      this.appointmentMovement !== undefined &&
      this.appointmentMovement.validEvent()
    );
  }
  moveTo_setAppointment(tar: Pos) {
    this.appointmentMovement = new Event_Pos(tar);
    moveTo_basic(this, tar);
  }
  exchangePos_setAppointment(tar: Cre_move) {
    SA(this, "exchangePos_setAppointment " + COO(tar));
    this.moveTo_setAppointment(tar);
    tar.moveTo_setAppointment(this);
  }
  MT_stop(
    tar: Pos,
    pullList: Cre[] = [this],
    step: number = getMoveStepDef(pullList),
    costMatrix: CostMatrix | undefined = moveBlockCostMatrix,
    plainCost: number = def_plainCost,
    swampCost: number = def_swampCost
  ): void {
    if (Adj(this, tar)) {
      this.stop();
    } else {
      this.MT(tar, pullList, step, costMatrix, plainCost, swampCost);
    }
  }
  randomMove() {
    const pos: Pos | undefined = getRoundEmptyPos(this);
    if (pos) {
      moveTo_direct(this, pos);
    }
  }
  flee(
    range: number = 4,
    FleeRange: number = range * 2,
    costMatrix: CostMatrix | undefined = moveBlockCostMatrix,
    plainCost: number = def_plainCost,
    swampCost: number = def_swampCost
  ): boolean {
    const eht = enemies.filter(i => hasThreat(i) && GR(i, this) <= range);
    if (eht.length > 0) {
      const spf = searchPath_flee(
        this,
        eht,
        FleeRange,
        costMatrix,
        plainCost,
        swampCost
      );
      if (spf.path.length > 0) {
        const tar = spf.path[0];
        moveTo_direct(this, tar);
        this.stop();
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }
  useAppointMovement(validTick: number = 0): boolean {
    const app = this.appointmentMovement;
    if (app && app.validEvent(validTick)) {
      this.MT(app);
      return true;
    } else {
      return false;
    }
  }
  /** cancel the current `MoveTask`*/
  stop() {
    const t = findTask(this, MoveTask);
    if (t) t.end();
  }
  /** pause the current `MoveTask`*/
  movePause(): void {
    const t = <MoveTask>findTask(this, MoveTask);
    if (t) t.pause = true;
  }
  /** continue the current `MoveTask`*/
  moveContinue(): void {
    const t = <MoveTask>findTask(this, MoveTask);
    if (t) t.pause = false;
  }
  /**move to judge most general move action */
  MT(
    tar: Pos,
    pullList: Cre[] = [this],
    step: number = getMoveStepDef(pullList),
    costMatrix: CostMatrix | undefined = moveBlockCostMatrix,
    plainCost: number = def_plainCost,
    swampCost: number = def_swampCost
  ): void {
    // SA(this,"moveTo1="+coordinate(tar));
    drawLineLight(this.master, tar);
    if (Adj(this, tar) && !atPos(this, tar)) {
      moveTo_direct(this, tar);
      this.stop();
      return;
    }
    //cancel old task
    let ifNewTask: boolean = false;
    const oldTask: MoveTask | undefined = findTask(this, MoveTask);
    if (oldTask && oldTask instanceof FindPathAndMoveTask) {
      //if is not the same pos
      if (!atPos(oldTask.tar, tar)) {
        ifNewTask = true;
      } else if (oldTask.plainCost !== plainCost) {
        ifNewTask = true;
      } else if (oldTask.swampCost !== swampCost) {
        ifNewTask = true;
      } else if (oldTask.costMatrix !== costMatrix) {
        ifNewTask = true;
      }
    } else ifNewTask = true;
    if (ifNewTask) {
      //add new move task
      new FindPathAndMoveTask(
        this,
        tar,
        pullList,
        step,
        costMatrix,
        plainCost,
        swampCost
      );
    }
  }
}
/**
 * a task used to move
 */

export class MoveTask extends Task_Cre {
  /** memoryed path*/
  path: Pos[];
  constructor(master: Cre, path: Pos[]) {
    super(master);
    this.path = path;
    //cancel old task
    this.cancelOldTask(MoveTask);
  }
  loop_task(): void {
    if (this.path.length > 0) {
      const firstStep: Pos = this.path[0];
      drawLineComplex(this.master, firstStep, 0.8, "#444444");
      if (Adj(firstStep, this.master)) {
        SA(this.master, "MTMD");
        moveTo_direct(this.master, firstStep);
        this.path.shift();
      } else {
        SA(this.master, "MTB");
        moveTo_basic(this.master, firstStep);
      }
    } else {
      this.end();
    }
  }
  end(): void {
    super.end();
  }
}
/** move to a position ,will findPath every `findPathStep` ticks*/

export class FindPathAndMoveTask extends MoveTask {
  /** target position */
  readonly tar: Pos;
  readonly findPathStep: number;
  readonly pullList: Cre[];
  readonly costMatrix: CostMatrix | undefined;
  readonly plainCost: number;
  readonly swampCost: number;
  /** default `findPathStep` */
  constructor(
    master: Cre,
    tar: Pos,
    pullList: Cre[] = [master],
    step: number = getMoveStepDef(pullList),
    costMatrix: CostMatrix | undefined = moveBlockCostMatrix,
    plainCost: number = def_plainCost,
    swampCost: number = def_swampCost
  ) {
    super(master, []);
    SA(master, "new FPAM Task");
    this.tar = tar;
    this.pullList = pullList;
    this.costMatrix = costMatrix;
    this.plainCost = plainCost;
    this.swampCost = swampCost;
    this.findPathStep = step;
  }
  /** the temparary target ,it will reFindPath if close to it*/
  get tempTar(): Pos {
    if (this.path.length > 0) {
      const lastPos = last(this.path);
      if (lastPos) {
        return lastPos;
      } else {
        return this.tar;
      }
    } else return this.tar;
  }
  loop_task(): void {
    SA(this.master, "FPAM_loop");
    drawLineLight(this.master, this.tar);
    let st = ct();
    //cancel if reach destination
    if (
      !this.tar ||
      !this.tempTar ||
      (this.tar instanceof GameObj && !this.tar.exists)
    ) {
      this.end();
    }
    const closeScanRange = 3;
    if (
      tick === this.invokeTick ||
      isMyTick(this.master, this.findPathStep) ||
      GR(this.tempTar, this.master) <= closeScanRange ||
      GR(this.tar, this.master) <= closeScanRange ||
      (this.path.length > 0 && blocked(this.path[0]))
    ) {
      this.path = this.findPath_task(this.tar);
    }
    super.loop_task();
    if (this.master.role)
      calEventNumberCPUTime(this.master.role, et(st), false);
  }
  findPath_task(tar: Pos): Pos[] {
    // SA(this.master, "findPath_task");
    const sRtn: FindPathResult = searchPath_area(
      this.master,
      this.tar,
      this.costMatrix,
      this.plainCost,
      this.swampCost
    );
    const path: Pos[] = sRtn.path;
    return path;
  }
}
/** normal moveTo,but will block to the tile it want to move next tick */
export function moveTo_basic(cre: Cre, tar: Pos): void {
  SA(cre, "moveTo_basic");
  moveBlockCostMatrix_setBlock(tar);
  cre.master.moveTo(tar);
}
//move to ,use move() that use direction,not find path
export function moveTo_direct(cre: Cre, tar: Pos): void {
  SA(cre, "DirMove");
  if (atPos(cre, tar)) {
    ERR("ERR dirMove atPos");
  } else if (Adj(cre, tar)) {
    moveBlockCostMatrix_setBlock(tar);
    const dx = tar.x - cre.x;
    const dy = tar.y - cre.y;
    const direc = getDirection(dx, dy);
    SA(cre, "" + direc);
    cre.master.move(direc);
  } else {
    ERR("ERR dirMove");
  }
}
export function moveBlockCostMatrix_setBlock(pos: Pos) {
  moveBlockCostMatrix.set(pos.x, pos.y, blockCost);
}
export function friendBlockCostMatrix_setBlock(pos: Pos) {
  friendBlockCostMatrix.set(pos.x, pos.y, blockCost);
}
export function enRamBlockCostMatrix_setBlock(pos: Pos) {
  enRamBlockCostMatrix.set(pos.x, pos.y, blockCost);
}
