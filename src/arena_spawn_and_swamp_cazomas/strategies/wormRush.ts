import {
  enemies,
  enemySpawn,
  oppoSpawns,
  spawn,
} from "arena_spawn_and_swamp_cazomas/gameObjects/GameObjectInitialize";
import { ATTACK } from "game/constants";
import { Cre_battle } from "../gameObjects/Cre_battle";
import { Cre_move } from "../gameObjects/Cre_move";
import { newPullTarsTask, PullTarsTask } from "../gameObjects/Cre_pull";
import { defendInArea } from "../gameObjects/CreCommands";
import { isHealer, isMelee, Role, set_spawnDps } from "../gameObjects/CreTool";
import { friends } from "../gameObjects/GameObjectInitialize";
import { damaged, healthRate } from "../gameObjects/HasHits";
import { Dooms, getGuessPlayer } from "../gameObjects/player";
import { spawnCreep } from "../gameObjects/spawn";
import {
  enRamBlockCostMatrix,
  friendBlockCostMatrix,
  inRampart,
} from "../gameObjects/UnitTool";
import { jamer } from "../roles/jamer";
import { TB } from "../utils/autoBodys";
import { Event_ori } from "../utils/Event";
import { addStrategyTick, strategyTick, tick } from "../utils/game";
import { best } from "../utils/JS";
import { atPos, closest, GR, InRan2, Pos_C } from "../utils/Pos";
import { ERR_rtn } from "../utils/print";
import { findTask } from "../utils/Task";
import { SA } from "../utils/visual";
import { useStandardTurtling } from "./4ramDefendTool";
import {
  assemblePoint,
  getStartGateAvoidFromEnemies,
  supplyToughDefender,
} from "./strategyTool";

let wormPartNum: number;
const wormPart: Role = new Role("wormPart", wormPartJob);
const assembleTick: number = 380;
let wormGo: boolean = false;
let wormStartWait: Event_ori | undefined = undefined;
export function useWormRush(
  wpn: number,
  tailSize: number = 0,
  turtleStrength: number = 1,
  spawnJamerNum: number = 0
) {
  wormPartNum = wpn;
  if (oppoSpawns.length >= 2) {
    set_spawnDps(10);
  }
  if (strategyTick >= 0) {
    if (wpn === 8) {
      if (tick >= assembleTick || wormGo) {
        supplyToughDefender(2, false);
      }
    } else {
      useStandardTurtling(strategyTick, turtleStrength);
    }
  }
  if (strategyTick === 0) {
    for (let i = 0; i < spawnJamerNum; i++) {
      spawnCreep(TB("M"), jamer);
    }
    if (wpn >= 6) {
      //150+640+50
      spawnCreep(TB("3MR8AM"), wormPart, new WormInfo(0));
      if (getGuessPlayer() === Dooms) {
        //200+240+500+50
        spawnCreep(TB("4M3A2HM"), wormPart, new WormInfo(1));
      } else {
        //350+320+250+50
        spawnCreep(TB("7M4AHM"), wormPart, new WormInfo(1));
      }
      spawnCreep(TB("9M6AM"), wormPart, new WormInfo(2));
      spawnCreep(TB("9M6AM"), wormPart, new WormInfo(3));
      spawnCreep(TB("9M6AM"), wormPart, new WormInfo(4));

      spawnCreep(TB("9M6AM"), wormPart, new WormInfo(5));
    }
    if (wpn >= 7) {
      if (wpn === 7) {
        if (tailSize === 0) {
          spawnCreep(TB("4M4A"), wormPart, new WormInfo(6));
        } else {
          spawnCreep(TB("6M6A"), wormPart, new WormInfo(6));
        }
      } else {
        spawnCreep(TB("10M6A"), wormPart, new WormInfo(6));
      }
    }
    if (wpn >= 8) {
      if (tailSize === 0) {
        spawnCreep(TB("4M4A"), wormPart, new WormInfo(7));
      } else if (tailSize === 1) {
        spawnCreep(TB("6M6A"), wormPart, new WormInfo(7));
      } else {
        spawnCreep(TB("8M7A"), wormPart, new WormInfo(7));
      }
    }
  }
  addStrategyTick();
}
function wormPartJob(cre: Cre_battle) {
  SA(cre, "WPJ");
  cre.group_Index = getWormInfo(cre).index;
  SA(cre, "I=" + cre.group_Index);
  cre.fight();
  const creInd = wormIndex(cre);
  if (!wormGo) {
    SA(cre, "NG");
    wormGo = ifGo();
    const assP = assemblePoint(creInd);
    if (tick >= assembleTick) {
      SA(cre, "AT");
      cre.MT(assP);
    } else {
      SA(cre, "DS");
      //if tick<320
      if (isHealer(cre)) {
        const scanRange = 8;
        const tars = friends.filter(
          i =>
            i !== cre &&
            i.role === wormPart &&
            GR(cre, i) <= scanRange &&
            damaged(i)
        );
        const tar = closest(cre, tars);
        if (tar) {
          cre.MT(tar);
        } else {
          cre.MT(assP);
        }
      } else {
        const isDefending = defendInArea(cre, spawn, 7);
        if (!isDefending) {
          cre.MT(assP);
        }
      }
    }
  } else {
    //worm go
    SA(cre, "WG");
    if (wormStartWait === undefined) {
      SA(cre, "RUSH");
      const head = best(wormParts(), i => -wormIndex(i));
      if (head && head === cre) {
        const followers = wormParts().filter(i => i !== head);
        const startGateUp = getStartGateAvoidFromEnemies();
        head.startGateUp = startGateUp;
        const target = enemySpawn;
        newPullTarsTask(head, followers, target, 5);
        const scanCloseDis = 6;
        if (GR(cre, enemySpawn) <= scanCloseDis) {
          wormStartWait = new Event_ori();
          findTask(head, PullTarsTask)?.end();
        }
      }
    } else {
      //start wait
      if (wormStartWait.validEvent(6)) {
        SA(cre, "WSW");
        const assembleX = enemySpawn.x + creInd - 3;
        const isUp = cre.y < enemySpawn.y;
        const keepDis = 5;
        const assembleY = isUp
          ? enemySpawn.y - keepDis
          : enemySpawn.y + keepDis;
        cre.MT(new Pos_C(assembleX, assembleY));
      } else {
        SA(cre, "AS");
        if (getGuessPlayer() === Dooms) {
          if (oppoSpawns.length >= 2) {
            //first spawn
            if (isHealer(cre)) {
              SA(cre, "IH1");
              const targets = friends.filter(
                i => i !== cre && damaged(i) && i.role === wormPart
              );
              const target = closest(cre, targets);
              if (target) {
                cre.MT(target, [cre], 1, friendBlockCostMatrix);
              } else {
                cre.MT_stop(enemySpawn, [cre], 1, friendBlockCostMatrix);
              }
            } else {
              SA(cre, "IA1");
              const enemyMelees = enemies.filter(
                i => i.getBodyPartsNum(ATTACK) > 0 && GR(i, enemySpawn) <= 7
              );
              const target = closest(cre, enemyMelees);
              if (target) {
                cre.MT_stop(target, [cre], 1, friendBlockCostMatrix);
              } else {
                cre.MT_stop(enemySpawn, [cre], 1, friendBlockCostMatrix);
              }
            }
          } else {
            //second spawn
            const waitRange = 7;
            if (GR(cre, enemySpawn) > waitRange) {
              const damagedFriend = friends.find(
                i => i.role === wormPart && healthRate(i) < 0.95
              );
              if (damagedFriend) {
                if (isHealer(cre)) {
                  SA(cre, "IH1.5");
                  cre.MT(damagedFriend, [cre], 1, friendBlockCostMatrix);
                } else {
                  defendInArea(cre, damagedFriend, 4);
                }
              } else {
                SA(cre, "GEn");
                const restFri = wormParts().filter(
                  i => GR(i, enemySpawn) > waitRange
                );
                const hasPullTask =
                  restFri.find(i => findTask(i, PullTarsTask) !== undefined) !==
                  undefined;
                if (hasPullTask) {
                  // cre.stop();
                  // findTask(cre, PullTarsTask)?.end();
                } else {
                  const followers = restFri.filter(i => i !== cre);
                  newPullTarsTask(cre, followers, enemySpawn);
                }
              }
            } else {
              //in range 7
              findTask(cre, PullTarsTask)?.end();
              if (isHealer(cre)) {
                SA(cre, "IH");
                const targets = friends.filter(
                  i => i !== cre && damaged(i) && i.role === wormPart
                );
                const target = closest(cre, targets);
                const dangerEns = enemies.filter(
                  i => isMelee(i) && inRampart(i) && InRan2(cre, i)
                );
                const closestEn = closest(cre, dangerEns);
                if (closestEn) {
                  SA(cre, "Fl");
                  cre.flee(2, 4, enRamBlockCostMatrix);
                } else {
                  if (target) {
                    SA(cre, "MTS");
                    cre.MT_stop(target, [cre], 1, enRamBlockCostMatrix);
                  } else {
                    SA(cre, "S");
                    cre.stop();
                  }
                }
              } else {
                //Melee
                SA(cre, "IMe");
                if (healthRate(cre) < 0.7) {
                  SA(cre, "Av");
                  const healCre = friends.find(
                    i => i.role === wormPart && isHealer(i)
                  );
                  if (healCre) {
                    cre.MT(healCre, [cre], 1, enRamBlockCostMatrix);
                  } else {
                    cre.MT_stop(enemySpawn, [cre], 1, friendBlockCostMatrix);
                  }
                } else {
                  SA(cre, "F");
                  cre.MT_stop(enemySpawn, [cre], 1, friendBlockCostMatrix);
                }
              }
            }
          }
        } else {
          cre.MT_stop(enemySpawn, [cre], 1, friendBlockCostMatrix);
        }
      }
    }
  }
}
function wormParts(): Cre_move[] {
  return <Cre_move[]>friends.filter(i => i.role === wormPart);
}

class WormInfo {
  index: number;
  constructor(index: number) {
    this.index = index;
  }
}
/**find the worm apart by index*/
function findWormPart(index: number): Cre_move | undefined {
  return <Cre_move | undefined>(
    friends.find(
      i =>
        i instanceof Cre_move && i.role === wormPart && index === i.group_Index
    )
  );
}
function getWormInfo(cre: Cre_move): WormInfo {
  return <WormInfo>cre.extraMessage;
}
function wormIndex(cre: Cre_move) {
  return cre.group_Index !== undefined
    ? cre.group_Index
    : ERR_rtn(-1, "wrong index");
}
function ifGo(): boolean {
  if (tick >= assembleTick + 30) {
    return true;
  } else {
    const finalSnakePart = findWormPart(wormPartNum - 1);
    if (finalSnakePart) {
      return atPos(finalSnakePart, assemblePoint(wormIndex(finalSnakePart)));
    } else {
      return false;
    }
  }
}
