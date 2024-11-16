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
import { Event_Number, Event_ori } from "../utils/Event";
import { StNumber } from "../utils/game";
import { divide0, maxWorth_lamb, removeIf, sum } from "../utils/JS";
import { Adj, GR, InShotRan, Pos, X_axisDistance } from "../utils/Pos";
import { Cre } from "./Cre";
import {
  getEnemyArmies,
  getEnemyThreats,
  getFriendArmies,
  getSurfaceBody,
  spawnDps,
  spawnExtraTaunt,
} from "./CreTool";
import { oppoUnits, spawn, Unit } from "./GameObjectInitialize";
import { damagedRate, healthRate } from "./HasHits";
import { findGO } from "./overallMap";
import { Ext, Ram, Spa, Tow } from "./Stru";
import { CanBeAttacked, getEnergy, inRampart } from "./UnitTool";

export class TauntEvent extends Event_ori {
  readonly from: Cre;
  readonly taunt: number;
  constructor(from: Cre, taunt: number) {
    super();
    this.from = from;
    this.taunt = taunt;
  }
}
export class ExtraTauntEvent extends Event_Number {
  lastTick: number;
  from: Unit | undefined;
  constructor(num: number, lastTick: number = 5, from?: Unit) {
    super(num);
    this.lastTick = lastTick;
    this.from = from;
  }
}
export function findMaxTaunt_heal<T extends Unit>(tarUnits: T[], crePos: Pos) {
  return maxWorth_lamb(tarUnits, u => {
    const unit_taunt = getTaunt(u);
    const damage_rate = damagedRate(u);
    const adj_rate = Adj(u, crePos) ? 1 : 0.33;
    return unit_taunt * damage_rate * adj_rate;
  });
}
/**
 * find the max taunt of Units
 */
export function findMaxTaunt<T extends Unit>(tarUnits: T[]) {
  return maxWorth_lamb(tarUnits, u => getTaunt(u));
}
export function sumForceByArr(
  arr: Unit[],
  includeRam: boolean = true
): StNumber {
  return sum(arr, i => calculateForce(i, includeRam));
}
export function isUnit(a: CanBeAttacked): boolean {
  return (
    a instanceof Cre ||
    a instanceof Spa ||
    a instanceof Ext ||
    a instanceof Tow ||
    a instanceof Ram
  );
}
export function getTauntShot(cre: Cre, tar: CanBeAttacked): StNumber {
  const RANum = cre.getHealthyBodyPartsNum(RANGED_ATTACK);
  const taunt = isUnit(tar) ? getTaunt(<Unit>tar) : 0;
  const dmg = rangeDmg * RANum;
  return StRate_damage * dmg * taunt;
}
export function getMassAttackDamage(range: number): number {
  if (range === 1) {
    return 10;
  } else if (range === 2) {
    return 4;
  } else if (range === 3) {
    return 1;
  } else {
    return 0;
  }
}
export const StRate_damage = 0.1;
export function getTauntMass(cre: Cre): StNumber {
  const RANum = cre.getHealthyBodyPartsNum(RANGED_ATTACK);
  const oppos = oppoUnits.filter(i => InShotRan(i, cre));
  return sum(oppos, oppo => {
    const range = GR(oppo, cre);
    const dmg = getMassAttackDamage(range);
    const oppoTaunt = getTaunt(oppo);
    return StRate_damage * RANum * dmg * oppoTaunt;
  });
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
    const HP: number = getHP(uni, includeRam);
    const dps = getDps(uni);
    //if is 10M6A HP=1.6 dps=1.8 force=1.7
    const force = Math.sqrt(dps * HP);
    // SAN(uni, "Fo", force);
    return force;
  } else {
    if (uni instanceof Ram) {
      return 0.2 * healthRate(uni);
    } else if (uni instanceof Spa) {
      return 0.5;
    } else {
      return 0.1;
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
  const basicTaunt = divide0(dps, HP + 0.25 * cre.hitsMax);
  //calculate the enemy approach my Spawn
  let spawnThreatBonus = 1;
  if (cre.oppo) {
    const range = GR(cre, spawn);
    const spawnScanRange = 7;
    const spawnVertiScanRange = 10;
    if (range <= 1) {
      spawnThreatBonus = 1 + 2 * spawnExtraTaunt;
    } else if (range <= spawnScanRange) {
      spawnThreatBonus = 1 + 1 * spawnExtraTaunt;
    } else if (X_axisDistance(cre, spawn) <= spawnVertiScanRange) {
      spawnThreatBonus = 1 + 0.5 * spawnExtraTaunt;
    }
  }
  //surfaceTaunt
  let surfaceBonus = 1;
  if (cre instanceof Cre && !inRampart(cre)) {
    const sb = getSurfaceBody(cre);
    if (sb.type === ATTACK) {
      surfaceBonus = 1.4;
    } else if (sb.type === RANGED_ATTACK) {
      surfaceBonus = 1.3;
    } else if (sb.type === HEAL) {
      surfaceBonus = 1.2;
    }
  }
  //extra taunt
  let extraBonus = 1;
  if (cre instanceof Cre) {
    const creCre = <Cre>cre;
    const et = creCre.extraTauntList;
    let etSum = 0;
    for (let ne of et) {
      if (ne.validEvent(ne.lastTick)) {
        etSum += ne.num;
      }
    }
    // SAN(cre, "etSum", etSum)
    removeIf(et, ne => !ne.validEvent(ne.lastTick));
    extraBonus = 1 + etSum;
  }
  const rtn = basicTaunt * spawnThreatBonus * surfaceBonus * extraBonus;
  return rtn;
}
export function protectSelfExtraTaunt(cre: Cre, rate: number = 0.1) {
  const closestEnemyArmy = findClosestByRange(cre, getEnemyThreats());
  addTauntBonus(closestEnemyArmy, rate, 1, cre);
}
export function addTauntBonus(
  tar: Unit,
  taunt: number,
  lastTick: number = 5,
  from?: Unit
): void {
  tar.extraTauntList.push(new ExtraTauntEvent(taunt, lastTick, from));
}

/**
 * get DPS of a Creep ,DPS of Structure represent the threat of it
 */
export function getDps(cre: Unit, valueMode: boolean = false): StNumber {
  let rtn: number;
  if (cre.master.exists) {
    if (cre instanceof Cre) {
      const cr: Cre = cre;
      const rateT = valueMode ? 0.5 : 0.1;
      const rateH = valueMode ? 0.5 : 0.9;
      const attackNum =
        rateT * cr.getBodyPartsNum(ATTACK) +
        rateH * cr.getHealthyBodyPartsNum(ATTACK);
      const rangedAttackNum =
        rateT * cr.getBodyPartsNum(RANGED_ATTACK) +
        rateH * cr.getHealthyBodyPartsNum(RANGED_ATTACK);
      const healNum =
        rateT * cr.getBodyPartsNum(HEAL) +
        rateH * cr.getHealthyBodyPartsNum(HEAL);
      const buildNum =
        rateT * cr.getBodyPartsNum(WORK) +
        rateH * cr.getHealthyBodyPartsNum(WORK);
      const moveNum =
        rateT * cr.getBodyPartsNum(MOVE) +
        rateH * cr.getHealthyBodyPartsNum(MOVE);
      const carryNum =
        rateT * cr.getBodyPartsNum(CARRY) +
        rateH * cr.getHealthyBodyPartsNum(CARRY);
      const toughNum =
        rateT * cr.getBodyPartsNum(TOUGH) +
        rateH * cr.getHealthyBodyPartsNum(TOUGH);
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
          15 * rangedAttackNum +
          15 * healNum +
          3 * buildNum +
          0.1 * moveNum +
          0.1 * carryNum +
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
      rtn = spawnDps * (1 + 0.25 * totalForce);
    } else if (cre instanceof Ext) {
      const enBonus = 1 + (2 * getEnergy(cre)) / 100;
      rtn = 13 * enBonus;
    } else {
      rtn = 1;
    }
  } else rtn = 0;
  return 0.01 * rtn;
}
export const attackDmg = 30;
export const rangeDmg = 10;
export const healAdjAmount = 12;
