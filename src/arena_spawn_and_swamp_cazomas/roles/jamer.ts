import { ATTACK, RANGED_ATTACK, WORK } from "game/constants";
import { findClosestByRange } from "game/utils";

import { hasThreat, Role } from "../gameObjects/Cre";
import { Cre_move } from "../gameObjects/Cre_move";
import {
  cpuBreakJudge,
  fleeWeakComplex,
  givePositionToImpartantFriend,
} from "../gameObjects/CreTool";
import { enemies, friends, oppoCSs } from "../gameObjects/GameObjectInitialize";
import { moveAndBePulled } from "../gameObjects/pull";
import { blocked, inOppoRampart } from "../gameObjects/UnitTool";
import { tick } from "../utils/game";
import { best, divideReduce } from "../utils/JS";
import { Adj, atPos, COO, GR, InShotRan, midPoint } from "../utils/Pos";
import { SA } from "../utils/visual";

/**used to jam the opponent's construction site*/
export const jamer: Role = new Role("jamer", jamerJob);
export function jamerJob(cre: Cre_move) {
  SA(cre, "I'm jamer " + (cre.role === jamer));
  const use_oldJamer = true;
  if (use_oldJamer) {
    jamerOldJob(cre);
    return;
  }
  const leader = friends.find(
    i => i.getBodyPartsNum(ATTACK) >= 9 || i.getBodyPartsNum(RANGED_ATTACK) >= 5
  );
  if (leader) {
    if (
      friends.filter(i => Adj(i, leader) && i.role === jamer).length >= 3 &&
      !Adj(cre, leader)
    ) {
      if (enemies.filter(i => hasThreat(i) && InShotRan(i, cre)).length > 0) {
        cre.flee(6, 12);
      } else {
        cre.stop();
      }
    } else {
      if (leader.upgrade.isPush === true) {
        cre.MTJ(leader);
      } else {
        moveAndBePulled(cre, leader);
      }
    }
  } else {
    jamerOldJob(cre);
  }
}
export function jamerOldJob(cre: Cre_move) {
  SA(cre, "I'm jamer");
  if (inOppoRampart(cre)) {
    SA(cre, "inOppoRampart");
    cre.stop();
  } else {
    let fleeing: boolean = fleeWeakComplex(cre);
    if (!fleeing) {
      if (cpuBreakJudge(cre)) {
        return;
      }
      givePositionToImpartantFriend(cre);
      const enemyCSsHasEnemyBuilderAround = oppoCSs.filter(
        i =>
          enemies.find(j => j.getBodyPartsNum(WORK) > 0 && GR(i, j) <= 3) !==
            undefined && !(blocked(i) && !atPos(i, cre))
      );
      const target = best(enemyCSsHasEnemyBuilderAround, cs => {
        const progressRate = cs.progressRate;
        const range = GR(cre, cs);
        return progressRate * divideReduce(range, 10);
      });
      SA(cre, "target=" + COO(target));
      if (target) {
        cre.MTJ(target);
      } else if (tick <= 75) {
        cre.MTJ(midPoint);
      } else {
        const enBuilders = enemies.filter(i => i.getBodyPartsNum(WORK) > 0);
        const enBuilder = findClosestByRange(cre, enBuilders);
        if (enBuilder) {
          cre.MTJ(enBuilder);
        } else {
          cre.MTJ(midPoint);
        }
      }
    }
  }
}
