import { ExtraTauntEvent } from "./CreTool";

export interface HasTaunt {
  tauntBonus: ExtraTauntEvent[];
  taunt: number;
}
export class ExtraTauntEvent extends Event_Number {
  name: string;
  from: Unit | undefined;
  constructor(num: number, name: string = "noname", from?: Unit) {
    super(num);
    this.name = name;
    this.from = from;
  }
}

/**
 * find the max taunt of Units
 * @param ifHeal if is healer want to find a damaged friend , set this true
 * @param ori the pos of the healer
 */
export function findMaxTaunt<T extends Unit>(
    units: T[],
    ifHeal: boolean = false,
    ori?: Cre | undefined
  ): { unit: T | undefined; taunt: number } {
    let maxTaunt: number = 0;
    let rtn: T | undefined;
    for (let u of units) {
      let ut = getTaunt(u);
      if (ifHeal) {
        if (ori) {
          if (GR(u, ori) <= 1) {
            ut *= getDamagedRate(u);
          } else {
            ut *= 0.33 * getDamagedRate(u);
          }
        } else {
          ut *= getDamagedRate(u);
        }
      }
      if (ut > maxTaunt) {
        maxTaunt = ut;
        rtn = u;
      }
    }
    return { unit: rtn, taunt: maxTaunt };
  }
  export function sumForceByArr(
    arr: Unit[],
    includeRam: boolean = true
  ): StNumber {
    let sum = 0;
    for (let cre of arr) {
      sum += calculateForce(cre, includeRam);
    }
    return sum;
  }
  export function isUnit(a: Attackable): boolean {
    return (
      a instanceof Cre ||
      a instanceof StructureSpawn ||
      a instanceof StructureExtension ||
      a instanceof StructureTower ||
      a instanceof StructureRampart
    );
  }
  export function getTauntShot(cre: Cre, tar: Attackable): StNumber {
    const RANum = cre.getHealthyBodyParts(RANGED_ATTACK).length;
    const taunt = isUnit(tar) ? getTaunt(<Unit>tar) : 0;
    const oppoTaunt =
      tar instanceof Cre || tar instanceof Structure ? taunt : 0.2;
    const dmg = 10 * RANum;
    return 0.1 * dmg * oppoTaunt;
  }
  export function getTauntMass(cre: Cre): StNumber {
    const RANum = cre.getHealthyBodyParts(RANGED_ATTACK).length;
    const oppos = oppoUnits.filter(i => GR(i, cre) <= 3);
    let rtn: number = 0;
    for (let oppo of oppos) {
      const range = GR(oppo, cre);
      let dmg: number;
      if (range === 1) {
        dmg = 10;
      } else if (range === 2) {
        dmg = 4;
      } else {
        dmg = 1;
      }
      const oppoTaunt = getTaunt(oppo);
      rtn += 0.1 * RANum * dmg * oppoTaunt;
    }
    return rtn;
  }

  export function getForce_tradition(cre: Cre) {
    let sum = 0;
    for (let body of cre.body()) {
      const bodyType = body.type;
      const bodyHits = body.hits;
      if (bodyHits > 0) {
        if (bodyType === ATTACK) sum += 3;
        else if (bodyType === RANGED_ATTACK) sum += 2;
        //1*2(Range)
        else if (bodyType === HEAL) sum += 2.6;
        //(1.2+0.4*2(Range))*1.3(outFight)
        else if (bodyType === MOVE) sum += 0.25;
        //health and move
        else if (bodyType === WORK) sum += 0.3;
        //work
        else sum += 0.1; //health
      }
    }
    return sum;
  }
  export function getHP(cre: Unit, includeRam: boolean = true): StNumber {
    let HP = hits(cre);
    //if in rampart plus rampart HP
    if (inRampart(cre) && includeRam) {
      const ram = <StructureRampart>findGO(cre, StructureRampart);
      if (ram) {
        const ramHP = hits(ram);
        HP += ramHP;
      }
    }
    return 0.001 * HP;
  }
  /**
   * calculate force of a cre,the higher hp and dps the cre has
   * the higher force it will be
   */
  export function calculateForce(
    cre: Unit,
    includeRam: boolean = true
  ): StNumber {
    let rtn: number;
    if (cre instanceof Cre) {
      const tarCal = includeRam
        ? cre.cal_force_includeRam
        : cre.cal_force_not_includeRam;
      if (tarCal && tarCal.validEvent()) {
        return tarCal.num;
      }
      //
      const forceTradition = 0.1 * getForce_tradition(<Cre>cre);
      const HP: number = getHP(cre, includeRam);
      const dps = getDps(cre, false, true);
      //if is 10M6A HP=1600 dps=180
      //tradition=2.5+18=20.5
      //new=0.05*sqrt(1600*180)=0.05*40*13.5=0.05*540=27
      const force_new = Math.sqrt(dps * HP);
      rtn = 0.8 * force_new + 0.2 * forceTradition;
      if (includeRam) cre.cal_force_includeRam = new Event_Number(rtn);
      else cre.cal_force_not_includeRam = new Event_Number(rtn);
    } else {
      const str: Structure = <Structure>cre;
      if (isMyRampart(str)) {
        rtn = 2 * getHPRate(str);
      } else if (isOppoRampart(str)) {
        rtn = 2 * getHPRate(str);
      } else if (isMySpawn(str)) {
        rtn = 1 * getHPRate(str);
      } else if (isOppoSpawn(str)) {
        rtn = 1 * getHPRate(str);
      } else rtn = 0;
    }
    return rtn;
  }
  /**
   * the higher dps and lower hp will increase the taunt of the Creep
   */
  export function getTaunt(cre: Unit, valueMode: boolean = false): StNumber {
    if (cre instanceof Cre) {
      const tarCal = valueMode ? cre.cal_taunt_value : cre.cal_taunt_fight;
      if (tarCal && tarCal.validEvent()) {
        return calExtraTaunt(cre, tarCal.num);
      }
    }
    let HP = getHP(cre);
    //
    const dps = getDps(cre, valueMode);
    // SA(cre, "dps=" + dps);
    // SA(cre, "HP=" + HP);
    let rtn = 0;
    if (HP > 0) {
      let bias = 0.1 * calculateForce(cre);
      if (valueMode && cre instanceof Cre) {
        HP *= 1 + cre.getSpeed_general();
      }
      rtn = (0.1 * dps) / (HP + bias);
    } else {
      rtn = 0;
      return rtn;
    }
    //calculate the enemy approach my Spawn
    if (oppo(cre)) {
      const r = GR(cre, spawnPos);
      const vr = X_axisDistance(cre, spawnPos);
      const spawnScanRange = 7;
      const spawnVertiScanRange = 10;
      if (r <= 1) {
        rtn *= 5 * spawnExtraTaunt;
      } else if (r <= spawnScanRange) {
        // SA(cre,"increased taunt");
        rtn *= spawnExtraTaunt;
      } else if (X_axisDistance(cre, spawnPos) <= spawnVertiScanRange) {
        rtn *= 0.5 * spawnExtraTaunt;
      }
    }
    //surfaceTaunt
    if (cre instanceof Cre && !inRampart(cre)) {
      const creCre = <Cre>cre;
      const sb = getSurfaceBody(creCre);
      const rate1 = 0.9;
      const rate2 = 0.3;
      if (sb.type === ATTACK) {
        rtn = rate1 * rtn + rate2 * 1;
      } else if (sb.type === RANGED_ATTACK) {
        rtn = rate1 * rtn + rate2 * 0.5;
      } else if (sb.type === HEAL) {
        rtn = rate1 * rtn + rate2 * 0.5;
      } else {
        rtn = rate1 * rtn;
      }
    }
    //extra taunt
    rtn = calExtraTaunt(cre, rtn);
    if (cre instanceof Cre) {
      if (valueMode) cre.cal_taunt_value = new Event_Number(rtn);
      else cre.cal_taunt_fight = new Event_Number(rtn);
    }
    return rtn;
  }
  function calExtraTaunt(cre: Unit, taunt: number): number {
    if (cre instanceof Cre) {
      const creCre = <Cre>cre;
      const et = creCre.getTauntBonus();
      const eLimit0 = 0;
      const eLimit5 = 5;
      let etSum = 0;
      for (let ne of et) {
        if (validEvent(ne, eLimit0)) {
          etSum += ne.num;
        } else if (validEvent(ne, eLimit5)) {
          etSum += 0.1 * ne.num;
        }
        // SAN(cre,"exT",ne.num)
        // SAN(cre,"tick",ne.tick)
      }
      // SAN(cre, "etSum", etSum)
      taunt *= 1 + etSum;
      removeIf(et, ne => !validEvent(ne, eLimit5));
    }
    return taunt;
  }
export function protectSelfExtraTaunt(cre: Cre, rate: number = 0.1) {
    const closestEnemyArmy = findClosestByRange(cre, getEnemyThreats());
    closestEnemyArmy.addTauntBonus(rate, "protectSelf", cre);
  }
getTauntBonus(): Event_Number[] {
    return <Event_Number[]>this.battle?.tauntBonus;
  }
  addTauntBonus(taunt: number, name: string = "no name", from?: Unit): void {
    this.battle?.tauntBonus.push(new ExtraTauntEvent(taunt, name, from));
  }

/**
 * get DPS of a Creep ,DPS of Structure represent the threat of it
 */
export function getDps(
  cre: Unit,
  valueMode: boolean = false,
  byCalculateForce: boolean = false
): StNumber {
  let rtn: number;
  if (exist(cre)) {
    if (cre instanceof Cre) {
      const cr: Cre = <Cre>cre;
      let rateT;
      let rateH;
      if (byCalculateForce) {
        rateT = 0.1;
        rateH = 0.9;
      } else {
        rateT = 0.5;
        rateH = 0.5;
      }
      const attackNum =
        rateT * cr.getBody(ATTACK).length +
        rateH * cr.getHealthyBodyParts(ATTACK).length;
      const rangedAttackNum =
        rateT * cr.getBody(RANGED_ATTACK).length +
        rateH * cr.getHealthyBodyParts(RANGED_ATTACK).length;
      const healNum =
        rateT * cr.getBody(HEAL).length +
        rateH * cr.getHealthyBodyParts(HEAL).length;
      const buildNum =
        rateT * cr.getBody(WORK).length +
        rateH * cr.getHealthyBodyParts(WORK).length;
      const moveNum =
        rateT * cr.getBody(MOVE).length +
        rateH * cr.getHealthyBodyParts(MOVE).length;
      const carryNum =
        rateT * cr.getBody(CARRY).length +
        rateH * cr.getHealthyBodyParts(CARRY).length;
      const toughNum =
        rateT * cr.getBody(TOUGH).length +
        rateH * cr.getHealthyBodyParts(TOUGH).length;
      if (valueMode) {
        //value mode
        rtn =
          8 * attackNum +
          15 * rangedAttackNum +
          25 * healNum +
          10 * buildNum +
          5 * moveNum +
          5 * carryNum +
          1 * toughNum;
      } else {
        //battle mode
        rtn =
          30 * attackNum +
          12 * rangedAttackNum +
          15 * healNum +
          3 * buildNum +
          1 * moveNum +
          4 * carryNum +
          0.1 * toughNum;
      }
    } else if (cre instanceof StructureRampart) {
      rtn = 0.5;
    } else if (cre instanceof StructureSpawn) {
      let totalForce;
      if (my(cre)) {
        totalForce = sumForceByArr(getFriendArmies());
      } else {
        totalForce = sumForceByArr(getEnemyArmies());
      }
      rtn = spawnDps * (1 + 0.5 * totalForce);
    } else if (cre instanceof StructureExtension) {
      const enBonus = 1 + (2 * getEnergy(cre)) / 100;
      rtn = 13 * enBonus;
    } else {
      rtn = 1;
    }
  } else rtn = 0;
  return 0.03 * rtn;
}
