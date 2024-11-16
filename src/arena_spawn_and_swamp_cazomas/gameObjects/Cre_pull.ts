//functions

import { CostMatrix } from "game/path-finder";
import { arrayEqual, divide0, last } from "../utils/JS";
import { Adj, COO, Pos, atPos } from "../utils/Pos";
import { ERR } from "../utils/print";
import { findTask } from "../utils/Task";
import { P, SA, drawLineComplex } from "../utils/visual";
import { Cre, Task_Cre } from "./Cre";
import {
  Cre_findPath,
  def_PSC,
  def_plainCost,
  def_stepTime,
  def_swampCost,
  type_MBF,
  type_PSC,
} from "./Cre_findPath";
import { Cre_move, FindPathAndMoveTask, MoveTask, TaskEvent } from "./Cre_move";
import { PullEvent } from "./CreTool";
import { moveBlockCostMatrix } from "./UnitTool";
export type type_PSC_pull = type_PSC | Cre[];
export class Cre_pull extends Cre_move {
  /**
   * new a {@link PullTask}, will cancel if already have same task
   */
  newPullTask(
    tarCre: Cre_move,
    tarPos: Pos,
    step: number = getMoveStepDef_pull([this, tarCre]),
    costMatrix: CostMatrix | undefined = moveBlockCostMatrix,
    PSC: type_PSC = def_PSC
  ) {
    if (this === tarCre) {
      ERR("pullTask same tar");
      return;
    }
    if (atPos(tarCre, tarPos)) {
      return;
    }
    const oldTask = <PullTask | undefined>findTask(this, PullTask);
    let ifNewTask: boolean = false;
    if (oldTask) {
      if (oldTask.tarCre !== tarCre || oldTask.tarPos !== tarPos) {
        ifNewTask = true;
      } else if (oldTask.PSC.plainCost !== PSC.plainCost) {
        ifNewTask = true;
      } else if (oldTask.PSC.swampCost !== PSC.swampCost) {
        ifNewTask = true;
      } else if (oldTask.costMatrix !== costMatrix) {
        ifNewTask = true;
      }
    } else {
      ifNewTask = true;
    }
    if (ifNewTask) {
      new PullTask(this, tarCre, tarPos, step, costMatrix, PSC);
    }
  }
  /**
   * new a {@link PullTarsTask}, will cancel if already have same task
   */
  newPullTarsTask(
    tarCres: Cre_pull[],
    tarPos: Pos,
    step: number = getMoveStepDef_pull(tarCres.concat([this])),
    costMatrix: CostMatrix | undefined = moveBlockCostMatrix,
    plainCost: number = def_plainCost,
    swampCost: number = def_swampCost
  ) {
    if (tarCres.find(i => i === this)) {
      ERR("new pullTarsTask master in tarCres");
      return;
    }
    const oldTask = <PullTarsTask | undefined>findTask(this, PullTarsTask);
    let ifNewTask: boolean = false;
    if (oldTask) {
      if (!arrayEqual(oldTask.tarCres, tarCres) || oldTask.tarPos !== tarPos) {
        ifNewTask = true;
      } else if (oldTask.plainCost !== plainCost) {
        ifNewTask = true;
      } else if (oldTask.swampCost !== swampCost) {
        ifNewTask = true;
      } else if (oldTask.costMatrix !== costMatrix) {
        ifNewTask = true;
      }
    } else {
      ifNewTask = true;
    }
    if (ifNewTask) {
      new PullTarsTask(this, tarCres, tarPos, step);
    }
  }
  /** go to a target Creep ,and let it pull this */
  directBePulled(tar: Cre_pull): boolean {
    SA(tar, "directBePulled");
    const pullingList = tar.getPullingTargetList();
    const lastOne = <Cre_pull>last(pullingList);
    if (Adj(this, lastOne)) {
      lastOne.normalPull(this);
      return true;
    } else {
      this.MT(tar);
      return false;
    }
  }
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
      if (tar instanceof Cre_move) tar.stop();
      tar.highPriorityMoveTaskEvent = pullEve;
      return true;
    } else return false;
  }
  /** move and pull */
  moveAndBePulled(tar: Cre_pull): boolean {
    if (Adj(this, tar)) {
      tar.normalPull(this);
      return true;
    } else {
      this.MT(tar);
      return false;
    }
  }
  /** the Cre[] of this creep is pulling ,include self */
  getPullingTargetList(): Cre_findPath[] {
    let pull_event: PullEvent | undefined = this.pullEvent;
    const rtn: Cre_findPath[] = [];
    rtn.push(this);
    while (pull_event !== undefined && pull_event.validEvent()) {
      if (rtn.find(i => i === pull_event?.bePulledOne) !== undefined) {
        break;
      } else {
        rtn.push(pull_event.bePulledOne);
      }
      pull_event = pull_event.bePulledOne.pullEvent;
    }
    return rtn;
  }
  /** the Cre[] that is pulling this creep ,include self */
  getBePulledTargetList(): Cre_findPath[] {
    let bePulled_event: PullEvent | undefined = this.bePulledEvent;
    const rtn: Cre_findPath[] = [];
    rtn.push(this);
    while (bePulled_event !== undefined && bePulled_event.validEvent()) {
      if (rtn.find(i => i === bePulled_event?.pullOne) !== undefined) {
        break;
      } else {
        rtn.push(bePulled_event.pullOne);
      }
      bePulled_event = bePulled_event.pullOne.pullEvent;
    }
    return rtn;
  }
  /** all Cre[] pulled this or ,is being pulled by this*/
  getAllPullTargetList(): Cre_findPath[] {
    const pt1 = this.getPullingTargetList();
    const pt2 = this.getBePulledTargetList();
    const rtn = pt1.concat(pt2);
    rtn.shift();
    return rtn;
  }
}

/**
 * Task of pull ,the creep will pull a creep to a position
 * @param nextStep the pos creep will go next ,
 *  if is undefined the creep will move random at last position of path
 */
export class PullTask extends Task_Cre {
  readonly master: Cre_pull;
  readonly tarCre: Cre_move;
  readonly tarPos: Pos;
  readonly step: number;
  moveTaskTar: FindPathAndMoveTask | undefined = undefined;
  moveTask1: FindPathAndMoveTask | undefined = undefined;
  moveTask2: FindPathAndMoveTask | undefined = undefined;
  readonly costMatrix: CostMatrix | undefined;
  readonly PSC: type_PSC;
  readonly randomMoveAtEnd: boolean;
  constructor(
    master: Cre_pull,
    tarCre: Cre_move,
    tarPos: Pos,
    step: number = getMoveStepDef_pull([master, tarCre]),
    costMatrix: CostMatrix | undefined = moveBlockCostMatrix,
    PSC: type_PSC = def_PSC,
    randomMoveAtEnd: boolean = false
  ) {
    super(master);
    this.master = master;
    this.tarCre = tarCre;
    this.tarPos = tarPos;
    this.step = step;
    this.costMatrix = costMatrix;
    this.PSC = PSC;
    this.randomMoveAtEnd = randomMoveAtEnd;
    this.cancelOldTask(PullTask);
    if (Adj(this.master, this.tarCre)) {
      SA(this.master, "MT1END");
    } else {
      this.moveTaskTar = new FindPathAndMoveTask(
        this.tarCre,
        this.master,
        this.step,
        this.costMatrix,
        this.PSC
      );
      this.tarCre.highPriorityMoveTaskEvent = new TaskEvent(this);
      this.moveTask1 = new FindPathAndMoveTask(
        this.master,
        this.tarCre,
        this.step,
        this.costMatrix,
        this.PSC
      );
    }
  }
  end() {
    super.end();
    this.moveTask1?.end();
    this.moveTask2?.end();
  }
  getMaster(): Cre_pull {
    return this.master;
  }
  loop_task(): void {
    SA(this.master, "PullTask_loop");
    if (Adj(this.master, this.tarCre)) {
      this.moveTask1?.end();
      this.moveTaskTar?.end();
      SA(this.tarCre, "normalPull " + COO(this.master));
      this.master.normalPull(this.tarCre);
      if (!this.moveTask2) {
        SA(this.master, "NMT2");
        this.moveTask2 = new FindPathAndMoveTask(
          this.master,
          this.tarPos,
          this.step,
          this.costMatrix,
          this.PSC
        );
      } else if (this.moveTask2.complete) {
        //master at pos
        if (this.randomMoveAtEnd) {
          this.master.randomMove();
        }
        this.end();
      } else if (atPos(this.tarCre, this.tarPos)) {
        //tar at pos
        SA(this.master, "AP");
        this.end();
      }
    } else {
      this.end();
    }
  }
}

/**
 * pull a group of creep to a position
 */
export class PullTarsTask extends Task_Cre {
  readonly master: Cre_pull;
  tarCres: Cre_pull[];
  readonly tarPos: Pos;
  readonly step: number;
  readonly costMatrix: CostMatrix | undefined;
  readonly plainCost: number;
  readonly swampCost: number;
  constructor(
    master: Cre_pull,
    tarCres: Cre_pull[],
    tarPos: Pos,
    step: number = getMoveStepDef_pull(tarCres.concat([master])),
    costMatrix: CostMatrix | undefined = moveBlockCostMatrix,
    plainCost: number = def_plainCost,
    swampCost: number = def_swampCost
  ) {
    super(master);
    this.master = master;
    SA(master, "new PT Task");
    this.tarCres = tarCres;
    this.tarPos = tarPos;
    this.step = step;
    this.costMatrix = costMatrix;
    this.plainCost = plainCost;
    this.swampCost = swampCost;
    //cancel old task
    this.cancelOldTask(PullTarsTask);
  }
  end(): void {
    super.end();
    findTask(this.master, MoveTask)?.end();
    this.tarCres.forEach(i => findTask(i, MoveTask)?.end());
  }
  loop_task(): void {
    // if have pull task
    SA(this.master, "PTTask loop");
    //remove unexist tar
    this.tarCres = this.tarCres.filter(i => i.exists);
    if (atPos(this.master, this.tarPos)) {
      this.end();
    }
    if (this.tarCres.length === 0) {
      this.end();
    }
    //let tar be linked
    let allPulling = true; //if all being pulled
    for (let i = 0; i < this.tarCres.length; i++) {
      const tar = this.tarCres[i];
      const tar_target = i === 0 ? this.master : this.tarCres[i - 1];
      if (!Adj(tar, tar_target)) {
        SA(tar, "try connect");
        allPulling = false;
        tar.MT(tar_target);
        tar.highPriorityMoveTaskEvent = new TaskEvent(this);
      } else {
        tar_target.normalPull(tar);
      }
    }
    if (!allPulling) {
      SA(this.master, "find tarCres");
      if (Adj(this.master, this.tarCres[0])) {
        this.master.MT(this.tarPos);
      } else {
        this.master.MT(this.tarCres[0]);
      }
    } else {
      SA(this.master, "all pulling");
      this.master.MT(this.tarPos);
    }
  }
}
/** get move and fatigue number of a creep ,all pulling and bePulled will
 *  be calculate too
 */
export function getMoveAndFatigueNum_pull(
  pullList: Cre_findPath[],
  extraEnergy: number = 0,
  purePlain: boolean = false,
  pureSwamp: boolean = false
): type_MBF {
  try {
    const pl = pullList;
    let moveNum = 0;
    let bodyNum = 0;
    let fatigueNum = 0;
    for (let tar of pl) {
      const mfRtn = tar.getMoveAndFatigueNum(extraEnergy, purePlain, pureSwamp);
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
export function getMoveTimeByTerrain_pull(
  pullList: Cre_findPath[],
  extraEnergy: number = 0,
  purePlain: boolean = false,
  pureSwamp: boolean = false
): number {
  const mb = getMoveAndFatigueNum_pull(
    pullList,
    extraEnergy,
    purePlain,
    pureSwamp
  );
  const time = Math.ceil(divide0(mb.fatigueNum, 2 * mb.moveNum, Infinity));
  return Math.max(1, time);
}
export function getMoveTime_general_pull(pullList: Cre_findPath[]): number {
  const timeOnPlain = getMoveTimeByTerrain_pull(pullList, 0, true);
  const timeOnSwamp = getMoveTimeByTerrain_pull(pullList, 0, false, true);
  return def_plainCost * timeOnPlain + def_swampCost * timeOnSwamp;
}
export function getSpeed_pull(pullList: Cre_findPath[]): number {
  return 1 / getMoveTimeByTerrain_pull(pullList);
}
export function getSpeed_general_pull(pullList: Cre_findPath[]): number {
  return 1 / getMoveTime_general_pull(pullList);
}
export function isFullSpeed_pull(pullList: Cre_findPath[]): boolean {
  return getMoveTimeByTerrain_pull(pullList) === 1;
}
export function getMoveStepDef_pull(pullList: Cre_findPath[]): number {
  return def_stepTime * getMoveTimeByTerrain_pull(pullList);
}
