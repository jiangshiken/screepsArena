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
import { newPullTarsTask } from "../gameObjects/pull";
import { spawnCreep } from "../gameObjects/spawn";
import { TB } from "../utils/autoBodys";
import { Event } from "../utils/Event";
import { addStrategyTick, strategyTick, tick } from "../utils/game";
import { best } from "../utils/JS";
import { atPos, closest, GR, Pos_C } from "../utils/Pos";
import { ERR_rtn } from "../utils/print";
import { SA } from "../utils/visual";
import { useStandardTurtling } from "./4ramDefendTool";
import { assemblePoint, getStartGateAvoidFromEnemies } from "./strategyTool";

let wormPartNum: number;
const wormPart: Role = new Role("wormPart", wormPartJob);
const assembleTick: number = 380;
let wormGo: boolean = false;
let wormStartWait: Event | undefined = undefined;
function wormPartJob(cre: Cre_battle) {
  SA(cre, "WPJ");
  cre.group_Index = getWormInfo(cre).index;
  cre.fight();
  const creInd = wormIndex(cre);
  if (!wormGo) {
    wormGo = ifGo();
    const assP = assemblePoint(creInd);
    if (tick >= assembleTick) {
      cre.MTJ(assP);
    } else {
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
    if (wormStartWait === undefined) {
      const head = best(wormParts(), i => -wormIndex(i));
      if (head && head === cre) {
        const followers = wormParts().filter(i => i !== head);
        const startGateUp = getStartGateAvoidFromEnemies();
        head.startGateUp = startGateUp;
        newPullTarsTask(head, followers, enemySpawn, 5);
      }
      if (GR(cre, enemySpawn) <= 5) {
        wormStartWait = new Event();
      }
    } else {
      //start wait
      if (wormStartWait.validEvent(6)) {
        const assembleX = enemySpawn.x + creInd - 3;
        const isUp = cre.y < enemySpawn.y;
        const assembleY = isUp ? enemySpawn.y - 4 : enemySpawn.y + 4;
        cre.MTJ(new Pos_C(assembleX, assembleY));
      } else {
        cre.MTJ_stop(enemySpawn);
      }
    }
  }
}
function wormParts(): Cre_move[] {
  return <Cre_move[]>friends.filter(i => i.role === wormPart);
}
export function useWormRush(wpn: number) {
  wormPartNum = wpn;
  if (strategyTick >= 0) {
    useStandardTurtling(strategyTick, 1);
  }
  if (strategyTick === 0) {
    if (wpn >= 5) {
      spawnCreep(TB("10M6A"), wormPart, new WormInfo(0));
      spawnCreep(TB("10M6A"), wormPart, new WormInfo(1));
      spawnCreep(TB("10M6A"), wormPart, new WormInfo(2));
      spawnCreep(TB("10M6A"), wormPart, new WormInfo(3));
      spawnCreep(TB("10M6A"), wormPart, new WormInfo(4));
    }
    if (wpn >= 6) {
      spawnCreep(TB("10M6A"), wormPart, new WormInfo(5));
    }
    if (wpn >= 7) {
      spawnCreep(TB("10M6A"), wormPart, new WormInfo(6));
    }
    if (wpn >= 8) {
      spawnCreep(TB("10M6A"), wormPart, new WormInfo(7));
    }
  }
  addStrategyTick();
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
  const finalSnakePart = findWormPart(wormPartNum - 1);
  if (finalSnakePart)
    return (
      tick >= assembleTick + 30 ||
      (finalSnakePart !== undefined &&
        atPos(finalSnakePart, assemblePoint(wormIndex(finalSnakePart))))
    );
  else return false;
}
