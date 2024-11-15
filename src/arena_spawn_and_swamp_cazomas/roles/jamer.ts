import { WORK } from "game/constants";

import {
  CS,
  enemySpawn,
} from "arena_spawn_and_swamp_cazomas/gameObjects/GameObjectInitialize";
import { Cre } from "../gameObjects/Cre";
import { Cre_move } from "../gameObjects/Cre_move";
import {
  cpuBreakJudge,
  givePositionToImpartantFriend,
} from "../gameObjects/CreCommands";
import { Role } from "../gameObjects/CreTool";
import { enemies, friends, oppoCSs } from "../gameObjects/GameObjectInitialize";
import { inEnBaseRan } from "../gameObjects/spawn";
import { blocked, inOppoRampart } from "../gameObjects/UnitTool";
import { best, divideReduce } from "../utils/JS";
import {
  atPos,
  closest,
  COO,
  directionToDiagonal,
  DirectionToVec,
  getDirectionByPos,
  getReverseDirection,
  GR,
  midPoint,
  posPlusVec,
  VecMultiplyConst,
  Y_axisDistance,
} from "../utils/Pos";
import { drawText, SA, SAB } from "../utils/visual";
import { spawnWallCostMatrix } from "./extStealer";

/**used to jam the opponent's construction site*/
export const jamer: Role = new Role("jamer", jamerJob);
export function jamerJob(cre: Cre_move) {
  SA(cre, "jamer");
  SA(cre, "JO");
  if (inOppoRampart(cre)) {
    SA(cre, "inOppoRampart");
    cre.stop();
  } else {
    const fleeCM = spawnWallCostMatrix.clone();
    const myJamers = friends.filter(
      i => i !== cre && i.role === jamer && GR(i, cre) <= 5
    );
    const closestJamer = closest(cre, myJamers);
    if (closestJamer) {
      const dir = getDirectionByPos(cre, closestJamer);
      const diagonalDir = directionToDiagonal(dir);
      const chooseDir = getReverseDirection(diagonalDir);
      const setLen = 6;
      const vec = DirectionToVec(chooseDir);
      for (let i = 0; i < setLen; i++) {
        const tarVec = VecMultiplyConst(vec, i + 1);
        const tarPos = posPlusVec(cre, tarVec);
        fleeCM.set(tarPos.x, tarPos.y, 1);
        drawText(tarPos, "E", 1);
      }
    }
    const fleeing: boolean = cre.flee(6, 12, fleeCM, 2, 2);
    SAB(cre, "FL", fleeing);
    if (fleeing) {
      cre.stop();
    } else {
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
        cre.MT(target, [cre], 5, undefined, 1, 1.5);
        cre.upgrade.target = target;
      } else {
        cre.MT(midPoint);
      }
    }
  }
}
//   const use_oldJamer = true;
//   if (use_oldJamer) {
//     jamerOldJob(cre);
//     return;
//   }
//   const leader = friends.find(
//     i => i.getBodyPartsNum(ATTACK) >= 9 || i.getBodyPartsNum(RANGED_ATTACK) >= 5
//   );
//   if (leader) {
//     if (
//       friends.filter(i => Adj(i, leader) && i.role === jamer).length >= 3 &&
//       !Adj(cre, leader)
//     ) {
//       if (enemies.filter(i => hasThreat(i) && InShotRan(i, cre)).length > 0) {
//         cre.flee(6, 12);
//       } else {
//         cre.stop();
//       }
//     } else {
//       if (leader.upgrade.isPush === true) {
//         cre.MT(leader);
//       } else {
//         moveAndBePulled(cre, leader);
//       }
//     }
//   } else {
//     jamerOldJob(cre);
//   }
// }
// export function jamerOldJob(cre: Cre_move) {

// } /**flee from every threated enemy*/
export function fleeWeakComplex(cre: Cre_move) {
  if (cre.flee(6, 12, spawnWallCostMatrix, 1, 1)) {
    SA(cre, "flee");
    return true;
  } else if (cre.flee(8, 16, spawnWallCostMatrix, 1, 1)) {
    SA(cre, "flee2");
    return true;
  } else {
    return false;
  }
}
