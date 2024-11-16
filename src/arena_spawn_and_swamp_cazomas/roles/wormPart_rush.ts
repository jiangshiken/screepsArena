import { spawn } from "child_process";
import { ATTACK } from "game/constants";
import { Cre_battle } from "../gameObjects/Cre_battle";
import { Cre_move } from "../gameObjects/Cre_move";
import { Cre_pull, PullTarsTask } from "../gameObjects/Cre_pull";
import { defendInArea } from "../gameObjects/CreCommands";
import { isHealer, isMelee, Role } from "../gameObjects/CreTool";
import {
  enemies,
  enemySpawn,
  friends,
  oppoSpawns,
} from "../gameObjects/GameObjectInitialize";
import { damaged, healthRate } from "../gameObjects/HasHits";
import { Dooms, getGuessPlayer } from "../gameObjects/player";
import {
  enRamBlockCostMatrix,
  friendBlockCostMatrix,
  inRampart,
} from "../gameObjects/UnitTool";
import {
  assemblePoint,
  getStartGateAvoidFromEnemies,
} from "../strategies/strategyTool";
import { Event_ori } from "../utils/Event";
import { tick } from "../utils/game";
import { best } from "../utils/JS";
import { atPos, closest, GR, InRan2, Pos_C } from "../utils/Pos";
import { ERR_rtn } from "../utils/print";
import { findTask } from "../utils/Task";
import { SA } from "../utils/visual";
let wormPartNum: number;
const wormPart: Role = new Role("wormPart", wormPartJob);
let assembleTick: number = 380;
let wormGo: boolean = false;
let wormStartWait: Event_ori | undefined = undefined;
function wormParts(): Cre_pull[] {
  return <Cre_pull[]>friends.filter(i => i.role === wormPart);
}
class WormInfo {
  index: number;
  constructor(index: number) {
    this.index = index;
  }
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
/**find the worm apart by index*/
function findWormPart(index: number): Cre_pull | undefined {
  return <Cre_pull | undefined>(
    friends.find(
      i =>
        i instanceof Cre_pull && i.role === wormPart && index === i.group_Index
    )
  );
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
      //if start assemble
      SA(cre, "AT");
      cre.MT(assP);
    } else {
      //if not assemble yet
      SA(cre, "DS");
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
        head.newPullTarsTask(followers, target, 5);
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
        //rush spawn
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
