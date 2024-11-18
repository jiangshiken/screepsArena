import { ATTACK, HEAL, RANGED_ATTACK, WORK } from "game/constants";
import { CostMatrix } from "game/path-finder";
import { calculateForce, getTaunt } from "../gameObjects/battle";
import { Cre, Task_Role } from "../gameObjects/Cre";
import { Cre_battle } from "../gameObjects/Cre_battle";
import { getPSC } from "../gameObjects/Cre_findPath";
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
import { damageAmount } from "../gameObjects/HasHits";
import { Dooms, getGuessPlayer, Tigga } from "../gameObjects/player";
import { Spa } from "../gameObjects/Stru";
import { inRampart } from "../gameObjects/UnitTool";
import { border_L1, border_R1, spawn_left } from "../utils/game";
import {
  best,
  divideReduce,
  goInRange,
  inRange,
  last,
  ranBool,
  relu,
  sum,
} from "../utils/JS";
import {
  Adj,
  closest,
  GR,
  inBorder,
  InRan2,
  Pos,
  Pos_C,
  X_axisDistance,
  Y_axisDistance,
} from "../utils/Pos";
import { findTask } from "../utils/Task";
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
  getTailers_all,
  getTailers_inGroup,
  getTailers_inGroup_adj,
  getTailerTask,
  tailChainPullAction,
  tailIndex,
} from "./tailer";
export const tailHealer: Role = new Role(
  "tailHealer",
  cre => new tailHealerJob(<Cre_battle>cre)
);
export function getMeleeTask(cre: Cre_battle): tailMeleeJob {
  return <tailMeleeJob>findTask(cre, tailMeleeJob);
}
export function getHealerTask(cre: Cre_battle): tailHealerJob {
  return <tailHealerJob>findTask(cre, tailHealerJob);
}
export class tailHealerJob extends Task_Role {
  master: Cre_battle;
  head: Cre_battle | undefined;
  myGroup: Cre_pull[] = [];
  constructor(master: Cre_battle) {
    super(master);
    this.master = master;
    this.cancelOldTask(tailHealerJob);
  }
  loop_task(): void {
    const cre = this.master;
    SA(cre, "tailHealerJob");
    cre.fight();
    // const
    const allTailers = getTailers_all();
    const myTailers = getTailers_inGroup(this.master);
    const myAdjTailers = getTailers_inGroup_adj(this.master);
    if (allTailers.length < 6) {
      const idleTailers = allTailers.filter(
        i => getTailerTask(i).tailGroupTarget === undefined
      );
      const tarTailer = closest(this.master, idleTailers);
      if (tarTailer) {
        getTailerTask(tarTailer).tailGroupTarget = this.master;
        const tail = <Cre_pull>last(myTailers);
        getTailerTask(tarTailer).tailIndex = getTailerTask(tail).tailIndex + 1;
      }
    }
    if (!this.head) {
      SA(this.master, "NO Head");
      const tarHead = <Cre_battle | undefined>(
        friends.find(
          i =>
            i instanceof Cre_battle &&
            i.role === tailMelee &&
            getMeleeTask(i).healer === undefined
        )
      );
      if (tarHead) {
        SA(this.master, "found tar head");
        this.head = tarHead;
        getMeleeTask(tarHead).healer = this.master;
      } else {
        SA(this.master, "can not find tar head");
        // //no head
        // this.myGroup = getTailers_inGroup(this.master);
        // const tail = last(this.myGroup);
        // SA(cre, "GO");
        // this.myGroup.forEach(i =>
        //   i.tasks.find(i => i instanceof PullTarsTask)?.end()
        // );
        // if (damaged(cre)) {
        //   tailChainPullAction(this.myGroup, mySpawn);
        // } else {
        //   const targets = friends.filter(i => i.role === tailMelee);
        //   const target = closest(cre, targets);
        //   if (target) {
        //     if (Adj(target, cre)) {
        //       cre.stop();
        //     } else {
        //       this.pushAction(cre, target, this.myGroup);
        //     }
        //   }
        // }
      }
    } else {
      SA(this.master, "has Head");
      if (!Adj(cre, this.head)) {
        SA(cre, "MTH");
        cre.MT(this.head);
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

export const tailMelee: Role = new Role(
  "tailMelee",
  cre => new tailMeleeJob(<Cre_battle>cre)
);

export class tailMeleeJob extends Task_Role {
  readonly master: Cre_battle;
  healer: Cre_battle | undefined;
  readonly headIsRange: boolean;
  target: Unit;
  myGroup: Cre_pull[] = [];
  constructor(master: Cre_battle) {
    super(master);
    this.master = master;
    this.cancelOldTask(tailMeleeJob);
    this.headIsRange = master.getBodyPartsNum(RANGED_ATTACK) >= 3;
    this.target = enemySpawn;
  }
  loop_task(): void {
    const cre = this.master;
    SA(cre, "tailMeleeJob");
    cre.fight();
    if (this.healer) {
      SA(cre, "HH");
      const myTailers = getTailers_inGroup(this.healer);
      const adjTailers = getTailers_inGroup_adj(this.healer);
      this.myGroup = (<Cre_pull[]>[this.master, this.healer]).concat(
        adjTailers
      );
      const myGroupLen = this.myGroup.length;
      SA(cre, " mgl=" + this.myGroup.length);
      const scanRange_target = 5 + myGroupLen + (this.headIsRange ? 7 : 0);
      const targets = oppoUnits.filter(
        i =>
          (i instanceof Cre && GR(i, cre) <= scanRange_target) ||
          i instanceof Spa
      );
      SA(displayPos(), "targets.len" + targets.length);
      const target = this.targetSelect(targets);
      if (target) {
        drawLineComplex(cre, target, 1, "#ee3333", "dashed");
        this.target = target;
        const head = <Cre_battle>best(this.myGroup, i => -tailIndex(i));
        const tail = <Cre_pull>best(this.myGroup, i => tailIndex(i));
        const second = best(
          this.myGroup.filter(i => i !== head),
          i => -tailIndex(i)
        );
        // const healer = this.myGroup.find(i => tailIndex(i) === 1);
        const healer = this.myGroup.find(i => tailIndex(i) === 1);
        const scanRange_threat = 5 + myGroupLen + (this.headIsRange ? 7 : 0);
        const enemyThreats = enemies.filter(
          i =>
            hasThreat(i) &&
            (GR(tail, i) <= scanRange_threat || GR(cre, i) <= scanRange_threat)
        );
        const enemyMelees = enemyThreats.filter(
          i => i.getBodyPartsNum(ATTACK) > 0
        );
        this.refreshStartGate(cre, tail, this.myGroup);
        //clear pull tars task and move task
        const tarDistance = target ? GR(head, target) : 1;
        const hasMelee =
          enemies.find(
            i => i.getBodyPartsNum(ATTACK) >= 3 && GR(i, head) <= 5
          ) !== undefined;
        const healerHead = this.myGroup.filter(i => tailIndex(i) <= 4);
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
          enemyThreats.find(i => GR(i, tail) < this.myGroup.length - 3) !==
          undefined;

        const healerHasThreat =
          healer && enemyMelees.find(i => Adj(i, healer)) !== undefined;
        // SA(cre, "ESD=" + enemySpawnDistance(cre));
        const XAxisThreatsArr = enemyThreats.filter(i => {
          // SA(i, "ESD=" + enemySpawnDistance(i));
          return ESDGreaterThan(i, cre, this.headIsRange ? 2 : 0);
        });
        const XAxisThreat = XAxisThreatsArr.length > 0;
        XAxisThreatsArr.forEach(i =>
          drawLineComplex(cre, i, 1, "#22ff00", dashed)
        );
        drawRange(cre, scanRange_threat, "#007777");
        drawRange(tail, scanRange_threat, "#007777");
        SAB(cre, "THT", tailHasThreat);
        SAB(cre, "XAT", XAxisThreat);
        if (tailHasThreat || healerHasThreat) {
          SA(cre, "BttTt");
          tailChainPullAction(this.myGroup, mySpawn);
        } else if (XAxisThreat) {
          SA(cre, "XAxisTt");
          tailChainPullAction(this.myGroup, mySpawn);
        } else if (damaged_light) {
          SA(cre, "damage_light");
          const enemyMeleesThreat = enemyMelees.filter(
            i => i.getHealthyBodyPartsNum(ATTACK) >= 2
          );
          const waitRange = this.headIsRange ? 4 : 2;
          if (
            enemyMeleesThreat.find(i => GR(i, cre) <= waitRange) === undefined
          ) {
            SA(cre, "wait");
            this.stopAction();
          } else if (this.headIsRange) {
            tailChainPullAction(this.myGroup, mySpawn);
          } else if (damaged) {
            //heavy damaged
            tailChainPullAction(this.myGroup, mySpawn);
          } else {
            //light damaged
            this.stopAction();
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
            this.stopAction();
          } else if (this.headIsRange) {
            this.rangedTypeAction(closestThreatDis);
          } else {
            SA(cre, "MELEE");
            this.pushAction(target);
          }
        }
      } else {
        SA(cre, "NO TARGET");
      }
    } else {
      SA(this.master, "NO healer");
    }
  }
  rangedTypeAction(closestThreatDis: number) {
    const cre = this.master;
    SA(cre, "RANGE");
    const hasAllyMelee =
      friends.find(i => GR(i, cre) <= 3 && i.getBodyPartsNum(ATTACK) >= 6) !==
      undefined;
    const hasMeleeEnemy =
      enemies.find(i => GR(i, cre) <= 4 && i.getBodyPartsNum(ATTACK) >= 2) !==
      undefined;
    SAB(cre, "HAM", hasAllyMelee);
    SAB(cre, "HM", hasMeleeEnemy);
    SAN(cre, "CTD", closestThreatDis);
    if (closestThreatDis <= 2) {
      if (hasMeleeEnemy) {
        tailChainPullAction(this.myGroup, mySpawn);
      } else {
        this.stopAction();
      }
    } else if (closestThreatDis === 3) {
      if (hasMeleeEnemy) {
        if (ranBool(hasAllyMelee ? 0.1 : 0.6)) {
          tailChainPullAction(this.myGroup, mySpawn);
        } else {
          this.stopAction();
        }
      } else {
        this.pushAction(this.target);
      }
    } else if (closestThreatDis === 4) {
      if (hasMeleeEnemy) {
        if (ranBool(hasAllyMelee ? 0.1 : 0.6)) {
          this.stopAction();
        } else {
          this.pushAction(this.target);
        }
      } else {
        this.pushAction(this.target);
      }
    } else {
      this.pushAction(this.target);
    }
  }
  targetSelect(targets: Unit[]) {
    const cre = this.master;
    return best(targets, tar => {
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
      const enSpawnBonus_rate = this.headIsRange ? 3 : 0.6;
      const enSpawnBonus =
        1 + enSpawnBonus_rate * goInRange(5 + ESDCompare(tar, cre), 0, 10);
      const disBonus = divideReduce(GR(tar, cre), 1.5);
      const sameBonus = this.target === tar ? 1.5 : 1;
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
  }
  pushPullAction(followers: Cre_pull[], tar: Pos) {
    const cre = this.master;
    SA(cre, "push pull");
    let costMat = undefined;
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
    this.master.newPullTarsTask(followers, tar, 10, costMat, getPSC(1, 2));
  }
  endHeadTask() {
    SA(this.master, "endHeadTask");
    findTask(this.master, PullTarsTask)?.end();
  }
  stopAction() {
    const cre = this.master;
    SA(cre, "STOP");
    if (arrangeTail_all(cre, this.myGroup)) {
      SA(cre, "wait arrange tail");
    } else {
      SA(cre, "stop action");
      this.endHeadTask();
      SA(cre, "try cleanFatigue");
      cleanFatigue(this.myGroup);
    }
  }
  pushAction(target: Unit) {
    const cre = this.master;
    SA(cre, "PUSH");
    const tail = <Cre_pull>last(this.myGroup);
    const NofatLen = this.myGroup.filter(i => i.master.fatigue === 0).length;
    const totalFatigue = sum(this.myGroup, i => i.master.fatigue);
    if (tail.master.fatigue !== 0) {
      SA(cre, "wait tail Ftq");
      this.stopAction();
    } else if (NofatLen <= 0.5 * this.myGroup.length || totalFatigue >= 150) {
      SA(cre, "FtqResst" + NofatLen + " " + totalFatigue);
      this.stopAction();
    } else if (arrangeTail_all(cre, this.myGroup)) {
      SA(cre, "wait arrange tail");
    } else {
      SA(cre, "normal pull");
      const followers = this.myGroup.filter(i => i !== cre);
      this.pushPullAction(followers, target);
    }
  }
  refreshStartGate(cre: Cre_pull, tail: Cre_pull, myGroup: Cre_pull[]) {
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
}
