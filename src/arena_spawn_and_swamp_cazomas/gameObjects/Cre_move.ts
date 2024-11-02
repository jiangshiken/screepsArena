import { FindPathOpts } from "game/path-finder";
import { findPath, getDirection } from "game/utils";
import { Event, Event_Pos } from "../utils/Event";
import { valid } from "../utils/JS";
import { COO, GR, Pos, atPos } from "../utils/Pos";
import { findTask } from "../utils/Task";
import { SA, drawLineLight } from "../utils/visual";
import { Cre, getRoundEmptyPos } from "./Cre";
import { FindPathAndMoveTask, MoveTask, getMoveStepDef } from "./findPath";
import { PullEvent } from "./pull";

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
    return (
      this.appointmentMovement !== undefined &&
      this.appointmentMovement.validEvent()
    );
  }
  moveToNormal_setAppointment(tar: Pos, op: FindPathOpts | null = null) {
    this.appointmentMovement = new Event_Pos(tar);
    this.moveToNormal(tar, op);
  }
  exchangePos_setAppointment(tar: Cre_move) {
    SA(this, "exchangePos_setAppointment " + COO(tar));
    this.moveToNormal_setAppointment(tar);
    tar.moveToNormal_setAppointment(this);
  }
  /** find path and move */
  moveToNormal(tar: Pos, op: FindPathOpts | null = null) {
    // SA(this.master, "moveToNormal" + COO(tar))
    this.wantMove = new Event();
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
      this.moveTo_Basic(tar0);
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
      this.moveToJudge(tar, op, step);
    }
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
}
