import { Visual } from "game/visual";
import { enemySpawn, mySpawn } from "./gameObjects/GameObjectInitialize";
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
  console.log("loop start !!3");
  //loop start
  const st0 = ct();
  loopStart();
  pt("loopStart", st0);
  //identify opponent
  const st1 = ct();
  identifyOpponent();
  pt("identifyOpponent", st1);
  //main strategy
  const lockMode = true;
  // const lockMode = false;
  // const CTFMode = false;
  // const CTFMode = true;
  // if (CTFMode) {
  //   PL("CTF");
  // } else
  if (tick <= startWaitTick) {
    spawnStartHarvester();
  } else if (lockMode) {
    set_harvesterNotFleeAtStart(true);
    // useWormRush_dooms();
    // useWormRush(7, 1, 2);
    useTailStrategy(true);
    // useTurtleStrategy();
    // useWormHeaderStrategy(1);
    // useShoterStrategy();
  } else {
    const st = ct();
    const gp = getGuessPlayer();
    if (gp === Tigga) {
      // useTurtleStrategy();
      set_harvesterNotFleeAtStart(true);
      // useWormRush(7);
      useTailStrategy();
      // useRamStealStrategy();
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
      set_harvesterNotFleeAtStart(true);
      useWormRush(7, 1, 2);
      // useTailStrategy(true);
      // useTurtleStrategy();
      // useWormHeaderStrategy(1);
      // useShoterStrategy();
    }
    pt("mainStrategy", st);
  }
  new Visual().line(mySpawn.master, enemySpawn.master);
  //loop end
  loopEnd();
}
