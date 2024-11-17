import { ATTACK, HEAL, RANGED_ATTACK, WORK } from "game/constants";
import { CostMatrix } from "game/path-finder";
import { calculateForce, getTaunt } from "../gameObjects/battle";
import { Cre, Task_Role } from "../gameObjects/Cre";
import { Cre_battle } from "../gameObjects/Cre_battle";
import { getPSC } from "../gameObjects/Cre_findPath";
import { MoveTask } from "../gameObjects/Cre_move";
import { Cre_pull, PullTarsTask } from "../gameObjects/Cre_pull";
import { hasThreat, isArmy, Role } from "../gameObjects/CreTool";
import {
  enemies,
  enemySpawn,
  friends,
  mySpawn,
  oppoUnits,
  Unit,
} from "../gameObjects/GameObjectInitialize";
import { damageAmount, damaged } from "../gameObjects/HasHits";
import { Dooms, getGuessPlayer, Tigga } from "../gameObjects/player";
import { Spa } from "../gameObjects/Stru";
import { inRampart } from "../gameObjects/UnitTool";
import { border_L1, border_R1, spawn_left } from "../utils/game";
import {
  best,
  divideReduce,
  first,
  goInRange,
  inRange,
  ranBool,
  relu,
  sum,
} from "../utils/JS";
import {
  Adj,
  atPos,
  closest,
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
import {
  arrangeTail_all,
  cleanFatigue,
  fleeAction,
  getGroup_adj,
  getGroup_all,
  tailGroup,
  tailIndex,
} from "./tailer";

export const tailHealer: Role = new Role(
  "tailHealer",
  cre => new tailHealerJob(<Cre_battle>cre)
);
export class tailHealerJob extends Task_Role {
  master: Cre_battle;
  constructor(master: Cre_battle) {
    super(master);
    this.master = master;
    this.cancelOldTask(tailHealerJob);
  }
  loop_task(): void {
    const cre = this.master;
    SA(cre, "tailHealerJob");
    cre.fight();
    const myGroup = getGroup_adj(tailGroup(cre));
    const melee = myGroup.find(i => i.role === tailMelee);
    const tail = <Cre_pull>best(myGroup, i => tailIndex(i));
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
}
export function ESDGreaterThan(en: Pos, fri: Pos, bias: number = 0) {
  return ESDCompare(en, fri) + bias > 0;
}
export function ESDCompare(en: Pos, fri: Pos): number {
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
  if (X_axisDistance(pos, mySpawn) <= 7 && inRange(pos.y, 11, 88)) {
    return 200 - Y_axisDistance(pos, mySpawn);
  } else if (X_axisDistance(pos, enemySpawn) <= 7 && inRange(pos.y, 11, 88)) {
    return Y_axisDistance(pos, enemySpawn);
  } else {
    return 50 + X_axisDistance(pos, enemySpawn);
  }
}
export function refreshStartGate(
  cre: Cre_pull,
  tail: Cre_pull,
  myGroup: Cre_pull[]
) {
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
export const tailMelee: Role = new Role(
  "tailMelee",
  cre => new tailMeleeJob(<Cre_battle>cre)
);

export class tailMeleeJob extends Task_Role {
  master: Cre_battle;
  constructor(master: Cre_battle) {
    super(master);
    this.master = master;
    this.cancelOldTask(tailMeleeJob);
  }
  loop_task(): void {
    const cre = this.master;
    SA(cre, "tailMeleeJob");
    cre.fight();
    const myGroupNum = tailGroup(cre);
    const myGroup = getGroup_adj(myGroupNum);
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
      const otherLeaders = friends.filter(
        i => i.role === tailMelee && i !== cre
      );
      const linkBonus =
        1 +
        1.5 * otherLeaders.filter(i => i.upgrade.currentTarget === tar).length;
      const tauntBonus = 1 + 0.02 * getTaunt(tar);
      // const extraTauntBonus=calExtraTaunt()
      const final =
        disBonus *
        sameBonus *
        linkBonus *
        typeBonus *
        tauntBonus *
        enSpawnBonus;
      SAN(tar, "T", final);
      // SAN(tar, "ESB", enSpawnBonus);
      return final;
    });
    if (target) {
      drawLineComplex(cre, target, 1, "#ee3333", "dashed");
      cre.upgrade.currentTarget = target;
      const head = <Cre_battle>best(myGroup, i => -tailIndex(i));
      const tail = <Cre_pull>best(myGroup, i => tailIndex(i));

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
      const enemyMelees = enemyThreats.filter(
        i => i.getBodyPartsNum(ATTACK) > 0
      );
      const closestThreat = best(enemyThreats, i => -GR(i, cre));
      const closestThreatDis = closestThreat ? GR(closestThreat, cre) : 50;
      if (tail && head) {
        refreshStartGate(cre, tail, myGroup);
        //clear pull tars task and move task
        getGroup_all(myGroupNum).forEach(mem => {
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
          enemyThreats.find(i => GR(i, tail) < myGroup.length - 3) !==
          undefined;

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
}
export function pullAction(
  cre: Cre_pull,
  followers: Cre_pull[],
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
  cre.newPullTarsTask(followers, tar, 10, costMat, getPSC(1, 2));
}
export function stopAction(cre: Cre_pull, head: Cre, myGroup: Cre_pull[]) {
  SA(cre, "STOP");
  if (arrangeTail_all(cre, myGroup)) {
    return;
  }
  myGroup.forEach(mem => mem.tasks.find(i => i instanceof PullTarsTask)?.end());
  myGroup.forEach(mem => mem.stop());
  SA(cre, "cleanFatigue");
  cleanFatigue(myGroup);
}
export function pushAction(
  cre: Cre_pull,
  target: Unit,
  myGroup: Cre_pull[],
  head: Cre_pull,
  tail: Cre_pull,
  healer: Cre_pull | undefined
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
