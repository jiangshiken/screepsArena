import { CostMatrix } from "game/path-finder";

import { spawn } from "arena_spawn_and_swamp_cazomas/gameObjects/GameObjectInitialize";
import { closest } from "arena_spawn_and_swamp_cazomas/utils/Pos";
import { Cre_battle } from "../gameObjects/Cre_battle";
import { Role } from "../gameObjects/CreTool";
import { enemies } from "../gameObjects/GameObjectInitialize";
import { blockCost } from "../gameObjects/UnitTool";
import { absRange, getRangePoss, GR } from "../utils/Pos";

/**a defender with tough on the body part instead of building rampart around
 * the base
 */
export const toughDefender: Role = new Role("toughDefender", toughDefenderJob);
export function toughDefenderJob(cre: Cre_battle) {
  cre.fight();
  const cm = new CostMatrix();
  const rps = getRangePoss(spawn, 2);
  for (let pos of rps) {
    if (absRange(pos, spawn) === 1) {
      cm.set(pos.x, pos.y, 1);
    } else if (GR(pos, spawn) === 1) {
      cm.set(pos.x, pos.y, 5);
    } else {
      cm.set(pos.x, pos.y, blockCost);
    }
  }
  const en = closest(spawn, enemies);
  if (en) {
    //if not at spawn dont chase
    if (GR(en, cre) > 1 || GR(en, spawn) === 1) {
      cre.MT(en, 1, cm);
    }
  }
}
