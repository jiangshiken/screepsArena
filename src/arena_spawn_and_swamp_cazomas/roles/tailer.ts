import { MOVE } from "game/constants";
import { CostMatrix } from "game/path-finder";
import { Cre, Task_Role } from "../gameObjects/Cre";
import { def_PSC, type_PSC } from "../gameObjects/Cre_findPath";
import { Cre_pull, PullTarsTask } from "../gameObjects/Cre_pull";
import { Role } from "../gameObjects/CreTool";
import { friends, mySpawn } from "../gameObjects/GameObjectInitialize";
import { inMyBaseRan } from "../gameObjects/spawn";
import { blocked } from "../gameObjects/UnitTool";
import { arrReverse, best, last, sum } from "../utils/JS";
import {
  Adj,
  COO,
  getDirectionByPos,
  getRangePoss,
  InRan2,
  Pos,
  Y_axisDistance,
} from "../utils/Pos";
import { findTask } from "../utils/Task";
import { drawLineComplex, drawRange, SA } from "../utils/visual";
export function getTailerTask(cre: Cre_pull): tailerJob {
  return <tailerJob>findTask(cre, tailerJob);
}
export function getTailers_all(): Cre_pull[] {
  return <Cre_pull[]>(
    friends.filter(i => i instanceof Cre_pull && i.role === tailer)
  );
}
export function getTailers_inGroup(tailTar: Cre): Cre_pull[] {
  const tailMembers = <Cre_pull[]>(
    friends.filter(
      i =>
        i instanceof Cre_pull && i.role === tailer && tailGroup(i) === tailTar
    )
  );
  return tailMembers.sort((a, b) => tailIndex(a) - tailIndex(b));
}
export function getTailers_inGroup_adj(tailTar: Cre): Cre_pull[] {
  const tailMembers = getTailers_inGroup(tailTar);
  const head = tailMembers[0];
  const rtn = [head];
  for (let i = 0; i < tailMembers.length - 1; i++) {
    const mem = tailMembers[i + 1];
    const mem_tar = tailMembers[i];
    if (Adj(mem, mem_tar)) {
      rtn.push(mem);
    }
  }
  return <Cre_pull[]>rtn;
}
export function tailIndex(cre: Cre_pull): number {
  return (<tailerJob>findTask(cre, tailerJob)).tailIndex;
}
export function tailGroup(cre: Cre_pull): Cre | undefined {
  return (<tailerJob>findTask(cre, tailerJob)).tailGroupTarget;
}
export function cleanFatigue(myGroup: Cre_pull[]) {
  const tar = <Cre_pull>best(myGroup, i => i.master.fatigue);
  if (tar.master.fatigue > 20) {
    SA(tar, "cleanFatigue");
    drawRange(tar, 0.7, "#00aaaa");
    const tarTop = myGroup.filter(i => tailIndex(i) < tailIndex(tar));
    const tarBottom = myGroup.filter(i => tailIndex(i) > tailIndex(tar));
    const topMoves = sum(tarTop, i =>
      i.master.fatigue === 0 ? i.getHealthyBodyPartsNum(MOVE) : 0
    );
    const bottomMoves = sum(tarBottom, i =>
      i.master.fatigue === 0 ? i.getHealthyBodyPartsNum(MOVE) : 0
    );
    if (topMoves > bottomMoves) {
      if (tarTop.length > 0) {
        const sortedTarTop = arrReverse(tarTop);
        new PullTarsTask(tar, sortedTarTop, mySpawn, 10, undefined, def_PSC, 0);
        if (tarBottom.length >= 2) {
          SA(tar, "bottom");
          cleanFatigue(tarBottom);
        }
      }
    } else {
      if (tarBottom.length > 0) {
        new PullTarsTask(tar, tarTop, mySpawn, 10, undefined, def_PSC, 0);
        if (tarTop.length >= 2) {
          SA(tar, "top");
          cleanFatigue(tarTop);
        }
      }
    }
  }
}
export function arrangeTail_all(cre: Cre, myGroup: Cre_pull[]): boolean {
  if (inMyBaseRan(cre) && Y_axisDistance(cre, mySpawn) <= 20) {
    return false;
  } else if (arrangeTail(myGroup)) {
    return true;
  } else if (arrangeTail2(myGroup)) {
    return true;
  } else {
    return false;
  }
}
export function allAdj(myGroup: Cre[]): boolean {
  let allAdj = true;
  for (let i = 0; i < myGroup.length - 1; i++) {
    const cre0 = myGroup[i];
    const cre1 = myGroup[i + 1];
    if (!Adj(cre0, cre1)) {
      allAdj = false;
    }
  }
  return allAdj;
}
function arrangeTail2(myGroup: Cre_pull[]): boolean {
  if (!allAdj(myGroup)) return false;
  const tail = best(myGroup, i => tailIndex(i));
  for (let i = 0; i < myGroup.length - 3; i++) {
    const cre0 = myGroup[i];
    const creMid1 = myGroup[i + 1];
    const creMid2 = myGroup[i + 2];
    const cre1 = myGroup[i + 3];
    if (InRan2(cre0, cre1) && creMid1.master.fatigue === 0) {
      const poss = getRangePoss(cre0);
      const tarPos = poss.find(
        i =>
          Adj(i, cre0) &&
          Adj(i, creMid1) &&
          Adj(i, creMid2) &&
          Adj(i, cre1) &&
          !blocked(i)
      );
      if (tarPos) {
        drawLineComplex(cre0, cre1, 0.8, "#ff7700");
        SA(cre0, "arrangeTail2");
        const followers = myGroup.filter(
          i => i !== tail && tailIndex(i) >= tailIndex(creMid2)
        );
        const sortedFollowers = arrReverse(followers);
        SA(creMid1, "MD");
        creMid1.moveTo_direct(tarPos);
        if (tail) tailPullAction(tail, sortedFollowers, mySpawn);
        return true;
      }
    }
  }
  return false;
}
function arrangeTail(myGroup: Cre_pull[]): boolean {
  if (!allAdj(myGroup)) return false;
  const tail = best(myGroup, i => tailIndex(i));
  for (let i = 0; i < myGroup.length - 2; i++) {
    const cre0 = myGroup[i];
    const creMid = myGroup[i + 1];
    const cre1 = myGroup[i + 2];
    if (Adj(cre0, cre1)) {
      drawLineComplex(cre0, cre1, 0.8, "#ff7700");
      SA(cre0, "arrangeTail");
      const followers = myGroup.filter(
        i => i !== tail && tailIndex(i) >= tailIndex(creMid)
      );
      const sortedFollowers = arrReverse(followers);
      if (tail) tailPullAction(tail, sortedFollowers, mySpawn);
      return true;
    }
  }
  return false;
}
export function tailPullAction(
  leader: Cre_pull,
  followers: Cre_pull[],
  tar: Pos,
  costMat: CostMatrix | undefined = undefined,
  PSC: type_PSC = def_PSC
) {
  leader.newPullTarsTask(followers, tar, 10, costMat, PSC);
}
export function getNextMember(
  myGroup: Cre_pull[],
  ind: number
): Cre_pull | undefined {
  const selectGroup = myGroup.filter(i => tailIndex(i) > ind);
  return best(selectGroup, i => -tailIndex(i));
}
export function tailChainPullAction(myGroup: Cre_pull[], tar: Pos) {
  const tail = <Cre_pull>last(myGroup);
  SA(tail, "FLEE");
  let sumFatigue = 0;
  for (let i = 0; i < myGroup.length - 1; i++) {
    const cre0 = myGroup[i];
    const cre1 = myGroup[i + 1];
    const cre0_fatigue: number = cre0.getMoveAndFatigueNum(
      0,
      false,
      false,
      cre1
    ).fatigueNum;
    if (cre0_fatigue > 0) {
      sumFatigue += cre0_fatigue;
    }
  }
  const allFatigue = sumFatigue;
  const allMove = sum(
    myGroup.filter(i => i.master.fatigue === 0),
    i => i.getHealthyBodyPartsNum(MOVE)
  );
  const candecreaseAllFatigue = allFatigue <= allMove * 2;
  if (candecreaseAllFatigue || tail.master.fatigue > 0) {
    SA(tail, "CanD");
    const followers2 = myGroup.filter(i => i !== tail);
    const sortedFollowers2 = arrReverse(followers2);
    tailPullAction(tail, sortedFollowers2, tar);
  } else {
    SA(tail, "Norm");
    const fatigueHolder = best(
      myGroup.filter(i => i !== tail && i.master.fatigue === 0),
      i => tailIndex(i)
    );
    if (fatigueHolder) {
      SA(fatigueHolder, "fatigueHolder");
      const followers = myGroup.filter(
        i => tailIndex(i) < tailIndex(fatigueHolder)
      );
      const sortedFollowers = arrReverse(followers);
      const fatigueHolderNext = myGroup.find(
        i => tailIndex(i) === tailIndex(fatigueHolder) + 1
      );
      if (fatigueHolderNext) {
        SA(fatigueHolderNext, "fatigueHolderNext");
        SA(fatigueHolder, "SFL=" + sortedFollowers.length);
        if (sortedFollowers.length === 0) {
          SA(fatigueHolder, "MD");
          fatigueHolder.MD(fatigueHolderNext);
        } else {
          new PullTarsTask(
            fatigueHolder,
            sortedFollowers,
            fatigueHolderNext,
            10,
            undefined,
            def_PSC,
            1
          );
        }
        const direct = getDirectionByPos(fatigueHolder, fatigueHolderNext);
        SA(fatigueHolder, "direct=" + direct);
        fatigueHolder.stop();
        fatigueHolder.master.move(direct);
        const followers2 = myGroup.filter(
          i => i !== tail && tailIndex(i) > tailIndex(fatigueHolder)
        );
        const sortedFollowers2 = arrReverse(followers2);
        SA(tail, "Tail=" + sortedFollowers2.length);
        if (sortedFollowers2.length === 0) {
          tail.MT(tar);
        } else {
          tailPullAction(tail, sortedFollowers2, tar);
        }
      } else {
        tailPullAction(fatigueHolder, sortedFollowers, tar);
      }
    } else {
      SA(tail, "no fatigueHolder");
      const followers = myGroup.filter(i => i !== tail);
      const sortedFollowers = arrReverse(followers);
      tailPullAction(tail, sortedFollowers, tar);
    }
  }
}
export const tailer: Role = new Role(
  "tailer",
  cre => new tailerJob(<Cre_pull>cre)
);

export class tailerJob extends Task_Role {
  master: Cre_pull;
  tailGroupTarget: Cre | undefined;
  tailIndex: number = 0;
  constructor(master: Cre_pull) {
    super(master);
    this.master = master;
    this.cancelOldTask(tailerJob);
  }
  loop_task(): void {
    const cre = this.master;
    if (this.tailGroupTarget) {
      const tailInd = tailIndex(cre);
      SA(cre, "Tar=" + COO(this.tailGroupTarget) + "_" + tailInd);
      // const myGroup = getTailers_inGroup_adj(groupNum);
    } else {
      SA(cre, "NO Target");
    }
  }
}
