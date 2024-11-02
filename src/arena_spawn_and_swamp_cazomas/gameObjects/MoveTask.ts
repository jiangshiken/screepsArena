import { CostMatrix, FindPathOpts, FindPathResult } from "game/path-finder";
import { getDirection } from "game/utils";
import { ct, et } from "../utils/CPU";
import { last } from "../utils/JS";
import { GR, Pos } from "../utils/Pos";
import { drawLineComplex, drawLineLight, SA } from "../utils/visual";
import { calEventNumberCPUTime, Cre, isMyTick, Task_Cre } from "./Cre";
import { getMoveStepDef } from "./findPath";
import { blocked } from "./UnitTool";

export const moveBlockCostMatrix: CostMatrix = new CostMatrix();
/**
 * a task used to move
 */
export class MoveTask extends Task_Cre {
  /** target position */
  tar: Pos;
  /** memoryed path*/
  path: Pos[];
  constructor(master: Cre, tar: Pos, path: Pos[] = []) {
    super(master);
    this.tar = tar;
    this.path = path;
    //cancel old task
    let pt = this.master.tasks.find(
      task => task instanceof MoveTask && task != this
    );
    if (pt) pt.end();
  }
  loop_task(): void {
    // SA(this.master, "MoveTask")
    drawLineLight(this.master, this.tar);
    if (this.pause) return;
    if (this.path.length > 0) {
      let tempTar: Pos = this.path[0];
      drawLineComplex(this.master, tempTar, 0.75, "#777777");
      // SA(tempTar,"moveTo tempTar="+COO(tempTar))
      moveTo_basic(tempTar);
      this.master.wantMove = new Event_C();
      //
      if (GR(this.master, tempTar) <= 1) {
        this.path.shift();
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
  findPathStep: number;
  op: FindPathOpts | undefined;
  /** the temparary target ,it will reFindPath if close to it*/
  tempTar: Pos;
  /** default `findPathStep` */
  constructor(
    master: Cre,
    tar: Pos,
    step: number = getMoveStepDef(master),
    op?: FindPathOpts | undefined
  ) {
    super(master, tar);
    this.op = op;
    this.path = this.findPath_task(master, tar);
    //for initialize
    if (this.path.length > 0) {
      let lp = last(this.path);
      if (lp) {
        this.tempTar = lp;
      } else {
        this.tempTar = tar;
      }
    } else this.tempTar = tar;
    //
    this.findPathStep = step;
    // SA(master,"pathLen="+this.path.length)
    // drawPoly(this.path,1,"#aaffaa")
  }
  loop_task(): void {
    let st = ct();
    // SA(this.master, "findPath loop")
    if (!this.tar) {
      this.end();
    }
    if (
      isMyTick(this.master, this.findPathStep) ||
      GR(this.tempTar, this.master) <= 1 ||
      GR(this.tar, this.master) <= 1 ||
      (this.path.length > 0 && blocked(this.path[0]))
    ) {
      this.path = this.findPath_task(this.master, this.tar);
    }
    super.loop_task();
    let t = et(st);
    if (this.master.role) calEventNumberCPUTime(this.master.role, t, false);
  }
  findPath_task(master: Cre, tar: Pos): Pos[] {
    SA(this.master, "findPath_task");
    const sRtn: FindPathResult = master.crePathFinder
      ? master.crePathFinder.getDecideSearchRtnByCre(this.tar, this.op)
      : defFindPathResult;
    const path: Pos[] = sRtn.path;
    if (path.length > 0) {
      const lp = last(path);
      if (lp) {
        this.tempTar = lp;
      } else {
        this.tempTar = tar;
      }
    } else this.tempTar = tar;
    return path;
  }
}
/** normal moveTo,but will block to the tile it want to move next tick */
export function moveTo_basic(cre: Cre, tar: Pos): void {
  moveBlockCostMatrix_setBlock(tar);
  cre.master.moveTo(tar);
}
//move to ,use move() that use direction,not find path
export function moveTo_direct(cre: Cre, tar: Pos): void {
  moveBlockCostMatrix_setBlock(tar);
  const dx = tar.x - cre.master.x;
  const dy = tar.y - cre.master.y;
  const direc = getDirection(dx, dy);
  cre.master.move(direc);
}
export function moveBlockCostMatrix_setBlock(pos: Pos) {
  moveBlockCostMatrix.set(pos.x, pos.y, 255);
}
