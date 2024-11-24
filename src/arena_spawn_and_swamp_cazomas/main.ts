import {
  Dooms,
  getGuessPlayer,
  identifyOpponent,
  Kerob,
  startWaitTick,
  Tigga,
} from "./gameObjects/player";
import { loopEnd, loopStart } from "./loop";
import { set_harvesterNotFleeAtStart } from "./roles/harvester";
import { spawnStartHarvester } from "./strategies/strategyTool";
import { useTailStrategy } from "./strategies/tailStrategy";
import { useWormHeaderStrategy } from "./strategies/wormHeaderStrategy";
import { useWormRush } from "./strategies/wormRush";
import { useWormRush_dooms } from "./strategies/wormRush_dooms";
import { ct, pt } from "./utils/CPU";
import { tick } from "./utils/game";

/**the loop function*/
export function loop(): void {
  console.log("loop start !!");
  //loop start
  const st0 = ct();
  loopStart();
  pt("loopStart", st0);
  //identify opponent
  const st1 = ct();
  identifyOpponent();
  pt("identifyOpponent", st1);
  //main strategy
  const lockMode = false;
  if (tick <= startWaitTick) {
    spawnStartHarvester(1, true);
  } else if (lockMode) {
  } else {
    const st = ct();
    const gp = getGuessPlayer();
    if (gp === Tigga) {
      // useTurtleStrategy();
      set_harvesterNotFleeAtStart(true);
      // useWormRush(7);
      useTailStrategy();
      // useTurtleStrategy();
      // useWormHeaderStrategy(1);
    } else if (gp === Kerob) {
      set_harvesterNotFleeAtStart(true);
      useWormHeaderStrategy();
    } else if (gp === Dooms) {
      set_harvesterNotFleeAtStart(true);
      useWormRush_dooms();
      // useTurtleStrategy();
    } else {
      useWormRush(7);
    }
    pt("mainStrategy", st);
  }
  //loop end
  loopEnd();
}
