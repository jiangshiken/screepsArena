import { ATTACK, RANGED_ATTACK } from "game/constants";
import { CostMatrix } from "game/path-finder";
import { Event } from "../utils/Event";
import { relu, sum } from "../utils/JS";
import { Adj, getRangePoss, GR, Pos } from "../utils/Pos";
import { SA } from "../utils/visual";
import { enemies, friends, myRamparts, spawn } from "./GameObjectInitialize";
import { findGO } from "./overallMap";
import { OwnedStru, Ram } from "./Stru";
import { blocked } from "./UnitTool";

export function myRampartAt(pos: Pos): Ram | undefined {
  return <OwnedStru | undefined>findGO(pos, Ram);
}
export function myRoundRamparts(cre: Pos, range: number): OwnedStru[] {
  return myRamparts.filter(i => GR(i, cre) <= range);
}
export const rampartHealthBias0: number = 1000;
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
  return !inMyRampart(spawn);
}
export function baseLoseRampartAround(): boolean {
  const roundPos = getRangePoss(spawn, 1);
  return roundPos.find(i => !inMyRampart(i)) !== undefined;
}
export function inMyHealthyRampart(pos: Pos) {
  const ram = <Ram | undefined>findGO(pos, Ram);
  return ram && ram.my && rampartIsHealthy(ram);
}
export let ramSaveCostMatrix_Event: Event = new Event();
export let ramSaveCostMatrix: CostMatrix | undefined;

export function refreshRampartSaveCostMatrix(pos: Pos, range: number) {
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
    if (!ramSaveCostMatrix) {
      ramSaveCostMatrix = new CostMatrix();
    }
    ramSaveCostMatrix.set(pos.x, pos.y, cost);
  }
  ramSaveCostMatrix_Event = new Event();
}
export function getMyHealthyRamparts(): OwnedStru[] {
  return myRamparts.filter(i => rampartIsHealthy(i));
}
export function getMyHealthyRamparts_around(cre: Pos): OwnedStru[] {
  return getMyHealthyRamparts().filter(i => Adj(i, cre));
}
