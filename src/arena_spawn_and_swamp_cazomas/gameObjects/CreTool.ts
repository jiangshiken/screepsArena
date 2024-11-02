import { ATTACK, RANGED_ATTACK, WORK } from "game/constants";
import { getRange } from "game/utils";

import {
  getEnemyForceMapValue,
  getForceMapValue,
  getFriendForceMapValue,
} from "../deprecated/maps";
import { getCPUPercent, lowCPUMode } from "../utils/CPU";
import { divide0, divideReduce, goInRange, ranGet, sum } from "../utils/JS";
import {
  atPos,
  COO,
  getRangePoss,
  getRangePossByStep,
  GR,
  Pos,
} from "../utils/Pos";
import { drawLineComplex, SA, SAN } from "../utils/visual";
import {
  blocked,
  calculateForce,
  Cre,
  damaged,
  exist,
  friends,
  getDamagedRate,
  getEarning,
  getEnergy,
  getFriendArmies,
  getOtherFriends,
  getTaunt,
  hasEnemyThreatAround,
  is5MA,
  isMyTick,
  moveToRandomEmptyAround,
  oppoUnits,
  Unit,
} from "./Cre";
import { myRamparts, resources } from "./GameObjectInitialize";
import { currentGuessPlayer, Dooms } from "./player";
export function myContainersEnergy() {
  let myContainers = getMyContainers();
  let sum = 0;
  for (let con of myContainers) {
    sum += getEnergy(con);
  }
  return sum;
}
export function defendInArea(cre: Cre, pos: Pos, range: number): boolean {
  const enInArea = enemies.filter(i => GR(pos, i) <= range);
  if (enInArea.length > 0) {
    const en = <Cre>cre.findClosestByRange(enInArea);
    cre.MTJ(en);
    return true;
  } else {
    cre.MTJ(pos);
    return false;
  }
}
export function isTerrainRoad(pos: Pos): boolean {
  return hasGO(pos, StructureRoad);
}
export let isTurtleContainer: boolean = false;
export function setIsTurtleContainer(b: boolean) {
  isTurtleContainer = b;
}
export function moveToAllEmptyRampart(cre: Cre) {
  SA(cre, " select all empty ");
  const healthyRamparts = myRamparts.filter(i => rampartIsHealthy(i));
  const emptyRamparts = healthyRamparts.filter(i => !blocked(i));
  const rampart = closest(cre, emptyRamparts);
  if (rampart) {
    cre.MTJ(rampart);
  } else SA(cre, " can not find rampart ");
}
export function defendTheRampart(cre: Cre) {
  const scanRange = 20;
  const enemyArmys = getEnemyArmies().filter(i => GR(i, cre) <= scanRange);
  const target = best(enemyArmys, en => {
    const aroundRam = myRamparts.find(i => GR(i, en) <= 1);
    const aroundRam2 = myRamparts.find(i => GR(i, en) <= 2);
    const aroundRam3 = myRamparts.find(i => GR(i, en) <= 3);
    const aroundBonus = aroundRam ? 4 : aroundRam2 ? 2.4 : aroundRam3 ? 1.6 : 1;
    const RANum = en.getHealthyBodyPartsNum(RANGED_ATTACK);
    const inBaseRange3 = GR(en, spawn) <= 3;
    const shotBaseBonus = inBaseRange3 ? 1 + 0.5 * RANum : 1;
    const baseRangeReduce = rangeReduce(en, spawn, 1);
    const creRangeReduce = rangeReduce(en, cre, 1);
    const worth =
      shotBaseBonus * aroundBonus * baseRangeReduce * creRangeReduce;
    return worth;
  });
  if (target) {
    drawLineComplex(cre, target, 0.8, "#cc8822", dotted);
  }
  moveToRampart(cre, target);
}
export function moveToRampart(cre: Cre, enemy: Pos | undefined) {
  SA(cre, "move to rampart ,enemy=" + COO(enemy));
  const healthyRamparts = myRamparts.filter(i => rampartIsHealthy(i));
  const emptyHealthyRamparts = healthyRamparts.filter(i => !blocked(i));
  //if enemy exist
  if (enemy) {
    SA(cre, "has enemy");
    //find enemy closest rampart
    const targetRampart = closest(enemy, emptyHealthyRamparts);
    if (targetRampart) {
      SA(cre, "targetRampart=" + COO(targetRampart));
      drawLineComplex(cre, targetRampart, 0.8, "#123456");
      //if already in it
      if (
        inMyHealthyRampart(cre) &&
        GR(targetRampart, enemy) >= GR(cre, enemy)
      ) {
        SA(cre, "already in it");
        cre.stop();
      } else {
        gotoTargetRampart(cre, targetRampart);
      }
    }
  } else {
    //if no enemy
    const targetRampart = closest(cre, emptyHealthyRamparts);
    if (inMyHealthyRampart(cre)) {
      //do nothing
      SA(cre, "already in healthy rampart");
      cre.stop();
    } else {
      //go in rampart
      if (targetRampart) {
        gotoTargetRampart(cre, targetRampart);
      }
    }
  }
}
export function gotoTargetRampart(cre: Cre, targetRampart: Pos) {
  SA(cre, "gotoTargetRampart " + COO(targetRampart));
  refreshRampartSaveCostMatrix(cre, 20);
  const sRtn = getDecideSearchRtnNoArea(cre, targetRampart, {
    costMatrix: ramSaveCostMatrix,
  });
  let cost = sRtn.cost;
  const path = sRtn.path;
  drawPolyLight(path);
  // SA(cre, "cost=" + cost);
  const lastPos = last(path);
  if (lastPos && !inMyHealthyRampart(lastPos)) {
    cost += 80;
  }
  if (inMyHealthyRampart(cre)) {
    if (path.length > 0) {
      const firstPos = path[0];
      if (!inMyHealthyRampart(firstPos) || cost > 50) {
        SA(cre, "path out of ram");
        const tarFriends = getOtherFriends(cre).filter(
          i =>
            GR(i, cre) <= 1 &&
            inMyHealthyRampart(i) &&
            !(cre.getBodyPartsNum(WORK) > 0 && cre.macro
              ? cre.macro.getIsWorking()
              : false) &&
            i.getHealthyBodyPartsNum(ATTACK) <
              cre.getHealthyBodyPartsNum(ATTACK)
        );
        if (tarFriends.length > 0) {
          const tarFriend = findClosestByRange(targetRampart, tarFriends);
          SA(cre, "exchangePos_A " + COO(tarFriend));
          cre.exchangePos_setAppointment(tarFriend);
        }
      } else {
        SA(cre, "goto target rampart " + COO(firstPos));
        const blockFri: Cre | undefined = <Cre | undefined>(
          findGO(firstPos, Cre)
        );
        if (blockFri) {
          cre.exchangePos_setAppointment(blockFri);
        } else {
          cre.moveToNormal(firstPos);
        }
      }
    } else {
      SA(cre, "no path");
    }
  } else {
    SA(cre, "quickly go into rampart");
    goinRampartAssign(cre, [spawn, cre]);
  }
}
export function goinRampartAssign(cre: Cre, calBlocked: Pos[]) {
  SA(cre, "goinRampartAssign " + COO(cre));
  const aroundRams = getMyHealthyRamparts_around(cre);
  const aroundEmptyRams = aroundRams.filter(i => !blocked(i, false));
  const aroundEmptyRam = last(aroundEmptyRams);
  if (aroundRams.length > 0) {
    if (aroundEmptyRam) {
      SA(cre, "go around empty ram" + COO(aroundEmptyRam));
      cre.moveToNormal_setAppointment(aroundEmptyRam);
    } else if (calBlocked.length < 6) {
      SA(cre, "need assign again");
      const aroundRamNotCaled = aroundRams.find(i => {
        return calBlocked.find(j => atPos(j, i)) === undefined;
      });
      if (aroundRamNotCaled) {
        const tarFriends =
          tick <= 400
            ? friends.filter(
                i =>
                  i.getBodyPartsNum(ATTACK) > 0 ||
                  i.getBodyPartsNum(RANGED_ATTACK) > 0
              )
            : friends;
        const newFriend = tarFriends.find(i => atPos(i, aroundRamNotCaled));
        if (newFriend) {
          SA(cre, "new friend:" + COO(newFriend));
          calBlocked.push(newFriend);
          drawLineComplex(cre, newFriend, 0.8, "#654321");
          cre.moveToNormal_setAppointment(aroundRamNotCaled);
          goinRampartAssign(newFriend, calBlocked);
        } else {
          SA(cre, "no new friend " + COO(aroundRamNotCaled));
        }
      } else {
        SA(cre, "assign over");
      }
    } else {
      SA(cre, "assign out of limit");
    }
  } else {
    SA(cre, "MTJ ram");
    const ram = closest(cre, getMyHealthyRamparts());
    if (ram) {
      cre.MTJ(ram);
    } else {
      SA(cre, "no ram");
    }
  }
}
//functions
export function moveToRandomEmptyAround(cre: Cre): void {
  SA(cre, "moveToRandomEmptyAround");
  const poss = getRangePoss(cre, 1);
  const empPoss = poss.filter(i => !blocked(i));
  const pos = ranGet(empPoss);
  if (pos) {
    cre.moveToNormal(pos);
  }
}
export function attackWeakRampart(cre: Cre) {
  SA(cre, "try attackWeakRampart");
  let myRamAround = myRamparts.filter(i => GR(i, cre) <= 1);
  let weakMyRamAround = myRamAround.find(
    i => !rampartIsHealthy(i, true, false) && !atPos(i, spawnPos)
  );
  if (weakMyRamAround) {
    SA(cre, "attacking WeakRampart");
    cre.battle?.attackNormal(weakMyRamAround);
  }
}
/**find the position that can get protect nearby*/
export function findProtectPos(cre: Cre): { pos: Pos; rate: number } {
  //find the min force*cost pos
  const ranPoss1 = getRangePoss(cre, 2);
  const ranPoss2 = getRangePossByStep(cre, 35, 5);
  const rams = myRamparts.filter(i => !blocked(i));
  const scanFriends = getFriendArmies();
  const ranPoss = ranPoss1.concat(ranPoss2, rams, scanFriends);
  let bestWorth = -Infinity;
  let bestPos: Pos = cre;
  for (let pos of ranPoss) {
    const force = getForceMapValue(pos);
    const cost = GR(cre, pos);
    const thisWorth = 0.5 * force * divideReduce(cost, 15);
    if (thisWorth > bestWorth) {
      bestWorth = thisWorth;
      bestPos = pos;
    }
  }
  SA(bestPos, "best protect pos here " + bestWorth);
  return { pos: bestPos, rate: bestWorth };
}
export function getRoundFightAndAvoidNum(
  cre: Cre,
  scanFilter: (cre: Cre) => boolean,
  scanRange: number = 8
) {
  const roundOtherAttackers = getOtherFriends(cre).filter(
    i => GR(cre, i) <= scanRange && scanFilter(cre)
  );
  const fightNum = sum(roundOtherAttackers, i =>
    i.upgrade.fight === true
      ? (0.5 + i.getSpeed_general()) *
        divideReduce(GR(i, cre), scanRange / 2) *
        calculateForce(i)
      : 0
  );
  const avoidNum = sum(roundOtherAttackers, i =>
    i.upgrade.fight === false
      ? (0.5 + i.getSpeed_general()) *
        divideReduce(GR(i, cre), scanRange / 2) *
        calculateForce(i)
      : 0
  );
  return { fightNum: fightNum, avoidNum: avoidNum };
}
/**get the rate if need to protect it self */
export function getForceTarAndPosRate(cre: Cre, target: Pos) {
  const forceAtPos = getForceMapValue(cre);
  const forceAtTarget = getForceMapValue(target);
  SA(cre, "target=" + COO(target));
  //force of this cre
  // const forceCre = calculateForce(cre);
  // SAN(cre, "forceCre", forceCre);
  //if force is too high that this number is high too
  // const forceRateAtPos = forceAtPos / forceCre; //20,5 = 1;
  // const forceRateAtTarget = forceAtTarget / forceCre; //20,5 = 1;
  const range = GR(cre, target);
  const targetRate = 2 * divideReduce(range, 10);
  const posRate = 1;
  const totalRate = posRate + targetRate;
  const posExtra = forceAtPos * divide0(posRate, totalRate);
  const targetExtra = forceAtTarget * divide0(targetRate, totalRate);
  const rtn = posExtra + targetExtra;
  SAN(cre, "posExtra", posExtra);
  SAN(cre, "targetExtra", targetExtra);
  return rtn;
}
/** try protect self */
export function protectSelf(cre: Cre): boolean {
  let protectPos = findProtectPos(cre).pos;
  if (!atPos(protectPos, cre)) {
    cre.MTJ(protectPos);
    return true;
  } else {
    return false;
  }
}
/**move to a place that has no resource*/
export function moveToNoResourcePlace(cre: Cre, needCloseArr: Pos[]) {
  //find pos have no resource
  let rangePos = getRangePoss(cre, 1);
  if (getEnergy(cre) > 0) {
    rangePos = rangePos.filter(i => !atPos(i, cre));
  }
  let possHaveNotResource = rangePos.filter(pos => {
    let resource = resources.find(i => atPos(pos, i));
    if (resource) {
      //if have resource at pos
      return false;
    } else {
      return true;
    }
  });
  let closeToNeedClosePos = possHaveNotResource.filter(i => {
    for (let cPos of needCloseArr) {
      if (getRange(cPos, i) <= 1) {
        return true;
      }
    }
    return false;
  });
  let tarPos: Pos | undefined;
  if (closeToNeedClosePos.length > 0) {
    tarPos = ranGet(closeToNeedClosePos);
  } else {
    tarPos = ranGet(possHaveNotResource);
  }
  if (tarPos) {
    cre.MTJ(tarPos);
  }
}
/** give position to important firend*/
export function givePositionToImpartantFriend(cre: Cre): boolean {
  SA(cre, "givePositionToImpartantFriend");
  const myForce = calculateForce(cre);
  const importantFriend = friends.find(
    i => GR(i, cre) <= 1 && i.canMove() && calculateForce(i) > myForce
  );
  if (importantFriend) {
    SA(cre, "give pos to important");
    moveToRandomEmptyAround(cre);
    return true;
  } else return false;
}
/** give position to important firend*/
export function exchangePositionWithImpartantFriend(cre: Cre): boolean {
  return false;
}
/**used on normal role ,judge if cpu over used.If it is ,return true*/
export function cpuBreakJudge(cre: Cre): boolean {
  if (getCPUPercent() > 0.8 || lowCPUMode) {
    if (isMyTick(cre, 20)) {
      SA(cre, "my turn");
    } else {
      SA(cre, "cpu break");
      return true;
    }
  }
  return false;
}
/**flee from every threated enemy*/
export function fleeWeakComplex(cre: Cre) {
  if (cre.battle.flee_weak(3, 8)) {
    SA(cre, "flee");
    return true;
  } else if (cre.battle.flee_weak(5, 13)) {
    SA(cre, "flee2");
    return true;
  } else {
    return false;
  }
}
/**find a fit target of damaged friend*/
export function findFitDamagedFriend(cre: Cre): {
  maxFitEn: Unit;
  maxFitRate: number;
} {
  const ifSelf = damaged(cre) ? friends : getOtherFriends(cre);
  const targets = ifSelf.filter(i => damaged(i));
  return findFitUnits(cre, targets, true, 8 * cre.getMoveTime());
}
/**find a fit target of opponent unit*/
export function findFitOppoUnit(
  cre: Cre,
  delay: number = 8 * cre.getMoveTime(),
  range: number = 100,
  extraBonus?: (tar: Unit) => number
): { maxFitEn: Unit; maxFitRate: number } {
  const tars = oppoUnits.filter(i => GR(i, cre) <= range);
  return findFitUnits(cre, tars, false, delay, extraBonus);
}
/**get the fit rate of a target*/
export function getFitRate(
  cre: Cre,
  unit: Unit,
  isHealer: boolean,
  extraBonus?: (tar: Unit) => number
): number {
  const range = GR(unit, cre);
  //calculate taunt
  const scanValueRange = 35;
  let taunt: number;
  if (range >= scanValueRange) {
    taunt = getTaunt(unit, true);
  } else if (
    friends.filter(
      i => GR(i, cre) <= scanValueRange && hasEnemyThreatAround(i, 8)
    ).length === 0
  ) {
    taunt = getTaunt(unit, true);
  } else {
    taunt = getTaunt(unit);
  }
  //dooms high taunt
  if (
    currentGuessPlayer === Dooms &&
    unit instanceof Cre &&
    unit.getBodyPartsNum(WORK) >= 2
  ) {
    SA(unit, "dooms high taunt!!");
    taunt *= 6;
  }
  //is 5MA
  if (is5MA(cre) && unit instanceof Cre) {
    if (
      unit.battle.tauntBonus.find(
        i =>
          i.name === "protectSelf" &&
          i.from instanceof Cre &&
          i.from.getBodypartsNum(WORK) > 0
      ) !== undefined
    ) {
      SA(unit, "protect self extra taunt");
      taunt *= 3;
    }
  }
  //calculate earn
  const friendForce =
    getFriendForceMapValue(cre) + getFriendForceMapValue(unit);
  const enemyForce = getEnemyForceMapValue(cre) + getEnemyForceMapValue(unit);
  const earn = isHealer ? 0 : getEarning(friendForce, enemyForce);
  //calculate cost
  let cost;
  if (range > 20) {
    cost = 3 * range;
  } else {
    //get the searchRtnCost
    const searchRtn = cre.getDecideSearchRtnByCre(unit);
    cost = searchRtn.cost;
  }
  //other parameter
  const friendForceExtra = 0.1 * getFriendForceMapValue(unit);
  const costConst = 30;
  const extraBonusRate: number = extraBonus ? extraBonus(unit) : 1;
  const damagedBonus = 1 + 5 * getDamagedRate(unit);
  const attackBodyPartBonus =
    unit instanceof Cre ? 1 + 0.5 * unit.getBodyPartsNum(ATTACK) : 1;
  const healerBonus = isHealer ? damagedBonus * attackBodyPartBonus : 1;
  const speedEnoughBonus =
    unit instanceof Cre
      ? cre.getSpeed_general() > unit.getSpeed_general()
        ? 1
        : 0.5
      : 1;
  const quickRangerBonus =
    speedEnoughBonus < 1 &&
    unit instanceof Cre &&
    unit.getBodyPartsNum(RANGED_ATTACK) > 0
      ? 0.5
      : 1;
  //final cal
  const tauntExtra = 0.4 * taunt;
  const earnExtra = 0.4 * earn;
  const basicFit = tauntExtra + earnExtra + friendForceExtra;
  // const fitRate = extraBonusRate * healerBonus * taunt * divideReduce(cost, costConst)
  const fitRate =
    quickRangerBonus *
    speedEnoughBonus *
    extraBonusRate *
    healerBonus *
    basicFit *
    divideReduce(cost, costConst);
  //print
  SA(unit, "friend=" + COO(cre));
  SAN(unit, "cost", cost);
  SAN(unit, "tauntExtra", tauntExtra);
  SAN(unit, "earnExtra", earnExtra);
  SAN(unit, "friendForceExtra", friendForceExtra);
  if (extraBonusRate !== 1) {
    SAN(unit, "extraBonusRate", extraBonusRate);
  }
  if (speedEnoughBonus === 0.5) {
    SAN(unit, "speedEnoughBonus", speedEnoughBonus);
  }
  if (quickRangerBonus === 0.5) {
    SAN(unit, "quickRangerBonus", quickRangerBonus);
  }
  SAN(unit, "FIT RATE", fitRate);
  if (fitRate > 0.05) {
    drawLineComplex(cre, unit, fitRate, "#2299bb", "dashed");
  }
  return fitRate;
}
/** find a fit target at this tick, if is healer want to find a damaged friend
 * set `isHealer` true.
 */
export function findFitUnits(
  cre: Cre,
  units: Unit[],
  isHealer: boolean,
  delay: number,
  extraBonus?: (tar: Unit) => number
): { maxFitEn: Unit; maxFitRate: number } {
  //if current target invalid or at tick delay
  if (units.length >= 1 && (!exist(cre.target) || isMyTick(cre, delay))) {
    let maxFitRate: number = -1;
    let maxFitEn: Unit = units[0];
    for (let u of units) {
      const fitRate = getFitRate(cre, u, isHealer, extraBonus);
      const op = goInRange(0.2 * fitRate, 0, 1);
      drawLineComplex(cre, u, op, "#ee8800");
      //record max fit rate
      if (fitRate > maxFitRate) {
        maxFitRate = fitRate;
        maxFitEn = u;
      }
    }
    //return new target
    cre.target = <any>maxFitEn;
    SAN(cre, "maxFitRate", maxFitRate);
    return { maxFitEn: maxFitEn, maxFitRate: maxFitRate };
  } else {
    const tarEn = <Unit>cre.target;
    if (tarEn) {
      const fitRate = getFitRate(cre, tarEn, isHealer);
      return { maxFitEn: tarEn, maxFitRate: fitRate };
    } else return { maxFitEn: tarEn, maxFitRate: 1 };
  }
}
