import { CostMatrix, FindPathResult } from "game/path-finder";
import { getDirection } from "game/utils";
import { ct, et } from "../utils/CPU";
import { tick } from "../utils/game";
import { last } from "../utils/JS";
import { Adj, atPos, GR, Pos } from "../utils/Pos";
import { ERR } from "../utils/print";
import { drawLineComplex, drawLineLight, SA } from "../utils/visual";
import { Cre, Task_Cre } from "./Cre";
import { calEventNumberCPUTime, isMyTick } from "./CreTool";
import {
  def_plainCost,
  def_swampCost,
  getMoveStepDef,
  searchPath_area,
} from "./findPath";
import { GameObj } from "./GameObj";
import { blockCost, blocked, moveBlockCostMatrix } from "./UnitTool";

/**
 * a task used to move
 */
export class MoveTask extends Task_Cre {
  /** memoryed path*/
  path: Pos[];
  constructor(master: Cre, path: Pos[]) {
    super(master);
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
        moveTo_direct(this.master, firstStep);
        this.path.shift();
      } else {
        SA(this.master, "MTB");
        moveTo_basic(this.master, firstStep);
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
  tar: Pos;
  findPathStep: number;
  pullList: Cre[];
  costMatrix: CostMatrix | undefined;
  plainCost: number;
  swampCost: number;
  /** default `findPathStep` */
  constructor(
    master: Cre,
    tar: Pos,
    pullList: Cre[] = [master],
    step: number = getMoveStepDef(pullList),
    costMatrix: CostMatrix | undefined = moveBlockCostMatrix,
    plainCost: number = def_plainCost,
    swampCost: number = def_swampCost
  ) {
    super(master, []);
    SA(master, "new FPAM Task");
    this.tar = tar;
    this.pullList = pullList;
    this.costMatrix = costMatrix;
    this.plainCost = plainCost;
    this.swampCost = swampCost;
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
      tick === this.invokeTick ||
      isMyTick(this.master, this.findPathStep) ||
      GR(this.tempTar, this.master) <= closeScanRange ||
      GR(this.tar, this.master) <= closeScanRange ||
      (this.path.length > 0 && blocked(this.path[0]))
    ) {
      this.path = this.findPath_task(this.tar);
    }
    super.loop_task();
    if (this.master.role)
      calEventNumberCPUTime(this.master.role, et(st), false);
  }
  findPath_task(tar: Pos): Pos[] {
    // SA(this.master, "findPath_task");
    const sRtn: FindPathResult = searchPath_area(
      this.master,
      this.tar,
      this.costMatrix,
      this.plainCost,
      this.swampCost
    );
    const path: Pos[] = sRtn.path;
    return path;
  }
}
/** normal moveTo,but will block to the tile it want to move next tick */
export function moveTo_basic(cre: Cre, tar: Pos): void {
  SA(cre, "moveTo_basic");
  moveBlockCostMatrix_setBlock(tar);
  cre.master.moveTo(tar);
}
//move to ,use move() that use direction,not find path
export function moveTo_direct(cre: Cre, tar: Pos): void {
  SA(cre, "DirMove");
  if (atPos(cre, tar)) {
    ERR("ERR dirMove atPos");
  } else if (Adj(cre, tar)) {
    moveBlockCostMatrix_setBlock(tar);
    const dx = tar.x - cre.x;
    const dy = tar.y - cre.y;
    const direc = getDirection(dx, dy);
    SA(cre, "" + direc);
    cre.master.move(direc);
  } else {
    ERR("ERR dirMove");
  }
}
export function moveBlockCostMatrix_setBlock(pos: Pos) {
  moveBlockCostMatrix.set(pos.x, pos.y, blockCost);
}
