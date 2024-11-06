//functions

import { SOA } from "../utils/export";
import { arrayEqual, invalid, last, remove, valid } from "../utils/JS";
import { GR, Pos, atPos } from "../utils/Pos";
import { findTask } from "../utils/Task";
import { SA, drawLineComplex } from "../utils/visual";
import { Cre, Task_Cre } from "./Cre";
import { Cre_move } from "./Cre_move";
import { moveToRandomEmptyAround } from "./CreCommands";
import { PullEvent } from "./CreTool";
import { getSpeed } from "./findPath";
import { FindPathAndMoveTask, moveTo_basic, moveTo_direct } from "./MoveTask";

/**
 * new a {@link PullTarsTask}, will cancel if already have same task
 */
export function newPullTarsTask(
  master: Cre_move,
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
  master: Cre_move,
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
/**
 * Task of pull ,the creep will pull a creep to a position
 * @param nextStep the pos creep will go next ,
 *  if is undefined the creep will move random at last position of path
 */
export class PullTask extends Task_Cre {
  master: Cre_move;
  tarCre: Cre;
  tarPos: Pos;
  nextStep: Pos | undefined;
  moveTask1: FindPathAndMoveTask | undefined = undefined;
  moveTask2: FindPathAndMoveTask | undefined = undefined;
  leaderStop: boolean;
  constructor(
    master: Cre_move,
    tarCre: Cre,
    tarPos: Pos,
    nextStep?: Pos,
    leaderStop: boolean = false
  ) {
    super(master);
    this.master = master;
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
      let ptRtn = normalPull(this.master, this.tarCre, true);
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
              [this.master, this.tarCre],
              1,
              undefined,
              1,
              1
            );
          }
        } else if (this.moveTask2.complete) {
          //master at pos
          // SA(this.master, "this.moveTask2.complete end");
          if (this.nextStep) moveTo_basic(this.master, this.nextStep);
          else moveToRandomEmptyAround(this.master);
          this.end();
        } else if (atPos(this.tarCre, this.tarPos)) {
          //tar at pos
          this.end();
        } else {
          //wait moveTask2 complete
        }
      } else {
        this.end();
      }
    } else {
      //do mis 1, move to tarCre
    }
  }
}

/** go to a target Creep ,and const it pull this */
export function directBePulled(cre: Cre, tar: Cre): boolean {
  SA(tar, "directBePulled");
  const tl = getPullingTargetList(tar);
  SA(tar, "getIsPullingTargetList=" + SOA(tl));
  let lastOne = last(tl);
  if (lastOne === undefined) {
    return false;
  }
  if (lastOne === cre) {
    //do not need?
    SA(tar, "lastOne==this");
    lastOne = tl[tl.length - 2];
  }
  const pte = cre.bePulledEvent;
  if (pte != undefined && pte.validEvent(1) && pte.pullOne === lastOne) {
    //if is being pulled
    const OneWhoPullCre = pte.pullOne;
    normalPull(OneWhoPullCre, cre);
    return true;
  } else {
    // if not being pulled
    if (invalid(lastOne)) {
      return false;
    } else if (GR(cre, lastOne) > 1) {
      // SA(this,"MTJ="+COO(lastOne));
      moveTo_basic(cre, lastOne);
      return false;
    } else {
      if (normalPull(lastOne, cre))
        //lastOne.pullingTarget.target=cre
        return true;
      else return false;
    }
  }
}
/** pull  */
export function normalPull(
  cre: Cre,
  tar: Cre,
  direct: boolean = false
): boolean {
  if (GR(cre, tar) <= 1) {
    //draw green line
    drawLineComplex(cre, tar, 0.5, "#00ff00");
    //pull
    cre.master.pull(tar.master);
    //set Event
    cre.pullEvent = new PullEvent(cre, tar);
    tar.bePulledEvent = new PullEvent(cre, tar);
    //tar move this
    if (direct) {
      // tar.moveToDirect(this);
      moveTo_direct(tar, cre);
    } else {
      moveTo_basic(tar, cre);
    }
    return true;
  } else return false;
}
/** move and pull */
export function pullTar(cre: Cre, tar: Cre): boolean {
  const range = GR(cre, tar);
  if (range > 1) {
    moveTo_basic(cre, tar);
    return false;
  } else {
    normalPull(cre, tar);
    return true;
  }
}

/** move and pull */
export function moveAndBePulled(cre: Cre, tar: Cre): boolean {
  const range = GR(cre, tar);
  if (range > 1) {
    moveTo_basic(cre, tar);
    return false;
  } else {
    normalPull(tar, cre);
    return true;
  }
}
/** the Cre[] of this creep is pulling ,include self */
export function getPullingTargetList(cre: Cre): Cre[] {
  let pe: PullEvent | undefined = cre.pullEvent;
  const rtn: Cre[] = [];
  rtn.push(cre);
  while (pe !== undefined && pe.validEvent()) {
    if (rtn.find(i => i === pe?.bePulledOne) !== undefined) {
      break;
    } else {
      rtn.push(pe.bePulledOne);
    }
    pe = pe.bePulledOne.pullEvent;
  }
  return rtn;
}
/** the Cre[] that is pulling this creep ,include self */
export function getBePullingTargetList(cre: Cre): Cre[] {
  let pe: PullEvent | undefined = cre.bePulledEvent;
  const rtn: Cre[] = [];
  rtn.push(cre);
  while (pe !== undefined && pe.validEvent()) {
    if (rtn.find(i => i === pe?.pullOne) !== undefined) {
      break;
    } else {
      rtn.push(pe.pullOne);
    }
    pe = pe.pullOne.pullEvent;
  }
  return rtn;
}
/** all Cre[] pulled this or ,is being pulled by this*/
export function getAllPullTargetList(cre: Cre): Cre[] {
  const pt1 = getPullingTargetList(cre);
  const pt2 = getBePullingTargetList(cre);
  const rtn = pt1.concat(pt2);
  rtn.shift();
  return rtn;
}
/**
 * pull a group of creep to a position
 * @param nextStep the pos creep will go next ,
 *  if is undefined the creep will move random at last position of path
 */
export class PullTarsTask extends Task_Cre {
  master: Cre_move;
  tarCres: Cre[];
  tarPos: Pos;
  nextStep: Pos | undefined;
  useLeaderPull: boolean;
  leaderStop: boolean;
  constructor(
    master: Cre_move,
    tarCres: Cre[],
    tarPos: Pos,
    nextStep?: Pos,
    useLeaderPull: boolean = true,
    leaderStop: boolean = false //for direct move of leader
  ) {
    super(master);
    this.master = master;
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
  }
  loop_task(): void {
    // if have pull task
    SA(this.master, "PullTarsTask loop_task");
    let tarCres = this.tarCres;
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
      //
      // SA(this.master, "try pull tar");
      // let pulling=tar.pullTar(tarNext);
      let pulling = moveAndBePulled(tarNext, tar);
      if (!pulling) {
        allPulling = false;
        let tarSpeed = getSpeed([tarNext]);
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
      SA(this.master, "allPulling");
      // SA(this.master, "tarCres[0]=" + COO(tarCres[0]));
      // SA(this.master, "this.tarPos=" + COO(this.tarPos));
      // SA(this.master, "this.nextStep=" + COO(this.nextStep));
      if (tarCres.length === 0) {
        this.master.MTJ(this.tarPos);
      } else {
        newPullTask(
          this.master,
          tarCres[0],
          this.tarPos,
          this.nextStep,
          this.leaderStop
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
