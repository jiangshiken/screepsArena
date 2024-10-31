import { CARRY, RESOURCE_ENERGY } from "game/constants";
import {
  Resource,
  StructureContainer,
  StructureExtension,
  StructureSpawn,
  StructureTower,
} from "game/prototypes";
import { inResourceArea, isTerrainWall } from "../utils/game";
import { GR, Pos } from "../utils/Pos";
import { Cre } from "./Cre";
import { containers, GO, HasStore } from "./GameObjectInitialize";
import { findGO, overallMap } from "./overallMap";
import { enemySpawn, spawn } from "./spawn";
import { Con, Ram, Roa, Stru } from "./Stru";

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
      if (go instanceof Cre || go instanceof Stru) {
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
  } else if (go instanceof Ram && go.my) {
    return false;
  } else if (go instanceof Con || go instanceof Roa) {
    return false;
  } else {
    return true;
  }
}
export function energylive(go: GO) {
  return getEnergy(go) > 0;
}
export function getEmptyCapacity(cre: HasStore): number {
  return getFreeEnergy(cre);
}
export function getCapacity(cre: HasStore): number {
  const rtn = cre.master.store.getCapacity(RESOURCE_ENERGY);
  return rtn ? rtn : 0;
}
export function getFreeEnergy(cre: HasStore): number {
  const rtn = cre.master.store.getFreeCapacity(RESOURCE_ENERGY);
  return rtn ? rtn : 0;
}
export function getWildCons(): Con[] {
  return containers.filter(i => inResourceArea(i));
}
export function inRampart(pos: Pos): boolean {
  return findGO(pos, Ram) !== undefined;
}
export function inOppoRampart(pos: Pos): boolean {
  const ram = <Ram | undefined>findGO(pos, Ram);
  return ram !== undefined && ram.oppo;
}
export function getMyBaseContainers() {
  return containers.filter(i => isMyBaseContainer(i));
}
export function isOutsideContainer(con: Con) {
  return inResourceArea(con);
}
export function isMyBaseContainer(con: Con) {
  return con instanceof StructureContainer && GR(con, spawn) <= 7;
}
export function isOppoBaseContainer(con: Con) {
  return con instanceof StructureContainer && GR(con, enemySpawn) <= 7;
}
export function getTowerDamage(range: number) {
  if (range <= 5) {
    return 150;
  } else if (range >= 20) {
    return 35;
  } else {
    return ((35 - 150) / (20 - 5)) * (range - 5) + 150;
  }
}
export function getTowerHealAmount(range: number) {
  if (range <= 5) {
    return 100;
  } else if (range >= 20) {
    return 25;
  } else {
    return ((25 - 100) / (20 - 5)) * (range - 5) + 100;
  }
}
export function getOutsideContainers() {
  return containers.filter(i => isOutsideContainer(i));
}
export function hasResourceOnGround(pos: Pos, amount: number) {
  const res = <Resource | undefined>findGO(pos, Resource);
  return res && res.amount >= amount;
}
