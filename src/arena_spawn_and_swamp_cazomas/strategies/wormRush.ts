import { oppoSpawns } from "arena_spawn_and_swamp_cazomas/gameObjects/GameObjectInitialize";
import { set_spawnDps } from "../gameObjects/CreTool";
import { spawnCreep } from "../gameObjects/spawn";
import { jamer } from "../roles/jamer";
import {
  assembleTick,
  set_wormPartNum,
  wormGo,
  WormInfo,
  wormPart,
} from "../roles/wormPart_rush";
import { TB } from "../utils/autoBodys";
import { addStrategyTick, strategyTick, tick } from "../utils/game";
import { useStandardTurtling } from "./stdTurtlingTool";
import { supplyToughDefender } from "./strategyTool";

export function useWormRush(
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
      spawnCreep(TB("3MR8AM"), wormPart, new WormInfo(0));
      //350+320+250+50
      spawnCreep(TB("7M4AHM"), wormPart, new WormInfo(1));
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
