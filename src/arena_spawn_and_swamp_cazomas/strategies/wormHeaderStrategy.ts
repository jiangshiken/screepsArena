import { spawnCreep } from "../gameObjects/spawn";
import { jamer } from "../roles/jamer";
import {
  wormHeader,
  wormHeaderHealer,
  wormHeaderTail,
} from "../roles/wormHeader";
import { TB } from "../utils/autoBodys";
import { addStrategyTick, strategyTick } from "../utils/game";
import { useStandardTurtling } from "./stdTurtlingTool";

export function useWormHeaderStrategy(turtleStrength: number = 1) {
  useStandardTurtling(strategyTick, turtleStrength);
  if (strategyTick === 0) {
    for (let i = 0; i < 6; i++) {
      spawnCreep(TB("M"), jamer);
    }
    spawnCreep(TB("3M10AM"), wormHeader);
    spawnCreep(TB("4M3HM"), wormHeaderHealer);
    //ftg=10+3=13
    //move=4+5+60=69
    for (let i = 0; i < 6; i++) {
      spawnCreep(TB("M"), jamer);
    }
    spawnCreep(TB("20M"), wormHeaderTail);
    spawnCreep(TB("20M"), wormHeaderTail);
    spawnCreep(TB("20M"), wormHeaderTail);
    for (let i = 0; i < 8; i++) {
      spawnCreep(TB("M"), jamer);
    }
  }
  addStrategyTick();
}
