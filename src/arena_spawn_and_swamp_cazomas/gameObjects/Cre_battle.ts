import { ATTACK, HEAL, RANGED_ATTACK } from "game/constants";
import { Event_Number } from "../utils/Event";
import { Adj, GR } from "../utils/Pos";
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
      oppoUnits.find(i => GR(this, i) <= 1) !== undefined ||
      (getGuessPlayer() === Kerob &&
        walls.find(i => Adj(i, this.master)) !== undefined)
    ) {
      //if can attack
      if (this.getHealthyBodyParts(ATTACK).length > 0) {
        let tars1 = oppoUnits.filter(i => GR(this.master, i) <= 1);
        let ANum = this.getHealthyBodyParts(ATTACK).length;
        //find max taunt
        let tauntA = 30 * ANum * findMaxTaunt(tars1).taunt;
        //targets in range 3
        // let tars3 = oppoUnits.filter(i => GR(this.master, i) <= 3);
        // let RANum = this.master.getHealthyBodies(RANGED_ATTACK).length;
        // //taunt of rangedAttack
        // let tauntR = 10 * RANum * findMaxTaunt(tars3).taunt;
        //
        let tarFriends = friends.filter(i => GR(this.master, i) <= 3);
        let HNum = this.getHealthyBodyParts(HEAL).length;
        //taunt of heal
        let tauntH = 12 * HNum * findMaxTaunt(tarFriends, true, this).taunt;
        if (tauntA >= tauntH) {
          // if (tauntA + tauntR >= tauntR + tauntH) {
          // SA(this.master, "melee and shot");
          let successMelee = this.melee();
          let successShot = this.shot();
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
      const w = walls.find(i => GR(i, this.master) <= 1);
      if (w) this.attackNormal(w);
    }
    if (this.getHealthyBodyParts(RANGED_ATTACK).length > 0) {
      const w = walls.find(i => GR(i, this.master) <= 3);
      if (w) this.shotTarget(w);
    }
  }
  /**attack normal*/
  attackNormal(tar: CanBeAttacked): boolean {
    if (GR(this.master, tar) <= 1) {
      this.master.attack(tar.master);
      return true;
    } else return false;
  }
  /**ranged attack normal*/
  shotTarget(tar: CanBeAttacked): void {
    // SA(this.master, "shotTarget " + COO(tar));
    if (GR(this.master, tar) <= 3) {
      this.master.rangedAttack(tar.master);
    }
  }
  /** shot round ,if range is 1 , mass attack */
  shotTargetJudgeIfMass(tar: CanBeAttacked) {
    // SA(this, "shotTargetJudgeIfMass");
    let tauntMass: number = getTauntMass(this);
    let tauntShot: number = getTauntShot(this, tar.master);
    if (GR(this, tar) <= 1 || tauntMass > tauntShot) {
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
      let tars = oppoUnits.filter(i => GR(this.master, i) <= 1);

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
      let tars = friends.filter(i => GR(this.master, i) <= 3);
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
      let range = GR(this.master, tar);
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
    let tars = oppoUnits.filter(i => GR(this.master, i) <= 3);
    let tarFriends = friends.filter(i => GR(this.master, i) <= 3);
    let UTShot = findMaxTaunt(tars);
    let UTHeal = findMaxTaunt(tarFriends, true, this);
    let RANum = this.getHealthyBodyParts(RANGED_ATTACK).length;
    let HNum = this.getHealthyBodyParts(HEAL).length;
    let tarShot = UTShot.unit;
    let tarHeal = UTHeal.unit;
    if (tarHeal && tarShot && GR(this.master, tarHeal) >= 2) {
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
      let tars = oppoUnits.filter(i => GR(this.master, i) <= 3);
      let tar = findMaxTaunt(tars).unit;
      if (tar != undefined && tar.exists) {
        this.shotTargetJudgeIfMass(tar);
        return true;
      }
    }
    return false;
  }
}
