import { StructureExtension } from "game/prototypes";
import { enemyAWeight, set_spawnDps } from "../gameObjects/CreTool";
import { createCS } from "../gameObjects/CS";
import { mySpawn } from "../gameObjects/GameObjectInitialize";
import { spawnCreep } from "../gameObjects/spawn";
import { jamer } from "../roles/jamer";
import {
  wormHeader,
  wormHeaderHealer,
  wormHeaderTail,
} from "../roles/wormHeader";
import { TB } from "../utils/autoBodys";
import { addStrategyTick, strategyTick } from "../utils/game";
import { Pos_C } from "../utils/Pos";
import { useStandardTurtling } from "./stdTurtlingTool";

export function useWormHeaderStrategy(turtleStrength: number = 1) {
  set_spawnDps(10);
  useStandardTurtling(strategyTick, turtleStrength);
  createCS(new Pos_C(mySpawn.x, mySpawn.y + 2), StructureExtension, 11);
  // createCS(new Pos_C(mySpawn.x + 1, mySpawn.y + 2), StructureExtension, 11);
  if (strategyTick === 0) {
    for (let i = 0; i < 4; i++) {
      spawnCreep(TB("M"), jamer);
    }
    const ea = enemyAWeight();
    // if(ea>0.6){
    //100+600+320+50
    spawnCreep(TB("2M4R4AM"), wormHeader);
    // }else{
    // spawnCreep(TB("5M10AM"), wormHeader);
    // }
    spawnCreep(TB("M4HM"), wormHeaderHealer);
    // spawnCreep(TB("3M10AM"), wormHeader);
    // spawnCreep(TB("4M3HM"), wormHeaderHealer);
    //ftg=10+3=13
    //move=4+5+60=69
    for (let i = 0; i < 4; i++) {
      spawnCreep(TB("M"), jamer);
    }
    spawnCreep(TB("21M"), wormHeaderTail);
    spawnCreep(TB("21M"), wormHeaderTail);
    spawnCreep(TB("21M"), wormHeaderTail);
    // spawnCreep(TB("20M"), wormHeaderTail);
    // spawnCreep(TB("20M"), wormHeaderTail);
    // spawnCreep(TB("20M"), wormHeaderTail);
    for (let i = 0; i < 14; i++) {
      spawnCreep(TB("M"), jamer);
    }
  }
  addStrategyTick();
}
