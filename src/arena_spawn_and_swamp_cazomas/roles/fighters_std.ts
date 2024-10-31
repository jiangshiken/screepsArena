import {
  getEnemyForceMapValue,
  getForceMapValue,
  getForceMapValueRate,
  getFriendForceMapValue,
} from "../deprecated/maps";
import {
  blocked,
  calculateForce,
  Cre,
  exist,
  friends,
  getDamagedRate,
  getDecideSearchRtn,
  getDps,
  getEarning,
  getEnemyArmies,
  getEnemyThreats,
  getFriendArmies,
  getFriendsThreated,
  getOtherFriends,
  getTaunt,
  hasEnemyArmyAround,
  hasEnemyHealerAround,
  hasEnemyThreatAround,
  hasOtherFriendAround,
  id,
  isHealer,
  isHealer_restrict,
  isSlowShoter,
  isWorker,
  myGO,
  protectSelfExtraTaunt,
  Role,
  sumForceByArr,
  Unit,
} from "../gameObjects/Cre";
import {
  cpuBreakJudge,
  findFitDamagedFriend,
  findFitOppoUnit,
  findProtectPos,
  getForceTarAndPosRate,
  getRoundFightAndAvoidNum,
} from "../gameObjects/CreTool";
import { myRamparts } from "../gameObjects/GameObjectInitialize";
import { inOppoRampart, inRampart } from "../gameObjects/HasHits";
import { inMyHealthyRampart } from "../gameObjects/ramparts";
import { enemySpawn, spawn } from "../gameObjects/spawn";
import {
  getSuperior,
  getSuperiorRate,
  rangeBonus,
  rangeReduce,
} from "../utils/bonus";
import { calSumCPU, ct } from "../utils/CPU";
import { Event_C, Event_Number, Event_Pos, validEvent } from "../utils/Event";
import { tick } from "../utils/game";
import {
  divide0,
  divideReduce,
  goInRange,
  maxWorth_lamb,
  randomBool,
  relu_oppo,
  sum,
} from "../utils/JS";
import {
  COO,
  filterInRange,
  getDirectionByPos,
  getRangePoss,
  GR,
  Pos,
} from "../utils/Pos";
import { drawLineComplex, SA, SAN } from "../utils/visual";
import { defender_RampartJob } from "./defender";
import { harvesterJob } from "./harvester";

import { ATTACK, RANGED_ATTACK } from "game/constants";
import { StructureExtension } from "game/prototypes";
import { findClosestByRange } from "game/utils";

/**the standard attacker*/
export const stdAttacker: Role = new Role("stdAttacker", stdAttackerJob);
/**the standard shoter*/
export const stdShoter: Role = new Role("stdShoter", stdShoterJob);
/**the standard healer*/
export const stdHealer: Role = new Role("stdHealer", stdHealerJob);
/**the standard harvester*/
export const stdHarvester: Role = new Role("stdHarvester", stdHarvesterJob);
/**looks like same as harvester*/
export function stdHarvesterJob(cre: Cre) {
  harvesterJob(cre);
}
/**find a fit friend target to follow or a fit damaged friend to heal and follow.
 * Will avoid enemy when trying to retreat or battle
 */
export function stdHealerJob(cre: Cre) {
  const st_stdHealer0 = ct();
  cre.fight();
  if (cpuBreakJudge(cre)) {
    return;
  }
  const findRtn = findFitDamagedFriend(cre);
  let friend: Unit | undefined = findRtn?.maxFitEn;
  SA(cre, "friend=" + COO(friend));
  if (friend !== undefined && exist(friend)) {
    const protectPos = findProtectPos(cre).pos;
    const FTPExtra = getForceTarAndPosRate(cre, friend);
    const forceExtra = getForceMapValue(friend);
    SAN(cre, "FTPExtra", FTPExtra);
    SAN(cre, "forceExtra", forceExtra);
    const fightRate = FTPExtra + forceExtra;
    //blue
    drawLineComplex(cre, friend, 0.6, "#33ff33");
    SA(cre, "has friend");
    if (hasEnemyArmyAround(cre, 3) && hasOtherFriendAround(cre, cre, 3)) {
      shortDistanceFight(cre, true);
    } else if (fightRate < 0) {
      SA(cre, "protect self");
      drawLineComplex(cre, protectPos, 0.25, "#0000ff");
      protectSelfExtraTaunt(cre);
      if (!cre.battle.flee(4, 12)) {
        cre.MTJ(protectPos);
      }
    } else {
      SA(cre, "goto friend");
      cre.MTJ_follow(friend);
    }
  } else {
    SA(cre, "no friend");
    const friendThreateds = getFriendsThreated();
    const target = maxWorth_lamb(
      friendThreateds,
      i => calculateForce(i) * rangeBonus(GR(i, cre), 10)
    )?.target;
    if (!cre.battle.flee(8, 16)) {
      if (target) {
        SA(cre, "target=" + id(target));
        cre.MTJ(target);
      } else {
        SA(cre, "no target");
      }
    }
  }
  calSumCPU(sum_stdHealer0, st_stdHealer0);
}
/**flee of shoter from melee enemy*/
export function stdShoterFleeAttack(cre: Cre) {
  SA(cre, "stdShoterFleeAttack");
  if (!cre.flee(3, 6)) {
    cre.flee(8, 15);
  }
}
/**flee of shoter from ranged enemy*/
export function stdShoterFleeRanged(cre: Cre): boolean {
  if (!cre.flee(5, 8)) {
    if (!cre.flee(7, 13)) {
      return cre.flee(12, 20);
    } else {
      return true;
    }
  } else {
    return true;
  }
}
/**if is surrounded by enemy*/
export function ifSurround(cre: Cre, ens: Cre[]): boolean {
  // const rotate:number=0.3
  const dirs: number[] = ens.map(en => {
    let dir = getDirectionByPos(cre, en);
    //shrink to top ,down ,left ,right
    if (dir % 2 === 0) dir--;
    return dir;
  });
  //remove duplicate
  let dirSet = [...new Set(dirs)];
  //count len
  return dirSet.length >= 2;
}
/**standard shoter,will avoid enemy that stronger than it,and trying to
 * shot weak enemy unit or slow creeps.
 */
export function stdShoterJob(cre: Cre) {
  cre.fight();
  if (cpuBreakJudge(cre)) {
    return;
  }
  //
  const findRtn = findFitOppoUnit(cre, 8 * cre.getMoveTime(), 100, tar =>
    tar instanceof Cre && hasEnemyHealerAround(tar, 15) ? 0.2 : 1
  ); //find enemy
  const enemy = findRtn?.maxFitEn;
  //go to attack it
  if (enemy) {
    drawLineComplex(cre, enemy, 0.75, "#ff0000"); //red
    // const prePos: Pos = enemy instanceof Cre ? cre.battle.findPredictPosByCre(enemy) : enemy;
    const prePos: Pos = enemy;
    const protectPos = findProtectPos(cre).pos;
    const enemyRAs = getEnemyThreats().filter(
      i =>
        i.getBodyPartsNum(RANGED_ATTACK) > 0 &&
        GR(i, cre) <= 10 &&
        i.getBodyPartsNum(ATTACK) > 0 &&
        GR(i, cre) <= 2
    );
    const goFight: boolean = enemyRAs.length === 0;
    if (goFight) {
      SA(cre, "goFight");
      cre.upgrade.fightEvent = new Event_C();
      if (enemy instanceof Cre) {
        (<Cre>enemy).addTauntBonus(0.08);
      }
      const closestEn = findClosestByRange(cre, getEnemyThreats());
      //TODO other same closest
      if (closestEn) {
        drawLineComplex(cre, closestEn, 0.4, "#00ee77");
        const rangeClose = GR(cre, closestEn);
        const ifCanMove = closestEn.canMove();
        const surroundInEns = getEnemyThreats().filter(
          i => GR(cre, i) <= 12 && i.getSpeed_general() > 0.3
        );
        const surround: boolean = ifSurround(cre, surroundInEns);
        const speedSuperior =
          closestEn.getSpeed_general() < cre.getSpeed_general();
        if (surround) {
          SA(cre, "surround");
          stdShoterFleeAttack(cre);
        } else if (rangeClose <= 2) {
          stdShoterFleeAttack(cre);
        } else if (rangeClose === 3) {
          if (ifCanMove) {
            let fleePosb = speedSuperior ? 0.8 : 1;
            if (randomBool(fleePosb)) {
              stdShoterFleeAttack(cre);
            } else {
              cre.stop();
            }
          } else {
            cre.stop();
          }
        } else if (rangeClose === 4) {
          if (ifCanMove) {
            if (randomBool(0.9)) {
              cre.stop();
            } else {
              cre.moveTo_follow(prePos);
            }
          } else {
            cre.moveTo_follow(prePos);
          }
        } else {
          cre.moveTo_follow(prePos);
        }
      } else {
        cre.MTJ(enemySpawn);
      }
    } else {
      SA(cre, "goFlee");
      cre.upgrade.fleeEvent = new Event_C();
      if (stdShoterFleeRanged(cre)) {
        SA(cre, "flee");
      } else {
        SA(cre, "go protect");
        drawLineComplex(cre, protectPos, 0.25, "#0000ff"); //blue
        cre.moveTo_follow(protectPos);
      }
    }
  } else {
    SA(cre, "no enemy");
    cre.MTJ(enemySpawn);
  }
}
/**used on healer or attacker.being called when in about range 3.Decide which
 * place to move when war starts.
 */
export function shortDistanceFight(cre: Cre, isHealer: boolean = false) {
  SA(cre, "in battle mode");
  cre.fight();
  //short distance fight mode
  const scanSize = 3;
  const poss: Pos[] = getRangePoss(cre, scanSize);
  let maxWorth: number = -Infinity;
  let maxWorthPos: Pos = poss[0];
  for (let pos of poss) {
    //calculate worth of pos
    if (!blocked(pos, true, false, true)) {
      const cost = GR(pos, cre);
      const enemyAround = getEnemyArmies().filter(i => GR(i, pos) <= 1);
      const enemyAround2 = getEnemyArmies().filter(i => GR(i, pos) <= 2);
      const firendAround = friends.filter(
        i =>
          GR(i, pos) <= 1 ||
          (GR(i, pos) <= 2 &&
            i.moveTarget &&
            validEvent(i.moveTarget, 0) &&
            GR(i.moveTarget.pos, i) <= 1)
      );
      const defendSpawnExtra = GR(spawn, pos) <= 1 ? 1 : 0;
      const invadeSpawnExtra = GR(enemySpawn, pos) <= 1 ? 2 : 0;
      const hasMyHealthyEmptyRam = inMyHealthyRampart(pos) && !blocked(pos);
      const ramDamageDecrease = hasMyHealthyEmptyRam ? 0.01 : 1;
      const otherFriendAround = firendAround.filter(i => i !== cre);
      const enemyMaxTaunt_un: number | undefined = maxWorth_lamb(
        enemyAround,
        e => getTaunt(e)
      )?.worth;
      const enemyMaxTaunt: number = enemyMaxTaunt_un ? enemyMaxTaunt_un : 0;
      // const enemyMaxTaunt: number = enemyAround.length >= 1 ? getTaunt(enemyAround.reduce((a, b) => (getTaunt(a) > getTaunt(b) ? a : b))) : 0;
      const friendMaxTaunt_healer: number = otherFriendAround
        .map(i => (0.1 + getDamagedRate(i)) * getTaunt(i))
        .reduce((a, b) => (a > b ? a : b), 0);
      const enemyDpsTotal: number =
        enemyAround2.length >= 1
          ? sum(enemyAround, i => 0.8 * getDps(i)) +
            sum(enemyAround2, i => 0.2 * getDps(i))
          : 0;
      const thisTaunt = getTaunt(cre);
      const myDps: number = getDps(cre);
      let invade: number;
      if (isHealer) {
        invade = 0.25 * friendMaxTaunt_healer * myDps;
      } else {
        invade = enemyMaxTaunt * myDps;
      }
      const friendAroundLen = firendAround.length;
      const enemyAroundLen = enemyAround.length;
      const shareBonus = 1 / (1 + friendAroundLen);
      const damage: number =
        thisTaunt * enemyDpsTotal * shareBonus * ramDamageDecrease;
      //calculate friend/enemy dps/taunt
      //TODO
      const worth =
        (invade - damage + defendSpawnExtra + invadeSpawnExtra) *
        divideReduce(cost, 2);
      if (worth > maxWorth) {
        SAN(pos, "friendAroundLen", friendAroundLen);
        SAN(pos, "enemyDpsTotal", enemyDpsTotal);
        SAN(pos, "enemyMaxTaunt", enemyMaxTaunt);
        SAN(pos, "myDps", myDps);
        SAN(pos, "invade", invade);
        SAN(pos, "damage", damage);
        SAN(pos, "worth", worth);
        maxWorth = worth;
        maxWorthPos = pos;
      }
    }
  }
  SA(cre, "maxWorthPos=" + COO(maxWorthPos));
  SA(maxWorthPos, "maxWorthPos here");
  drawLineComplex(cre, maxWorthPos, 0.6, "#dd33dd");
  cre.moveTarget = new Event_Pos(maxWorthPos);
  cre.moveTo_follow(maxWorthPos);
}
/**flee of standard attacker*/
export function stdAttackerFlee(cre: Cre): boolean {
  if (!cre.battle.flee(5, 8)) {
    return cre.battle.flee(9, 16);
  } else {
    return true;
  }
}
export let sum_stdHealer0: Event_Number = new Event_Number(0);
export let sum_stdAttacker0: Event_Number = new Event_Number(0);
export let sum_stdAttacker1: Event_Number = new Event_Number(0);
/**Job of standard attacker.It will find a fit target,invade or retreat,judge
 * which position to stay when short distance fight.
 */
export function stdAttackerJob(cre: Cre) {
  const st_stdAttacker0 = ct();
  if (cre.fight()) {
    const enAround = getEnemyThreats().filter(i => GR(i, cre) <= 1);
    for (let en of enAround) {
      en.addTauntBonus(1);
    }
  }
  if (cpuBreakJudge(cre)) {
    return;
  }
  const baseRams = myRamparts.filter(i => GR(i, spawn) <= 3);
  if (tick >= 600) {
    const superior = getSuperior(false);
    const superiorRate = getSuperiorRate();
    const target = baseRams.find(i => !blocked(i));
    //if too inferior ,go to turtle mode
    SAN(cre, "superior=", superior);
    if (target) {
      SA(target, "base ram here");
    }
    //turtle mode active
    if (
      (superior < -90 && tick >= 1500) ||
      (superior < 0 && tick >= 1900 && GR(cre, spawn) <= 50)
    ) {
      if (inRampart(cre) && GR(cre, spawn) <= 3) {
        SA(cre, "defend base");
        defender_RampartJob(cre);
        // cre.stop()
        return;
      } else {
        if (target) {
          SA(cre, "turtle mode");
          cre.MTJ_follow(target);
          return;
        } else {
          SA(cre, "defend base");
          if (GR(cre, spawn) >= 5) {
            cre.MTJ(spawn);
          } else {
            shortDistanceFight(cre);
          }
          return;
        }
      }
      //attack base mode
    } else if (tick >= 1800 && superiorRate > 1.7 && superior > 20) {
      SA(cre, "berserker mode");
      cre.MTJ_follow(enemySpawn);
    }
  }
  //
  let fitRtn;
  if (cre.getSpeed_general() === 1) {
    SA(cre, "i'm 5MA");
    fitRtn = findFitOppoUnit(cre, 8 * cre.getMoveTime(), 100, tar =>
      (tar instanceof Cre &&
        (isWorker(tar) || isSlowShoter(tar) || isHealer_restrict(tar))) ||
      tar instanceof StructureExtension
        ? 5
        : 1
    ); //find enemy
  } else {
    fitRtn = findFitOppoUnit(cre, 8 * cre.getMoveTime(), 100); //find enemy
  }
  //
  const protectTargets = getOtherFriends(cre).filter(
    i => i.isArmy() || isWorker(i)
  );
  const protectRtn = maxWorth_lamb(protectTargets, i => {
    const myRangeReduce: number = rangeReduce(cre, i, 30);
    const earn_current: number = getEarning(
      getFriendForceMapValue(i),
      getEnemyForceMapValue(i)
    );
    const distanceReduce = goInRange(GR(cre, i) / 40, 0, 1);
    const earn_protect: number = getEarning(
      getFriendForceMapValue(i) + distanceReduce * calculateForce(cre),
      getEnemyForceMapValue(i)
    );
    const earnExtra: number = earn_protect - earn_current;
    // SAN(cre, "EE" + COO(i) + ":", earnExtra)
    return 0.2 * myRangeReduce * earnExtra;
  });
  let fitTarget: Unit | undefined;
  let fitRate: number;
  if (protectRtn) {
    const chooseInvade = fitRtn.maxFitRate > protectRtn.worth;
    if (chooseInvade) {
      fitTarget = fitRtn.maxFitEn;
      fitRate = fitRtn.maxFitRate;
    } else {
      const closestEn = protectRtn.target
        ? findClosestByRange(protectRtn.target, getEnemyThreats())
        : undefined;
      if (
        protectRtn.target &&
        closestEn &&
        GR(closestEn, protectRtn.target) <= 3
      ) {
        fitTarget = closestEn;
      } else {
        fitTarget = protectRtn.target;
      }
      fitRate = protectRtn.worth;
    }
    SAN(cre, "fitRtn.maxFitRate", fitRtn.maxFitRate);
    SAN(cre, "protectRtn.worth", protectRtn.worth);

    //go to attack it
    if (fitTarget) {
      if (myGO(fitTarget)) {
        cre.moveTo_follow(fitTarget);
      } else {
        if (chooseInvade)
          drawLineComplex(cre, fitTarget, 0.75, "#ff0000"); //red
        else drawLineComplex(cre, fitTarget, 0.75, "#0044bb"); //blue
        const prePos: Pos = fitTarget;
        // const prePos: Pos = fitTarget instanceof Cre ? cre.battle.findPredictPosByCre(fitTarget) : fitTarget;
        const protectRtn = findProtectPos(cre);
        const protectPos = protectRtn.pos;
        const protectRate = protectRtn.rate;
        const fightAvoidRtn = getRoundFightAndAvoidNum(
          cre,
          i => i.role === stdAttacker,
          10
        );
        const fightNum = fightAvoidRtn.fightNum;
        const avoidNum = fightAvoidRtn.avoidNum;
        //spawn extra
        const mySpawnCost = getDecideSearchRtn(cre, spawn).cost;
        const enemySpawnCost = getDecideSearchRtn(cre, enemySpawn).cost;
        // const _enemyWorkerBonus = enemyWorkerBonus(1.1)
        // const _myWorkerBonus = myWorkerBonus(1.1)
        //
        const moveScanRange = 10;
        const enemiesInRange = filterInRange(
          getEnemyArmies(),
          cre,
          moveScanRange
        );
        const friendsInRange = filterInRange(
          getFriendArmies(),
          cre,
          moveScanRange
        );

        const enemyForceSum = sumForceByArr(enemiesInRange);
        const friendForceSum = sumForceByArr(friendsInRange);
        const enemySpeedNum = sum(
          enemiesInRange,
          i => i.getSpeed() * calculateForce(i)
        );
        const friendSpeedNum = sum(
          friendsInRange,
          i => i.getSpeed() * calculateForce(i)
        );
        const enemySpeedAve = divide0(enemySpeedNum, enemyForceSum);
        const friendSpeedAve = divide0(friendSpeedNum, friendForceSum);
        const ifWin = friendForceSum > enemyForceSum;
        const speedDelta = friendSpeedAve - enemySpeedAve;
        let moveLackExtra;
        if (ifWin) {
          //we will win
          moveLackExtra = 0.4 * speedDelta;
        } else {
          //we will lose
          if (speedDelta > 0) {
            //we are quicker
            moveLackExtra = -0.3 * speedDelta;
          } else {
            //we are slower
            moveLackExtra = -0.6 * speedDelta;
          }
        }
        //
        const mySpawnPathExtraComponent = -0.001 * mySpawnCost;
        // * _enemyWorkerBonus
        const enemySpawnPathExtraComponent = 0.001 * enemySpawnCost;
        // * _myWorkerBonus
        //extras
        const startFightExtra =
          filterInRange(getFriendArmies(), cre, 4).find(i =>
            hasEnemyThreatAround(i, 1)
          ) !== undefined
            ? 2
            : 0;
        const superiorRateExtra = 0.25 * (Math.min(4, getSuperiorRate()) - 1);
        const spawnPathExtra =
          1.6 * (mySpawnPathExtraComponent + enemySpawnPathExtraComponent);
        const tauntExtra = 0.1 * getTaunt(fitTarget);
        const TNPRateExtra = 0.67 * getForceTarAndPosRate(cre, fitTarget);
        const fitRateExtra =
          0.12 * fitRate * rangeBonus(GR(fitTarget, cre), 10, 3);
        const fightNumExtra = 0.08 * fightNum;
        const avoidNumExtra = -0.08 * avoidNum;
        const isFightingExtra = cre.upgrade.fight ? 0.1 : -0.1;
        //
        const hasHealerNearby =
          friends.find(i => GR(i, cre) <= 10 && isHealer(i)) !== undefined;
        const damagedExtra = hasHealerNearby
          ? -0.4 * getDamagedRate(cre)
          : -0.1 * getDamagedRate(cre);
        const isSpawnFortress = GR(fitTarget, enemySpawn) <= 2;
        const fortressAttack_biasPoint = isSpawnFortress ? 0.3 : 0.1;
        const fortressAttackRate =
          2 * (fortressAttack_biasPoint - getDamagedRate(cre));
        const fortressAttackExtra =
          inOppoRampart(fitTarget) &&
          friends.find(i => GR(i, cre) <= 5 && isHealer(i))
            ? fortressAttackRate
            : relu_oppo(fortressAttackRate);
        // const bias = -0.4
        const bias = 1;
        SAN(cre, "startFightExtra", startFightExtra);
        SAN(cre, "superiorRateExtra", superiorRateExtra);
        SAN(cre, "moveLackExtra", moveLackExtra);
        SAN(cre, "spawnPathExtra", spawnPathExtra);
        SAN(cre, "TNPRateExtra", TNPRateExtra);
        SAN(cre, "fitRateExtra", fitRateExtra);
        SAN(cre, "fightNumExtra", fightNumExtra);
        SAN(cre, "avoidNumExtra", avoidNumExtra);
        SAN(cre, "tauntExtra", tauntExtra);
        SAN(cre, "isFightingExtra", isFightingExtra);
        SAN(cre, "damagedExtra", damagedExtra);
        SAN(cre, "fortressAttackExtra", fortressAttackExtra);
        SAN(cre, "bias", bias);
        const fightRate =
          startFightExtra +
          superiorRateExtra +
          moveLackExtra +
          spawnPathExtra +
          TNPRateExtra +
          fitRateExtra +
          fightNumExtra +
          avoidNumExtra +
          tauntExtra +
          isFightingExtra +
          damagedExtra +
          fortressAttackExtra +
          bias;
        SAN(cre, "FIGHT RATE", fightRate);
        const goFight: boolean = fightRate > 0;
        if (goFight) {
          cre.upgrade.fight = true;
          if (fitTarget instanceof Cre) {
            (<Cre>fitTarget).addTauntBonus(0.08);
          }
          const shortDistance = hasEnemyThreatAround(cre, 4);
          const vr = getForceMapValueRate(cre);
          if (shortDistance && vr < 2) {
            const st_stdAttacker1 = ct();
            shortDistanceFight(cre);
            calSumCPU(sum_stdAttacker1, st_stdAttacker1);
          } else {
            SA(cre, "in relax mode");
            drawLineComplex(cre, prePos, 0.25, "#00ff00"); //green
            cre.moveTo_follow(prePos);
          }
        } else {
          // cre.battle.isFighting = true
          cre.upgrade.fight = false;
          protectSelfExtraTaunt(cre);
          if (protectRate > 0) {
            SA(cre, "go protect " + COO(protectPos));
            drawLineComplex(cre, protectPos, 0.25, "#0000ff"); //blue
            cre.moveTo_follow(protectPos);
          } else if (stdAttackerFlee(cre)) {
            SA(cre, "flee");
          } else {
            SA(cre, "go protect after flee " + COO(protectPos));
            drawLineComplex(cre, protectPos, 0.25, "#0000ff"); //blue
            cre.moveTo_follow(protectPos);
          }
        }
      }
    } else {
      SA(cre, "no enemy");
      cre.MTJ(enemySpawn);
    }
    calSumCPU(sum_stdAttacker0, st_stdAttacker0);
  }
}
