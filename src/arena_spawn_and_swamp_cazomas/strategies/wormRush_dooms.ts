import { ATTACK } from "game/constants";
import { Cre_battle } from "../gameObjects/Cre_battle";
import { Cre_pull, PullTarsTask } from "../gameObjects/Cre_pull";
import { defendInArea } from "../gameObjects/CreCommands";
import { isHealer, isMelee, Role, set_spawnDps } from "../gameObjects/CreTool";
import {
  enemies,
  enemySpawn,
  friends,
  oppoSpawns,
} from "../gameObjects/GameObjectInitialize";
import { damaged, healthRate } from "../gameObjects/HasHits";
import { spawnCreep } from "../gameObjects/spawn";
import {
  enRamBlockCostMatrix,
  friendBlockCostMatrix,
  inRampart,
} from "../gameObjects/UnitTool";
import { jamer } from "../roles/jamer";
import {
  assembleTick,
  set_wormPartNum,
  wormGo,
  WormInfo,
  wormPartJob,
} from "../roles/wormPart_rush";
import { TB } from "../utils/autoBodys";
import { addStrategyTick, strategyTick, tick } from "../utils/game";
import { closest, GR, InRan2 } from "../utils/Pos";
import { findTask } from "../utils/Task";
import { SA } from "../utils/visual";
import { useStandardTurtling } from "./4ramDefendTool";
import { supplyToughDefender } from "./strategyTool";
export function useWormRush_dooms(
  wpn: number,
  tailSize: number = 0,
  turtleStrength: number = 1,
  spawnJamerNum: number = 0
) {
  set_wormPartNum(wpn);
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
      spawnCreep(TB("3MR8AM"), wormPart_dooms, new WormInfo(0));
      spawnCreep(TB("4M3A2HM"), wormPart_dooms, new WormInfo(1));
      spawnCreep(TB("9M6AM"), wormPart_dooms, new WormInfo(2));
      spawnCreep(TB("9M6AM"), wormPart_dooms, new WormInfo(3));
      spawnCreep(TB("9M6AM"), wormPart_dooms, new WormInfo(4));
      spawnCreep(TB("9M6AM"), wormPart_dooms, new WormInfo(5));
    }
    if (wpn >= 7) {
      if (wpn === 7) {
        if (tailSize === 0) {
          spawnCreep(TB("4M4A"), wormPart_dooms, new WormInfo(6));
        } else {
          spawnCreep(TB("6M6A"), wormPart_dooms, new WormInfo(6));
        }
      } else {
        spawnCreep(TB("10M6A"), wormPart_dooms, new WormInfo(6));
      }
    }
    if (wpn >= 8) {
      if (tailSize === 0) {
        spawnCreep(TB("4M4A"), wormPart_dooms, new WormInfo(7));
      } else if (tailSize === 1) {
        spawnCreep(TB("6M6A"), wormPart_dooms, new WormInfo(7));
      } else {
        spawnCreep(TB("8M7A"), wormPart_dooms, new WormInfo(7));
      }
    }
  }
  addStrategyTick();
}
const wormPart_dooms: Role = new Role(
  "wormPart_dooms",
  cre => new wormPart_doomsJob(<Cre_battle>cre)
);
class wormPart_doomsJob extends wormPartJob {
  master: Cre_battle;
  constructor(master: Cre_battle) {
    super(master);
    this.master = master;
    this.cancelOldTask(wormPart_doomsJob);
  }
  rushSpawn() {
    const cre = this.master;
    if (oppoSpawns.length >= 2) {
      //first spawn
      if (isHealer(cre)) {
        SA(cre, "IH1");
        const targets = friends.filter(
          i => i !== cre && damaged(i) && i.role === wormPart_dooms
        );
        const target = closest(cre, targets);
        if (target) {
          cre.MT(target, 1, friendBlockCostMatrix);
        } else {
          cre.MT_stop(enemySpawn, 1, friendBlockCostMatrix);
        }
      } else {
        SA(cre, "IA1");
        const enemyMelees = enemies.filter(
          i => i.getBodyPartsNum(ATTACK) > 0 && GR(i, enemySpawn) <= 7
        );
        const target = closest(cre, enemyMelees);
        if (target) {
          cre.MT_stop(target, 1, friendBlockCostMatrix);
        } else {
          cre.MT_stop(enemySpawn, 1, friendBlockCostMatrix);
        }
      }
    } else {
      //second spawn
      const waitRange = 7;
      if (GR(cre, enemySpawn) > waitRange) {
        const damagedFriend = friends.find(
          i => i.role === wormPart_dooms && healthRate(i) < 0.95
        );
        if (damagedFriend) {
          if (isHealer(cre)) {
            SA(cre, "IH1.5");
            cre.MT(damagedFriend, 1, friendBlockCostMatrix);
          } else {
            defendInArea(cre, damagedFriend, 4);
          }
        } else {
          SA(cre, "GEn");
          const myWormParts = <Cre_pull[]>(
            friends.filter(i => i.role === wormPart_dooms)
          );
          const restFri = myWormParts.filter(
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
            cre.newPullTarsTask(followers, enemySpawn);
          }
        }
      } else {
        //in range 7
        findTask(cre, PullTarsTask)?.end();
        if (isHealer(cre)) {
          SA(cre, "IH");
          const targets = friends.filter(
            i => i !== cre && damaged(i) && i.role === wormPart_dooms
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
              cre.MT_stop(target, 1, enRamBlockCostMatrix);
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
              i => i.role === wormPart_dooms && isHealer(i)
            );
            if (healCre) {
              cre.MT(healCre, 1, enRamBlockCostMatrix);
            } else {
              cre.MT_stop(enemySpawn, 1, friendBlockCostMatrix);
            }
          } else {
            SA(cre, "F");
            cre.MT_stop(enemySpawn, 1, friendBlockCostMatrix);
          }
        }
      }
    }
  }
}
