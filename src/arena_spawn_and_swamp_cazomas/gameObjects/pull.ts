//functions

import { CostMatrix } from "game/path-finder";
import { arrayEqual, last, remove, valid } from "../utils/JS";
import { Adj, COO, Pos, atPos } from "../utils/Pos";
import { ERR } from "../utils/print";
import { findTask } from "../utils/Task";
import { SA, drawLineComplex } from "../utils/visual";
import { Cre, Task_Cre } from "./Cre";
import { Cre_move } from "./Cre_move";
import { moveToRandomEmptyAround } from "./CreCommands";
import { PullEvent } from "./CreTool";
import {
  def_plainCost,
  def_swampCost,
  getMoveStepDef,
  getSpeed,
} from "./findPath";
import { FindPathAndMoveTask, moveTo_basic, moveTo_direct } from "./MoveTask";
import { moveBlockCostMatrix } from "./UnitTool";

/**
 * new a {@link PullTask}, will cancel if already have same task
 */
export function newPullTask(
  master: Cre_move,
  tarCre: Cre,
  tarPos: Pos,
  step: number = getMoveStepDef([master, tarCre]),
  costMatrix: CostMatrix | undefined = moveBlockCostMatrix,
  plainCost: number = def_plainCost,
  swampCost: number = def_swampCost
) {
  if (master === tarCre) {
    ERR("pullTask same tar");
    return;
  }
  if (atPos(tarCre, tarPos)) {
    return;
  }
  const oldTask = <PullTask | undefined>findTask(master, PullTask);
  let ifNewTask: boolean = false;
  if (oldTask) {
    if (oldTask.tarCre !== tarCre || oldTask.tarPos !== tarPos) {
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
    new PullTask(
      master,
      tarCre,
      tarPos,
      step,
      costMatrix,
      plainCost,
      swampCost
    );
  }
}
/**
 * Task of pull ,the creep will pull a creep to a position
 * @param nextStep the pos creep will go next ,
 *  if is undefined the creep will move random at last position of path
 */
export class PullTask extends Task_Cre {
  master: Cre_move;
  tarCre: Cre;
  tarPos: Pos;
  step: number;
  moveTask1: FindPathAndMoveTask | undefined = undefined;
  moveTask2: FindPathAndMoveTask | undefined = undefined;
  costMatrix: CostMatrix | undefined;
  plainCost: number;
  swampCost: number;
  randomMoveAtEnd: boolean;
  constructor(
    master: Cre_move,
    tarCre: Cre,
    tarPos: Pos,
    step: number = getMoveStepDef([master, tarCre]),
    costMatrix: CostMatrix | undefined = moveBlockCostMatrix,
    plainCost: number = def_plainCost,
    swampCost: number = def_swampCost,
    randomMoveAtEnd: boolean = false
  ) {
    super(master);
    this.master = master;
    this.tarCre = tarCre;
    this.tarPos = tarPos;
    this.step = step;
    this.costMatrix = costMatrix;
    this.plainCost = plainCost;
    this.swampCost = swampCost;
    this.randomMoveAtEnd = randomMoveAtEnd;
    this.cancelOldTask(PullTask);
    if (Adj(this.master, this.tarCre)) {
      SA(this.master, "MT1END");
    } else {
      this.moveTask1 = new FindPathAndMoveTask(
        this.master,
        this.tarCre,
        [this.master],
        this.step,
        this.costMatrix,
        this.plainCost,
        this.swampCost
      );
    }
  }
  end() {
    super.end();
    this.moveTask1?.end();
    this.moveTask2?.end();
  }
  getMaster(): Cre_move {
    return this.master;
  }
  loop_task(): void {
    SA(this.master, "PullTask_loop");
    if (Adj(this.master, this.tarCre)) {
      this.moveTask1?.end();
      SA(this.tarCre, "normalPull " + COO(this.master));
      normalPull(this.master, this.tarCre);
      if (!this.moveTask2) {
        SA(this.master, "NMT2");
        this.moveTask2 = new FindPathAndMoveTask(
          this.master,
          this.tarPos,
          [this.master, this.tarCre],
          this.step,
          this.costMatrix,
          this.plainCost,
          this.swampCost
        );
      } else if (this.moveTask2.complete) {
        //master at pos
        if (this.randomMoveAtEnd) {
          moveToRandomEmptyAround(this.master);
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

/** go to a target Creep ,and let it pull this */
export function directBePulled(cre: Cre_move, tar: Cre): boolean {
  SA(tar, "directBePulled");
  const pullingList = getPullingTargetList(tar);
  const lastOne = <Cre>last(pullingList);
  if (Adj(cre, lastOne)) {
    normalPull(lastOne, cre);
    return true;
  } else {
    cre.MTJ(tar);
  }
}
/** pull  */
export function normalPull(cre: Cre, tar: Cre): boolean {
  if (Adj(cre, tar)) {
    //draw green line
    drawLineComplex(cre, tar, 0.7, "#00ff22");
    //pull
    cre.master.pull(tar.master);
    //set Event
    cre.pullEvent = new PullEvent(cre, tar);
    tar.bePulledEvent = new PullEvent(cre, tar);
    //tar move this
    SA(tar, "PMTD " + COO(cre));
    moveTo_direct(tar, cre);
    return true;
  } else return false;
}
/** move and pull */
export function moveAndBePulled(cre: Cre_move, tar: Cre): boolean {
  if (Adj(cre, tar)) {
    normalPull(tar, cre);
    return true;
  } else {
    cre.MTJ(tar);
    return false;
  }
}
/** the Cre[] of this creep is pulling ,include self */
export function getPullingTargetList(cre: Cre): Cre[] {
  let pull_event: PullEvent | undefined = cre.pullEvent;
  const rtn: Cre[] = [];
  rtn.push(cre);
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
export function getBePulledTargetList(cre: Cre): Cre[] {
  let bePulled_event: PullEvent | undefined = cre.bePulledEvent;
  const rtn: Cre[] = [];
  rtn.push(cre);
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
export function getAllPullTargetList(cre: Cre): Cre[] {
  const pt1 = getPullingTargetList(cre);
  const pt2 = getBePulledTargetList(cre);
  const rtn = pt1.concat(pt2);
  rtn.shift();
  return rtn;
}
/**
 * new a {@link PullTarsTask}, will cancel if already have same task
 */
export function newPullTarsTask(
  master: Cre_move,
  tarCres: Cre[],
  tarPos: Pos,
  step: number = getMoveStepDef(tarCres.concat([master]))
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
    new PullTarsTask(master, tarCres, tarPos, step, nextStep);
  }
}
/**
 * pull a group of creep to a position
 */
export class PullTarsTask extends Task_Cre {
  master: Cre_move;
  tarCres: Cre[];
  tarPos: Pos;
  step: number;
  nextStep: Pos | undefined;
  useLeaderPull: boolean;
  leaderStop: boolean;
  costMatrix: CostMatrix | undefined;
  plainCost: number;
  swampCost: number;
  constructor(
    master: Cre_move,
    tarCres: Cre[],
    tarPos: Pos,
    step: number = getMoveStepDef(tarCres.concat([master])),
    nextStep?: Pos,
    useLeaderPull: boolean = true,
    leaderStop: boolean = false, //for direct move of leader
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
    this.nextStep = nextStep;
    this.useLeaderPull = useLeaderPull;
    this.leaderStop = leaderStop;
    this.costMatrix = costMatrix;
    this.plainCost = plainCost;
    this.swampCost = swampCost;
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
  }
  loop_task(): void {
    // if have pull task
    SA(this.master, "PullTarsTask loop_task");
    let tarCres = this.tarCres;
    if (tarCres.find(i => i === this.master)) {
      SA(this.master, "PULL SELF");
      this.end();
    }
    let allPulling = true; //if all being pulled
    //remove unexist tar
    for (let tar of tarCres) {
      if (!tar.master.exists) {
        remove(tarCres, tar);
      }
    }
    //let tar be linked
    let creIdle = true;
    for (let i = 0; i < tarCres.length - 1; i++) {
      let tar = tarCres[i];
      let tarNext = tarCres[i + 1];
      let pulling = moveAndBePulled(tarNext, tar);
      if (!pulling) {
        SA(this.master, "not pulling");
        allPulling = false;
        let tarSpeed = getSpeed([tarNext]);
        if (
          this.useLeaderPull &&
          creIdle &&
          (tarSpeed < 1 || !tar.hasMoveBodyPart())
        ) {
          //go pull this tar
          newPullTask(this.master, tarNext, tar);
          creIdle = false;
        }
      }
    }
    if (allPulling) {
      //if all pulled
      SA(this.master, "allPulling");
      if (tarCres.length === 0) {
        this.master.MTJ(this.tarPos);
      } else {
        SA(this.master, "newPullTask" + COO(tarCres[0]));
        newPullTask(
          this.master,
          tarCres[0],
          this.tarPos,
          this.step,
          this.nextStep,
          this.leaderStop,
          this.costMatrix,
          this.plainCost,
          this.swampCost
        );
      }
    } else if (creIdle) {
      //this is idle,approach first
      SA(this.master, "creIdle");
      moveTo_basic(this.master, tarCres[0]);
    } else {
      SA(this.master, "not all pulling");
    }
  }
}
