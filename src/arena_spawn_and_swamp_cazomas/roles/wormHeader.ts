import { ATTACK, HEAL, MOVE, RANGED_ATTACK } from "game/constants";
import { calculateForce, getTaunt } from "../gameObjects/battle";
import { Cre, Task_Role } from "../gameObjects/Cre";
import { Cre_battle } from "../gameObjects/Cre_battle";
import { getPSC } from "../gameObjects/Cre_findPath";
import { Cre_pull, PullTarsTask } from "../gameObjects/Cre_pull";
import { hasThreat, isArmy, isMelee, Role } from "../gameObjects/CreTool";
import {
  enemies,
  enemySpawn,
  friends,
  mySpawn,
  oppoUnits,
  Unit,
} from "../gameObjects/GameObjectInitialize";
import { damageAmount, damagedRate } from "../gameObjects/HasHits";
import { Dooms, getGuessPlayer, Tigga } from "../gameObjects/player";
import { Spa } from "../gameObjects/Stru";
import { arrReverse, best, divideReduce, last, relu, sum } from "../utils/JS";
import { Adj, GR, InRan2 } from "../utils/Pos";
import { findTask } from "../utils/Task";
import { SA, SAN } from "../utils/visual";
import { harvester } from "./harvester";
import { arrangeTail_all } from "./tailer";
import { wormPartJob } from "./wormPart_rush";

export const wormHeader: Role = new Role(
  "wormHeader",
  cre => new wormHeaderJob(<Cre_battle>cre)
);
export function wormHeaderTail_index(cre: Cre): number {
  return cre.group_Index ? cre.group_Index : -1;
}
export class wormHeaderJob extends Task_Role {
  readonly master: Cre_battle;
  target: Unit;
  myGroup: Cre_pull[] = [];
  isPushing: boolean = true;
  constructor(master: Cre_battle) {
    super(master);
    this.master = master;
    this.cancelOldTask(wormPartJob);
    this.target = enemySpawn;
  }
  getHeaderTails() {
    return <Cre_pull[]>(
      friends
        .filter(i => i.role === wormHeaderTail)
        .sort((a, b) => wormHeaderTail_index(a) - wormHeaderTail_index(b))
    );
  }
  getHeaderHealer() {
    return friends.find(i => i.role === wormHeaderHealer);
  }
  resetMyGroup() {
    const cre = this.master;
    const healer = this.getHeaderHealer();
    const headerTails = this.getHeaderTails();
    this.myGroup = (<Cre_pull[]>[cre, healer]).concat(headerTails);
  }
  loop_task(): void {
    const cre = this.master;
    SA(cre, "WHJ");
    cre.fight();
    const healer = <Cre_battle>friends.find(i => i.role === wormHeaderHealer);
    const headerTails = this.getHeaderTails();
    if (cre.tryBreakBlockedContainer()) {
      SA(cre, "BW");
    } else if (healer) {
      this.myGroup = (<Cre_pull[]>[cre, healer]).concat(headerTails);
      if (headerTails.length === 3) {
        const tail = <Cre_pull>last(this.myGroup);
        const targets = oppoUnits.filter(
          i => i instanceof Cre || i instanceof Spa
        );
        const target = this.targetSelect(targets);
        if (target) {
          const tarDistance = GR(cre, target);
          const healPerTick = healer.getHealthyBodyPartsNum(HEAL);
          const disExtra = healPerTick * tarDistance;
          const scanRange_threat = 5;
          const enemyThreats = enemies.filter(
            i =>
              hasThreat(i) &&
              (GR(tail, i) <= scanRange_threat ||
                GR(cre, i) <= scanRange_threat)
          );
          const enemyMelees = enemyThreats.filter(
            i => i.getBodyPartsNum(ATTACK) > 0
          );
          const ranEns = enemyMelees.filter(i => InRan2(i, cre));
          const sumForce = sum(ranEns, i => {
            const force = calculateForce(i);
            const dis = GR(i, cre);
            return dis <= 1 ? force : 0.75 * force;
          });
          SAN(cre, "sumFo", sumForce);
          const pureRangeExtra =
            target instanceof Cre && !isMelee(target) && this.isPushing
              ? 500
              : 0;
          const sumDamage = sum(this.myGroup, i => damageAmount(i));
          const healerDamaged = damageAmount(healer) > 50;
          const damaged =
            sumDamage > disExtra + (800 - 300 * sumForce) + pureRangeExtra;
          const damaged_light =
            sumDamage > relu(disExtra + 400 - 150 * sumForce) + pureRangeExtra;
          if (healerDamaged) {
            SA(cre, "healerDamaged");
            this.fleeAction();
          } else if (damaged_light) {
            SA(cre, "damage_light");
            const enemyMeleesThreat = enemyMelees.filter(
              i => i.getHealthyBodyPartsNum(ATTACK) >= 2
            );
            const enemyRangedThreat = enemies.filter(
              i => i.getHealthyBodyPartsNum(RANGED_ATTACK) >= 2
            );
            const waitRange = 2;
            if (
              enemyMeleesThreat.find(i => GR(i, cre) <= waitRange) ===
                undefined &&
              enemyRangedThreat.find(i => GR(i, cre) <= 3) === undefined
            ) {
              SA(cre, "wait");
              this.stopAction();
            } else if (damaged) {
              SA(cre, "heavy damaged");
              this.fleeAction();
            } else {
              SA(cre, "light damaged");
              this.stopAction();
            }
          } else {
            if (
              target instanceof Cre &&
              Adj(cre, target) &&
              target.getHealthyBodyPartsNum(MOVE) >= 10
            ) {
              this.stopAction();
            } else {
              this.pushAction(target);
            }
          }
        } else {
          SA(cre, "no target");
        }
      } else {
        SA(cre, "wait headertails");
        cre.MT_stop(healer);
        const har = friends.find(i => i.role === harvester);
        if (har) {
          healer.MT_stop(har);
        }
      }
    } else {
      SA(cre, "NO Healer");
      this.myGroup = [this.master];
    }
  }
  endPTTask(cre: Cre_pull) {
    SA(this.master, "endPTTask");
    findTask(cre, PullTarsTask)?.end();
  }
  pushAction(target: Unit) {
    const cre = this.master;
    this.isPushing = true;
    SA(cre, "PUSH");
    const tail = <Cre_pull>last(this.myGroup);
    this.endPTTask(tail);
    this.myGroup.filter(i => i !== cre).forEach(i => this.endPTTask(i));
    const followers = this.myGroup.filter(i => i !== cre);
    cre.newPullTarsTask(followers, target, 5, undefined, getPSC(1, 1));
  }
  fleeAction() {
    const cre = this.master;
    this.isPushing = false;
    SA(cre, "FLEE");
    const tail = <Cre_pull>last(this.myGroup);
    this.endPTTask(cre);
    this.myGroup.filter(i => i !== tail).forEach(i => this.endPTTask(i));
    const followers = this.myGroup.filter(i => i !== tail);
    const follower_sorted = arrReverse(followers);
    // const fleePos = cre.getFleePos(12, 12, undefined, getPSC(1, 1));
    const fleePos = mySpawn;
    tail.newPullTarsTask(
      follower_sorted,
      fleePos ? fleePos : mySpawn,
      5,
      undefined,
      getPSC(1, 1)
    );
  }
  stopAction() {
    const cre = this.master;
    if (arrangeTail_all(cre, this.myGroup)) {
      SA(cre, "arrangeTail_all");
      return;
    }
    SA(cre, "STOP");
    const tail = <Cre_pull>last(this.myGroup);
    this.myGroup.forEach(i => this.endPTTask(i));
    this.endPTTask(tail);
    this.endPTTask(this.master);
    if (this.myGroup.length === 5) {
      SA(cre, "exc");
      const tail_2 = this.myGroup[3];
      const tail_3 = this.myGroup[2];
      const dr_tail = damagedRate(tail);
      const dr_tail2 = damagedRate(tail_2);
      const dr_tail3 = damagedRate(tail_3);
      const delta_12 = dr_tail - dr_tail2;
      const delta_23 = dr_tail2 - dr_tail3;
      if (dr_tail > 0 || dr_tail2 > 0 || dr_tail3 > 0) {
        if (delta_12 > delta_23) {
          SA(cre, "12");
          tail.moveTo_direct(tail_2);
          tail_2.moveTo_direct(tail);
          this.exchangeIndex(tail, tail_2);
          this.resetMyGroup();
        } else {
          SA(cre, "23");
          tail_2.moveTo_direct(tail_3);
          tail_3.moveTo_direct(tail_2);
          this.exchangeIndex(tail_2, tail_3);
          this.resetMyGroup();
        }
      } else {
        SA(cre, "none");
      }
    }
  }
  exchangeIndex(cre0: Cre, cre1: Cre) {
    const i0 = cre0.group_Index;
    cre0.group_Index = cre1.group_Index;
    cre1.group_Index = i0;
  }
  targetSelect(targets: Unit[]) {
    const cre = this.master;
    const tail = <Cre_pull>last(this.myGroup);
    return best(targets, tar => {
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
      const closeSpawnBonus = divideReduce(GR(tar, mySpawn), 10);
      const closeTailBonus = divideReduce(GR(tar, tail), 2);
      const disBonus = divideReduce(GR(tar, cre), 1.5);
      const sameBonus = this.target === tar ? 6 : 1;
      const tauntBonus = 1 + 0.02 * getTaunt(tar);
      // const extraTauntBonus=calExtraTaunt()
      const final =
        closeSpawnBonus *
        disBonus *
        closeTailBonus *
        sameBonus *
        typeBonus *
        tauntBonus;
      SAN(tar, "T", final);
      // SAN(tar, "ESB", enSpawnBonus);
      return final;
    });
  }
}
export const wormHeaderTail: Role = new Role(
  "wormHeaderTail",
  cre => new wormHeaderTailJob(<Cre_battle>cre)
);
export class wormHeaderTailJob extends Task_Role {
  master: Cre_battle;
  constructor(master: Cre_battle) {
    super(master);
    this.master = master;
    this.cancelOldTask(wormHeaderTailJob);
    this.master.group_Index = friends.filter(
      i => i.role === wormHeaderTail
    ).length;
  }
  loop_task(): void {
    const cre = this.master;
    const ind = this.master.group_Index;
    SA(cre, "WHTJ " + ind);
  }
}
export const wormHeaderHealer: Role = new Role(
  "wormHeaderHealer",
  cre => new wormHeaderHealerJob(<Cre_battle>cre)
);
export class wormHeaderHealerJob extends Task_Role {
  master: Cre_battle;
  constructor(master: Cre_battle) {
    super(master);
    this.master = master;
    this.cancelOldTask(wormHeaderTailJob);
  }
  loop_task(): void {
    const cre = this.master;
    SA(cre, "WHHJ");
    cre.fight();
  }
}
