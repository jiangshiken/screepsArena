import { ATTACK, CARRY, HEAL, MOVE, RANGED_ATTACK, WORK } from "game/constants";
import { getTicks } from "game/utils";

import {
  calculateForce,
  enemies,
  enemyAttackNum,
  friends,
  getEnergy,
  getHarvables,
  hasThreat,
  is5MA,
  sumForceByArr,
} from "../gameObjects/Cre";
import {
  spawn,
  spawnAndExtensionsEnergy,
  spawnNearBlockedAround,
} from "../gameObjects/Spa";
import { StNumber } from "./game";
import { divide0, divideReduce, goInRange, relu, sum } from "./JS";
import { GR, Pos, X_axisDistance } from "./Pos";

export function rangeReduce(cre: Pos, tar: Pos, bias: number = 10): number {
  return divideReduce(GR(cre, tar), bias);
}
export function enemyWorkerBonus(rate: number): StNumber {
  const workNum = sum(enemies, en => en.getBodies(WORK).length);
  const carryNum = sum(enemies, en => en.getBodies(CARRY).length);
  const totalNum = workNum + 0.25 * carryNum;
  return goInRange(rate, 1, Infinity) * 0.25 * totalNum;
}
export function enemyBuilderBonus(rate: number): StNumber {
  const workNum = sum(enemies, en => en.getBodies(WORK).length);
  return goInRange(rate, 1, Infinity) * 0.25 * workNum;
}
export function myWorkerBonus(rate: number): StNumber {
  const workNum = sum(friends, fri => fri.getBodies(WORK).length);
  const carryNum = sum(friends, fri => fri.getBodies(CARRY).length);
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
export function enemyQuickAttackReduce(rate: number): StNumber {
  return 1 / enemyQuickAttackBonus(rate);
}
export function enemyQuickAttackBonus(rate: number): StNumber {
  const len = enemies.filter(
    i => i.getBodiesNum(ATTACK) > 0 && i.getSpeed_general() >= 0.5
  ).length;
  return goInRange(rate, 1, Infinity) * 0.5 * len;
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
export function enemyRAReduce(rate: number): StNumber {
  return 1 / enemyRABonus(rate);
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
export function enemyHealReduction(rate: number): StNumber {
  return 1 / enemyHealBonus(rate);
}
export function enemySlowShoterBonus(rate: number): StNumber {
  const slowShoters = enemies.filter(
    i =>
      i.getSpeed_general() < 1 &&
      i.getBodiesNum(RANGED_ATTACK) + i.getBodiesNum(HEAL) > 0 &&
      i.getBodiesNum(ATTACK) === 0
  );
  return goInRange(rate, 1, Infinity) * 0.5 * slowShoters.length;
}
export function enemyMoveSpeedReduce(rate: number): StNumber {
  return 1 / enemyMoveSpeedBonus(rate);
}
export function enemyMoveSpeedBonus(rate: number): StNumber {
  const moveSum = sum(enemies, i => i.getSpeed_general() * calculateForce(i));
  return goInRange(rate, 1, Infinity) * 0.25 * moveSum;
}
export function enemy5MABonus(rate: number): StNumber {
  const sum = enemies.filter(i => is5MA(i)).length;
  return goInRange(rate, 1, Infinity) * 1 * sum;
}
export function enemyHealBonus(rate: number): StNumber {
  let sum = 0;
  for (let en of enemies) {
    const healNum = en.getBodies(HEAL).length;
    sum += healNum;
  }
  return goInRange(rate, 1, Infinity) * 0.25 * sum;
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
export function enemyRASlowBonus(rate: number): StNumber {
  let sum = 0;
  for (let en of enemies) {
    const enemyRangedAttackNum = en.getBodies(RANGED_ATTACK).length;
    const enemyMoveNum = en.getBodies(MOVE).length;
    if (enemyRangedAttackNum * 2 >= enemyMoveNum && enemyRangedAttackNum > 0) {
      sum += enemyRangedAttackNum;
    }
  }
  return goInRange(rate, 1, Infinity) * 0.35 * sum;
}
export function enemyRABonus(rate: number): StNumber {
  let sum = 0;
  for (let en of enemies) {
    const enemyRangedAttackNum = en.getBodies(RANGED_ATTACK).length;
    sum += enemyRangedAttackNum;
  }
  return goInRange(rate, 1, Infinity) * 0.25 * sum;
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
