import { ATTACK, RANGED_ATTACK, WORK } from "game/constants";

import { Cre } from "../gameObjects/Cre";
import { Cre_move } from "../gameObjects/Cre_move";
import {
  cpuBreakJudge,
  fleeWeakComplex,
  givePositionToImpartantFriend,
} from "../gameObjects/CreCommands";
import { hasThreat, Role } from "../gameObjects/CreTool";
import { CS } from "../gameObjects/CS";
import { enemies, friends, oppoCSs } from "../gameObjects/GameObjectInitialize";
import { moveAndBePulled } from "../gameObjects/pull";
import { enemySpawn, inEnBaseRan } from "../gameObjects/spawn";
import { blocked, inOppoRampart } from "../gameObjects/UnitTool";
import { best, divideReduce } from "../utils/JS";
import {
  Adj,
  atPos,
  COO,
  GR,
  InShotRan,
  midPoint,
  Y_axisDistance,
} from "../utils/Pos";
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
      const jamers = friends.filter(i => i.role === jamer);
      givePositionToImpartantFriend(cre);
      const enemyCSsHasEnemyBuilderAround = oppoCSs.filter(
        i =>
          enemies.find(j => j.getBodyPartsNum(WORK) > 0 && GR(i, j) <= 3) !==
            undefined && !(blocked(i) && !atPos(i, cre))
      );
      const enBuilders = enemies.filter(
        i =>
          i.getBodyPartsNum(WORK) > 0 &&
          !(inEnBaseRan(i) && Y_axisDistance(i, enemySpawn) <= 7)
      );
      const targets = (<(Cre | CS)[]>enBuilders).concat(
        enemyCSsHasEnemyBuilderAround
      );
      const target = best(targets, tar => {
        const typeBonus = tar instanceof CS ? 2 : 1;
        const progressRateBonus = tar instanceof CS ? tar.progressRate : 1;
        const dis = GR(cre, tar);
        const disReduce = divideReduce(dis, 10);
        const selfBonus = cre.upgrade.target === tar ? 1.5 : 1;
        const friTargetNum = jamers.filter(
          i => i.upgrade.target === tar
        ).length;
        const splitReduce = divideReduce(friTargetNum, 1);
        return (
          typeBonus * progressRateBonus * disReduce * selfBonus * splitReduce
        );
      });
      SA(cre, "target=" + COO(target));
      if (target) {
        cre.MTJ(target);
        cre.upgrade.target = target;
      } else {
        cre.MTJ(midPoint);
      }
    }
  }
}
