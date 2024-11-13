import { ATTACK, HEAL, RANGED_ATTACK } from "game/constants";
import { Event_Number } from "../utils/Event";
import { Adj, GR, InShotRan } from "../utils/Pos";
import { SA } from "../utils/visual";
import { findMaxTaunt, getTauntMass, getTauntShot } from "./battle";
import { Cre } from "./Cre";
import { Cre_harvest } from "./Cre_harvest";
import { friends, oppoUnits, walls } from "./GameObjectInitialize";
import { getGuessPlayer, Kerob } from "./player";
import { CanBeAttacked } from "./UnitTool";

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
        const tauntA = 30 * ANum * findMaxTaunt(tarsAround).taunt;
        //targets in range 3
        //
        const tarFriends = friends.filter(i => InShotRan(this.master, i));
        const HNum = this.getHealthyBodyParts(HEAL).length;
        //taunt of heal
        const tauntH = 12 * HNum * findMaxTaunt(tarFriends, true, this).taunt;
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
    if (this.getHealthyBodyParts(ATTACK).length > 0) {
      const w = walls.find(i => Adj(i, this.master));
      if (w) this.attackNormal(w);
    }
    if (this.getHealthyBodyParts(RANGED_ATTACK).length > 0) {
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
  shotTarget(tar: CanBeAttacked): void {
    // SA(this.master, "shotTarget " + COO(tar));
    if (InShotRan(this.master, tar)) {
      this.master.rangedAttack(tar.master);
    }
  }
  /** shot round ,if range is 1 , mass attack */
  shotTargetJudgeIfMass(tar: CanBeAttacked) {
    // SA(this, "shotTargetJudgeIfMass");
    let tauntMass: number = getTauntMass(this);
    let tauntShot: number = getTauntShot(this, tar.master);
    if (Adj(this, tar) || tauntMass > tauntShot) {
      this.master.rangedMassAttack();
    } else {
      this.shotTarget(tar);
    }
  }
  /**melee attack if enemies in ranged 1*/
  melee(): boolean {
    // SA(this,"melee 1")
    if (this.getBodyParts(ATTACK).length > 0) {
      // SA(this,"melee 2")
      let tars = oppoUnits.filter(i => Adj(this.master, i));

      let tar = findMaxTaunt(tars).unit;
      if (tar != undefined && tar.master.exists) {
        // SA(this,"melee 3")
        this.attackNormal(tar);
        return true;
      } else if (getGuessPlayer() === Kerob) {
        const wallTar = walls.find(i => Adj(i, this.master));
        if (wallTar) {
          SA(this.master, "AW");
          this.attackNormal(wallTar);
        }
      }
    }
    return false;
  }
  /** heal static */
  restore() {
    if (this.getBodyPartsNum(HEAL) > 0) {
      let tars = friends.filter(i => InShotRan(this.master, i));
      let tar = findMaxTaunt(tars, true, this).unit;
      if (tar != undefined && tar.master.exists) {
        this.healTar(tar);
      }
    }
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
    let tars = oppoUnits.filter(i => InShotRan(this.master, i));
    let tarFriends = friends.filter(i => InShotRan(this.master, i));
    let UTShot = findMaxTaunt(tars);
    let UTHeal = findMaxTaunt(tarFriends, true, this);
    let RANum = this.getHealthyBodyParts(RANGED_ATTACK).length;
    let HNum = this.getHealthyBodyParts(HEAL).length;
    let tarShot = UTShot.unit;
    let tarHeal = UTHeal.unit;
    if (tarHeal && tarShot && !Adj(this.master, tarHeal)) {
      //will conflict
      let useShot: boolean =
        10 * RANum * UTShot.taunt > 12 * HNum * UTHeal.taunt;
      if (useShot) {
        //use shot
        // SA(this,"use shot")
        if (tarShot != undefined && tarShot.exists) {
          this.shotTargetJudgeIfMass(tarShot);
          return true;
        }
      } else {
        //use heal
        // SA(this,"use heal")
        if (tarHeal != undefined && tarHeal.exists) {
          this.healTar(tarHeal);
          return true;
        }
      }
    } else {
      //use both
      // SA(this,"use both")
      if (HNum > 0 && tarHeal != undefined && tarHeal.exists) {
        this.healTar(tarHeal);
        return true;
      }
      if (RANum > 0 && tarShot != undefined && tarShot.exists) {
        this.shotTargetJudgeIfMass(tarShot);
        return true;
      }
    }
    return false;
  }
  /** ranged attack static, will find fit enemy  */
  shot(): boolean {
    if (this.getBodyPartsNum(RANGED_ATTACK) > 0) {
      let tars = oppoUnits.filter(i => InShotRan(this.master, i));
      let tar = findMaxTaunt(tars).unit;
      if (tar != undefined && tar.exists) {
        this.shotTargetJudgeIfMass(tar);
        return true;
      }
    }
    return false;
  }
}
