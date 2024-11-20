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
        ifRanged = g === 0;
      } else {
        ifRanged = false;
      }
      if (ifRanged) {
        //RANGED
        if (getGuessPlayer() === Tigga) {
          //600+320+50
          spawnCreep(TB("5R2AM"), tailMelee);
          spawnCreep(TB("5M2HM"), tailHealer);
          const tailLen2 = def_rangedTailNum;
          for (let i = 0; i < tailLen2; i++) {
            spawnCreep(TB("2M"), tailer);
          }
        } else {
          // //DOOMS
          // spawnCreep(TB("4R4AM"), tailMelee);
          // spawnCreep(TB("5MHM"), tailHealer);
          // const tailLen = 8;
          // for (let i = 0; i < tailLen; i++) {
          //   spawnCreep(TB("M"), tailer);
          // }
          // const tailLen2 = 4;
          // for (let i = 0; i < tailLen2; i++) {
          //   spawnCreep(TB("2M"), tailer);
          // }
        }
      } else {
        //MELEE
        if (getGuessPlayer() === Tigga) {
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
            spawnCreep(TB("2M"), tailer);
          }
        } else {
          // //DOOMS
          // if (g === 0) spawnCreep(TB("3MR8AM"), tailMelee);
          // else spawnCreep(TB("3M10AM"), tailMelee);
          // if (g === 0) spawnCreep(TB("4M3HM"), tailHealer);
          // else spawnCreep(TB("4M2HM"), tailHealer);
          // const tailLen = g === 0 ? 7 : 5;
          // for (let i = 0; i < tailLen; i++) {
          //   spawnCreep(TB("2M"), tailer);
          // }
          // spawnCreep(TB("3M"), tailer);
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
