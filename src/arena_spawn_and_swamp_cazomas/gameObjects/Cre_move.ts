import { CostMatrix, FindPathResult } from "game/path-finder";
import { ct, et } from "../utils/CPU";
import { Event_Pos, Event_ori } from "../utils/Event";
import { last } from "../utils/JS";
import { Adj, COO, GR, Pos, atPos } from "../utils/Pos";
import { Task, findTask } from "../utils/Task";
import { tick } from "../utils/game";
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
  def_PSC,
  moveBlockCostMatrix_setBlock,
  searchPath_area,
  searchPath_flee,
  type_PSC,
} from "./Cre_findPath";
import { GameObj } from "./GameObj";
import { enemies } from "./GameObjectInitialize";
import { blocked, moveBlockCostMatrix } from "./UnitTool";
export class TaskEvent extends Event_ori {
  task: Task;
  constructor(task: Task) {
    super();
    this.task = task;
  }
}
export class Cre_move extends Cre_findPath {
  appointmentMovement: Event_Pos | undefined;
  moveEvent: MoveEvent | undefined;
  normalPull(tar: Cre_findPath): boolean {
    const p_rtn = super.normalPull(tar);
    if (p_rtn) {
      if (tar instanceof Cre_move) tar.stop();
    }
    return p_rtn;
  }
  /** normal moveTo,but will block to the tile it want to move next tick */
  moveTo_basic(tar: Pos): void {
    SA(this, "moveTo_basic");
    moveBlockCostMatrix_setBlock(tar);
    this.master.moveTo(tar);
  }
  /** if the target of current `MoveTask` is `tar` ,cancel it*/
  appointMovementIsActived(time: number): boolean {
    return (
      this.appointmentMovement !== undefined &&
      this.appointmentMovement.validEvent(time)
    );
  }
  exchangePos_setAppointment(tar: Cre_move) {
    SA(this, "exchangePos_setAppointment " + COO(tar));
    this.MD(tar);
    tar.appointmentMovement = new Event_Pos(this);
  }
  MT_stop(
    tar: Pos,
    step: number = this.getMoveStepDef(),
    costMatrix: CostMatrix | undefined = moveBlockCostMatrix,
    PSC: type_PSC = def_PSC
  ): void {
    if (Adj(this, tar)) {
      this.stop();
    } else {
      this.MT(tar, step, costMatrix, PSC);
    }
  }
  randomMove() {
    const pos: Pos | undefined = getRoundEmptyPos(this);
    if (pos) {
      this.MD(pos);
    }
  }
  MD(tar: Pos) {
    this.moveTo_direct(tar);
    this.stop();
  }
  flee(
    range: number = 4,
    FleeRange: number = range * 2,
    costMatrix: CostMatrix | undefined = moveBlockCostMatrix,
    PSC: type_PSC = def_PSC
  ): boolean {
    const eht = enemies.filter(i => hasThreat(i) && GR(i, this) <= range);
    if (eht.length > 0) {
      const spf = searchPath_flee(this, eht, FleeRange, costMatrix, PSC);
      if (spf.path.length > 0) {
        const tar = spf.path[0];
        this.MD(tar);
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }
  useAppointMovement(): boolean {
    const app = this.appointmentMovement;
    if (app) {
      this.MT(app);
      return true;
    } else {
      return false;
    }
  }
  /** cancel the current `MoveTask`*/
  stop() {
    findTask(this, MoveTask)?.end();
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
    step: number = this.getMoveStepDef(),
    costMatrix: CostMatrix | undefined = moveBlockCostMatrix,
    PSC: type_PSC = def_PSC
  ): void {
    // SA(this,"moveTo1="+coordinate(tar));
    drawLineLight(this.master, tar);
    if (Adj(this, tar) && !atPos(this, tar)) {
      this.MD(tar);
      return;
    }
    //cancel old task
    let ifNewTask: boolean = false;
    const oldTask: MoveTask | undefined = findTask(this, MoveTask);
    if (oldTask && oldTask instanceof FindPathAndMoveTask) {
      //if is not the same pos
      if (!atPos(oldTask.tar, tar)) {
        ifNewTask = true;
      } else if (oldTask.PSC.plainCost !== PSC.plainCost) {
        ifNewTask = true;
      } else if (oldTask.PSC.swampCost !== PSC.swampCost) {
        ifNewTask = true;
      } else if (oldTask.costMatrix !== costMatrix) {
        ifNewTask = true;
      }
    } else ifNewTask = true;
    if (ifNewTask) {
      //add new move task
      new FindPathAndMoveTask(this, tar, step, costMatrix, PSC);
    }
  }
}
/**
 * a task used to move
 */

export class MoveTask extends Task_Cre {
  /** memoryed path*/
  path: Pos[];
  master: Cre_move;
  constructor(master: Cre_move, path: Pos[]) {
    super(master, Infinity);
    this.master = master;
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
        this.master.moveTo_direct(firstStep);
        this.path.shift();
      } else {
        SA(this.master, "MTB");
        this.master.moveTo_basic(firstStep);
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
  readonly master: Cre_move;
  readonly tar: Pos;
  readonly findPathStep: number;
  readonly costMatrix: CostMatrix | undefined;
  readonly PSC: type_PSC;
  /** default `findPathStep` */
  constructor(
    master: Cre_move,
    tar: Pos,
    step: number = master.getMoveStepDef(),
    costMatrix: CostMatrix | undefined = moveBlockCostMatrix,
    PSC: type_PSC = def_PSC
  ) {
    super(master, []);
    SA(master, "new FPAM Task");
    this.master = master;
    this.tar = tar;
    this.costMatrix = costMatrix;
    this.PSC = PSC;
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
      tick === this.birthEvent.invokeTick ||
      isMyTick(this.master, this.findPathStep) ||
      GR(this.tempTar, this.master) <= closeScanRange ||
      GR(this.tar, this.master) <= closeScanRange ||
      (this.path.length > 0 && blocked(this.path[0]))
    ) {
      this.path = this.findPath_task();
    }
    super.loop_task();
    if (this.master.role)
      calEventNumberCPUTime(this.master.role, et(st), false);
  }
  findPath_task(): Pos[] {
    // SA(this.master, "findPath_task");
    const sRtn: FindPathResult = searchPath_area(
      this.master,
      this.tar,
      this.costMatrix,
      this.PSC
    );
    const path: Pos[] = sRtn.path;
    return path;
  }
}
export class MoveEvent extends Event_ori {
  readonly tar: Pos;
  readonly nextStep: Pos;
  constructor(tar: Cre, nextStep: Cre) {
    super();
    this.tar = tar;
    this.nextStep = nextStep;
  }
}
