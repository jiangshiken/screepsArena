import { ATTACK, HEAL, RANGED_ATTACK } from "game/constants";
import { Event_Number } from "../utils/Event";
import { Adj, GR, InShotRan } from "../utils/Pos";
import { SA } from "../utils/visual";
import {
  attackDmg,
  findMaxTaunt,
  findMaxTaunt_heal,
  getTauntMass,
  getTauntShot,
  healAdjAmount,
  rangeDmg,
  StRate_damage,
} from "./battle";
import { Cre } from "./Cre";
import { Cre_harvest } from "./Cre_harvest";
import { enemySpawn, friends, oppoUnits, walls } from "./GameObjectInitialize";
import { CanBeAttacked } from "./UnitTool";
export function healAmount(range: number): number {
  if (range <= 1) {
    return 12;
  } else if (range <= 3) {
    return 4;
  } else {
    return 0;
  }
}
export class Cre_battle extends Cre_harvest {
  /**calculation*/
  cal_taunt_fight: Event_Number | undefined;
  cal_taunt_value: Event_Number | undefined;
  cal_force_includeRam: Event_Number | undefined;
  cal_force_not_includeRam: Event_Number | undefined;
  /** the `HasHits` that the creep is targeting */
  target: CanBeAttacked | undefined = undefined;
  /**do attack ,ranged ,heal at the same tick,will judge which to use
   * when conflict
   */
  fight(): boolean {
    SA(this, "fight");
    if (
      oppoUnits.find(i => Adj(this, i)) !== undefined ||
      walls.find(i => Adj(i, this.master)) !== undefined
    ) {
      //if can attack
      if (this.getHealthyBodyPartsNum(ATTACK) > 0) {
        const tarsAround = oppoUnits.filter(i => Adj(this.master, i));
        const ANum = this.getHealthyBodyParts(ATTACK).length;
        //find max taunt
        const maxTauntA = findMaxTaunt(tarsAround);
        const tauntA =
          StRate_damage * attackDmg * ANum * (maxTauntA ? maxTauntA.worth : 0);
        //targets in range 3
        //
        const tarFriends = friends.filter(i => InShotRan(this.master, i));
        const HNum = this.getHealthyBodyParts(HEAL).length;
        //taunt of heal
        const maxTauntH = findMaxTaunt_heal(tarFriends, this);
        const tauntH =
          StRate_damage *
          healAdjAmount *
          HNum *
          (maxTauntH ? maxTauntH.worth : 0);
        if (tauntA >= tauntH) {
          const successMelee = this.melee();
          const successShot = this.shot();
          return successMelee || successShot;
        } else {
          // SA(this.master, "sr1");
          return this.shotAndRestore();
        }
      } else {
        // SA(this.master, "sr2");
        return this.shotAndRestore();
      }
    } else {
      // SA(this.master, "sr3");
      return this.shotAndRestore();
    }
  }
  /**attack wall*/
  attackWall() {
    if (this.getHealthyBodyPartsNum(ATTACK) > 0) {
      const w = walls.find(i => Adj(i, this.master));
      if (w) this.attackNormal(w);
    }
    if (this.getHealthyBodyPartsNum(RANGED_ATTACK) > 0) {
      const w = walls.find(i => InShotRan(i, this.master));
      if (w) this.shotTarget(w);
    }
  }
  /**attack normal*/
  attackNormal(tar: CanBeAttacked): boolean {
    if (Adj(this.master, tar)) {
      this.master.attack(tar.master);
      return true;
    } else return false;
  }
  /**ranged attack normal*/
  shotTarget(tar: CanBeAttacked): boolean {
    // SA(this.master, "shotTarget " + COO(tar));
    if (InShotRan(this.master, tar)) {
      this.master.rangedAttack(tar.master);
      return true;
    } else return false;
  }
  /** shot round ,if range is 1 , mass attack */
  shotTargetJudgeIfMass(tar: CanBeAttacked) {
    // SA(this, "STJIM");
    const tauntMass: number = getTauntMass(this);
    const tauntShot: number = getTauntShot(this, tar);
    // SAN(this, "TM", tauntMass);
    // SAN(this, "TS", tauntShot);
    if (Adj(this, tar) || tauntMass > tauntShot) {
      this.master.rangedMassAttack();
    } else {
      this.shotTarget(tar);
    }
  }
  /**melee attack if enemies in ranged 1*/
  melee(): boolean {
    if (this.getBodyPartsNum(ATTACK) > 0) {
      const tars = oppoUnits.filter(i => Adj(this.master, i));
      const tar = findMaxTaunt(tars)?.target;
      if (tar) {
        this.attackNormal(tar);
        return true;
      } else {
        const wallTar = walls.find(
          i => Adj(i, this.master) && GR(i, enemySpawn) <= 7
        );
        if (wallTar) {
          SA(this.master, "AW");
          this.attackNormal(wallTar);
        }
      }
    }
    return false;
  }
  /** heal static */
  restore(): boolean {
    if (this.getBodyPartsNum(HEAL) > 0) {
      const tars = friends.filter(i => InShotRan(this.master, i));
      const tar = findMaxTaunt_heal(tars, this)?.target;
      if (tar) {
        this.healTar(tar);
        return true;
      }
    }
    return false;
  }
  /**  heal target static*/
  healTar(tar: Cre): boolean {
    SA(this.master, "healTar");
    if (tar.exists) {
      const range = GR(this.master, tar);
      if (range > 1 && range <= 3) {
        //if range 2 or 3,
        this.master.rangedHeal(tar.master);
        return true;
      } else {
        //if range==1 heal it
        this.master.heal(tar.master);
        return true;
      }
    }
    return false;
  }
  shotAndRestore(): boolean {
    // SA(this.master, "shotAndRestore");
    const tars = oppoUnits.filter(i => InShotRan(this.master, i));
    const tarFriends = friends.filter(i => InShotRan(this.master, i));
    const UTShot = findMaxTaunt(tars);
    const UTHeal = findMaxTaunt_heal(tarFriends, this);
    const RANum = this.getHealthyBodyPartsNum(RANGED_ATTACK);
    const HNum = this.getHealthyBodyPartsNum(HEAL);
    const tarShot = UTShot?.target;
    const maxTauntShot = UTShot ? UTShot.worth : 0;
    const maxTauntHeal = UTHeal ? UTHeal.worth : 0;
    const tarHeal = UTHeal?.target;
    if (tarHeal && tarShot && !Adj(this.master, tarHeal)) {
      //will conflict
      const worthShot = StRate_damage * rangeDmg * RANum * maxTauntShot;
      const worthHeal = StRate_damage * healAdjAmount * HNum * maxTauntHeal;
      const worthMass = getTauntMass(this);
      const useShot: boolean = Math.max(worthShot, worthMass) >= worthHeal;
      if (useShot) {
        // SA(this,"use shot")
        if (tarShot) {
          this.shotTargetJudgeIfMass(tarShot);
          return true;
        }
      } else {
        // SA(this,"use heal")
        if (tarHeal) {
          this.healTar(tarHeal);
          return true;
        }
      }
    } else {
      // SA(this,"use both")
      if (HNum > 0 && tarHeal) {
        this.healTar(tarHeal);
        return true;
      }
      if (RANum > 0 && tarShot) {
        this.shotTargetJudgeIfMass(tarShot);
        return true;
      }
    }
    return false;
  }
  /** ranged attack static, will find fit enemy  */
  shot(): boolean {
    if (this.getBodyPartsNum(RANGED_ATTACK) > 0) {
      const tars = oppoUnits.filter(i => InShotRan(this.master, i));
      const tar = findMaxTaunt(tars)?.target;
      if (tar) {
        this.shotTargetJudgeIfMass(tar);
        return true;
      }
    }
    return false;
  }
}
