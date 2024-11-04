import { ATTACK, HEAL, RANGED_ATTACK, WORK } from "game/constants";
import { CostMatrix, searchPath } from "game/path-finder";
import { findClosestByRange } from "game/utils";

import { StructureRampart, StructureSpawn } from "game/prototypes";

import { enemyRampartIsHealthy } from "../gameObjects/ramparts";
import {
  enemySpawn,
  getBodiesCost,
  inEnBaseRan,
  inMyBaseRan,
  resetStartGateAvoidFromEnemies,
  spawn,
  spawnAndExtensionsEnergy,
  spawnCleared,
  spawnCreep,
  spawnCreep_ifHasEnergy,
} from "../gameObjects/spawn";
import { jamer } from "../roles/jamer";
import { toughDefender } from "../roles/toughDefender";

import { Cre } from "arena_spawn_and_swamp_cazomas/gameObjects/Cre";
import { closest } from "arena_spawn_and_swamp_cazomas/utils/Pos";
import { supplyCS } from "../gameObjects/CS";
import { defendInArea } from "../gameObjects/CreCommands";
import {
  Role,
  enemyAWeight,
  getEnemyArmies,
  getEnemyThreats,
  hasEnemyThreatAround,
  hasThreat,
  isArmy,
  isHealer,
  setEnRamAroundCost,
} from "../gameObjects/CreTool";
import { Cre_build } from "../gameObjects/Cre_build";
import { Cre_move } from "../gameObjects/Cre_move";
import {
  constructionSites,
  cres,
  enemies,
  friends,
  myUnits,
  oppoRamparts,
  oppoUnits,
} from "../gameObjects/GameObjectInitialize";
import { damaged, damagedRate } from "../gameObjects/HasHits";
import { Ext, Spa } from "../gameObjects/Stru";
import { getEnergy, getFreeEnergy, inRampart } from "../gameObjects/UnitTool";
import { calculateForce, getTaunt, sumForceByArr } from "../gameObjects/battle";
import { getMoveTime, searchPathByCreCost } from "../gameObjects/findPath";
import { findGO } from "../gameObjects/overallMap";
import {
  Dooms,
  Kerob,
  Other,
  Tigga,
  currentGuessPlayer,
  getGuessPlayer,
} from "../gameObjects/player";
import { PullTarsTask } from "../gameObjects/pull";
import { Event } from "../utils/Event";
import { best, invalid, maxWorth_lamb, sum } from "../utils/JS";
import {
  Adj,
  COO,
  GR,
  InShotRan,
  Pos,
  Pos_C,
  Vec,
  VecMultiplyConst,
  X_axisDistance,
  Y_axisDistance,
  atPos,
  posPlusVec,
  vecPlusVec,
} from "../utils/Pos";
import { findTask } from "../utils/Task";
import { TB } from "../utils/autoBodys";
import { SOA } from "../utils/export";
import { addStrategyTick, leftVector, strategyTick, tick } from "../utils/game";
import {
  P,
  SA,
  SAN,
  displayPos,
  drawLineComplex,
  drawText,
} from "../utils/visual";
import { useStandardTurtling } from "./4ramDefendTool";

/**the part of the snake*/
export const snakePart: Role = new Role("snakePart", snakePartJob);
const bias0p9 = 0.9;
const bias0p8 = 0.8;
const bias0p7 = 0.7;
const bias0p6 = 0.6;
const bias0p3 = 0.3;

//variables
export let snakeLeader: Cre_build | undefined = undefined;
export let allInEvent: Event | undefined;
export let allIn: boolean = false;
export let snakeGo: boolean = false;
export let snakeParts: Cre_build[] = [];
let startGateSeted = false;
export let snakePartsTotalNum = 8;
export function set_snakePartsTotalNum(num: number) {
  snakePartsTotalNum = num;
}
export let HealerMode: boolean = false;
export function set_HealerMode(b: boolean) {
  HealerMode = b;
}
/**the assemblePoint of snake part after spawn.For the propose to
 * be easy to pull together*/
function assemblePoint(cre: Cre): Pos {
  const ind: number = cre.upgrade.spIndex;
  const leftOrRight = VecMultiplyConst(leftVector(), -3);
  let vecCre: Vec;
  if (ind == 0) vecCre = new Vec(-1, 0);
  else if (ind == 1) vecCre = new Vec(0, 0);
  else if (ind == 2) vecCre = new Vec(-1, 1);
  else if (ind == 3) vecCre = new Vec(1, 1);
  else if (ind == 4) vecCre = new Vec(0, 1);
  else if (ind == 5) vecCre = new Vec(1, 0);
  else if (ind == 6) vecCre = new Vec(0, -1);
  else vecCre = new Vec(0, -2);
  return posPlusVec(spawn, vecPlusVec(vecCre, leftOrRight));
}
const assembleTick = 380;
function goLimitTick() {
  if (getGuessPlayer() === Tigga || getGuessPlayer() === Kerob) {
    return 500;
  } else {
    return snakePartsTotalNum <= 7 ? 440 : 470;
  }
}
const restartGateTickLimit = 385;
const defenderTickLimit = 380;
/**if ready in rush mode(after spawned at base and ready to rush)*/
function ifGo(): boolean {
  drawText(new Pos_C(50, 52), "C");
  const finalSnakePart = findSnakePart(snakePartsTotalNum === 8 ? 7 : 1);
  return (
    tick >= goLimitTick() ||
    (finalSnakePart !== undefined &&
      atPos(finalSnakePart, assemblePoint(finalSnakePart)))
  );
}
/**find the snake apart by index*/
function findSnakePart(index: number): Cre | undefined {
  return snakeParts.find(i => i.upgrade.spIndex === index);
}
export let sum_snakePart0: number = 0;
/**
 * control a creep as a snake part.it will wait at base at <400 tick.
 * and drive a snake to the enemy base.if it is at enemy base or num of creeps has healthy move part
 * less than 3.It will split and then attack the enemy spawn.
 */
export function snakePartJob(cre: Cre_build) {
  SA(cre, "i'm snakePart");
  drawText(new Pos_C(50, 55), "E");
  if (cre.getBodyPartsNum(WORK) > 0) {
    if (Adj(cre, spawn)) {
      SA(cre, "ad");
      if (getEnergy(cre) === 0) {
        SA(cre, "w");
        cre.withdrawNormal(spawn);
      } else {
        SA(cre, "2");
        const cs = constructionSites.find(i => atPos(i, spawn));
        if (cs) {
          SA(cre, "cs");
          cre.master.build(cs);
          cre.stop();
          return;
        } else if (getFreeEnergy(cre) > 0) {
          cre.withdrawNormal(spawn);
        }
      }
    }
  }
  const index = cre.upgrade.spIndex;
  SA(cre, "index=" + index);
  if (cre.getBodyPartsNum(WORK) > 0) {
  } else {
    cre.fight();
  }
  const leader = snakeLeader;
  //snake wait to rush
  if (!snakeGo) {
    //if not go to attack enemy spawn
    if (getGuessPlayer() === Tigga) {
      const tar = assemblePoint(cre);
      cre.MTJ(tar);
    } else if (tick >= assembleTick) {
      const tar = assemblePoint(cre);
      cre.MTJ(tar);
    } else {
      //if tick<320
      if (isHealer(cre)) {
        const scanRange = 10;
        const tars = myUnits.filter(i => GR(cre, i) <= scanRange && damaged(i));
        if (tars.length > 0) {
          const tar = closest(cre, tars);
          if (tar) cre.MTJ(tar);
        } else {
          const tar = assemblePoint(cre);
          cre.MTJ(tar);
        }
      } else {
        const scanRange = cre.getBodyParts(RANGED_ATTACK).length > 0 ? 10 : 7;
        const b = defendInArea(cre, spawn, scanRange);
        if (!b) {
          const tar = assemblePoint(cre);
          cre.MTJ(tar);
        }
      }
    }
  } else if (
    getGuessPlayer() === Tigga ||
    getGuessPlayer() === Kerob ||
    getGuessPlayer() === Dooms
  ) {
    SA(cre, "SP");
  } else if (leader !== undefined) {
    //if on the way to enemy spawn
    const j0 = !leader.exists;
    const j1 = leader !== undefined;
    const j2 = leader === cre;
    //control leader PSA
    if (snakeParts.length < 3) {
      //if healthy PSA <3
      allIn = true;
      SA(cre, "allIn=" + allIn);
    } else if ((snakeGo || (j0 && j1)) && j2) {
      //if rush to enemyspawn && leader==cre
      //exchange leader
      if (snakeGo) {
        for (let sp of snakeParts) {
          sp.stop();
        }
      }
      SA(cre, "snakeParts.length=" + snakeParts.length);
      if (leader && snakeParts.length >= 3) {
        const followers = snakeParts.filter(i => i !== leader);
        const sortedFollowers = followers.sort((a, b) => spInd(a) - spInd(b));
        SA(cre, "leader=" + COO(leader));
        SA(cre, "followers=" + SOA(sortedFollowers));
        //new pull targets task
        new PullTarsTask(leader, sortedFollowers, enemySpawn, undefined, false);
      } else {
        allIn = true;
        SA(cre, "RBRallIn=" + allIn);
      }
    }
    //control normal PSA
    let split: boolean;
    const roundEnemies = enemies.filter(i => GR(i, cre) <= 1);
    const roundEnemyForce: number = sumForceByArr(roundEnemies);
    //judge if split
    const roundEnemyForceBias = 25;
    SA(cre, "MGR(leader,enemySpawn)=" + GR(leader, enemySpawn));
    SA(
      cre,
      "verticalDistance(leader,enemySpawn)=" +
        X_axisDistance(leader, enemySpawn)
    );
    SA(cre, "roundEnemyForce=" + roundEnemyForce);
    const roundForce1 = sumForceByArr(
      getEnemyArmies().filter(i => GR(i, leader) <= 1)
    );
    const roundForce5 = sumForceByArr(
      getEnemyArmies().filter(i => GR(i, leader) <= 5)
    );
    const leaderDanger: number = roundForce1 + 0.4 * roundForce5;
    SAN(leader, "leaderDanger", leaderDanger);
    if (allIn) {
      split = true;
      let pt = findTask(leader, PullTarsTask);
      if (pt) {
        pt.end();
      }
    } else if (
      //judge if split by position
      GR(leader, enemySpawn) <= (currentGuessPlayer === Dooms ? 4 : 4) ||
      (GR(leader, enemySpawn) <= 6 &&
        (getMoveTime([leader]) > 1 || roundEnemyForce >= 25)) ||
      (X_axisDistance(leader, enemySpawn) <= 20 &&
        roundEnemyForce >= roundEnemyForceBias)
    ) {
      split = true;
      allIn = true;
    } else if (
      (leaderDanger >= 20 && X_axisDistance(leader, enemySpawn) <= 15) ||
      leaderDanger >= 90
    ) {
      split = true;
      allIn = true;
    } else {
      split = false;
    }
    if (split) {
      SA(cre, "split");
      //if split
      if (invalid(allInEvent)) {
        allInEvent = new Event();
      }
      const closeEnNum = enemies.filter(i => GR(i, enemySpawn) <= 2).length;
      const waitTime: number =
        getGuessPlayer() === Tigga && closeEnNum <= 2 ? 1 : 7;
      if (allInEvent?.validEvent(waitTime)) {
        SA(cre, "wait");
        if (GR(cre, enemySpawn) >= 4) {
          cre.MTJ(enemySpawn);
        } else {
          cre.stop();
        }
        // cre.moveToNormal(closesetToEnS);
      } else {
        //Att after split
        SA(cre, "Att");
        //normal mode
        if (currentGuessPlayer === Tigga) {
          snakeAgainstTigga(cre);
        } else if (currentGuessPlayer === Dooms) {
          snakeAgainstDooms(cre);
        } else {
          //guess player is not Tigga
          const nearFriends = friends.filter(
            i => GR(i, cre) <= 1 && i.role === snakePart
          );
          const nearFriendNearSpawn = <Cre_move | undefined>(
            nearFriends.find(i => GR(i, enemySpawn) === 1)
          );
          const tarRams = oppoRamparts.filter(i => GR(i, enemySpawn) === 1);
          const tarRam = maxWorth_lamb(tarRams, i => {
            const enemyInRam = <Cre | undefined>findGO(i, Cre);
            if (enemyInRam) {
              return -calculateForce(enemyInRam);
            } else {
              return 0;
            }
          })?.target;
          const needDestroyRams = oppoRamparts.filter(
            i =>
              GR(i, enemySpawn) <= 7 &&
              !atPos(i, enemySpawn) &&
              !(hasEnemyThreatAround(i, 0) && enemyRampartIsHealthy(i))
          );
          const needDestroyRam = findClosestByRange(cre, needDestroyRams);
          const avoidRams = oppoRamparts.filter(
            i => GR(i, enemySpawn) <= 1 && hasEnemyThreatAround(i, 0)
          );
          SAN(cre, "tarRams.length", tarRams.length);
          SA(cre, "tarRams=" + COO(tarRam));
          if (tarRam) {
            SAN(cre, "MGR(tarRam, cre)", GR(tarRam, cre));
          }
          if (
            GR(cre, enemySpawn) === 2 &&
            nearFriendNearSpawn &&
            cre.getBodyPartsNum(ATTACK) >
              nearFriendNearSpawn.getBodyPartsNum(ATTACK)
          ) {
            SA(cre, "exchange Pos");
            cre.exchangePos_setAppointment(nearFriendNearSpawn);
          } else if (GR(cre, enemySpawn) <= 1 && currentGuessPlayer !== Dooms) {
            SA(cre, "stop at spawn");
            cre.stop();
          } else if (tarRams.length >= 2 && tarRam && GR(tarRam, cre) <= 1) {
            SA(cre, "stop at ram");
            cre.stop();
          } else {
            SA(cre, "continue");
            //at 13 vertical
            let target: Pos | undefined;
            if (inEnBaseRan(cre)) {
              let threatenEn = enemies.find(
                i =>
                  GR(i, cre) <= 4 &&
                  (currentGuessPlayer !== Dooms
                    ? i.getBodyPartsNum(ATTACK) > 0
                    : hasThreat(i)) &&
                  GR(i, enemySpawn) <= GR(cre, enemySpawn) + 3 &&
                  !atPos(i, enemySpawn) &&
                  !inRampart(i)
              );
              if (threatenEn) {
                target = threatenEn;
              } else if (needDestroyRam) {
                target = needDestroyRam;
              } else {
                target = enemySpawn;
              }
            } else {
              target = enemySpawn;
            }
            SA(cre, "target=" + COO(target));
            //avoid block by friend at small road
            if (GR(cre, enemySpawn) >= 4) {
              SA(cre, "move careful");
              const tempCM = new CostMatrix();
              const creeps = cres;
              for (let everyCre of creeps) {
                tempCM.set(everyCre.x, everyCre.y, 30);
              }
              const tempTar = searchPath(cre, target, {
                costMatrix: tempCM,
                plainCost: 1,
                swampCost: 3,
              }).path[0];
              drawLineComplex(cre, tempTar, 0.7, "#553477");
              cre.MTJ(tempTar);
            } else {
              const sRtn = searchPathByCreCost(cre, target);
              const tarPos = sRtn.path[0];
              const enRam = enemies.find(
                i =>
                  GR(tarPos, i) <= 1 &&
                  i.getBodyPartsNum(ATTACK) >= 3 &&
                  inRampart(i) &&
                  !atPos(i, enemySpawn)
              );
              if (enRam) {
                SA(cre, "i m wrong");
                cre.stop();
              } else {
                SA(cre, "i m right");
                cre.MTJ(tarPos);
              }
            }
          }
        }
      }
    } else {
      //not split
    }
  } else {
    SA(cre, "no leader");
  }
}
function snakeIndex(cre: Cre): number {
  return cre.upgrade.spIndex;
}
function snakeAgainstDooms(cre: Cre_move) {
  SA(cre, "AGAINST DOOMS");
  if (enemies.find(i => Adj(cre, i)) !== undefined) {
    SA(cre, "s");
    cre.stop();
  } else if (Y_axisDistance(cre, enemySpawn) >= 2) {
    SA(cre, "g");
    cre.MTJ_stop({ x: cre.x, y: enemySpawn.y });
  } else {
    const tar = enemies.find(
      i => i.getBodyPartsNum(ATTACK) >= 1 && GR(i, enemySpawn) <= 2
    );
    if (tar) {
      SA(cre, "atar");
      cre.MTJ_stop(tar);
    } else {
      SA(cre, "a");
      cre.MTJ_stop(enemySpawn);
    }
  }
}
function snakeAgainstTigga(cre: Cre_build) {
  // const directAttMode = false
  const directAttMode = true;
  const directShotMode = false;
  // const directShotMode = true
  if (directAttMode) {
    SA(cre, "directAttMode");
    if (enemies.find(i => Adj(cre, i)) !== undefined) {
      SA(cre, "s");
      cre.stop();
    } else if (Y_axisDistance(cre, enemySpawn) >= 3) {
      SA(cre, "g");
      cre.MTJ_stop({ x: cre.x, y: enemySpawn.y });
    } else {
      const tar = enemies.find(
        i => i.getBodyPartsNum(ATTACK) >= 2 && GR(i, enemySpawn) <= 2
      );
      const spawnRam = oppoRamparts.find(i => atPos(i, enemySpawn));
      const spawnHealth = spawnRam && spawnRam.hits >= 5000;
      if (tar && spawnHealth) {
        SA(cre, "atar");
        cre.MTJ_stop(tar);
      } else {
        SA(cre, "a");
        cre.MTJ_stop(enemySpawn);
      }
    }
  } else if (directShotMode) {
    SA(cre, "directShotMode");
    if (GR(enemySpawn, cre) <= 2) {
      const tars = enemies.filter(i => !inRampart(i));
      const tar = best(tars, i => -GR(cre, i));
      if (tar) {
        cre.MTJ_stop(tar);
      } else {
        cre.MTJ_stop(enemySpawn);
      }
    } else if (GR(enemySpawn, cre) >= 4) {
      cre.MTJ_stop(enemySpawn);
    } else {
      //
    }
    if (InShotRan(cre, enemySpawn)) {
      cre.shotTarget(enemySpawn);
    }
  } else {
    SA(cre, "AGAINST TIGGA");
    const range = GR(cre, enemySpawn);
    const XRange = X_axisDistance(cre, enemySpawn);
    const outsideone = snakeParts.find(i => range >= 3);
    if (!outsideone) {
      SA(cre, "A");
      cre.MTJ_stop(enemySpawn);
    } else if (XRange === 2 && range <= 2) {
      SA(cre, "S");
      cre.stop();
    } else {
      SA(cre, "G");
      cre.MTJ_stop(enemySpawn);
    }
  }
}
function spawnSnakePart(bodyparts: string, index: number) {
  spawnCreep(TB(bodyparts), snakePart, index);
}
export function decideSpawnPart(ind: number) {
  if (spawnCleared(spawn)) {
    //patient attacker
    const aRate = enemyAWeight();
    // const currentType = "9M6AM"
    // const currentType2 = currentType
    const currentType = "8MA3RM";
    const currentType2 = "9M2A2RM";
    //100+1120+50=1270
    const tigga0 =
      getGuessPlayer() === Tigga
        ? "10MH"
        : getGuessPlayer() === Dooms
        ? "M11AM"
        : "MR9AM";
    //50+900+50
    // const tiggaHeadType="M6RM"
    //150+800+50
    // const tiggaHeadType="3M10AM"
    // 400+300+240+50
    const tiggaHeadType = "8M2R3AM";
    //100+200+400+50
    const tiggaSecondType = "2M4C4WHM";
    //300+150+50+50+200+240
    // const tiggaHeadType="6M3CMC2W3A"
    //200+150+50+50+200+320
    // const tiggaHeadType="4M3CMC2W4A"
    const tigga1 = getGuessPlayer() === Tigga ? tiggaHeadType : "5M3H";
    const tiggaType = "7M";
    // const tigga1 = "5M3H"
    //900
    const tigga2 = getGuessPlayer() === Tigga ? tiggaSecondType : "14M";
    const tigga3 = getGuessPlayer() === Tigga ? tiggaType : "14M";
    const tigga4 = getGuessPlayer() === Tigga ? tiggaType : "14M";
    const tigga5 = getGuessPlayer() === Tigga ? tiggaType : "14MH";
    const tigga6 = getGuessPlayer() === Tigga ? "14M" : "14M";
    const tigga7 = "";
    //TIGGA
    //M=3+6+17*5=94
    //F=14+4=18 reqM=90
    //KEROB
    //M=2+5+15*4+10=77
    //F=10+3+1=14 reqM=70
    if (ind === 0) {
      if (currentGuessPlayer === Tigga) {
        spawnSnakePart(tigga0, 0);
      } else if (currentGuessPlayer === Kerob) {
        spawnSnakePart(tigga0, 0);
      } else if (currentGuessPlayer === Dooms) {
        spawnSnakePart(tigga0, 0);
      } else {
        spawnSnakePart("10M3ARM", 0);
      }
    } else if (ind === 1) {
      if (currentGuessPlayer === Tigga) {
        //350+160+150+250+50=960
        spawnSnakePart(tigga1, 1);
      } else if (currentGuessPlayer === Kerob) {
        //350+160+150+250+50=960
        spawnSnakePart(tigga1, 1);
      } else if (currentGuessPlayer === Dooms) {
        spawnSnakePart(tigga1, 1);
      } else {
        spawnSnakePart("7M4AHM", 1);
      }
    } else if (ind === 2) {
      if (currentGuessPlayer === Tigga) {
        spawnSnakePart(tigga2, 2);
      } else if (currentGuessPlayer === Kerob) {
        spawnSnakePart(tigga2, 2);
      } else if (currentGuessPlayer === Dooms) {
        spawnSnakePart(tigga2, 2);
      } else {
        spawnSnakePart("10M5AM", 2);
      }
    } else if (ind === 3) {
      if (currentGuessPlayer === Tigga) {
        spawnSnakePart(tigga3, 3);
      } else if (currentGuessPlayer === Kerob) {
        spawnSnakePart(tigga3, 3);
      } else if (currentGuessPlayer === Dooms) {
        spawnSnakePart(tigga3, 3);
      } else {
        if (aRate > bias0p6) {
          spawnSnakePart("10M5AM", 3);
        } else {
          spawnSnakePart("13M3AM", 3);
        }
      }
    } else if (ind === 4) {
      if (currentGuessPlayer === Tigga) {
        spawnSnakePart(tigga4, 4);
      } else if (currentGuessPlayer === Kerob) {
        spawnSnakePart(tigga4, 4);
      } else if (currentGuessPlayer === Dooms) {
        spawnSnakePart(tigga4, 4);
      } else {
        if (aRate > bias0p6) {
          spawnSnakePart("10M5AM", 4);
        } else {
          spawnSnakePart("13M3AM", 4);
        }
      }
    } else if (ind === 5) {
      if (currentGuessPlayer === Tigga) {
        spawnSnakePart(tigga5, 5);
      } else if (currentGuessPlayer === Kerob) {
        spawnSnakePart(tigga5, 5);
      } else if (currentGuessPlayer === Dooms) {
        spawnSnakePart(tigga5, 5);
      } else {
        if (aRate > bias0p6) {
          spawnSnakePart("10M5AM", 5);
        } else {
          spawnSnakePart("13M3AM", 5);
        }
      }
    } else if (ind === 6) {
      if (currentGuessPlayer === Tigga) {
        spawnSnakePart(tigga6, 6);
      } else if (currentGuessPlayer === Kerob) {
        spawnSnakePart(tigga6, 6);
      } else if (currentGuessPlayer === Dooms) {
        spawnSnakePart(tigga6, 6);
      } else if (snakePartsTotalNum === 7) {
        spawnSnakePart("2M3AM", 6);
      } else {
        spawnSnakePart("7M4AHM", 6);
      }
    } else if (ind === 7) {
      if (getGuessPlayer() === Tigga) {
        spawnSnakePart(tigga7, 7);
      } else if (getGuessPlayer() === Kerob) {
        spawnSnakePart(tigga7, 7);
      } else if (currentGuessPlayer === Dooms) {
        spawnSnakePart(tigga7, 7);
      } else {
        spawnSnakePart("7M2AM", 7);
      }
    }
  }
}
function spInd(cre: Cre): number {
  return <number>cre.upgrade.spIndex;
}
function trySpawnPart(index: number): boolean {
  if (snakePartsTotalNum > index && !findSnakePart(index)) {
    decideSpawnPart(index);
    return true;
  } else return false;
}
export let spawnJamer: boolean = true;
export function set_spawnJamer(b: boolean) {
  spawnJamer = b;
}
export let suppliedBuilder = false;
export function useSnakeRushStrategy() {
  drawText(new Pos_C(50, 53), "D");
  sum_snakePart0 = 0;
  const st = strategyTick;
  SAN(spawn, "st", st);
  snakeParts = <Cre_build[]>friends.filter(i => i.role === snakePart);
  for (let cre of snakeParts) {
    if (cre.upgrade.spIndex === undefined) {
      cre.upgrade.spIndex = <number>cre.spawnInfo?.extraMessage;
    }
  }
  snakeLeader = <Cre_build>(
    (snakeParts.length === 0
      ? undefined
      : snakeParts.reduce(
          (a, b) => (spInd(a) < spInd(b) ? a : b),
          snakeParts[0]
        ))
  );
  if (!snakeGo && ifGo()) snakeGo = true;

  //set spawn dps
  SA(displayPos(), "snakeGo=" + snakeGo);
  SA(displayPos(), "snakePartsTotalNum=" + snakePartsTotalNum);
  setEnRamAroundCost(70);
  SA(displayPos(), "enemyAWeight()=" + enemyAWeight());
  //defend spawn
  if (getGuessPlayer() === Tigga) {
    supplyCS(spawn, StructureRampart);
    if (snakeGo) {
      supplyToughDefender(4);
    }
  } else if (getGuessPlayer() === Dooms) {
    if (snakeGo) {
      supplyToughDefender(1);
    }
  } else {
    useStandardTurtling(st, 1);
  }
  //spawn jamer
  if (spawnJamer) {
    if (st === 50 && getGuessPlayer() !== Other) {
      for (let i = 0; i < 3; i++) {
        spawnCreep(TB("M"), jamer);
      }
    }
  }
  if (getGuessPlayer() === Tigga) {
    if (!suppliedBuilder) {
      suppliedBuilder = true;
      // for (let i = 0; i < 3; i++) {
      // spawnCreep(TB("10M2R"), stdShoter)
      // // }
      // spawnCreep(TB("10M2H"), stdHealer)
      // spawnCreep(TB("MACW"), builderTurtle)
      // createCS({ x: spawn.x, y: spawn.y }, StructureRampart)
      // createCS({ x: spawn.x, y: spawn.y + 2 }, StructureExtension)
      // createCS({ x: spawn.x - 1, y: spawn.y + 2 }, StructureExtension)
      // createCS({ x: spawn.x + 1, y: spawn.y + 2 }, StructureExtension)
      // spawnCreep(TB("2TRM"), toughDefender)
    }
  }
  if (st >= 12 && tick < 600) {
    if (!snakeGo) {
      if (trySpawnPart(6)) {
      } else if (trySpawnPart(3)) {
      } else if (trySpawnPart(4)) {
      } else if (trySpawnPart(5)) {
      } else if (trySpawnPart(2)) {
      } else if (trySpawnPart(0)) {
      } else if (trySpawnPart(1)) {
      } else if (trySpawnPart(7)) {
      }
    }
  }

  //set start gate
  if (
    !startGateSeted &&
    (st === restartGateTickLimit || snakeParts.length >= snakePartsTotalNum)
  ) {
    startGateSeted = true;
    if (currentGuessPlayer === Dooms) {
      resetStartGateAvoidFromEnemies(false);
    } else {
      resetStartGateAvoidFromEnemies(true);
    }
  }
  //after fight
  if (st >= 300 && snakeGo && spawnCleared(spawn)) {
    // //250+160
    // if(getGuessPlayer()===Tigga){
    // }else if(getGuessPlayer()){
    // 	SA(displayPos(), "supply stdShoter")
    // 	// spawnCreep(TB("5MR"), stdShoter);
    // 	spawnCreep(TB("M"), jamer)
    // }
  }
  //
  command();
  //
  addStrategyTick();
  //
}
function command() {
  if (snakeGo) {
    drawText(new Pos_C(50, 50), "A");
    const head = best(snakeParts, i => -snakeIndex(i)); //snakeParts.find(i => snakeIndex(i)===0)//i.getBodyPartsNum(ATTACK) >= 1)
    const second = snakeParts.find(i => snakeIndex(i) === 1); // i.getBodyPartsNum(HEAL) >= 3||
    const tail = best(snakeParts, i => snakeIndex(i));
    if (head && tail && second) {
      if (getGuessPlayer() === Tigga) {
      } else {
        // set_swampFirst(true);
      }
      SA(head, "HEAD");
      SA(tail, "TAIL");
      const targets = oppoUnits.filter(
        i =>
          i.oppo &&
          ((i instanceof Cre && (isArmy(i) || i.getBodyPartsNum(WORK) > 0)) ||
            (i instanceof Ext && !inRampart(i)) ||
            i instanceof Spa)
      );
      const threats = enemies.filter(i => {
        if (getGuessPlayer() === Kerob && Adj(i, enemySpawn)) {
          return i.getBodyPartsNum(ATTACK) > 2;
        } else {
          return i.getBodyPartsNum(ATTACK) > 0;
        }
      });
      const target =
        getGuessPlayer() === Tigga
          ? enemySpawn
          : best(targets, i => {
              let typeBonus: number = 0;
              if (i instanceof Cre) {
                if (getGuessPlayer() === Tigga) {
                  typeBonus = 3;
                } else {
                  if (i.getBodyPartsNum(WORK) > 0) {
                    typeBonus = 1;
                  } else if (
                    GR(i, enemySpawn) <= 7 &&
                    i.getBodyPartsNum(ATTACK) >= 2
                  ) {
                    typeBonus = 0.3;
                  } else if (
                    i.getBodyPartsNum(ATTACK) +
                      i.getBodyPartsNum(RANGED_ATTACK) <=
                    1
                  ) {
                    typeBonus = 0.01;
                  } else if (Adj(i, enemySpawn) && GR(i, spawn) >= 90) {
                    typeBonus = 0.001;
                  } else {
                    typeBonus = 3;
                  }
                }
              } else if (i instanceof Ext) {
                if (getGuessPlayer() === Tigga) {
                  typeBonus = 0.015;
                } else if (getGuessPlayer() === Dooms) {
                  typeBonus = 2;
                } else {
                  typeBonus = 0.15;
                }
                // typeExtra = 0.15
              } else if (i instanceof StructureSpawn) {
                if (getGuessPlayer() === Tigga) {
                  typeBonus = 100;
                } else if (getGuessPlayer() === Dooms) {
                  typeBonus = 10;
                } else {
                  typeBonus = 0.02;
                }
                // typeExtra = getTicks() <= 630 ? 100 : 0.5
              }
              const X_axisDistanceBonus =
                1 + 0.05 * X_axisDistance(i, enemySpawn);
              const damageRate = damagedRate(head);
              const disBonus = 1 / (1 + (0.1 + 4 * damageRate) * GR(i, head));
              const sameBonus = head.upgrade.currentTarget === i ? 2 : 1;
              const tauntBonus = 1 + 0.1 * getTaunt(i);
              const final =
                disBonus *
                sameBonus *
                typeBonus *
                tauntBonus *
                X_axisDistanceBonus;
              SA(
                i,
                "T=" +
                  final +
                  " tyb=" +
                  typeBonus +
                  " disb=" +
                  disBonus +
                  " ttb=" +
                  tauntBonus +
                  " xb=" +
                  X_axisDistanceBonus
              );

              return final;
            });
      if (target) drawLineComplex(head, target, 1, "#ee3333", "dashed");
      head.upgrade.currentTarget = target;
      const hasThreated =
        snakeParts.find(sp => threats.find(i => Adj(i, sp)) !== undefined) !==
        undefined;
      // const potentialThreat=sum(threats.filter(i=>MGR(i,head)<=3),i=>i.getBodyPartsNum(ATTACK))
      // 	+sum(threats.filter(i=>MGR(i,head)>3 && MGR(i,head)<=8),i=>0.25*i.getBodyPartsNum(ATTACK));
      // const ifRetreat=!ranBool(1/(1+0.125*relu(potentialThreat-4)))
      // SA(head,"potThreat="+potentialThreat+" ifRetreat="+ifRetreat)
      const ifRetreat = false;
      const tarDistance = target ? GR(head, target) : 1;
      const hasMelee =
        enemies.find(i => i.getBodyPartsNum(ATTACK) >= 3 && GR(i, head) <= 5) !=
        undefined;
      const pureRangedBias =
        getGuessPlayer() === Tigga
          ? 500
          : head.upgrade.isPush === true
          ? 600
          : 0;
      const damaged =
        sum(snakeParts, sp => sp.hitsMax - sp.hits) >=
        36 * (tarDistance + 2) + (hasMelee ? 0 : pureRangedBias);
      if (getGuessPlayer() === Tigga) {
        drawText(new Pos_C(50, 51), "B");
        if (Adj(second, enemySpawn)) {
          const third = snakeParts.find(i => snakeIndex(i) === 2);
          if (constructionSites.find(i => atPos(i, second)) === undefined) {
            supplyCS(second, StructureRampart);
            // supplyCS(second,StructureRampart,1,false,true)
          }
          // if(getEnergy(second)<10){
          // 	SA(second,"withdraw")
          // 	const a=second.master.withdraw(enemySpawn, RESOURCE_ENERGY)
          // 	SA(second,'a='+a)
          // }else{
          const enemyHealer = enemies.filter(
            i => i.getBodyPartsNum(HEAL) > 0 && GR(i, second) <= 7
          );
          const healNum = sum(enemyHealer, i => i.getBodyPartsNum(HEAL));
          if (second.getBodyPartsNum(RANGED_ATTACK) >= 4) {
            SA(second, "-1");
            second.master.rangedMassAttack();
            second.melee();
          } else if (
            second.getBodyPartsNum(ATTACK) === 3 &&
            second.getHealthyBodyPartsNum(ATTACK) < 3
          ) {
            drawText(second, "A");
            second.master.heal(second.master);
          } else if (healNum >= 5 && Adj(second, enemySpawn)) {
            SA(second, "0");
            drawText(second, "B");
            second.master.attack(enemySpawn.master);
          } else if (inRampart(second)) {
            SA(second, "1");
            drawText(second, "C");
            second.melee();
            second.shot();
          } else {
            SA(second, "2");
            drawText(second, "D");
            second.fight();
          }
          if (third) {
            SA(third, "0");
            const ram = constructionSites.find(i => i.my && Adj(i, third));
            if (ram) {
              third.buildStatic();
              SA(third, "1");
            } else {
              SA(third, "2");
            }
          }
          // if(second && !third){
          // 	SA(second,"aa")
          // 	const ram=constructionSites.find(i=>i.my && Adj(i,second))
          // 	if(!inRampart(second) && ram){
          // 		SA(second,"bb")
          // 		second.buildStatic()
          // 	}else{
          // 		SA(second,"cc")
          // 	}
          // }
          // if(getEnergy(second)>0){
          // 	SA(second,"0")
          // 	const ram=constructionSites.find(i=>i.my && Adj(i,second))
          // 	if(ram){
          // 		second.master.build(ram)
          // 		SA(second,"1")
          // 	}else{
          // 		SA(second,"2")
          // 	}
          // }else{
          // 	SA(second,"3")
          // 	const enemyHealer=enemies.filter(i=>i.getBodyPartsNum(HEAL)>0 && GR(i,second)<=7)
          // 	const healNum=sum(enemyHealer,i=>i.getBodyPartsNum(HEAL))
          // 	if(healNum>=5 && Adj(second,enemySpawn)){
          // 		second.master.attack(enemySpawn)
          // 	}else{
          // 		second.fight()
          // 	}
          // }
          // builderStandardJob(second)
          // }
          // const followers = snakeParts.filter(i => snakeIndex(i)>0 && snakeIndex(i)<=2);
          // const sortedFollowers = followers.sort((a, b) => spInd(a) - spInd(b))
          // const rest = snakeParts.filter(i => snakeIndex(i)>=3);
          // for (let fol of rest) {
          // 	fol.stop()
          // }
          // // head.stop()
          // // head.tasks.find(i => i instanceof PullTarsTask)?.end()
          // const pos1
          // new PullTarsTask(head, sortedFollowers, enemySpawn, undefined, false);
          // const rest = snakeParts.filter(i => snakeIndex(i)!==1);
          // let exc=false
          // for (let fol of rest) {
          // 	const threatEn=enemies.find(i=>Adj(i,second) && hasThreat(i))
          // 	if(threatEn){
          // 		SA(second,'THREAT')
          // 		if(Adj(fol,second)&& !Adj(fol,threatEn)){
          // 			SA(fol,'EXC')
          // 			fol.exchangePos_setAppointment(second)
          // 			exc=true
          // 		}else{
          // 			fol.MTJ_stop(enemySpawn)
          // 		}
          // 	}else{
          // 		fol.MTJ_stop(enemySpawn)
          // 	}
          // }
          // if(!exc){
          // 	second.stop()
          // }
          head.tasks.find(i => i instanceof PullTarsTask)?.end();
          tail.tasks.find(i => i instanceof PullTarsTask)?.end();
          SA(second, "ATT");
        } else if (target) {
          SA(head, "PUSH");
          head.upgrade.isPush = true;
          tail.tasks.find(i => i instanceof PullTarsTask)?.end();
          const followers = snakeParts.filter(i => i !== head);
          const sortedFollowers = followers.sort((a, b) => spInd(a) - spInd(b));
          new PullTarsTask(head, sortedFollowers, target, undefined, false);
        } else {
          SA(head, "NO TARGET");
        }
      } else if (!Adj(second, head)) {
        tail.tasks.find(i => i instanceof PullTarsTask)?.end();
        head.tasks.find(i => i instanceof PullTarsTask)?.end();
        const followers = snakeParts.filter(i => i !== head && i !== second);
        const sortedFollowers = followers.sort((a, b) => spInd(a) - spInd(b));
        new PullTarsTask(second, sortedFollowers, head, undefined, false);
      } else if (hasThreated || damaged || ifRetreat) {
        SA(head, "BACK");
        head.upgrade.isPush = false;
        second.tasks.find(i => i instanceof PullTarsTask)?.end();
        head.tasks.find(i => i instanceof PullTarsTask)?.end();
        const followers = snakeParts.filter(i => i !== tail);
        const sortedFollowers = followers.sort((a, b) => spInd(b) - spInd(a));
        new PullTarsTask(tail, sortedFollowers, spawn, undefined, false);
      } else if (target) {
        SA(head, "PUSH!");
        head.upgrade.isPush = true;
        second.tasks.find(i => i instanceof PullTarsTask)?.end();
        tail.tasks.find(i => i instanceof PullTarsTask)?.end();
        snakeParts.forEach(sp => {
          if (sp !== head) {
            sp.tasks.find(i => i instanceof PullTarsTask)?.end();
          }
        });
        if (Adj(target, enemySpawn)) {
          if (Adj(head, target)) {
            SA(head, "S");
            head.tasks.find(i => i instanceof PullTarsTask)?.end();
            head.stop();
          } else {
            SA(head, "O2");
            const followers = snakeParts.filter(i => i !== head);
            const sortedFollowers = followers.sort(
              (a, b) => spInd(a) - spInd(b)
            );
            new PullTarsTask(head, sortedFollowers, target, undefined, false);
          }
        } else {
          let ifChase: boolean;
          if (target instanceof Cre && target.getBodyPartsNum(ATTACK) === 0) {
            ifChase = true;
          } else if (
            target instanceof Cre &&
            target.getBodyPartsNum(WORK) > 0 &&
            inRampart(target)
          ) {
            ifChase = false;
          } else if (
            target instanceof Cre &&
            target.getBodyPartsNum(WORK) > 0 &&
            !inRampart(target)
          ) {
            ifChase = true;
          } else {
            ifChase = false;
          }
          if (Adj(head, target) && !ifChase) {
            head.stop();
          } else {
            SA(head, "O");
            const followers = snakeParts.filter(i => i !== head);
            const sortedFollowers = followers.sort(
              (a, b) => spInd(a) - spInd(b)
            );
            new PullTarsTask(head, sortedFollowers, target, undefined, false);
          }
        }
      } else {
        SA(head, "NO TARGET");
      }
    } else {
      P("NO HEAD TAIL");
    }
  }
}
function supplyToughDefender(defenderNum: number = 2) {
  //first defender
  SA(displayPos(), "supplyToughDefender");
  if (
    spawnCleared(spawn) &&
    friends.filter(i => i.role === toughDefender).length < defenderNum
  ) {
    SA(displayPos(), "spawn defender");
    const spEns = getEnemyThreats().filter(i => inMyBaseRan(i));
    const spEn = closest(spawn, spEns);
    const aRate = enemyAWeight();
    if (spEn) {
      const range = GR(spEn, spawn);
      const myEnergy = spawnAndExtensionsEnergy(spawn);
      let restPart;
      if (getGuessPlayer() === Tigga) {
        restPart = TB("M3H");
      } else if (getGuessPlayer() === Dooms) {
        restPart = TB("MRA");
      } else if (getGuessPlayer() === Kerob) {
        restPart = TB("MAR");
      } else if (aRate > 0.6) {
        //100+320
        restPart = TB("M4A");
      } else if (aRate > 0.25) {
        //100+160+150
        restPart = TB("M2AR");
      } else {
        //100+300
        restPart = TB("M2R");
      }
      const restCost = getBodiesCost(restPart);
      const TNum_beforeRange = Math.min(
        Math.floor((myEnergy - restCost) / 10),
        getGuessPlayer() === Dooms ? 10 : getGuessPlayer() === Tigga ? 8 : 20
      );
      const TNumLimit = Math.floor(range / 3 + 4);
      const TNum = Math.min(TNumLimit, TNum_beforeRange);
      SAN(displayPos(), "TNum", TNum);
      if (TNum >= 0) {
        SA(displayPos(), "spawn the tough defender");
        spawnCreep_ifHasEnergy(TB(TNum + "T").concat(restPart), toughDefender);
      } else {
        SA(displayPos(), "TNum error");
      }
    } else {
      if (getGuessPlayer() === Tigga) {
        spawnCreep_ifHasEnergy(TB("10TM3H"), toughDefender);
      } else if (getGuessPlayer() === Kerob) {
        spawnCreep_ifHasEnergy(TB("20TM2AR"), toughDefender);
      } else if (getGuessPlayer() === Dooms) {
        spawnCreep_ifHasEnergy(TB("10TMRA"), toughDefender);
      } else if (aRate > 0.6) {
        //150+150+240=540
        spawnCreep_ifHasEnergy(TB("20TM4A"), toughDefender);
      } else if (aRate > 0.25) {
        spawnCreep_ifHasEnergy(TB("20TM2AR"), toughDefender);
      } else {
        spawnCreep_ifHasEnergy(TB("20TM2R"), toughDefender);
      }
    }
  }
}
