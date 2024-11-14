import {
  enemySpawn,
  spawn,
} from "arena_spawn_and_swamp_cazomas/gameObjects/GameObjectInitialize";
import { Cre_battle } from "../gameObjects/Cre_battle";
import { Cre_move } from "../gameObjects/Cre_move";
import { defendInArea } from "../gameObjects/CreCommands";
import { isHealer, Role } from "../gameObjects/CreTool";
import { friends } from "../gameObjects/GameObjectInitialize";
import { damaged } from "../gameObjects/HasHits";
import { newPullTarsTask, PullTarsTask } from "../gameObjects/pull";
import { spawnCreep } from "../gameObjects/spawn";
import { TB } from "../utils/autoBodys";
import { Event } from "../utils/Event";
import { addStrategyTick, strategyTick, tick } from "../utils/game";
import { best } from "../utils/JS";
import { atPos, closest, GR, Pos_C } from "../utils/Pos";
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
let wormStartWait: Event | undefined = undefined;
export function useWormRush(wpn: number, tailSmall: boolean = true) {
  wormPartNum = wpn;
  if (strategyTick >= 0) {
    if (wpn === 8) {
      if (tick >= assembleTick || wormGo) {
        supplyToughDefender(2, false);
      }
    } else {
      useStandardTurtling(strategyTick, 1);
    }
  }
  if (strategyTick === 0) {
    if (wpn >= 6) {
      //150+640+50
      spawnCreep(TB("3MR8AM"), wormPart, new WormInfo(0));
      //450+240+250+50
      spawnCreep(TB("9M3AHM"), wormPart, new WormInfo(1));
      spawnCreep(TB("9M6AM"), wormPart, new WormInfo(2));
      spawnCreep(TB("9M6AM"), wormPart, new WormInfo(3));
      spawnCreep(TB("9M6AM"), wormPart, new WormInfo(4));
      spawnCreep(TB("9M6AM"), wormPart, new WormInfo(5));
    }
    if (wpn >= 7) {
      if (tailSmall && wpn === 7)
        spawnCreep(TB("5M3A"), wormPart, new WormInfo(6));
      else spawnCreep(TB("10M6A"), wormPart, new WormInfo(6));
    }
    if (wpn >= 8) {
      if (tailSmall && wpn === 8)
        spawnCreep(TB("5M3A"), wormPart, new WormInfo(7));
      else spawnCreep(TB("10M6A"), wormPart, new WormInfo(7));
    }
  }
  addStrategyTick();
}
function wormPartJob(cre: Cre_battle) {
  SA(cre, "WPJ");
  cre.group_Index = getWormInfo(cre).index;
  cre.fight();
  const creInd = wormIndex(cre);
  if (!wormGo) {
    SA(cre, "NG");
    wormGo = ifGo();
    const assP = assemblePoint(creInd);
    if (tick >= assembleTick) {
      SA(cre, "AT");
      cre.MTJ(assP);
    } else {
      SA(cre, "DS");
      //if tick<320
      if (isHealer(cre)) {
        const scanRange = 10;
        const tars = friends.filter(i => GR(cre, i) <= scanRange && damaged(i));
        const tar = closest(cre, tars);
        if (tar) {
          cre.MTJ(tar);
        } else {
          cre.MTJ(assP);
        }
      } else {
        const isDefending = defendInArea(cre, spawn, 7);
        if (!isDefending) {
          cre.MTJ(assP);
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
        newPullTarsTask(head, followers, enemySpawn, 5);
        const scanCloseDis = 6;
        if (GR(cre, enemySpawn) <= scanCloseDis) {
          wormStartWait = new Event();
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
        cre.MTJ(new Pos_C(assembleX, assembleY));
      } else {
        SA(cre, "AS");
        cre.MTJ_stop(enemySpawn);
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
