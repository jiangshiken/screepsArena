import { BodyPartHelper } from "arena_sas_masterkeze/bodypartHelper";
import { CreepHelper } from "arena_sas_masterkeze/creepHelper";
import { ATTACK, CARRY, HEAL, MOVE, RANGED_ATTACK } from "game/constants";
import { Creep } from "game/prototypes";
import { DataHelper } from "../dataHelper";
import { Strategy, StrategyContent } from "../strategy";
interface AntirushContent extends StrategyContent {
  attackers: Creep[];
  rangers: Creep[];
  healers: Creep[];
}
/**
 * 防守反击：利用rampart，用较小的代价防守对手强攻，有机会时追击歼灭对手
 */
export class AntirushStrategy implements Strategy<AntirushContent> {
  content: AntirushContent;
  get attackers() {
    return this.content.attackers;
  }
  get rangers() {
    return this.content.rangers;
  }
  get healers() {
    return this.content.healers;
  }
  constructor(content: AntirushContent) {
    this.content = content;
  }
  run(): void {
    throw new Error("Method not implemented.");
  }
  /**
   * 孵化策略
   * 1. 无论如何出一个蓝球
   * 2. 根据敌方配置情况，增加红球、蓝球、绿球
   * 红球：
   */
  scaleUp(): Boolean {
    const mySpawn = DataHelper.mySpawn;
    const hostile = DataHelper.hostileCreeps.filter(c =>
      DataHelper.spawnVector.x > 0 ? c.x >= mySpawn.x - 7 : c.x <= mySpawn.x + 7
    );
    let myStat = [...this.attackers, ...this.rangers, ...this.healers].reduce(
      (prev, curr) => {
        let out = {
          aCount: prev.aCount + CreepHelper.getActivePartCount(curr, ATTACK),
          raCount:
            prev.raCount + CreepHelper.getActivePartCount(curr, RANGED_ATTACK),
          hCount: prev.hCount + CreepHelper.getActivePartCount(curr, HEAL),
          cCount: prev.cCount + CreepHelper.getActivePartCount(curr, CARRY),
          hits: prev.hits + curr.hits,
        };
        return out;
      },
      {
        aCount: 0,
        raCount: 0,
        hCount: 0,
        cCount: 0,
        hits: 0,
      }
    );
    let hostileStat = hostile.reduce(
      (prev, curr) => {
        let out = {
          aCount: prev.aCount + CreepHelper.getActivePartCount(curr, ATTACK),
          raCount:
            prev.raCount + CreepHelper.getActivePartCount(curr, RANGED_ATTACK),
          hCount: prev.hCount + CreepHelper.getActivePartCount(curr, HEAL),
          cCount: prev.cCount + CreepHelper.getActivePartCount(curr, CARRY),
          hits: prev.hits + curr.hits,
        };
        return out;
      },
      {
        aCount: 0,
        raCount: 0,
        hCount: 0,
        cCount: 0,
        hits: 0,
      }
    );
    if (hostile.length === 0) {
      // 没有接近的敌人
      return false;
    }
    // 没有远程，先生个远程
    if (this.rangers.length === 0) {
      const creep = mySpawn.spawnCreep(
        BodyPartHelper.toBodyParts("mrrrrmmm")
      ).object;
      if (creep) {
        this.rangers.push(creep);
      }
      return true;
    }
    let rampart = DataHelper.getRampartAt(mySpawn);
    // 除数不为0
    let myRampartHits = rampart ? rampart.hits : 1;
    // 攻击强度
    let attackPower =
      hostileStat.hits * (hostileStat.aCount + hostileStat.raCount / 3);
    // 死守强度
    let defendPower =
      myRampartHits *
      (myStat.aCount + myStat.raCount / 3 - hostileStat.hCount * 0.4);
    // 接触战强度
    let hostilePower =
      hostileStat.hits *
      (hostileStat.aCount + hostileStat.raCount / 3 - myStat.hCount * 0.4);
    let myPower =
      myStat.hits *
      (myStat.aCount + myStat.raCount / 3 - hostileStat.hCount * 0.4);

    // 对方有红球，而且在死完前拆光ram，这里是比较保守的简单估计
    if (hostileStat.aCount > 0 && attackPower > defendPower) {
      let aCount = Math.min(
        Math.ceil((attackPower - defendPower) / myRampartHits),
        8
      );
      if (aCount >= 8) {
        // 死守了，不考虑追击，只出一半的腿
        const creep = mySpawn.spawnCreep(
          BodyPartHelper.toBodyParts("mmmmaaaaaaaa")
        ).object;
        if (creep) {
          this.attackers.push(creep);
        }
        return true;
      } else {
        // 其他情况出相同数量的腿
        let bodyPart = [
          ...new Array(aCount).fill(ATTACK),
          ...new Array(aCount).fill(MOVE),
        ];
        const creep = mySpawn.spawnCreep(bodyPart).object;
        if (creep) {
          this.attackers.push(creep);
        }
        return true;
      }
    }
    // 远程尽量破防
    if (hostileStat.hCount * 12 > myStat.raCount * 10) {
      const creep = mySpawn.spawnCreep(
        BodyPartHelper.toBodyParts("mrrrrmmm")
      ).object;
      if (creep) {
        this.rangers.push(creep);
      }
      return true;
    }
    // 防守无压力，追击有压力时，增加绿球
    if (
      attackPower <= defendPower &&
      (myStat.hCount === 0 || myPower < hostilePower)
    ) {
      const creep = mySpawn.spawnCreep(
        BodyPartHelper.toBodyParts("mhhmmh")
      ).object;
      if (creep) {
        this.rangers.push(creep);
      }
      return true;
    }
    return false;
  }
}
