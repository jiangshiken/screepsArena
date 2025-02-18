import { Task_Role } from "../gameObjects/Cre";
import { Cre_battle } from "../gameObjects/Cre_battle";
import { Cre_move } from "../gameObjects/Cre_move";
import { Cre_pull, PullTarsTask } from "../gameObjects/Cre_pull";
import { defendInArea } from "../gameObjects/CreCommands";
import { isHealer, Role } from "../gameObjects/CreTool";
import {
  enemySpawn,
  friends,
  mySpawn,
} from "../gameObjects/GameObjectInitialize";
import { damaged } from "../gameObjects/HasHits";
import { friendBlockCostMatrix } from "../gameObjects/UnitTool";
import {
  assemblePoint,
  getStartGateAvoidFromEnemies,
} from "../strategies/strategyTool";
import { Event_ori } from "../utils/Event";
import { tick } from "../utils/game";
import { best } from "../utils/JS";
import { atPos, closest, GR, Pos_C } from "../utils/Pos";
import { ERR_rtn } from "../utils/print";
import { findTask } from "../utils/Task";
import { SA } from "../utils/visual";
export let wormPartNum: number;
export function set_wormPartNum(n: number) {
  wormPartNum = n;
}
// export let assembleTick: number =380;
export function getAssembleTick() {
  return 500 + 30 * (wormPartNum - 7);
}
export let wormGo: boolean = false;
export let wormStartWait: Event_ori | undefined = undefined;
export class WormInfo {
  index: number;
  constructor(index: number) {
    this.index = index;
  }
}
export function getWormInfo(cre: Cre_move): WormInfo {
  return <WormInfo>cre.extraMessage;
}
export function wormIndex(cre: Cre_move) {
  return cre.group_Index !== undefined
    ? cre.group_Index
    : ERR_rtn(-1, "wrong index");
}

export const wormPart: Role = new Role(
  "wormPart",
  cre => new wormPartJob(<Cre_battle>cre)
);
export class wormPartJob extends Task_Role {
  master: Cre_battle;
  constructor(master: Cre_battle) {
    super(master);
    this.master = master;
    this.cancelOldTask(wormPartJob);
  }
  ifGo(): boolean {
    if (tick >= getAssembleTick() + 30) {
      return true;
    } else {
      const finalSnakePart = this.findWormPart(wormPartNum - 1);
      if (finalSnakePart) {
        return atPos(finalSnakePart, assemblePoint(wormIndex(finalSnakePart)));
      } else {
        return false;
      }
    }
  }
  /**find the worm apart by index*/
  findWormPart(index: number): Cre_pull | undefined {
    return <Cre_pull | undefined>(
      friends.find(
        i =>
          i instanceof Cre_pull && this.isWormPart(i) && index === i.group_Index
      )
    );
  }
  isWormPart(cre: Cre_pull) {
    return cre.role === wormPart;
  }
  getMyWormParts() {
    return (<Cre_pull[]>friends).filter(i => this.isWormPart(i));
  }
  loop_task(): void {
    const cre = this.master;
    SA(cre, "WPJ");
    cre.group_Index = getWormInfo(cre).index;
    SA(cre, "I=" + cre.group_Index);
    cre.fight();
    const creInd = wormIndex(cre);
    if (!wormGo) {
      SA(cre, "NG");
      wormGo = this.ifGo();
      const assP = assemblePoint(creInd);
      if (tick >= getAssembleTick()) {
        //if start assemble
        SA(cre, "AT");
        cre.MT(assP);
      } else {
        //if not assemble yet
        SA(cre, "DS");
        if (cre.tryBreakBlockedContainer()) {
          SA(cre, "BW");
        } else if (isHealer(cre)) {
          const scanRange = 8;
          const tars = friends.filter(
            i =>
              i !== cre &&
              i instanceof Cre_pull &&
              this.isWormPart(i) &&
              GR(cre, i) <= scanRange &&
              damaged(i)
          );
          const tar = closest(cre, tars);
          if (tar) {
            cre.MT(tar);
          } else {
            cre.MT(assP);
          }
        } else {
          const isDefending = defendInArea(cre, mySpawn, 7);
          if (!isDefending) {
            cre.MT(assP);
          }
        }
      }
    } else {
      //worm go
      this.wormGo();
    }
  }
  wormGo() {
    const cre = this.master;
    const creInd = wormIndex(cre);
    SA(cre, "WG");
    const myWormParts = this.getMyWormParts();
    if (wormStartWait === undefined) {
      SA(cre, "RUSH");
      const head = best(myWormParts, i => -wormIndex(i));
      if (head && head === cre) {
        const followers = myWormParts.filter(i => i !== head);
        const startGateUp = getStartGateAvoidFromEnemies();
        head.startGateUp = startGateUp;
        const target = enemySpawn;
        head.newPullTarsTask(followers, target, 5);
        const scanCloseDis = 6;
        if (GR(cre, enemySpawn) <= scanCloseDis) {
          wormStartWait = new Event_ori();
          findTask(head, PullTarsTask)?.end();
        }
      }
    } else {
      //start wait
      if (wormStartWait.validEvent(6)) {
        SA(cre, "WSW");
        const assembleX = enemySpawn.x + creInd - 3;
        const isUp = cre.y < enemySpawn.y;
        const keepDis = 5;
        const assembleY = isUp
          ? enemySpawn.y - keepDis
          : enemySpawn.y + keepDis;
        cre.MT(new Pos_C(assembleX, assembleY));
      } else {
        //rush spawn
        SA(cre, "AS");
        this.rushSpawn();
      }
    }
  }
  rushSpawn() {
    this.master.MT_stop(enemySpawn, 1, friendBlockCostMatrix);
  }
}
