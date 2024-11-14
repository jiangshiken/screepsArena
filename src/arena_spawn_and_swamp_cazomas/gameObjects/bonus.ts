import { CARRY, WORK } from "game/constants";
import { getTicks } from "game/utils";

import { StNumber } from "../utils/game";
import { divide0, divideReduce, goInRange, relu, sum } from "../utils/JS";
import { GR, Pos, X_axisDistance } from "../utils/Pos";
import { sumForceByArr } from "./battle";
import { getHarvables } from "./Cre_harvest";
import { enemyAttackNum, hasThreat, is5MA } from "./CreTool";
import { enemies, friends, spawn } from "./GameObjectInitialize";
import { spawnAndExtensionsEnergy, spawnNearBlockedAround } from "./spawn";
import { getEnergy } from "./UnitTool";

export function rangeReduce(cre: Pos, tar: Pos, bias: number = 10): number {
  return divideReduce(GR(cre, tar), bias);
}
export function enemyWorkerBonus(rate: number): StNumber {
  const workNum = sum(enemies, en => en.getBodyPartsNum(WORK));
  const carryNum = sum(enemies, en => en.getBodyPartsNum(CARRY));
  const totalNum = workNum + 0.25 * carryNum;
  return goInRange(rate, 1, Infinity) * 0.25 * totalNum;
}
export function enemyBuilderBonus(rate: number): StNumber {
  const workNum = sum(enemies, en => en.getBodyPartsNum(WORK));
  return goInRange(rate, 1, Infinity) * 0.25 * workNum;
}
export function myWorkerBonus(rate: number): StNumber {
  const workNum = sum(friends, fri => fri.getBodyPartsNum(WORK));
  const carryNum = sum(friends, fri => fri.getBodyPartsNum(CARRY));
  const totalNum = workNum + 0.25 * carryNum;
  return goInRange(rate, 1, Infinity) * 0.25 * totalNum;
}
export function getFriendEnemyForceSum(includeRam: boolean = false): {
  friendForceSum: StNumber;
  enemyForceSum: StNumber;
} {
  const fts = friends.filter(i => hasThreat(i));
  const ets = enemies.filter(i => hasThreat(i));
  const ff = sumForceByArr(fts, includeRam);
  const ef = sumForceByArr(ets, includeRam);
  return { friendForceSum: ff, enemyForceSum: ef };
}
export function getSuperiorRate(includeRam: boolean = false): StNumber {
  const feRtn = getFriendEnemyForceSum(includeRam);
  const ff = feRtn.friendForceSum;
  const ef = feRtn.enemyForceSum;
  return divide0(ff, ef + 1);
}
/** my force -enemy force*/
export function getSuperior(includeRam: boolean = false): StNumber {
  const feRtn = getFriendEnemyForceSum(includeRam);
  const ff = feRtn.friendForceSum;
  const ef = feRtn.enemyForceSum;
  return 10 * (ff - ef);
}
export function enemyAttackReduce(rate: number): StNumber {
  return 1 / enemyAttackBonus(rate);
}
export function richBonus(rate: number): StNumber {
  //en=200 r=1	en=0 r=0.5	en=1000 r=2
  const en = spawnAndExtensionsEnergy(spawn);
  if (en < 200) {
    return 0.5 + rate * 0.0025 * en;
  } else {
    return 0.5 + rate * (0.5 + 0.00125 * (en - 200));
  }
}
export function poorBonus(rate: number) {
  const en = spawnAndExtensionsEnergy(spawn);
  return 1 + relu(0.001 * (1000 - en));
}
export function totalInferiorityBonus(): StNumber {
  const superior = getSuperior();
  if (superior < 0) {
    return 1 + 0.05 * Math.abs(superior);
  } else {
    return 1;
  }
}
export function enemy5MABonus(rate: number): StNumber {
  const sum = enemies.filter(i => is5MA(i)).length;
  return goInRange(rate, 1, Infinity) * 1 * sum;
}
export function spawnEnergyBonus(): StNumber {
  return 1 + spawnAndExtensionsEnergy(spawn) / 1000;
}
export function spawnEnergyAroundBonus(): StNumber {
  const harvables = getHarvables().filter(i => GR(i, spawn) <= 6);
  const totalEnergy =
    harvables.length === 0
      ? 0
      : harvables.map(i => getEnergy(i)).reduce((a, b) => a + b);
  return 1 + (spawnAndExtensionsEnergy(spawn) + totalEnergy) / 1000;
}
export function spawnBlockBonus(): StNumber {
  const sb3 = spawnNearBlockedAround(spawn, 3);
  const sb2 = spawnNearBlockedAround(spawn, 2);
  const sb1 = spawnNearBlockedAround(spawn, 1);
  if (sb1) return 15;
  else if (sb2) return 10;
  else if (sb3) return 5;
  else return 1;
}
export function enemyArmyReduce(rate: number): StNumber {
  return 1 / enemyArmyBonus(rate);
}
export function enemyArmyBonus(rate: number): StNumber {
  const enemiesThreated = enemies.filter(i => hasThreat(i));
  const sumForce = sumForceByArr(enemiesThreated);
  return goInRange(rate, 1, Infinity) * 0.5 * sumForce;
}
export function getBaseRangeBonus(pos: Pos): StNumber {
  return 1 + 25 / GR(pos, spawn);
}
/**from strength+1 to 1 by tick=0 to n */
export function ticksBonus(n: number, strength: number = 2): StNumber {
  const theTick = getTicks();
  return 1 + relu(strength - 1) * relu((n - theTick) / n);
}
/**from 1/(strength+1) to 1 by tick=0 to n */
export function ticksReduce(n: number, strength: number = 2): StNumber {
  return 1 / ticksBonus(n, strength);
}

export function spawnDangerousBonus(rate: number): StNumber {
  const ets = enemies.filter(
    i => hasThreat(i) && X_axisDistance(i, spawn) <= 10
  );
  const ef = sumForceByArr(ets);
  return goInRange(rate, 1, Infinity) * 3 * ef;
}

export function enemyAttackBonus(rate: number): StNumber {
  const sum: number = enemyAttackNum();
  return goInRange(rate, 1, Infinity) * 0.16 * sum;
}
export function getTickByBonus(
  min: number,
  max: number,
  bonus: number
): StNumber {
  const reduce = 1 / bonus;
  const delta = max - min;
  const rtn = min + delta * reduce;
  return rtn;
}
export function totalSuperiorityReduce(): StNumber {
  return 1 / totalSuperiorityBonus();
}
/**every 2 force add 1 bonus */
export function totalSuperiorityBonus(): StNumber {
  const superior = getSuperior();
  if (superior > 0) {
    return 1 + 0.05 * Math.abs(superior);
  } else {
    return 1;
  }
}
export function totalSuperiorityRateReduce(): StNumber {
  return 1 / totalSuperiorityRateBonus();
}
export function totalSuperiorityRateBonus(): StNumber {
  const superiorRate = getSuperiorRate();
  if (superiorRate > 1) {
    return superiorRate;
  } else {
    return 1;
  }
}
