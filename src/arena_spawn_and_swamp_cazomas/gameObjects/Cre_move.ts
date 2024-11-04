import { CostMatrix } from "game/path-finder";
import { Event_Pos } from "../utils/Event";
import { COO, GR, Pos, atPos } from "../utils/Pos";
import { findTask } from "../utils/Task";
import { SA, drawLineLight } from "../utils/visual";
import { Cre, getRoundEmptyPos, hasThreat } from "./Cre";
import {
  def_plainCost,
  def_swampCost,
  getMoveStepDef,
  searchPath_flee,
} from "./findPath";
import { enemies } from "./GameObjectInitialize";
import { FindPathAndMoveTask, MoveTask, moveTo_basic } from "./MoveTask";

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
  MTJ_stop(
    tar: Pos,
    pullList: Cre[] = [this],
    step: number = getMoveStepDef(pullList),
    costMatrix: CostMatrix | undefined = undefined,
    plainCost: number = def_plainCost,
    swampCost: number = def_swampCost
  ): void {
    if (GR(this, tar) <= 1) {
      this.stop();
    } else {
      this.MTJ(tar, pullList, step, costMatrix, plainCost, swampCost);
    }
  }
  randomMove() {
    const pos: Pos | undefined = getRoundEmptyPos(this);
    if (pos) {
      this.MTJ(pos);
    }
  }
  flee(
    range: number = 4,
    FleeRange: number = 7,
    costMatrix: CostMatrix | undefined = undefined,
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
      const tar = spf.path[0];
      if (tar) {
        moveTo_basic(this, tar);
      }
      return true;
    } else {
      return false;
    }
  }
  useAppointMovement(validTick: number = 0): boolean {
    const app = this.appointmentMovement;
    if (app && app.validEvent(validTick)) {
      this.MTJ(app);
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
  MTJ(
    tar: Pos,
    pullList: Cre[] = [this],
    step: number = getMoveStepDef(pullList),
    costMatrix: CostMatrix | undefined = undefined,
    plainCost: number = def_plainCost,
    swampCost: number = def_swampCost
  ): void {
    // SA(this,"moveTo1="+coordinate(tar));
    drawLineLight(this.master, tar);
    let theSame: boolean = true;
    const currentMoveTask: MoveTask | undefined = findTask(this, MoveTask);
    // SA(this,"currentMoveTask="+S(currentMoveTask));
    if (currentMoveTask && currentMoveTask instanceof FindPathAndMoveTask) {
      // SA(this,"currentMoveTask.tar="+COO(currentMoveTask.tar));
      // SA(this,"tar="+COO(tar));
      //if is not the same pos
      if (!atPos(currentMoveTask.tar, tar)) {
        theSame = false;
      } else if (currentMoveTask.plainCost !== plainCost) {
        theSame = false;
      } else if (currentMoveTask.swampCost !== swampCost) {
        theSame = false;
      } else if (currentMoveTask.costMatrix !== costMatrix) {
        theSame = false;
      }
    } else theSame = false;
    // SA(this,"theSame="+theSame)
    if (!theSame) {
      //add new move task
      // SA(this,"FindPathAndMoveTask");
      new FindPathAndMoveTask(
        this,
        tar,
        pullList,
        step,
        costMatrix,
        plainCost,
        swampCost
      );
    } else if (currentMoveTask) {
      currentMoveTask.pause = false;
    }
  }
}
