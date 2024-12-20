import { ATTACK, RANGED_ATTACK } from "game/constants";
import { CostMatrix } from "game/path-finder";
import { Event_ori } from "../utils/Event";
import { relu, sum } from "../utils/JS";
import { Adj, getRangePoss, GR, Pos } from "../utils/Pos";
import { SA } from "../utils/visual";
import { enemies, friends, myRamparts, mySpawn } from "./GameObjectInitialize";
import { findGO } from "./overallMap";
import { guessPlayer, Tigga } from "./player";
import { OwnedStru, Ram } from "./Stru";
import { blocked } from "./UnitTool";

export function myRampartAt(pos: Pos): Ram | undefined {
  return <OwnedStru | undefined>findGO(pos, Ram);
}
export function myRoundRamparts(cre: Pos, range: number): OwnedStru[] {
  return myRamparts.filter(i => GR(i, cre) <= range);
}
export const rampartHealthBias0: number = guessPlayer === Tigga ? 250 : 1000;
export function enemyRampartIsHealthy(ram: OwnedStru) {
  return rampartIsHealthy(ram, false);
}
export function rampartIsHealthy(
  ram: OwnedStru,
  isMy: boolean = true,
  useExtra: boolean = true,
  bias: number = 0
) {
  //has enemy around
  const around1Enemies = isMy
    ? enemies.filter(i => GR(i, ram) <= 1)
    : friends.filter(i => GR(i, ram) <= 1);
  const around3Enemies = isMy
    ? enemies.filter(i => GR(i, ram) <= 3)
    : friends.filter(i => GR(i, ram) <= 3);
  const RANum = sum(around3Enemies, i =>
    i.getHealthyBodyPartsNum(RANGED_ATTACK)
  );
  const ANum = sum(around1Enemies, i => i.getHealthyBodyPartsNum(ATTACK));
  const extraBias = 30 * ANum + 10 * RANum;
  if (useExtra) {
    return ram.hits >= rampartHealthBias0 + relu(extraBias + bias);
  } else {
    return ram.hits >= rampartHealthBias0;
  }
}
export function inMyRampart(pos: Pos): boolean {
  const ram = <Ram | undefined>findGO(pos, Ram);
  return ram !== undefined && ram.my;
}
export function baseLoseRampart(): boolean {
  return !inMyRampart(mySpawn);
}
export function baseLoseRampartAround(): boolean {
  const roundPos = getRangePoss(mySpawn, 1);
  return roundPos.find(i => !inMyRampart(i)) !== undefined;
}
export function inMyHealthyRampart(pos: Pos) {
  const ram = <Ram | undefined>findGO(pos, Ram);
  return ram && ram.my && rampartIsHealthy(ram);
}
export let ramSaveCostMatrix_Event: Event_ori = new Event_ori();
export let ramSaveCostMatrix: CostMatrix = new CostMatrix();
export function setAroundRampartSaveCostMatrix(pos: Pos, range: number) {
  SA(pos, "refreshed CM");
  const rangePoss = getRangePoss(pos, range);
  for (let pos of rangePoss) {
    let cost: number;
    if (inMyHealthyRampart(pos)) {
      if (blocked(pos)) {
        cost = 40;
      } else {
        cost = 1;
      }
    } else {
      cost = 200;
    }
    ramSaveCostMatrix.set(pos.x, pos.y, cost);
  }
  ramSaveCostMatrix_Event = new Event_ori();
}
export function getMyHealthyRamparts(): OwnedStru[] {
  return myRamparts.filter(i => rampartIsHealthy(i));
}
export function getMyHealthyRamparts_around(cre: Pos): OwnedStru[] {
  return getMyHealthyRamparts().filter(i => Adj(i, cre));
}
