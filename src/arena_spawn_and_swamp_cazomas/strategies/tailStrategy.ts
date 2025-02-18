import { mySpawn } from "arena_spawn_and_swamp_cazomas/gameObjects/GameObjectInitialize";
import { spawnCleared, spawnCreep } from "../gameObjects/spawn";
import { jamer } from "../roles/jamer";

import { getGuessPlayer, Tigga } from "../gameObjects/player";
import { extStealer, initSpawnWallCostMatrix } from "../roles/extStealer";
import { tailer } from "../roles/tailer";
import { toughDefender } from "../roles/toughDefender";
import {
  def_meleeTailNum,
  def_rangedTailNum,
  tailHealer,
  tailMelee,
} from "../roles/wormTailer";
import { TB } from "../utils/autoBodys";
import { addStrategyTick, strategyTick } from "../utils/game";
import { useStandardTurtling } from "./stdTurtlingTool";
export function useTailStrategy(useDefense: boolean = false) {
  const st = strategyTick;
  // set_energyStealMode(true);
  initSpawnWallCostMatrix();
  if (st >= 0) {
    if (useDefense) {
      useStandardTurtling(st, 1);
    }
  }
  if (st === 1) {
    const jamerNum = 6;
    for (let i = 0; i < jamerNum; i++) {
      spawnCreep(TB("M"), jamer);
    }
    for (let g = 0; g < 4; g++) {
      let ifRanged = false;
      // if (getGuessPlayer() === Tigga) {
      //   ifRanged = g <= 2;
      // } else {
      // ifRanged = g === 1;
      ifRanged = false;
      // ifRanged = true;
      // }
      if (ifRanged) {
        //RANGED
        //600+320+50
        spawnCreep(TB("5R2AM"), tailMelee);
        spawnCreep(TB("4M3HM"), tailHealer);
        const tailLen2 = def_rangedTailNum;
        for (let i = 0; i < tailLen2; i++) {
          spawnCreep(TB("M"), tailer);
        }
      } else {
        //MELEE
        // if (g === 0) spawnCreep(TB("3MR8AM"), tailMelee);
        // else
        spawnCreep(TB("3M10AM"), tailMelee);
        spawnCreep(TB("4M3HM"), tailHealer);
        // const tailLen = 3;
        // for (let i = 0; i < tailLen; i++) {
        //   spawnCreep(TB("M"), tailer);
        // }
        const tailLen2 = def_meleeTailNum;
        for (let i = 0; i < tailLen2; i++) {
          spawnCreep(TB("M"), tailer);
        }
      }
    }
    //700
    if (getGuessPlayer() === Tigga) {
      // spawnCreep(TB("3MA"), extStealer);
      //100+80+150+50
      spawnCreep(TB("10TARM"), toughDefender);
    } else {
      //150+240+50
      spawnCreep(TB("15T4AM"), toughDefender);
    }
  }

  if (st >= 2) {
    if (spawnCleared(mySpawn)) {
      spawnCreep(TB("3MA"), extStealer);
    }
  }
  addStrategyTick();
}
