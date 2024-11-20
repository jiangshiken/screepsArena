import { ATTACK, HEAL, MOVE } from "game/constants";
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
import { wormPartJob } from "./wormPart_rush";

export const wormHeader: Role = new Role(
  "wormHeader",
  cre => new wormHeaderJob(<Cre_battle>cre)
);
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
  loop_task(): void {
    const cre = this.master;
    SA(cre, "WHJ");
    cre.fight();
    const healer = friends.find(i => i.role === wormHeaderHealer);
    const headerTails = <Cre_pull[]>(
      friends.filter(i => i.role === wormHeaderTail)
    );
    if (healer) {
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
          const healerDamaged = damageAmount(healer) > 300;
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
            const waitRange = 2;
            if (
              enemyMeleesThreat.find(i => GR(i, cre) <= waitRange) === undefined
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
    const followers = this.myGroup.filter(i => i !== cre);
    cre.newPullTarsTask(followers, target, 5, undefined, getPSC(1, 1));
  }
  fleeAction() {
    const cre = this.master;
    this.isPushing = false;
    SA(cre, "FLEE");
    const tail = <Cre_pull>last(this.myGroup);
    this.endPTTask(cre);
    const followers = this.myGroup.filter(i => i !== tail);
    const follower_sorted = arrReverse(followers);
    tail.newPullTarsTask(follower_sorted, mySpawn, 5, undefined, getPSC(1, 1));
  }
  stopAction() {
    const cre = this.master;
    SA(cre, "STOP");
    const tail = <Cre_pull>last(this.myGroup);
    this.endPTTask(tail);
    this.endPTTask(this.master);
    if (this.myGroup.length >= 5) {
      const tail_2 = this.myGroup[3];
      const tail_3 = this.myGroup[2];
      if (damagedRate(tail) >= 0.05) {
        SA(cre, "heal tail");
      } else if (damagedRate(tail_2) >= 0.05) {
        SA(cre, "heal tail");
        // const pullPos
      }
    }
  }
  targetSelect(targets: Unit[]) {
    const cre = this.master;
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
      const disBonus = divideReduce(GR(tar, cre), 1.5);
      const sameBonus = this.target === tar ? 1.5 : 1;
      const tauntBonus = 1 + 0.02 * getTaunt(tar);
      // const extraTauntBonus=calExtraTaunt()
      const final = disBonus * sameBonus * typeBonus * tauntBonus;
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
  }
  loop_task(): void {
    const cre = this.master;
    SA(cre, "WHTJ");
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
