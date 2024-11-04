import { CostMatrix } from "game/path-finder";

import { Role } from "../gameObjects/Cre";
import { Cre_battle } from "../gameObjects/Cre_battle";
import { enemies, friends } from "../gameObjects/GameObjectInitialize";
import { getGuessPlayer, Tigga } from "../gameObjects/player";
import { spawn } from "../gameObjects/spawn";
import { closest, leftVector } from "../utils/game";
import {
  absRange,
  getRangePoss,
  GR,
  posPlusVec,
  Vec,
  VecMultiplyConst,
  vecPlusVec,
} from "../utils/Pos";
import { SA } from "../utils/visual";

/**a defender with tough on the body part instead of building rampart around
 * the base
 */
export const toughDefender: Role = new Role("toughDefender", toughDefenderJob);
export function toughDefenderJob(cre: Cre_battle) {
  cre.fight();
  const cm = new CostMatrix();
  if (getGuessPlayer() === Tigga) {
    SA(cre, "TIGGA");
    if (cre.upgrade.index === undefined) {
      cre.upgrade.index = friends.filter(i => i.role === toughDefender).length;
    }
    SA(cre, cre.upgrade.index);
    const leftVec = leftVector();
    const ind = cre.upgrade.index;
    const upVec = new Vec(0, 1);
    if (ind === 1) {
      SA(cre, "1");
      const stop_pos = posPlusVec(spawn, vecPlusVec(leftVec, upVec));
      cre.MTJ(stop_pos);
    } else if (ind === 2) {
      SA(cre, "2");
      const stop_pos = posPlusVec(
        spawn,
        vecPlusVec(upVec, VecMultiplyConst(leftVec, 2))
      );
      cre.MTJ(stop_pos);
    } else if (ind === 3) {
      SA(cre, "3");
      const stop_pos = posPlusVec(spawn, leftVec);
      cre.MTJ(stop_pos);
    } else if (ind === 4) {
      SA(cre, "4");
      const stop_pos = posPlusVec(spawn, VecMultiplyConst(leftVec, 2));
      cre.MTJ(stop_pos);
    } else {
      SA(cre, "XX");
    }
  } else {
    const rps = getRangePoss(spawn, 2);
    for (let pos of rps) {
      if (absRange(pos, spawn) === 1) {
        cm.set(pos.x, pos.y, 1);
      } else if (GR(pos, spawn) === 1) {
        cm.set(pos.x, pos.y, 5);
      } else {
        cm.set(pos.x, pos.y, 255);
      }
    }
    const en = closest(spawn, enemies);
    if (en) {
      //if not at spawn dont chase
      if (GR(en, cre) > 1 || GR(en, spawn) === 1) {
        cre.MTJ(en, [cre], 1, cm);
      }
    }
  }
}
