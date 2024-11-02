
//functions
/**
 * new a {@link PullTarsTask}, will cancel if already have same task
 */
export function newPullTarsTask(
    master: Cre,
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
    master: Cre,
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
  // export let pullGoSwamp: Boolean = false
  // export function setPullGoSwamp(b: Boolean) {
  // 	pullGoSwamp = b
  // }
  // export let pullIgnoreSwamp: Boolean = false
  // export function set_pullIgnoreSwamp(b: Boolean) {
  // 	pullIgnoreSwamp = b
  // }
  /**
   * Task of pull ,the creep will pull a creep to a position
   * @param nextStep the pos creep will go next ,
   *  if is undefined the creep will move random at last position of path
   */
  export class PullTask extends Task_Cre {
    tarCre: Cre;
    tarPos: Pos;
    nextStep: Pos | undefined;
    moveTask1: FindPathAndMoveTask | undefined = undefined;
    moveTask2: FindPathAndMoveTask | undefined = undefined;
    leaderStop: boolean;
    constructor(
      master: Cre,
      tarCre: Cre,
      tarPos: Pos,
      nextStep?: Pos,
      leaderStop: boolean = false
    ) {
      super(master);
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
        let ptRtn = this.master.normalPull(this.tarCre, true);
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
                1,
                { plainCost: 1, swampCost: 1 }
              );
            }
          } else if (this.moveTask2.complete) {
            //master at pos
            // SA(this.master, "this.moveTask2.complete end");
            if (this.nextStep) this.master.moveToNormal(this.nextStep);
            else moveToRandomEmptyAround(this.master);
            this.end();
          } else if (atPos(this.tarCre, this.tarPos)) {
            //tar at pos
            // SA(this.master, "pull task end");
            this.end();
          } else {
            //wait moveTask2 complete
          }
        } else {
          this.end();
        }
      } else {
        //do mis 1, move to tarCre
        // SA(this.master, "this.tarCre=" + COO(this.tarCre));
      }
    }
  }

  /** represent a event of pull function */
  export class PullEvent extends Event_C {
    /** one who pulled other creep */
    pullOne: Cre;
    /** one who be pulled */
    bePulledOne: Cre;
    constructor(pullOne: Cre, bePulledOne: Cre) {
      super();
      this.pullOne = pullOne;
      this.bePulledOne = bePulledOne;
    }
  }

    /** go to a target Creep ,and const it pull this */
    directBePulled(tar: Cre): boolean {
      SA(tar, "directBePulled");
      const tl = tar.getPullingTargetList();
      SA(tar, "getIsPullingTargetList=" + SOA(tl));
      let lastOne = last(tl);
      if (lastOne === undefined) {
        return false;
      }
      if (lastOne === this) {
        //do not need?
        SA(tar, "lastOne==this");
        lastOne = tl[tl.length - 2];
      }
      const pte = this.bePulledTarget;
      if (pte != undefined && validEvent(pte, 1) && pte.pullOne === lastOne) {
        //if is being pulled
        const OneWhoPullCre = pte.pullOne;
        OneWhoPullCre.normalPull(this);
        return true;
      } else {
        // if not being pulled
        if (invalid(lastOne)) {
          return false;
        } else if (GR(this, lastOne) > 1) {
          // SA(this,"MTJ="+COO(lastOne));
          this.MTJ(lastOne);
          return false;
        } else {
          if (lastOne.normalPull(this))
            //lastOne.pullingTarget.target=cre
            return true;
          else return false;
        }
      }
    }
    /** pull  */
    normalPull(tar: Cre, direct: boolean = false): boolean {
      if (GR(this, tar) <= 1) {
        //draw green line
        drawLineComplex(this, tar, 0.5, "#00ff00");
        //pull
        this.master.pull(tar.master);
        //set Event
        const pe = new PullEvent(this, tar);
        this.pullTarget = pe;
        tar.bePulledTarget = pe;
        //tar move this
        if (direct) {
          // tar.moveToDirect(this);
          tar.crePathFinder?.moveTo_Basic_Direct(this);
        } else {
          tar.moveToNormal(this);
        }
        return true;
      } else return false;
    }
    /** move and pull */
    pullTar(tar: Cre): boolean {
      const range = getRange(this, tar);
      if (range > 1) {
        //go to tar
        this.MTJ(tar);
        // sayAppend(this," move to tar ");
        return false;
      } else {
        // pull it
        // MTJ(tar,this);
        this.normalPull(tar);
        this.stopByTar(tar); //TODO
        // sayAppend(this," pulling tar");
        return true;
      }
    }


    /** move and pull */
    moveAndBePulled(tar: Cre): boolean {
      const range = getRange(this, tar);
      if (range > 1) {
        //go to tar
        this.MTJ(tar);
        // sayAppend(this," move to tar ");
        return false;
      } else {
        // pull it
        // MTJ(tar,this);
        tar.normalPull(this);
        this.stopByTar(tar); //TODO
        // sayAppend(this," pulling tar");
        return true;
      }
    }
    /** the Cre[] of this creep is pulling ,include self */
    getPullingTargetList(): Cre[] {
      let pt = this.pullTarget;
      const rtn: Cre[] = [];
      rtn.push(this);
      let w = 20;
      while (pt && validEvent(pt, 1)) {
        w -= 1;
        if (w <= 0) {
          break;
        }
        rtn.push(pt.bePulledOne);
        pt = pt.bePulledOne.pullTarget;
      }
      return rtn;
    }
    /** the Cre[] that is pulling this creep ,include self */
    getBePullingTargetList(): Cre[] {
      let pt = this.bePulledTarget;
      const rtn: Cre[] = [];
      rtn.push(this);
      let w = 10;
      while (pt && validEvent(pt, 1)) {
        w -= 1;
        if (w <= 0) {
          break;
        }
        rtn.push(pt.pullOne);
        pt = pt.pullOne.bePulledTarget;
      }
      return rtn;
    }
    /** all Cre[] pulled this or ,is being pulled by this*/
    getAllPullTargetList(): Cre[] {
      var pt1 = this.getPullingTargetList();
      var pt2 = this.getBePullingTargetList();
      var rtn = pt1.concat(pt2);
      rtn.shift();
      return rtn;
    }
  /**
   * pull a group of creep to a position
   * @param nextStep the pos creep will go next ,
   *  if is undefined the creep will move random at last position of path
   */
  export class PullTarsTask extends Task_Cre {
    tarCres: Cre[];
    tarPos: Pos;
    nextStep: Pos | undefined;
    useLeaderPull: boolean;
    leaderStop: boolean;
    constructor(
      master: Cre,
      tarCres: Cre[],
      tarPos: Pos,
      nextStep?: Pos,
      useLeaderPull: boolean = true,
      leaderStop: boolean = false //for direct move of leader
    ) {
      super(master);
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
      // for (let tar of this.tarCres) {
      // 	tar.tasks.find(i => i instanceof PullTask)?.end()
      // }
    }
    loop_task(): void {
      // if have pull task
      SA(this.master, "PullTarsTask loop_task");
      let tarCres = this.tarCres;
      let allPulling = true; //if all being pulled
      //remove unexist tar
      for (let tar of tarCres) {
        if (!exist(tar)) {
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
        let pulling = tarNext.moveAndBePulled(tar);
        if (!pulling) {
          allPulling = false;
          let tarSpeed = tarNext.getSpeed();
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
        // SA(this.master, "allPulling");
        // SA(this.master, "tarCres[0]=" + COO(tarCres[0]));
        // SA(this.master, "this.tarPos=" + COO(this.tarPos));
        // SA(this.master, "this.nextStep=" + COO(this.nextStep));
        newPullTask(
          this.master,
          tarCres[0],
          this.tarPos,
          this.nextStep,
          this.leaderStop
        );
      } else if (creIdle) {
        //this is idle,approach first
        this.master.MTJ(tarCres[0]);
      } else {
      }
    }
  }
