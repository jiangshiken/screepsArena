//functions

import { CostMatrix } from "game/path-finder";
import { arrayEqual, last } from "../utils/JS";
import { Adj, COO, Pos, atPos } from "../utils/Pos";
import { ERR } from "../utils/print";
import { findTask } from "../utils/Task";
import { SA, drawLineComplex } from "../utils/visual";
import { Cre, Task_Cre } from "./Cre";
import { Cre_move } from "./Cre_move";
import { moveToRandomEmptyAround } from "./CreCommands";
import { PullEvent } from "./CreTool";
import { def_plainCost, def_swampCost, getMoveStepDef } from "./findPath";
import { FindPathAndMoveTask, MoveTask, moveTo_direct } from "./MoveTask";
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
  readonly master: Cre_move;
  readonly tarCre: Cre;
  readonly tarPos: Pos;
  readonly step: number;
  moveTaskTar: FindPathAndMoveTask | undefined = undefined;
  moveTask1: FindPathAndMoveTask | undefined = undefined;
  moveTask2: FindPathAndMoveTask | undefined = undefined;
  readonly costMatrix: CostMatrix | undefined;
  readonly plainCost: number;
  readonly swampCost: number;
  readonly randomMoveAtEnd: boolean;
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
      this.moveTaskTar = new FindPathAndMoveTask(
        this.tarCre,
        this.master,
        [this.tarCre],
        this.step,
        this.costMatrix,
        this.plainCost,
        this.swampCost
      );
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
      this.moveTaskTar?.end();
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
    return false;
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
  tarCres: Cre_move[],
  tarPos: Pos,
  step: number = getMoveStepDef(tarCres.concat([master])),
  costMatrix: CostMatrix | undefined = moveBlockCostMatrix,
  plainCost: number = def_plainCost,
  swampCost: number = def_swampCost
) {
  if (tarCres.find(i => i === master)) {
    ERR("new pullTarsTask master in tarCres");
    return;
  }
  const oldTask = <PullTarsTask | undefined>findTask(master, PullTarsTask);
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
    new PullTarsTask(master, tarCres, tarPos, step);
  }
}
/**
 * pull a group of creep to a position
 */
export class PullTarsTask extends Task_Cre {
  readonly master: Cre_move;
  tarCres: Cre_move[];
  readonly tarPos: Pos;
  readonly step: number;
  readonly costMatrix: CostMatrix | undefined;
  readonly plainCost: number;
  readonly swampCost: number;
  constructor(
    master: Cre_move,
    tarCres: Cre_move[],
    tarPos: Pos,
    step: number = getMoveStepDef(tarCres.concat([master])),
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
        tar.MTJ(tar_target);
      } else {
        normalPull(tar_target, tar);
      }
    }
    if (!allPulling) {
      SA(this.master, "find tarCres");
      this.master.MTJ(this.tarCres[0]);
    } else {
      SA(this.master, "all pulling");
      this.master.MTJ(this.tarPos);
    }
  }
}
