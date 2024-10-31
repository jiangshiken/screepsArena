import { Cre_harvest } from "./Cre_harvest";

export class Cre_battle extends Cre_harvest {
  /**do attack ,ranged ,heal at the same tick,will judge which to use
   * when conflict
   */
  fight(): boolean {
    SA(this.master, "fight");
    if (
      hasOppoUnitAround(this.master, 1) ||
      (getGuessPlayer() === Kerob &&
        walls.find(i => Adj(i, this.master)) !== undefined)
    ) {
      //if can attack
      if (this.master.getHealthyBodyParts(ATTACK).length > 0) {
        let tars1 = oppoUnits.filter(i => GR(this.master, i) <= 1);
        let ANum = this.master.getHealthyBodyParts(ATTACK).length;
        //find max taunt
        let tauntA = 30 * ANum * findMaxTaunt(tars1).taunt;
        //targets in range 3
        // let tars3 = oppoUnits.filter(i => GR(this.master, i) <= 3);
        // let RANum = this.master.getHealthyBodies(RANGED_ATTACK).length;
        // //taunt of rangedAttack
        // let tauntR = 10 * RANum * findMaxTaunt(tars3).taunt;
        //
        let tarFriends = friends.filter(i => GR(this.master, i) <= 3);
        let HNum = this.master.getHealthyBodyParts(HEAL).length;
        //taunt of heal
        let tauntH =
          12 * HNum * findMaxTaunt(tarFriends, true, this.master).taunt;
        if (tauntA >= tauntH || this.master.pureMeleeMode) {
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
    if (this.master.getHealthyBodyParts(ATTACK).length > 0) {
      const w = walls.find(i => GR(i, this.master) <= 1);
      if (w) this.attackNormal(w);
    }
    if (this.master.getHealthyBodyParts(RANGED_ATTACK).length > 0) {
      const w = walls.find(i => GR(i, this.master) <= 3);
      if (w) this.shotTarget(w);
    }
  }
  /**attack normal*/
  attackNormal(tar: Attackable): boolean {
    if (GR(this.master, tar) <= 1) {
      this.master.master.attack(tar instanceof Cre ? tar.master : tar);
      return true;
    } else return false;
  }
  /**ranged attack normal*/
  shotTarget(tar: Attackable): void {
    SA(this.master, "shotTarget " + COO(tar));
    if (GR(this.master, tar) <= 3) {
      this.master.master.rangedAttack(tar instanceof Cre ? tar.master : tar);
    }
  }
  /** shot round ,if range is 1 , mass attack */
  shotTargetJudgeIfMass(tar: Attackable) {
    SA(this.master, "shotTargetJudgeIfMass");
    let tauntMass: number = getTauntMass(this.master);
    let tauntShot: number = getTauntShot(this.master, tar);
    if (GR(this.master, tar) <= 1 || tauntMass > tauntShot) {
      this.master.master.rangedMassAttack();
    } else {
      this.shotTarget(tar);
    }
  }
  getPrePosInRange1() {
    const hisPos = this.hisPos.pos;
    const nowPos = this.master;
    const nmh = deltaPosToVec(nowPos, hisPos);
    const rtn = posPlusVec(nowPos, nmh);
    drawLineComplex(this.master, rtn, 0.25, "#00ff66");
    return rtn;
  }
  /** set the `hisPos` of the creep */
  setHisPos() {
    this.hisPos = new Event_Pos({ x: this.master.x, y: this.master.y });
  }
  /**
   * creep that has {@link ATTACK} or {@link RANGED_ATTACK} or {@link HEAL}
   */
  isArmy(): boolean {
    let bodies: BodyCre[] = this.master.body();
    if (bodies) {
      for (let body of bodies) {
        if (
          body.type === ATTACK ||
          body.type === RANGED_ATTACK ||
          body.type === HEAL
        ) {
          return true;
        }
      }
      return false;
    } else return false;
  }
  /**melee attack if enemies in ranged 1*/
  melee(): boolean {
    // SA(this,"melee 1")
    if (this.master.getBody(ATTACK).length > 0) {
      // SA(this,"melee 2")
      let tars = oppoUnits.filter(i => GR(this.master, i) <= 1);

      let tar = findMaxTaunt(tars).unit;
      if (tar != undefined && exist(tar)) {
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

  /**flee from enemy that stronger than this*/
  flee(range: number = 4, FleeRange: number = 7): boolean {
    SA(this.master, "try flee");
    const cre = this.master;
    let ensArmyAround = getEnemyArmies().filter(
      i => GR(i, this.master) <= range
    );
    let ensThreatAround = getEnemyThreats().filter(
      i => GR(i, this.master) <= range
    );
    let ensAround;
    if (ensThreatAround.length === 0) {
      ensAround = ensThreatAround;
    } else {
      ensAround = ensArmyAround;
    }
    if (ensAround.length > 0) {
      const mapForce = getForceMapValue(cre);
      const mapForceExtra = -mapForce;
      const enFSum = sumForceByArr(ensAround);
      const myForce = calculateForce(this.master);
      const oldExtra = enFSum - myForce;
      const fleeRate = oldExtra + mapForceExtra;
      const ifSelfNotThreated = !hasThreat(cre);
      if (ifSelfNotThreated || fleeRate > 0) {
        SA(cre, "fleeing");
        let tarOOA = getRangePosArr(ensAround, FleeRange);
        let sRtn = getDecideSearchRtnNoArea(this.master, tarOOA, {
          flee: true,
          plainCost: this.master.getMoveTimeByTerrain(false),
          swampCost: this.master.getMoveTimeByTerrain(true),
        });
        let sp = sRtn.path;
        drawPolyLight(sp);
        if (sp.length > 0) {
          this.master.moveToNormal(sp[0]);
          return true;
        } else {
          SA(cre, "no path");
        }
      } else {
        SA(cre, "no need");
      }
    } else {
      SA(cre, "no en");
    }
    return false;
  }
  /**is enemy creep that has melee or ranged or heal*/
  isEnemyArmy(): boolean {
    return this.isArmy() && oppo(this.master);
  }
  /** heal static */
  restore() {
    if (this.master.getBody(HEAL).length > 0) {
      let tars = friends.filter(i => GR(this.master, i) <= 3);
      let tar = findMaxTaunt(tars, true, this.master).unit;
      if (tar != undefined && exist(tar)) {
        this.healTar(tar);
      }
    }
  }
  /**  heal target static*/
  healTar(tar: Cre): boolean {
    SA(this.master, "healTar");
    if (exist(tar)) {
      let range = GR(this.master, tar);
      if (range > 1 && range <= 3) {
        //if range 2 or 3,
        this.master.master.rangedHeal(tar.master);
        return true;
      } else {
        //if range==1 heal it
        this.master.master.heal(tar.master);
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
    let UTHeal = findMaxTaunt(tarFriends, true, this.master);
    let RANum = this.master.getHealthyBodyParts(RANGED_ATTACK).length;
    let HNum = this.master.getHealthyBodyParts(HEAL).length;
    let tarShot = UTShot.unit;
    let tarHeal = UTHeal.unit;
    if (tarHeal && tarShot && GR(this.master, tarHeal) >= 2) {
      //will conflict
      let useShot: boolean =
        10 * RANum * UTShot.taunt > 12 * HNum * UTHeal.taunt;
      if (useShot) {
        //use shot
        // SA(this,"use shot")
        if (tarShot != undefined && exist(tarShot)) {
          this.shotTargetJudgeIfMass(tarShot);
          return true;
        }
      } else {
        //use heal
        // SA(this,"use heal")
        if (tarHeal != undefined && exist(tarHeal)) {
          this.healTar(tarHeal);
          return true;
        }
      }
    } else {
      //use both
      // SA(this,"use both")
      if (HNum > 0 && tarHeal != undefined && exist(tarHeal)) {
        this.healTar(tarHeal);
        return true;
      }
      if (RANum > 0 && tarShot != undefined && exist(tarShot)) {
        this.shotTargetJudgeIfMass(tarShot);
        return true;
      }
    }
    return false;
  }
  /** ranged attack static, will find fit enemy  */
  shot(): boolean {
    if (this.master.getBody(RANGED_ATTACK).length > 0) {
      let tars = oppoUnits.filter(i => GR(this.master, i) <= 3);
      let tar = findMaxTaunt(tars).unit;
      if (tar != undefined && exist(tar)) {
        this.shotTargetJudgeIfMass(tar);
        return true;
      }
    }
    return false;
  }
  /**flee from all enemy threated*/
  flee_weak(range: number = 5, FleeRange: number = 13): boolean {
    const cre = this.master;
    SA(cre, "try flee_weak");
    const meleeScanRange = range;
    const shotScanRange = range + 2;
    const roundEnemyAttackers = enemies.filter(
      i => GR(i, cre) <= meleeScanRange && i.getBodypartsNum(ATTACK) > 0
    );
    const roundEnemyShoters = enemies.filter(
      i => GR(i, cre) <= shotScanRange && i.getBodypartsNum(RANGED_ATTACK) > 0
    );
    if (roundEnemyAttackers.length + roundEnemyShoters.length > 0) {
      const scanTars = roundEnemyAttackers.concat(roundEnemyShoters);
      const fleeRangeAfterCal =
        roundEnemyShoters.length > 0 ? FleeRange + 2 : FleeRange;
      const tarOOA = getRangePosArr(scanTars, FleeRange);
      const sRtn = getDecideSearchRtnNoArea(this.master, tarOOA, {
        flee: true,
        plainCost: this.master.getMoveTimeByTerrain(false),
        swampCost: this.master.getMoveTimeByTerrain(true),
      });
      const sp = sRtn.path;
      drawPolyLight(sp);
      if (sp.length > 0) {
        this.master.moveToNormal(sp[0]);
        return true;
      }
    }
    return false;
  }
  shotTarget(tar: Attackable): void {
    if (this.battle) this.battle.shotTarget(tar);
  }
  fight(): boolean {
    return this.battle ? this.battle.fight() : false;
  }
  isEnemyArmy(): boolean {
    return this.battle ? this.battle.isEnemyArmy() : false;
  }
  isArmy(): boolean {
    return this.battle ? this.battle.isArmy() : false;
  }
}
