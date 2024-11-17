import { mySpawn } from "arena_spawn_and_swamp_cazomas/gameObjects/GameObjectInitialize";
import { getTicks } from "game/utils";
import { spawnCleared, spawnCreep } from "../gameObjects/spawn";
import { jamer } from "../roles/jamer";

import { getGuessPlayer, Kerob, Tigga } from "../gameObjects/player";
import { drawFatigue } from "../gameObjects/visual_Cre";
import { extStealer, initSpawnWallCostMatrix } from "../roles/extStealer";
import { set_energyStealMode } from "../roles/harvester";
import { tailer } from "../roles/tailer";
import { toughDefender } from "../roles/toughDefender";
import { tailHealer, tailMelee } from "../roles/wormTailer";
import { TB } from "../utils/autoBodys";

export function useTailStrategy() {
  set_energyStealMode(true);
  initSpawnWallCostMatrix();
  drawFatigue();
  if (getTicks() === 50) {
    const jamerNum = getGuessPlayer() === Tigga ? 7 : 4;
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
          spawnCreep(TB("5R2AM"), tailMelee, new TailInfo(g, 0));
          spawnCreep(TB("5M2HM"), tailHealer, new TailInfo(g, 1));
          const tailLen = 2;
          for (let i = 0; i < tailLen; i++) {
            spawnCreep(TB("M"), tailer, new TailInfo(g, 2 + i));
          }
          const tailLen2 = 8;
          for (let i = 0; i < tailLen2; i++) {
            spawnCreep(TB("2M"), tailer, new TailInfo(g, 2 + tailLen + i));
          }
        } else {
          //DOOMS
          spawnCreep(TB("4R4AM"), tailMelee, new TailInfo(g, 0));
          spawnCreep(TB("5MHM"), tailHealer, new TailInfo(g, 1));
          const tailLen = 8;
          for (let i = 0; i < tailLen; i++) {
            spawnCreep(TB("M"), tailer, new TailInfo(g, 2 + i));
          }
          const tailLen2 = 4;
          for (let i = 0; i < tailLen2; i++) {
            spawnCreep(TB("2M"), tailer, new TailInfo(g, 2 + tailLen + i));
          }
        }
      } else {
        //MELEE
        if (getGuessPlayer() === Tigga) {
          if (g === 0) spawnCreep(TB("3MR8AM"), tailMelee, new TailInfo(g, 0));
          else spawnCreep(TB("3M10AM"), tailMelee, new TailInfo(g, 0));
          spawnCreep(TB("4M3HM"), tailHealer, new TailInfo(g, 1));
          const tailLen = 3;
          for (let i = 0; i < tailLen; i++) {
            spawnCreep(TB("M"), tailer, new TailInfo(g, 2 + i));
          }
          const tailLen2 = 4;
          for (let i = 0; i < tailLen2; i++) {
            spawnCreep(TB("2M"), tailer, new TailInfo(g, 2 + tailLen + i));
          }
        } else {
          //DOOMS
          if (g === 0) spawnCreep(TB("3MR8AM"), tailMelee, new TailInfo(g, 0));
          else spawnCreep(TB("3M10AM"), tailMelee, new TailInfo(g, 0));
          if (g === 0) spawnCreep(TB("4M3HM"), tailHealer, new TailInfo(g, 1));
          else spawnCreep(TB("4M2HM"), tailHealer, new TailInfo(g, 1));
          const tailLen = g === 0 ? 7 : 5;
          for (let i = 0; i < tailLen; i++) {
            spawnCreep(TB("2M"), tailer, new TailInfo(g, 2 + i));
          }
          spawnCreep(TB("3M"), tailer, new TailInfo(g, 2 + tailLen));
        }
      }
    }
    //700
    //250+400+50
    if (getGuessPlayer() === Kerob) {
      spawnCreep(TB("10TRM"), toughDefender);
    } else if (getGuessPlayer() === Tigga) {
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
