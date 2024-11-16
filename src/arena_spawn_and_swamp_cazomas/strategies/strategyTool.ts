import { CARRY, MOVE } from "game/constants";

import { mySpawn } from "arena_spawn_and_swamp_cazomas/gameObjects/GameObjectInitialize";
import {
  enemyAWeight,
  getEnemyThreats,
  hasThreat,
} from "../gameObjects/CreTool";
import { enemies, friends } from "../gameObjects/GameObjectInitialize";
import {
  getBodiesCost,
  inMyBaseRan,
  spawnAndExtensionsEnergy,
  spawnCleared,
  spawnCreep,
  spawnCreep_ifHasEnergy,
} from "../gameObjects/spawn";
import { harvester } from "../roles/harvester";
import { toughDefender } from "../roles/toughDefender";
import { TB } from "../utils/autoBodys";
import { leftRate, leftVector, tick } from "../utils/game";
import { sum } from "../utils/JS";
import {
  closest,
  GR,
  Pos,
  posPlusVec,
  Vec,
  VecMultiplyConst,
  vecPlusVec,
} from "../utils/Pos";
import { displayPos, SA, SAN } from "../utils/visual";
/**spawn the start harvester of every strategy*/
export function spawnStartHarvester(
  needCarryNum: number,
  is2C2M: boolean = false
) {
  SA(displayPos(), "spawnCleared(spawn)" + spawnCleared(mySpawn));
  if (tick <= 300 && spawnCleared(mySpawn)) {
    const tarHarvesters = friends.filter(
      i => i.role === harvester && i.getHealthyBodyPartsNum(MOVE) > 0
    );
    SA(displayPos(), "tarHarvesters.length" + tarHarvesters.length);
    const carryNum = sum(tarHarvesters, i => i.getHealthyBodyPartsNum(CARRY));
    SA(displayPos(), "spawnStartHarvester carryNum=" + carryNum);
    if (carryNum < needCarryNum) {
      SA(displayPos(), "supply harvester");
      if (is2C2M) {
        spawnCreep(TB("m2cm"), harvester); //
      } else {
        spawnCreep(TB("cm"), harvester); //
      }
    }
  }
}
/** set startGate by enemy num*/
export function getStartGateAvoidFromEnemies(avoid: boolean = true): boolean {
  const spawnY = mySpawn.y;
  const upEnemies = enemies.filter(i => i.y < spawnY && hasThreat(i));
  const downEnemies = enemies.filter(i => i.y > spawnY && hasThreat(i));
  const upNum = upEnemies.length;
  const downNum = downEnemies.length;
  return avoid ? upNum < downNum : upNum > downNum;
}
/**the assemblePoint of worm part after spawn.
 * ind is from 0 to 9
 */
export function assemblePoint(ind: number): Pos {
  const leftOrRight = VecMultiplyConst(leftVector(), -3);
  let vecCre: Vec;
  const lr = leftRate();
  if (ind == 0) vecCre = new Vec(1 * lr, 0);
  else if (ind == 1) vecCre = new Vec(0 * lr, 0);
  else if (ind == 2) vecCre = new Vec(-1 * lr, 0);
  else if (ind == 3) vecCre = new Vec(-2 * lr, 0);
  else if (ind == 4) vecCre = new Vec(-2 * lr, 1);
  else if (ind == 5) vecCre = new Vec(-1 * lr, 1);
  else if (ind == 6) vecCre = new Vec(0 * lr, 1);
  else if (ind == 7) vecCre = new Vec(1 * lr, 1);
  else if (ind == 8) vecCre = new Vec(2 * lr, 1);
  else vecCre = new Vec(-3, 1);
  return posPlusVec(mySpawn, vecPlusVec(vecCre, leftOrRight));
}
export function supplyToughDefender(
  defenderNum: number = 1,
  useEmergentSpawn: boolean = true
) {
  //first defender
  SA(displayPos(), "supplyToughDefender");
  if (
    spawnCleared(mySpawn) &&
    friends.filter(i => i.role === toughDefender).length < defenderNum
  ) {
    SA(displayPos(), "spawn defender");
    const spEns = getEnemyThreats().filter(i => inMyBaseRan(i));
    const spEn = closest(mySpawn, spEns);
    const aRate = enemyAWeight();
    if (spEn) {
      const range = GR(spEn, mySpawn);
      const myEnergy = spawnAndExtensionsEnergy(mySpawn);
      let restPart;
      if (aRate > 0.6) {
        //100+320
        restPart = TB("M4A");
      } else if (aRate > 0.2) {
        //100+160+150
        restPart = TB("M2AR");
      } else {
        //100+300
        restPart = TB("M2R");
      }
      const restCost = getBodiesCost(restPart);
      const TNum_beforeRange = Math.min(
        Math.floor((myEnergy - restCost) / 10),
        20
      );
      const TNumLimit = useEmergentSpawn ? Math.floor(range / 3 + 6) : Infinity;
      const TNum = Math.min(TNumLimit, TNum_beforeRange);
      SAN(displayPos(), "TNum", TNum);
      if (TNum >= 0) {
        SA(displayPos(), "spawn the tough defender");
        spawnCreep_ifHasEnergy(TB(TNum + "T").concat(restPart), toughDefender);
      } else {
        SA(displayPos(), "TNum error");
      }
    } else {
      if (aRate > 0.6) {
        //150+150+240=540
        spawnCreep_ifHasEnergy(TB("20TM4A"), toughDefender);
      } else if (aRate > 0.2) {
        spawnCreep_ifHasEnergy(TB("20TM2AR"), toughDefender);
      } else {
        spawnCreep_ifHasEnergy(TB("20TM2R"), toughDefender);
      }
    }
  }
}
