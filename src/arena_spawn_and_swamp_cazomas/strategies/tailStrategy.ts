import {
  enemySpawn,
  spawn,
} from "arena_spawn_and_swamp_cazomas/gameObjects/GameObjectInitialize";
import { ATTACK, HEAL, MOVE, RANGED_ATTACK, WORK } from "game/constants";
import { getTicks } from "game/utils";
import { inMyBaseRan, spawnCleared, spawnCreep } from "../gameObjects/spawn";
import { jamer } from "../roles/jamer";

import { Cre } from "arena_spawn_and_swamp_cazomas/gameObjects/Cre";
import {
  MoveTask,
  moveTo_direct,
} from "arena_spawn_and_swamp_cazomas/gameObjects/Cre_move";
import { CostMatrix } from "game/path-finder";
import { calculateForce, getTaunt } from "../gameObjects/battle";
import { Cre_battle } from "../gameObjects/Cre_battle";
import { getMoveAndFatigueNum_single } from "../gameObjects/Cre_findPath";
import { Cre_move } from "../gameObjects/Cre_move";
import { newPullTarsTask, PullTarsTask } from "../gameObjects/Cre_pull";
import { hasThreat, isArmy, Role } from "../gameObjects/CreTool";
import {
  enemies,
  friends,
  oppoUnits,
  Unit,
} from "../gameObjects/GameObjectInitialize";
import { damageAmount, damaged } from "../gameObjects/HasHits";
import { Dooms, getGuessPlayer, Kerob, Tigga } from "../gameObjects/player";
import { Spa } from "../gameObjects/Stru";
import { blocked, inRampart } from "../gameObjects/UnitTool";
import { extStealer, initSpawnWallCostMatrix } from "../roles/extStealer";
import { set_energyStealMode } from "../roles/harvester";
import { toughDefender } from "../roles/toughDefender";
import { TB } from "../utils/autoBodys";
import { border_L1, border_R1, spawn_left } from "../utils/game";
import {
  best,
  divideReduce,
  first,
  goInRange,
  inRange,
  last,
  ranBool,
  relu,
  sum,
} from "../utils/JS";
import {
  Adj,
  atPos,
  closest,
  getDirectionByPos,
  getRangePoss,
  GR,
  inBorder,
  InRan2,
  Pos,
  Pos_C,
  X_axisDistance,
  Y_axisDistance,
} from "../utils/Pos";
import {
  dashed,
  displayPos,
  drawLineComplex,
  drawRange,
  drawText,
  SA,
  SAB,
  SAN,
} from "../utils/visual";
const group1: Cre[] = [];
class TailInfo {
  group: number;
  index: number;
  constructor(group: number, index: number) {
    this.group = group;
    this.index = index;
  }
}
function drawFatigue() {
  friends.forEach(fri => {
    // SA(fri, "DrawFtgLine");
    const length = 0.03 * fri.master.fatigue;
    const startPos = { x: fri.x - 0.5, y: fri.y + 0.5 };
    const endPos = { x: fri.x - 0.5, y: fri.y + 0.5 - length };
    drawLineComplex(startPos, endPos, 1, "#333333");
  });
}
export function useTailStrategy() {
  set_energyStealMode(true);
  initSpawnWallCostMatrix();
  // set_swampIgnore(true);
  // set_moveCostForceRate(0.001)
  // setMoveMapSetRate(0.0004);
  drawFatigue();
  if (getTicks() === 50) {
    //400
    // spawnCreep(TB('5MCW'),builderStandard)
    // spawnCreep(TB('4CM'),harvester)
    const jamerNum = getGuessPlayer() === Tigga ? 7 : 4;
    for (let i = 0; i < jamerNum; i++) {
      spawnCreep(TB("M"), jamer);
    }
    for (let g = 0; g < 3; g++) {
      let ifRanged = false;
      if (getGuessPlayer() === Tigga) {
        ifRanged = g === 0;
      } else {
        ifRanged = false;
      }
      if (ifRanged) {
        //RANGED
        if (getGuessPlayer() === Tigga) {
          //600+320+50
          spawnCreep(TB("5R2AM"), tailMelee, new TailInfo(g, 0));
          spawnCreep(TB("5M2HM"), tailHealer, new TailInfo(g, 1));
          const tailLen = 2;
          for (let i = 0; i < tailLen; i++) {
            spawnCreep(TB("M"), tailPart, new TailInfo(g, 2 + i));
          }
          const tailLen2 = 8;
          for (let i = 0; i < tailLen2; i++) {
            spawnCreep(TB("2M"), tailPart, new TailInfo(g, 2 + tailLen + i));
          }
        } else {
          //DOOMS
          spawnCreep(TB("4R4AM"), tailMelee, new TailInfo(g, 0));
          spawnCreep(TB("5MHM"), tailHealer, new TailInfo(g, 1));
          const tailLen = 8;
          for (let i = 0; i < tailLen; i++) {
            spawnCreep(TB("M"), tailPart, new TailInfo(g, 2 + i));
          }
          const tailLen2 = 4;
          for (let i = 0; i < tailLen2; i++) {
            spawnCreep(TB("2M"), tailPart, new TailInfo(g, 2 + tailLen + i));
          }
        }
      } else {
        //MELEE
        if (getGuessPlayer() === Tigga) {
          if (g === 0) spawnCreep(TB("3MR8AM"), tailMelee, new TailInfo(g, 0));
          else spawnCreep(TB("3M10AM"), tailMelee, new TailInfo(g, 0));
          spawnCreep(TB("4M3HM"), tailHealer, new TailInfo(g, 1));
          const tailLen = 3;
          for (let i = 0; i < tailLen; i++) {
            spawnCreep(TB("M"), tailPart, new TailInfo(g, 2 + i));
          }
          const tailLen2 = 4;
          for (let i = 0; i < tailLen2; i++) {
            spawnCreep(TB("2M"), tailPart, new TailInfo(g, 2 + tailLen + i));
          }
          //EXT STEALER
          // if (g === 1) {
          //   spawnCreep(TB("3MA"), extStealer);
          // }
        } else {
          //DOOMS
          if (g === 0) spawnCreep(TB("3MR8AM"), tailMelee, new TailInfo(g, 0));
          else spawnCreep(TB("3M10AM"), tailMelee, new TailInfo(g, 0));
          if (g === 0) spawnCreep(TB("4M3HM"), tailHealer, new TailInfo(g, 1));
          else spawnCreep(TB("4M2HM"), tailHealer, new TailInfo(g, 1));
          const tailLen = g === 0 ? 7 : 5;
          for (let i = 0; i < tailLen; i++) {
            spawnCreep(TB("2M"), tailPart, new TailInfo(g, 2 + i));
          }
          spawnCreep(TB("3M"), tailPart, new TailInfo(g, 2 + tailLen));
        }
      }
    }
    //700
    //250+400+50
    if (getGuessPlayer() === Kerob) {
      spawnCreep(TB("10TRM"), toughDefender);
    } else if (getGuessPlayer() === Tigga) {
      // spawnCreep(TB("3MA"), extStealer);
      //150+240+50
      spawnCreep(TB("5TAM"), toughDefender);
    } else {
      //150+240+50
      spawnCreep(TB("15T4AM"), toughDefender);
    }
  }
  if (getTicks() > 50) {
    if (spawnCleared(spawn)) {
      // if(friends.filter(i=>i.role===jamer).length<=8){
      //     spawnCreep(TB('M'),jamer)
      // }else{
      spawnCreep(TB("3MA"), extStealer);
      // }
    }
  }
  command();
}
export const tailHealer: Role = new Role("tailHealer", tailHealerJob);
// export const tailShoter: Role = new Role("tailShoter", tailShoterJob);
export const tailMelee: Role = new Role("tailMelee", tailMeleeJob);
export const tailPart: Role = new Role("tailPart", tailPartJob);
function tailHealerJob(cre: Cre_battle) {
  SA(cre, "tailHealerJob");
  cre.fight();
  const myGroup = getGroup(tailGroup(cre));
  const melee = myGroup.find(i => i.role === tailMelee);
  const tail = <Cre_move>best(myGroup, i => tailIndex(i));
  if (melee === undefined) {
    SA(cre, "GO");
    myGroup.forEach(i => i.tasks.find(i => i instanceof PullTarsTask)?.end());
    if (damaged(cre)) {
      fleeAction(cre, myGroup, cre, tail, cre);
    } else {
      const targets = friends.filter(i => i.role === tailMelee);
      const target = closest(cre, targets);
      if (target) {
        if (Adj(target, cre)) {
          cre.stop();
        } else {
          pushAction(cre, target, myGroup, cre, tail, cre);
        }
      }
    }
  } else {
    if (!Adj(cre, melee)) {
      SA(cre, "MTH");
      cre.MT(melee);
    }
  }
}
function getGroup_real(n: number): Cre_move[] {
  const tailMembers = friends.filter(i => tailGroup(i) === n);
  return <Cre_move[]>tailMembers;
}
function getGroup(n: number): Cre_move[] {
  const tailMembers = friends.filter(i => tailGroup(i) === n);
  const head = tailMembers[0];
  const rtn = [head];
  for (let i = 0; i < tailMembers.length - 1; i++) {
    const mem = tailMembers[i + 1];
    const mem_tar = tailMembers[i];
    if (Adj(mem, mem_tar)) {
      rtn.push(mem);
    }
  }
  return <Cre_move[]>rtn;
}
function tailIndex(cre: Cre): number {
  const ie: any = cre.extraMessage;
  if (ie && ie instanceof TailInfo) {
    return ie.index;
  } else {
    return -1;
  }
}
function tailGroup(cre: Cre): number {
  const ie: any = cre.extraMessage;
  if (ie && ie instanceof TailInfo) {
    return ie.group;
  } else {
    return -1;
  }
}
function ESDGreaterThan(en: Pos, fri: Pos, bias: number = 0) {
  return ESDCompare(en, fri) + bias > 0;
}
function ESDCompare(en: Pos, fri: Pos): number {
  const ESD_en = enemySpawnDistance(en);
  const ESD_fri = enemySpawnDistance(fri);
  if (ESD_en < 50 && ESD_fri < 50) {
    const disA = en.y - enemySpawn.y;
    const disB = fri.y - enemySpawn.y;
    if (disA * disB < 0) {
      return -50;
    } else {
      return enemySpawnDistance(en) - enemySpawnDistance(fri);
    }
  } else if (ESD_en > 150 && ESD_fri > 150) {
    return enemySpawnDistance(en) - enemySpawnDistance(fri);
  } else {
    return enemySpawnDistance(en) - enemySpawnDistance(fri);
  }
}
function enemySpawnDistance(pos: Pos): number {
  if (X_axisDistance(pos, spawn) <= 7 && inRange(pos.y, 11, 88)) {
    return 200 - Y_axisDistance(pos, spawn);
  } else if (X_axisDistance(pos, enemySpawn) <= 7 && inRange(pos.y, 11, 88)) {
    return Y_axisDistance(pos, enemySpawn);
  } else {
    return 50 + X_axisDistance(pos, enemySpawn);
  }
}
function refreshStartGate(cre: Cre_move, tail: Cre_move, myGroup: Cre_move[]) {
  SA(cre, "refreshStartGate");
  if (X_axisDistance(cre, enemySpawn) <= 8) {
    SA(cre, "X");
    let current_startGateUp;
    if (cre.y > enemySpawn.y + 5) {
      SA(cre, "A");
      current_startGateUp = false;
    } else if (cre.y < enemySpawn.y - 5) {
      SA(cre, "B");
      current_startGateUp = true;
    } else {
      SA(cre, "C " + (cre.y > tail.y));
      current_startGateUp = cre.y > tail.y;
    }
    const setSGU = current_startGateUp;
    myGroup.forEach(mem => {
      mem.startGateUp = setSGU;
    });
  }
}
function tailMeleeJob(cre: Cre_battle) {
  SA(cre, "tailMeleeJob");
  cre.fight();
  const myGroupNum = tailGroup(cre);
  const myGroup = getGroup(myGroupNum);
  const myGroupLen = myGroup.length;
  SA(cre, "mg=" + myGroupNum + " mgl=" + myGroup.length);
  const headIsRange = cre.getBodyPartsNum(RANGED_ATTACK) >= 3;
  const scanRange_target = 5 + myGroupLen + (headIsRange ? 7 : 0);
  const targets = oppoUnits.filter(
    i =>
      (i instanceof Cre && GR(i, cre) <= scanRange_target) || i instanceof Spa
  );
  SA(displayPos(), "oppoUnits.len" + oppoUnits.length);
  SA(displayPos(), "targets.len" + targets.length);
  const target = best(targets, tar => {
    // SA(cre,"C")
    let typeBonus: number = 0;
    if (tar instanceof Cre) {
      if (hasThreat(tar)) {
        typeBonus = 3;
      } else if (isArmy(tar)) {
        typeBonus = 1;
      } else {
        typeBonus = 0;
      }
    } else if (tar instanceof Spa) {
      if (getGuessPlayer() === Tigga) {
        typeBonus = 5;
      } else if (getGuessPlayer() === Dooms) {
        typeBonus = 2;
      } else {
        typeBonus = 1;
      }
    }
    const enSpawnBonus_rate = headIsRange ? 3 : 0.6;
    const enSpawnBonus =
      1 + enSpawnBonus_rate * goInRange(5 + ESDCompare(tar, cre), 0, 10);
    const disBonus = divideReduce(GR(tar, cre), 1.5);
    const sameBonus = cre.upgrade.currentTarget === tar ? 1.5 : 1;
    const otherLeaders = friends.filter(i => i.role === tailMelee && i !== cre);
    const linkBonus =
      1 +
      1.5 * otherLeaders.filter(i => i.upgrade.currentTarget === tar).length;
    const tauntBonus = 1 + 0.02 * getTaunt(tar);
    // const extraTauntBonus=calExtraTaunt()
    const final =
      disBonus * sameBonus * linkBonus * typeBonus * tauntBonus * enSpawnBonus;
    SAN(tar, "T", final);
    // SAN(tar, "ESB", enSpawnBonus);
    return final;
  });
  if (target) {
    drawLineComplex(cre, target, 1, "#ee3333", "dashed");
    cre.upgrade.currentTarget = target;
    const head = <Cre_battle>best(myGroup, i => -tailIndex(i));
    const tail = <Cre_move>best(myGroup, i => tailIndex(i));

    const second = best(
      myGroup.filter(i => i !== head),
      i => -tailIndex(i)
    );
    // const healer = myGroup.find(i => tailIndex(i) === 1);
    const healer = myGroup.find(i => tailIndex(i) === 1);
    const scanRange_threat = 5 + myGroupLen + (headIsRange ? 7 : 0);
    const enemyThreats = enemies.filter(
      i =>
        hasThreat(i) &&
        (GR(tail, i) <= scanRange_threat || GR(cre, i) <= scanRange_threat)
    );
    const enemyMelees = enemyThreats.filter(i => i.getBodyPartsNum(ATTACK) > 0);
    const closestThreat = best(enemyThreats, i => -GR(i, cre));
    const closestThreatDis = closestThreat ? GR(closestThreat, cre) : 50;
    if (tail && head) {
      refreshStartGate(cre, tail, myGroup);
      //clear pull tars task and move task
      getGroup_real(myGroupNum).forEach(mem => {
        mem.stop();
        mem.tasks.find(i => i instanceof PullTarsTask)?.end();
      });
      const tarDistance = target ? GR(head, target) : 1;
      const hasMelee =
        enemies.find(
          i => i.getBodyPartsNum(ATTACK) >= 3 && GR(i, head) <= 5
        ) !== undefined;
      const healerHead = myGroup.filter(i => tailIndex(i) <= 4);
      const sumDamage = sum(healerHead, i => damageAmount(i));
      const closestThreat = closest(cre, enemyThreats);
      const closestThreatDis = closestThreat
        ? GR(cre, closestThreat)
        : Infinity;
      const healPerTick = healer ? healer.getHealthyBodyPartsNum(HEAL) : 0;
      const disExtra = healPerTick * Math.min(tarDistance, closestThreatDis);
      const ranEns = enemyMelees.filter(i => InRan2(i, head));
      const sumForce = sum(ranEns, i => {
        const force = calculateForce(i);
        const dis = GR(i, cre);
        return dis <= 1 ? force : 0.75 * force;
      });
      SAN(cre, "sumFo", sumForce);
      const damaged = sumDamage > disExtra + (800 - 300 * sumForce);
      const damaged_light = sumDamage > relu(disExtra + 400 - 150 * sumForce);
      const tailHasThreat =
        enemyThreats.find(i => GR(i, tail) < myGroup.length - 3) !== undefined;

      const healerHasThreat =
        healer && enemyMelees.find(i => Adj(i, healer)) !== undefined;
      // SA(cre, "ESD=" + enemySpawnDistance(cre));

      const XAxisThreatsArr = enemyThreats.filter(i => {
        // SA(i, "ESD=" + enemySpawnDistance(i));
        return ESDGreaterThan(i, cre, headIsRange ? 2 : 0);
      });
      const XAxisThreat = XAxisThreatsArr.length > 0;
      XAxisThreatsArr.forEach(i =>
        drawLineComplex(cre, i, 1, "#22ff00", dashed)
      );
      drawRange(cre, scanRange_threat, "#007777");
      drawRange(tail, scanRange_threat, "#007777");
      SAB(cre, "THT", tailHasThreat);
      SAB(cre, "XAT", XAxisThreat);
      if (healer && !Adj(healer, head)) {
        SA(cre, "linkHead");
        head.tasks.find(i => i instanceof PullTarsTask)?.end();
        const followers = myGroup.filter(i => i !== head && i !== healer);
        const sortedFollowers = followers.sort(
          (a, b) => tailIndex(a) - tailIndex(b)
        );
        pullAction(healer, sortedFollowers, head);
      } else if (tailHasThreat || healerHasThreat) {
        SA(cre, "BttTt");
        fleeAction(cre, myGroup, head, tail, healer);
      } else if (XAxisThreat) {
        SA(cre, "XAxisTt");
        fleeAction(cre, myGroup, head, tail, healer);
      } else if (damaged_light) {
        SA(cre, "damage_light");
        const enemyMeleesThreat = enemyMelees.filter(
          i => i.getHealthyBodyPartsNum(ATTACK) >= 2
        );
        const waitRange = headIsRange ? 4 : 2;
        if (
          enemyMeleesThreat.find(i => GR(i, cre) <= waitRange) === undefined
        ) {
          SA(cre, "wait");
          stopAction(cre, head, myGroup);
        } else if (headIsRange) {
          fleeAction(cre, myGroup, head, tail, healer);
        } else if (damaged) {
          //heavy damaged
          fleeAction(cre, myGroup, head, tail, healer);
        } else {
          //light damaged
          stopAction(cre, head, myGroup);
        }
      } else {
        let ifChase: boolean;
        if (target instanceof Cre && target.getBodyPartsNum(ATTACK) === 0) {
          ifChase = true;
        } else if (
          target instanceof Cre &&
          target.getBodyPartsNum(WORK) > 0 &&
          inRampart(target)
        ) {
          ifChase = false;
        } else if (
          target instanceof Cre &&
          target.getBodyPartsNum(WORK) > 0 &&
          !inRampart(target)
        ) {
          ifChase = true;
        } else {
          ifChase = false;
        }
        if (Adj(head, target) && !ifChase) {
          SA(cre, "ADJ");
          stopAction(cre, head, myGroup);
        } else if (headIsRange) {
          SA(cre, "RANGE");
          const hasAllyMelee =
            friends.find(
              i => GR(i, cre) <= 3 && i.getBodyPartsNum(ATTACK) >= 6
            ) !== undefined;
          const hasMeleeEnemy =
            enemies.find(
              i => GR(i, cre) <= 4 && i.getBodyPartsNum(ATTACK) >= 2
            ) !== undefined;
          SAB(cre, "HAM", hasAllyMelee);
          SAB(cre, "HM", hasMeleeEnemy);
          SAN(cre, "CTD", closestThreatDis);
          if (closestThreatDis <= 2) {
            if (hasMeleeEnemy) {
              fleeAction(cre, myGroup, head, tail, healer);
            } else {
              stopAction(cre, head, myGroup);
            }
          } else if (closestThreatDis === 3) {
            if (hasMeleeEnemy) {
              if (ranBool(hasAllyMelee ? 0.1 : 0.6)) {
                fleeAction(cre, myGroup, head, tail, healer);
              } else {
                stopAction(cre, head, myGroup);
              }
            } else {
              pushAction(cre, target, myGroup, head, tail, healer);
            }
          } else if (closestThreatDis === 4) {
            if (hasMeleeEnemy) {
              if (ranBool(hasAllyMelee ? 0.1 : 0.6)) {
                stopAction(cre, head, myGroup);
              } else {
                pushAction(cre, target, myGroup, head, tail, healer);
              }
            } else {
              pushAction(cre, target, myGroup, head, tail, healer);
            }
          } else {
            pushAction(cre, target, myGroup, head, tail, healer);
          }
        } else {
          SA(cre, "MELEE");
          pushAction(cre, target, myGroup, head, tail, healer);
        }
      }
    } else {
      SA(cre, "NO TAIL HEAD");
    }
  } else {
    SA(cre, "NO TARGET");
  }
}
function pullAction(
  cre: Cre_move,
  followers: Cre_move[],
  tar: Pos,
  goSide: boolean = false
) {
  let costMat = undefined;
  if (goSide) {
    costMat = new CostMatrix();
    if (inRange(tar.x, border_L1, border_R1)) {
      const range = 25;
      for (let i = 0; i < range * 2; i++) {
        const setValue = 10;
        const setY = tar.y + i - range;
        if (inBorder(tar.x, setY)) {
          const absRan = Math.abs(setY - tar.y);
          const setValue_final = Math.floor(2 + (setValue * absRan) / range);
          costMat.set(tar.x, setY, setValue_final);
          if (spawn_left) {
            costMat.set(tar.x + 1, setY, setValue_final);
            costMat.set(tar.x + 2, setY, setValue_final);
          } else {
            costMat.set(tar.x - 1, setY, setValue_final);
            costMat.set(tar.x - 2, setY, setValue_final);
          }
          drawText(new Pos_C(tar.x, setY), "" + setValue_final);
        }
      }
    }
  }
  newPullTarsTask(cre, followers, tar, 10, costMat, 1, 2);
}
function stopAction(cre: Cre_move, head: Cre, myGroup: Cre_move[]) {
  SA(cre, "STOP");
  if (arrangeTail_all(cre, myGroup)) {
    return;
  }
  myGroup.forEach(mem => mem.tasks.find(i => i instanceof PullTarsTask)?.end());
  myGroup.forEach(mem => mem.stop());
  SA(cre, "cleanFatigue");
  cleanFatigue(myGroup);
}
function cleanFatigue(myGroup: Cre_move[]) {
  const tar = <Cre_move>best(myGroup, i => i.master.fatigue);
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
        const sortedTarTop = tarTop.sort((a, b) => tailIndex(b) - tailIndex(a));
        new PullTarsTask(tar, sortedTarTop, spawn, 10);
        if (tarBottom.length >= 2) {
          SA(tar, "bottom");
          cleanFatigue(tarBottom);
        }
      }
    } else {
      if (tarBottom.length > 0) {
        const sortedTarBottom = tarTop.sort(
          (a, b) => tailIndex(a) - tailIndex(b)
        );
        new PullTarsTask(tar, sortedTarBottom, spawn, 10);
        if (tarTop.length >= 2) {
          SA(tar, "top");
          cleanFatigue(tarTop);
        }
      }
    }
  }
}
function arrangeTail_all(cre: Cre, myGroup: Cre_move[]): boolean {
  if (inMyBaseRan(cre) && Y_axisDistance(cre, spawn) <= 20) {
    return false;
  } else if (arrangeTail(cre, myGroup)) {
    return true;
  } else if (arrangeTail2(cre, myGroup)) {
    return true;
  } else {
    return false;
  }
}
function arrangeTail2(cre: Cre, myGroup: Cre_move[]): boolean {
  SA(cre, "arrange2");
  let notAllPulling = false;
  for (let i = 0; i < myGroup.length - 1; i++) {
    const cre0 = myGroup[i];
    const cre1 = myGroup[i + 1];
    if (!Adj(cre0, cre1)) {
      notAllPulling = true;
    }
  }
  if (notAllPulling) return false;
  SA(cre, "=>");
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
        SA(cre0, "ARR2");
        const followers = myGroup.filter(
          i => i !== tail && tailIndex(i) >= tailIndex(creMid2)
        );
        const sortedFollowers = followers.sort(
          (a, b) => tailIndex(b) - tailIndex(a)
        );
        SA(creMid1, "MD");
        moveTo_direct(creMid1, tarPos);
        if (tail) pullAction(tail, sortedFollowers, spawn);
        return true;
      }
    }
  }
  return false;
}
function arrangeTail(cre: Cre, myGroup: Cre_move[]): boolean {
  SA(cre, "arrange");
  let notAllPulling = false;
  for (let i = 0; i < myGroup.length - 1; i++) {
    const cre0 = myGroup[i];
    const cre1 = myGroup[i + 1];
    if (!Adj(cre0, cre1)) {
      notAllPulling = true;
    }
  }
  if (notAllPulling) return false;
  const tail = best(myGroup, i => tailIndex(i));
  for (let i = 0; i < myGroup.length - 2; i++) {
    const cre0 = myGroup[i];
    const creMid = myGroup[i + 1];
    const cre1 = myGroup[i + 2];
    if (Adj(cre0, cre1)) {
      drawLineComplex(cre0, cre1, 0.8, "#ff7700");
      SA(cre0, "ARR");
      const followers = myGroup.filter(
        i => i !== tail && tailIndex(i) >= tailIndex(creMid)
      );
      const sortedFollowers = followers.sort(
        (a, b) => tailIndex(b) - tailIndex(a)
      );
      if (tail) pullAction(tail, sortedFollowers, spawn);
      return true;
    }
  }
  return false;
}
function pushAction(
  cre: Cre_move,
  target: Unit,
  myGroup: Cre_move[],
  head: Cre_move,
  tail: Cre_move,
  healer: Cre_move | undefined
) {
  SA(cre, "PUSH");
  if (arrangeTail_all(cre, myGroup)) {
    return;
  }
  if (tail.master.fatigue !== 0) {
    stopAction(cre, head, myGroup);
    return;
  }
  const NofatLen = myGroup.filter(i => i.master.fatigue === 0).length;
  const totalFatigue = sum(myGroup, i => i.master.fatigue);
  if (NofatLen <= 0.5 * myGroup.length || totalFatigue >= 150) {
    SA(cre, "FtqResst" + NofatLen + " " + totalFatigue);
    stopAction(cre, head, myGroup);
  } else {
    const followers = myGroup.filter(i => i !== head);
    const sortedFollowers = followers.sort(
      (a, b) => tailIndex(a) - tailIndex(b)
    );
    tail.tasks.find(i => i instanceof PullTarsTask)?.end();
    pullAction(cre, sortedFollowers, target, true);
    const moveTask = cre.tasks.find(i => i instanceof MoveTask);
    if (healer && moveTask && moveTask instanceof MoveTask) {
      const tempTar = first(moveTask.path);
      if (tempTar) {
        drawLineComplex(cre, tempTar, 0.8, "#ff22ff");
        if (friends.find(i => atPos(i, tempTar)) !== undefined) {
          SA(cre, "CONFLICT");
          cre.tasks.find(i => i instanceof PullTarsTask)?.end();
          fleeAction(cre, myGroup, head, tail, healer);
        }
      }
    }
  }
}
function getNextMember(myGroup: Cre_move[], ind: number): Cre_move | undefined {
  const selectGroup = myGroup.filter(i => tailIndex(i) > ind);
  return best(selectGroup, i => -tailIndex(i));
}
function fleeAction(
  cre: Cre_move,
  myGroup: Cre_move[],
  head: Cre_move,
  tail: Cre_move,
  healer: Cre_move | undefined
) {
  if (!healer) {
    SA(cre, "RUSH");
    pushAction(cre, enemySpawn, myGroup, head, tail, healer);
  }
  SA(cre, "FLEE");
  const oneAfterFirst = getNextMember(myGroup, 0);
  const oneAfterSecond = getNextMember(myGroup, 1);
  const moveFatigueRtn_head = getMoveAndFatigueNum_single(
    head,
    0,
    false,
    false,
    oneAfterFirst
  );
  const moveFatigueRtn_second = healer
    ? getMoveAndFatigueNum_single(healer, 0, false, false, oneAfterSecond)
    : {
        moveNum: 0,
        bodyNum: 0,
        fatigueNum: 0,
      };
  const allFatigue =
    moveFatigueRtn_head.fatigueNum + moveFatigueRtn_second.fatigueNum;
  const allMove = sum(
    myGroup.filter(i => i.master.fatigue === 0),
    i => i.getHealthyBodyPartsNum(MOVE)
  );
  const candecreaseAllFatigue = allFatigue <= allMove * 2;
  if (candecreaseAllFatigue || tail.master.fatigue > 0) {
    SA(cre, "CanD");
    const followers2 = myGroup.filter(i => i !== tail);
    const sortedFollowers2 = followers2.sort(
      (a, b) => tailIndex(b) - tailIndex(a)
    );
    pullAction(tail, sortedFollowers2, spawn);
  } else {
    SA(cre, "Norm");
    const fatigueHolder = best(
      myGroup.filter(i => i !== tail && i.master.fatigue === 0),
      i => tailIndex(i)
    );
    head.tasks.find(i => i instanceof PullTarsTask)?.end();
    if (fatigueHolder) {
      SA(fatigueHolder, "fatigueHolder");
      const followers = myGroup.filter(
        i => tailIndex(i) < tailIndex(fatigueHolder)
      );
      const sortedFollowers = followers.sort(
        (a, b) => tailIndex(b) - tailIndex(a)
      );
      const fatigueHolderNext = myGroup.find(
        i => tailIndex(i) === tailIndex(fatigueHolder) + 1
      );
      if (fatigueHolderNext) {
        SA(fatigueHolderNext, "fatigueHolderNext");
        SA(fatigueHolder, "SFL=" + sortedFollowers.length);
        if (sortedFollowers.length === 0) {
          SA(fatigueHolder, "MD");
          moveTo_direct(fatigueHolder, fatigueHolderNext);
        } else {
          new PullTarsTask(
            fatigueHolder,
            sortedFollowers,
            fatigueHolderNext,
            10
          );
        }
        const direct = getDirectionByPos(fatigueHolder, fatigueHolderNext);
        SA(fatigueHolder, "direct=" + direct);
        fatigueHolder.stop();
        fatigueHolder.master.move(direct);
        const followers2 = myGroup.filter(
          i => i !== tail && tailIndex(i) > tailIndex(fatigueHolder)
        );
        const sortedFollowers2 = followers2.sort(
          (a, b) => tailIndex(b) - tailIndex(a)
        );
        SA(tail, "Tail=" + sortedFollowers2.length);
        if (sortedFollowers2.length === 0) {
          tail.MT(spawn);
        } else {
          pullAction(tail, sortedFollowers2, spawn);
        }
      } else {
        pullAction(fatigueHolder, sortedFollowers, spawn);
      }
    } else {
      SA(cre, "no fatigueHolder");
      const followers = myGroup.filter(i => i !== tail);
      const sortedFollowers = followers.sort(
        (a, b) => tailIndex(b) - tailIndex(a)
      );
      pullAction(tail, sortedFollowers, spawn);
    }
  }
}
// function tailShoterJob(cre: Cre) {
//   SA(cre, "tailShoterJob");
//   const targets = oppoUnits.filter(
//     i => i instanceof Cre || i instanceof Ext || i instanceof Spa
//   );
//   const target = best(targets, i => {
//     return -GR(i, cre);
//   });
//   if (target) {
//     const dis = GR(target, cre);
//     if (dis <= 2) {
//       SA(cre, "FLEE");
//     } else if (dis === 3) {
//       if (ranBool(0.9)) {
//         SA(cre, "STOP");
//         //TODO
//       }
//     }
//     //TODO
//   }
// }
function tailPartJob(cre: Cre_move) {
  const groupNum = tailGroup(cre);
  const tailInd = tailIndex(cre);
  SA(cre, "TP G" + groupNum + "_" + tailInd);
  const myGroup = getGroup(groupNum);
  const head = myGroup.find(i => i.role === tailMelee || i.role === tailHealer);
  const tail = last(myGroup);
  if (head) {
    if (tail && !myGroup.find(i => i === cre)) {
      if (!Adj(cre, tail)) {
        SA(cre, "MTH");
        cre.MT(tail, [cre], 5, undefined, 1, 1);
      }
    }
  } else {
  }
}
function command() {}
