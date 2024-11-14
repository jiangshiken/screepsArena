import { CostMatrix } from "game/path-finder";
import { Event_Pos } from "../utils/Event";
import { Adj, COO, GR, Pos, atPos } from "../utils/Pos";
import { findTask } from "../utils/Task";
import { SA, drawLineLight } from "../utils/visual";
import { Cre } from "./Cre";
import { getRoundEmptyPos, hasThreat } from "./CreTool";
import {
  def_plainCost,
  def_swampCost,
  getMoveStepDef,
  searchPath_flee,
} from "./findPath";
import { enemies } from "./GameObjectInitialize";
import {
  FindPathAndMoveTask,
  MoveTask,
  moveTo_basic,
  moveTo_direct,
} from "./MoveTask";
import { moveBlockCostMatrix } from "./UnitTool";

export class Cre_move extends Cre {
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
