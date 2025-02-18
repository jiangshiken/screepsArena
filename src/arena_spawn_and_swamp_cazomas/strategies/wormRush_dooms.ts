import { ATTACK, WORK } from "game/constants";
import { Cre_battle } from "../gameObjects/Cre_battle";
import { Cre_pull, PullTarsTask } from "../gameObjects/Cre_pull";
import { defendInArea } from "../gameObjects/CreCommands";
import { isHealer, isMelee, Role, set_spawnDps } from "../gameObjects/CreTool";
import {
  enemies,
  enemySpawn,
  friends,
  oppoCSs,
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
  getAssembleTick,
  set_wormPartNum,
  wormGo,
  wormIndex,
  WormInfo,
  wormPartJob,
} from "../roles/wormPart_rush";
import { TB } from "../utils/autoBodys";
import { addStrategyTick, strategyTick, tick } from "../utils/game";
import { best } from "../utils/JS";
import { Adj, closest, GR, InRan2 } from "../utils/Pos";
import { findTask } from "../utils/Task";
import { SA } from "../utils/visual";
import { useStandardTurtling } from "./stdTurtlingTool";
import { supplyToughDefender } from "./strategyTool";
export function useWormRush_dooms() {
  const wpn: number = 8;
  const tailSize: number = 0;
  const turtleStrength: number = 1;
  const spawnJamerNum: number = 8;
  const st = strategyTick;
  set_wormPartNum(wpn);
  if (oppoSpawns.length >= 2) {
    set_spawnDps(10);
  }
  if (wpn === 9) {
    if (tick >= getAssembleTick() || wormGo) {
      supplyToughDefender(2, false);
    }
  } else {
    useStandardTurtling(strategyTick, turtleStrength);
  }
  if (st === 0) {
    for (let i = 0; i < spawnJamerNum; i++) {
      spawnCreep(TB("M"), jamer);
    }
    //150+640+50
    spawnCreep(TB("3MR8AM"), wormPart_dooms, new WormInfo(0));
    spawnCreep(TB("4M3A2HM"), wormPart_dooms, new WormInfo(1));
    spawnCreep(TB("9M6AM"), wormPart_dooms, new WormInfo(2));
    spawnCreep(TB("9M6AM"), wormPart_dooms, new WormInfo(3));
    spawnCreep(TB("9M6AM"), wormPart_dooms, new WormInfo(4));
    spawnCreep(TB("9M6AM"), wormPart_dooms, new WormInfo(5));
    if (wpn >= 7) {
      if (wpn === 7) {
        if (tailSize === 0) {
          spawnCreep(TB("3M3A"), wormPart_dooms, new WormInfo(6));
        } else {
          spawnCreep(TB("6M6A"), wormPart_dooms, new WormInfo(6));
        }
      } else {
        spawnCreep(TB("9M6AM"), wormPart_dooms, new WormInfo(6));
      }
    }
    if (wpn >= 8) {
      if (wpn === 8) {
        if (tailSize === 0) {
          spawnCreep(TB("3M3A"), wormPart_dooms, new WormInfo(7));
        } else {
          spawnCreep(TB("6M6A"), wormPart_dooms, new WormInfo(7));
        }
      } else {
        spawnCreep(TB("9M6AM"), wormPart_dooms, new WormInfo(7));
      }
    }
    if (wpn >= 9) {
      if (tailSize === 0) {
        spawnCreep(TB("3M3A"), wormPart_dooms, new WormInfo(8));
      } else {
        spawnCreep(TB("6M6A"), wormPart_dooms, new WormInfo(8));
      }
    }
  }
  addStrategyTick();
}
const wormPart_dooms: Role = new Role(
  "wormPart_dooms",
  cre => new wormPart_doomsJob(<Cre_battle>cre)
);
let passEnemySecondSpawn: boolean = false;
class wormPart_doomsJob extends wormPartJob {
  master: Cre_battle;
  constructor(master: Cre_battle) {
    super(master);
    this.master = master;
    this.cancelOldTask(wormPart_doomsJob);
  }
  isWormPart(cre: Cre_pull): boolean {
    return cre.role === wormPart_dooms;
  }
  wormGo(): void {
    const cre = this.master;
    if (passEnemySecondSpawn) {
      SA(cre, "SWG");
      super.wormGo();
    } else {
      SA(cre, "GSS");
      const secondSpawn = oppoSpawns.find(i => i !== enemySpawn);
      const secondSpawnCS = oppoCSs.find(i => i.progress > 950);
      // SA(cre, "secondSpawn=" + COO(secondSpawn));
      // SA(cre, "oppoCSs=" + oppoCSs.length);
      // for (let oppoCS of oppoCSs) {
      //   SA(cre, "p=" + oppoCS.progress);
      // }
      // SA(cre, "secondSpawnCS=" + COO(secondSpawnCS));
      const tar = secondSpawn ? secondSpawn : secondSpawnCS;
      if (tar) {
        const myWormParts = this.getMyWormParts();
        const head = <Cre_battle>best(myWormParts, i => -wormIndex(i));
        if (Adj(head, tar)) {
          const tarBuilder = enemies.find(
            i => i.getBodyPartsNum(WORK) >= 3 && GR(i, tar) <= 7
          );
          if (secondSpawn) {
            SA(cre, "AS");
            cre.MT_stop(secondSpawn);
          } else if (tarBuilder) {
            SA(cre, "AB");
            cre.MT_stop(tarBuilder);
            // findTask(head, PullTarsTask)?.end();
            // passEnemySecondSpawn = true;
          } else {
            SA(cre, "pass");
            passEnemySecondSpawn = true;
          }
        } else {
          SA(cre, "HSS");
          const followers = myWormParts.filter(i => i !== head);
          head.newPullTarsTask(followers, tar, 5);
        }
      } else {
        SA(cre, "NSS");
        passEnemySecondSpawn = true;
      }
    }
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
