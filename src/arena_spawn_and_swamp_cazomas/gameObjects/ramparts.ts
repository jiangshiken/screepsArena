import { ATTACK, RANGED_ATTACK, WORK } from "game/constants";
import { CostMatrix } from "game/path-finder";
import { StructureRampart } from "game/prototypes";
import { findClosestByRange } from "game/utils";
import { rangeReduce } from "../utils/bonus";
import { Event } from "../utils/Event";
import { closest, tick } from "../utils/game";
import { best, last, relu, sum } from "../utils/JS";
import { Adj, atPos, COO, getRangePoss, GR, Pos } from "../utils/Pos";
import { dotted, drawLineComplex, drawPolyLight, SA } from "../utils/visual";
import {
  blocked,
  Cre,
  getDecideSearchRtnNoArea,
  getEnemyArmies,
  getOtherFriends,
  hits,
} from "./Cre";
import { enemies, friends, myRamparts } from "./GameObjectInitialize";
import { spawnPos } from "./HasHits";
import { findGO } from "./overallMap";
import { spawn } from "./spawn";
import { OwnedStru } from "./Stru";

export function myRampartAt(pos: Pos): OwnedStru | undefined {
  return <OwnedStru | undefined>findGO(pos, StructureRampart);
}
export function myRoundRamparts(cre: Pos, range: number): OwnedStru[] {
  return myRamparts.filter(i => GR(i, cre) <= range);
}
export const rampartHealthBias0: number = 1000;
export function enemyRampartIsHealthy(ram: OwnedStru) {
  return rampartIsHealthy(ram, false);
}
export function rampartIsHealthy(
  ram: OwnedStru,
  isMy: boolean = true,
  useExtra: boolean = true,
  bias: number = 0
) {
  //has enemy around
  let around1Enemies = isMy
    ? enemies.filter(i => GR(i, ram) <= 1)
    : friends.filter(i => GR(i, ram) <= 1);
  let around3Enemies = isMy
    ? enemies.filter(i => GR(i, ram) <= 3)
    : friends.filter(i => GR(i, ram) <= 3);
  const RANum = sum(around3Enemies, i =>
    i.getHealthyBodyPartsNum(RANGED_ATTACK)
  );
  const ANum = sum(around1Enemies, i => i.getHealthyBodyPartsNum(ATTACK));
  const extraBias = 30 * ANum + 10 * RANum;
  if (useExtra) {
    return hits(ram) >= rampartHealthBias0 + relu(extraBias + bias);
  } else {
    return hits(ram) >= rampartHealthBias0;
  }
}
export function moveToAllEmptyRampart(cre: Cre) {
  SA(cre, " select all empty ");
  const healthyRamparts = myRamparts.filter(i => rampartIsHealthy(i));
  const emptyRamparts = healthyRamparts.filter(i => !blocked(i));
  const rampart = closest(cre, emptyRamparts);
  if (rampart) {
    cre.MTJ(rampart);
  } else SA(cre, " can not find rampart ");
}
export function inMyRampart(pos: Pos): boolean {
  const ram = <OwnedStru | undefined>findGO(pos, StructureRampart);
  return ram !== undefined && ram.my;
}
export function baseLoseRampart(): boolean {
  return !inMyRampart(spawn);
}
export function baseLoseRampartAround(): boolean {
  const roundPos = getRangePoss(spawn, 1);
  return roundPos.find(i => !inMyRampart(i)) !== undefined;
}
export function inMyHealthyRampart(pos: Pos) {
  const ram = <OwnedStru | undefined>findGO(pos, StructureRampart);
  return ram && ram.my && rampartIsHealthy(ram);
}
export let ramSaveCostMatrix_Event: Event = new Event();
export let ramSaveCostMatrix: CostMatrix | undefined;
export function defendTheRampart(cre: Cre) {
  const scanRange = 20;
  const enemyArmys = getEnemyArmies().filter(i => GR(i, cre) <= scanRange);
  const target = best(enemyArmys, en => {
    const aroundRam = myRamparts.find(i => GR(i, en) <= 1);
    const aroundRam2 = myRamparts.find(i => GR(i, en) <= 2);
    const aroundRam3 = myRamparts.find(i => GR(i, en) <= 3);
    const aroundBonus = aroundRam ? 4 : aroundRam2 ? 2.4 : aroundRam3 ? 1.6 : 1;
    const RANum = en.getHealthyBodyPartsNum(RANGED_ATTACK);
    const inBaseRange3 = GR(en, spawn) <= 3;
    const shotBaseBonus = inBaseRange3 ? 1 + 0.5 * RANum : 1;
    const baseRangeReduce = rangeReduce(en, spawn, 1);
    const creRangeReduce = rangeReduce(en, cre, 1);
    const worth =
      shotBaseBonus * aroundBonus * baseRangeReduce * creRangeReduce;
    return worth;
  });
  if (target) {
    drawLineComplex(cre, target, 0.8, "#cc8822", dotted);
  }
  moveToRampart(cre, target);
}
export function refreshRampartSaveCostMatrix(pos: Pos, range: number) {
  SA(pos, "refreshed CM");
  const rangePoss = getRangePoss(pos, range);
  for (let pos of rangePoss) {
    let cost: number;
    if (inMyHealthyRampart(pos)) {
      if (blocked(pos)) {
        cost = 40;
      } else {
        cost = 1;
      }
    } else {
      cost = 200;
    }
    if (!ramSaveCostMatrix) {
      ramSaveCostMatrix = new CostMatrix();
    }
    ramSaveCostMatrix.set(pos.x, pos.y, cost);
  }
  ramSaveCostMatrix_Event = new Event();
}
export function moveToRampart(cre: Cre, enemy: Pos | undefined) {
  SA(cre, "move to rampart ,enemy=" + COO(enemy));
  const healthyRamparts = myRamparts.filter(i => rampartIsHealthy(i));
  const emptyHealthyRamparts = healthyRamparts.filter(i => !blocked(i));
  //if enemy exist
  if (enemy) {
    SA(cre, "has enemy");
    //find enemy closest rampart
    const targetRampart = closest(enemy, emptyHealthyRamparts);
    if (targetRampart) {
      SA(cre, "targetRampart=" + COO(targetRampart));
      drawLineComplex(cre, targetRampart, 0.8, "#123456");
      //if already in it
      if (
        inMyHealthyRampart(cre) &&
        GR(targetRampart, enemy) >= GR(cre, enemy)
      ) {
        SA(cre, "already in it");
        cre.stop();
      } else {
        gotoTargetRampart(cre, targetRampart);
      }
    }
  } else {
    //if no enemy
    const targetRampart = closest(cre, emptyHealthyRamparts);
    if (inMyHealthyRampart(cre)) {
      //do nothing
      SA(cre, "already in healthy rampart");
      cre.stop();
    } else {
      //go in rampart
      if (targetRampart) {
        gotoTargetRampart(cre, targetRampart);
      }
    }
  }
}
export function gotoTargetRampart(cre: Cre, targetRampart: Pos) {
  SA(cre, "gotoTargetRampart " + COO(targetRampart));
  refreshRampartSaveCostMatrix(cre, 20);
  const sRtn = getDecideSearchRtnNoArea(cre, targetRampart, {
    costMatrix: ramSaveCostMatrix,
  });
  let cost = sRtn.cost;
  const path = sRtn.path;
  drawPolyLight(path);
  // SA(cre, "cost=" + cost);
  const lastPos = last(path);
  if (lastPos && !inMyHealthyRampart(lastPos)) {
    cost += 80;
  }
  if (inMyHealthyRampart(cre)) {
    if (path.length > 0) {
      const firstPos = path[0];
      if (!inMyHealthyRampart(firstPos) || cost > 50) {
        SA(cre, "path out of ram");
        const tarFriends = getOtherFriends(cre).filter(
          i =>
            GR(i, cre) <= 1 &&
            inMyHealthyRampart(i) &&
            !(cre.getBodypartsNum(WORK) > 0 && cre.macro
              ? cre.macro.getIsWorking()
              : false) &&
            i.getHealthyBodyPartsNum(ATTACK) <
              cre.getHealthyBodyPartsNum(ATTACK)
        );
        if (tarFriends.length > 0) {
          const tarFriend = findClosestByRange(targetRampart, tarFriends);
          SA(cre, "exchangePos_A " + COO(tarFriend));
          cre.exchangePos_setAppointment(tarFriend);
        }
      } else {
        SA(cre, "goto target rampart " + COO(firstPos));
        const blockFri: Cre | undefined = <Cre | undefined>(
          findGO(firstPos, Cre)
        );
        if (blockFri) {
          cre.exchangePos_setAppointment(blockFri);
        } else {
          cre.moveToNormal(firstPos);
        }
      }
    } else {
      SA(cre, "no path");
    }
  } else {
    SA(cre, "quickly go into rampart");
    goinRampartAssign(cre, [spawn, cre]);
  }
}
export function getMyHealthyRamparts(): OwnedStru[] {
  return myRamparts.filter(i => rampartIsHealthy(i));
}
export function getMyHealthyRamparts_around(cre: Pos): OwnedStru[] {
  return getMyHealthyRamparts().filter(i => Adj(i, cre));
}
export function goinRampartAssign(cre: Cre, calBlocked: Pos[]) {
  SA(cre, "goinRampartAssign " + COO(cre));
  const aroundRams = getMyHealthyRamparts_around(cre);
  const aroundEmptyRams = aroundRams.filter(i => !blocked(i, false));
  const aroundEmptyRam = last(aroundEmptyRams);
  if (aroundRams.length > 0) {
    if (aroundEmptyRam) {
      SA(cre, "go around empty ram" + COO(aroundEmptyRam));
      cre.moveToNormal_setAppointment(aroundEmptyRam);
    } else if (calBlocked.length < 6) {
      SA(cre, "need assign again");
      const aroundRamNotCaled = aroundRams.find(i => {
        return calBlocked.find(j => atPos(j, i)) === undefined;
      });
      if (aroundRamNotCaled) {
        const tarFriends =
          tick <= 400
            ? friends.filter(
                i =>
                  i.getBodypartsNum(ATTACK) > 0 ||
                  i.getBodypartsNum(RANGED_ATTACK) > 0
              )
            : friends;
        const newFriend = tarFriends.find(i => atPos(i, aroundRamNotCaled));
        if (newFriend) {
          SA(cre, "new friend:" + COO(newFriend));
          calBlocked.push(newFriend);
          drawLineComplex(cre, newFriend, 0.8, "#654321");
          cre.moveToNormal_setAppointment(aroundRamNotCaled);
          goinRampartAssign(newFriend, calBlocked);
        } else {
          SA(cre, "no new friend " + COO(aroundRamNotCaled));
        }
      } else {
        SA(cre, "assign over");
      }
    } else {
      SA(cre, "assign out of limit");
    }
  } else {
    SA(cre, "MTJ ram");
    const ram = closest(cre, getMyHealthyRamparts());
    if (ram) {
      cre.MTJ(ram);
    } else {
      SA(cre, "no ram");
    }
  }
}
export function attackWeakRampart(cre: Cre) {
  SA(cre, "try attackWeakRampart");
  let myRamAround = myRamparts.filter(i => GR(i, cre) <= 1);
  let weakMyRamAround = myRamAround.find(
    i => !rampartIsHealthy(i, true, false) && !atPos(i, spawnPos)
  );
  if (weakMyRamAround) {
    SA(cre, "attacking WeakRampart");
    cre.battle?.attackNormal(weakMyRamAround);
  }
}
