import { mySpawn } from "arena_spawn_and_swamp_cazomas/gameObjects/GameObjectInitialize";
import { getTicks } from "game/utils";
import { spawnCleared, spawnCreep } from "../gameObjects/spawn";
import { jamer } from "../roles/jamer";

import { getGuessPlayer, Tigga } from "../gameObjects/player";
import { extStealer, initSpawnWallCostMatrix } from "../roles/extStealer";
import { set_energyStealMode } from "../roles/harvester";
import { tailer } from "../roles/tailer";
import { toughDefender } from "../roles/toughDefender";
import {
  def_meleeTailNum,
  def_rangedTailNum,
  tailHealer,
  tailMelee,
} from "../roles/wormTailer";
import { TB } from "../utils/autoBodys";
export function useTailStrategy() {
  set_energyStealMode(true);
  initSpawnWallCostMatrix();
  if (getTicks() === 50) {
    const jamerNum = 6;
    for (let i = 0; i < jamerNum; i++) {
      spawnCreep(TB("M"), jamer);
    }
    for (let g = 0; g < 3; g++) {
      let ifRanged = false;
      if (getGuessPlayer() === Tigga) {
        ifRanged = g <= 1;
      } else {
        ifRanged = false;
      }
      if (ifRanged) {
        //RANGED
        //600+320+50
        spawnCreep(TB("5R2AM"), tailMelee);
        spawnCreep(TB("5M2HM"), tailHealer);
        spawnCreep(TB("4M"), tailer);
        const tailLen2 = def_rangedTailNum - 1;
        for (let i = 0; i < tailLen2; i++) {
          spawnCreep(TB("2M"), tailer);
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
        spawnCreep(TB("4M"), tailer);
        const tailLen2 = def_meleeTailNum - 1;
        for (let i = 0; i < tailLen2; i++) {
          spawnCreep(TB("2M"), tailer);
        }
      }
    }
    //700
    if (getGuessPlayer() === Tigga) {
      // spawnCreep(TB("3MA"), extStealer);
      //150+240+50
      spawnCreep(TB("5TAM"), toughDefender);
    } else {
      //150+240+50
      spawnCreep(TB("15T4AM"), toughDefender);
    }
  }
  if (getTicks() > 50) {
    if (spawnCleared(mySpawn)) {
      spawnCreep(TB("3MA"), extStealer);
    }
  }
}
