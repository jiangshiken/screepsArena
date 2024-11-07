import {
  ATTACK,
  CARRY,
  HEAL,
  MOVE,
  RANGED_ATTACK,
  TOUGH,
  WORK,
} from "game/constants";
import { findClosestByRange } from "game/utils";
import { Event, Event_Number } from "../utils/Event";
import { StNumber } from "../utils/game";
import { removeIf } from "../utils/JS";
import { GR, X_axisDistance } from "../utils/Pos";
import { SAN } from "../utils/visual";
import { Cre } from "./Cre";
import {
  getEnemyArmies,
  getEnemyThreats,
  getFriendArmies,
  getSurfaceBody,
  spawnDps,
  spawnExtraTaunt,
} from "./CreTool";
import { getSpeed_general } from "./findPath";
import { oppoUnits, Unit } from "./GameObjectInitialize";
import { damagedRate, HasHits, healthRate } from "./HasHits";
import { findGO } from "./overallMap";
import { spawn } from "./spawn";
import { Ext, Ram, Spa, Stru, Tow } from "./Stru";
import { getEnergy, inRampart } from "./UnitTool";

export class TauntEvent extends Event {
  readonly from: Cre;
  readonly taunt: number;
  constructor(from: Cre, taunt: number) {
    super();
    this.from = from;
    this.taunt = taunt;
  }
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
          ut *= damagedRate(u);
        } else {
          ut *= 0.33 * damagedRate(u);
        }
      } else {
        ut *= damagedRate(u);
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
export function isUnit(a: HasHits): boolean {
  return (
    a instanceof Cre ||
    a instanceof Spa ||
    a instanceof Ext ||
    a instanceof Tow ||
    a instanceof Ram
  );
}
export function getTauntShot(cre: Cre, tar: HasHits): StNumber {
  const RANum = cre.getHealthyBodyParts(RANGED_ATTACK).length;
  const taunt = isUnit(tar) ? getTaunt(<Unit>tar) : 0;
  const oppoTaunt = tar instanceof Cre || tar instanceof Stru ? taunt : 0.2;
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
  for (let body of cre.body) {
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
  let HP = cre.hits;
  //if in rampart plus rampart HP
  if (inRampart(cre) && includeRam) {
    const ram = <Ram>findGO(cre, Ram);
    if (ram) {
      const ramHP = ram.hits;
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
  uni: Unit,
  includeRam: boolean = true
): StNumber {
  if (uni instanceof Cre) {
    const forceTradition = 0.1 * getForce_tradition(<Cre>uni);
    const HP: number = getHP(uni, includeRam);
    const dps = getDps(uni, false, true);
    //if is 10M6A HP=1600 dps=180
    //tradition=2.5+18=20.5
    //new=0.05*sqrt(1600*180)=0.05*40*13.5=0.05*540=27
    //final=25*0.03=0.75
    const force_new = Math.sqrt(dps * HP);
    const rtn = 0.8 * force_new + 0.2 * forceTradition;
    SAN(uni, "calForce", rtn);
    return rtn;
  } else {
    if (uni instanceof Ram) {
      return 2 * healthRate(uni);
    } else {
      return 1;
    }
  }
}
/**
 * the higher dps and lower hp will increase the taunt of the Creep
 */
export function getTaunt(cre: Unit, valueMode: boolean = false): StNumber {
  let HP = getHP(cre);
  //
  const dps = getDps(cre, valueMode);
  // SA(cre, "dps=" + dps);
  // SA(cre, "HP=" + HP);
  let rtn = 0;
  if (HP > 0) {
    let bias = 0.1 * calculateForce(cre);
    if (valueMode && cre instanceof Cre) {
      HP *= 1 + getSpeed_general([cre]);
    }
    rtn = (0.1 * dps) / (HP + bias);
  } else {
    rtn = 0;
    return rtn;
  }
  //calculate the enemy approach my Spawn
  if (cre.oppo) {
    const r = GR(cre, spawn);
    const spawnScanRange = 7;
    const spawnVertiScanRange = 10;
    if (r <= 1) {
      rtn *= 5 * spawnExtraTaunt;
    } else if (r <= spawnScanRange) {
      // SA(cre,"increased taunt");
      rtn *= spawnExtraTaunt;
    } else if (X_axisDistance(cre, spawn) <= spawnVertiScanRange) {
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
  return rtn;
}
export function calExtraTaunt(cre: Unit, taunt: number): number {
  if (cre instanceof Cre) {
    const creCre = <Cre>cre;
    const et = creCre.extraTauntList;
    const eLimit0 = 0;
    const eLimit5 = 5;
    let etSum = 0;
    for (let ne of et) {
      if (ne.validEvent(eLimit0)) {
        etSum += ne.num;
      } else if (ne.validEvent(eLimit5)) {
        etSum += 0.1 * ne.num;
      }
      // SAN(cre,"exT",ne.num)
      // SAN(cre,"tick",ne.tick)
    }
    // SAN(cre, "etSum", etSum)
    taunt *= 1 + etSum;
    removeIf(et, ne => !ne.validEvent(eLimit5));
  }
  return taunt;
}
export function protectSelfExtraTaunt(cre: Cre, rate: number = 0.1) {
  const closestEnemyArmy = findClosestByRange(cre, getEnemyThreats());
  addTauntBonus(closestEnemyArmy, rate, "protectSelf", cre);
}
export function addTauntBonus(
  tar: Unit,
  taunt: number,
  name: string = "no name",
  from?: Unit
): void {
  tar.extraTauntList.push(new ExtraTauntEvent(taunt, name, from));
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
  if (cre.master.exists) {
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
        rateT * cr.getBodyParts(ATTACK).length +
        rateH * cr.getHealthyBodyParts(ATTACK).length;
      const rangedAttackNum =
        rateT * cr.getBodyParts(RANGED_ATTACK).length +
        rateH * cr.getHealthyBodyParts(RANGED_ATTACK).length;
      const healNum =
        rateT * cr.getBodyParts(HEAL).length +
        rateH * cr.getHealthyBodyParts(HEAL).length;
      const buildNum =
        rateT * cr.getBodyParts(WORK).length +
        rateH * cr.getHealthyBodyParts(WORK).length;
      const moveNum =
        rateT * cr.getBodyParts(MOVE).length +
        rateH * cr.getHealthyBodyParts(MOVE).length;
      const carryNum =
        rateT * cr.getBodyParts(CARRY).length +
        rateH * cr.getHealthyBodyParts(CARRY).length;
      const toughNum =
        rateT * cr.getBodyParts(TOUGH).length +
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
    } else if (cre instanceof Ram) {
      rtn = 0.5;
    } else if (cre instanceof Spa) {
      let totalForce;
      if (cre.my) {
        totalForce = sumForceByArr(getFriendArmies());
      } else {
        totalForce = sumForceByArr(getEnemyArmies());
      }
      rtn = spawnDps * (1 + 0.5 * totalForce);
    } else if (cre instanceof Ext) {
      const enBonus = 1 + (2 * getEnergy(cre)) / 100;
      rtn = 13 * enBonus;
    } else {
      rtn = 1;
    }
  } else rtn = 0;
  return 0.03 * rtn;
}
