import { CARRY, RESOURCE_ENERGY } from "game/constants";
import {
  Resource,
  Structure,
  StructureContainer,
  StructureExtension,
  StructureRampart,
  StructureRoad,
  StructureSpawn,
  StructureTower,
} from "game/prototypes";
import { isTerrainWall } from "../utils/game";
import { Pos } from "../utils/Pos";
import { Cre } from "./Cre";
import { GO, HasEnergy, HasStore } from "./GameObjectInitialize";
import { overallMap } from "./overallMap";
import { Stru } from "./Stru";

export function getEnergy(a: GO): number {
  if (a instanceof Resource) {
    return a.amount;
  } else if (a instanceof Cre && a.getBodyPartsNum(CARRY) > 0) {
    return a.master.store[RESOURCE_ENERGY];
  } else if (
    a.master instanceof StructureSpawn ||
    a.master instanceof StructureContainer ||
    a.master instanceof StructureExtension ||
    a.master instanceof StructureTower
  ) {
    return a.master.store[RESOURCE_ENERGY];
  } else {
    return 0;
  }
}
/**
 * if position is blocked
 */
export function blocked(pos: Pos, avoidFriendBlock: boolean = false): boolean {
  if (isTerrainWall(pos)) {
    return true;
  } else {
    const posList = overallMap[pos.x][pos.y];
    for (let go of posList) {
      if (go instanceof Cre || go instanceof Structure) {
        isBlockGO(go, avoidFriendBlock);
      }
    }
    return false;
  }
}
export function isBlockGO(go: Cre | Stru, avoidFriendBlock: boolean = false) {
  if (go instanceof Cre) {
    if (avoidFriendBlock && go.my) {
      return false;
    } else {
      return true;
    }
  } else if (go.master instanceof StructureRampart && go.my) {
    return false;
  } else if (
    go.master instanceof StructureContainer ||
    go.master instanceof StructureRoad
  ) {
    return false;
  } else {
    return true;
  }
}
export function energylive(go: HasEnergy) {
  return getEnergy(go) > 0;
}
export function getEmptyCapacity(cre: HasStore): number {
  return getFreeEnergy(cre);
}
export function getCapacity(cre: HasStore): number {
  let rtn = cre.store.getCapacity(RESOURCE_ENERGY);
  return rtn ? rtn : 0;
}
export function getFreeEnergy(cre: HasStore): number {
  const rtn = cre.store.getFreeCapacity(RESOURCE_ENERGY);
  return rtn ? rtn : 0;
}
