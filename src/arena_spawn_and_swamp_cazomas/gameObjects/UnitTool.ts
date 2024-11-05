import { CARRY, RESOURCE_ENERGY } from "game/constants";
import { CostMatrix } from "game/path-finder";
import { Resource } from "game/prototypes";
import { inResourceArea, isTerrainWall } from "../utils/game";
import { getRangePoss, GR, Pos } from "../utils/Pos";
import { SA } from "../utils/visual";
import { Cre } from "./Cre";
import { GameObj } from "./GameObj";
import { BlockGO, containers, GO, HasStore } from "./GameObjectInitialize";
import { findGO, overallMap } from "./overallMap";
import { enemySpawn, spawn } from "./spawn";
import { Con, Ext, Ram, Res, Roa, Spa, Stru, Tow } from "./Stru";

export type CanBeAttacked = Stru | Cre;
export function getEnergy(a: GameObj): number {
  if (a instanceof Res) {
    return a.master.amount;
  } else if (a instanceof Cre && a.getBodyPartsNum(CARRY) > 0) {
    return a.master.store[RESOURCE_ENERGY];
  } else if (
    a instanceof Spa ||
    a instanceof Con ||
    a instanceof Ext ||
    a instanceof Tow
  ) {
    return a.master.store[RESOURCE_ENERGY];
  } else {
    return 0;
  }
}
export let moveBlockCostMatrix: CostMatrix = new CostMatrix();
export function set_moveBlockCostMatrix(c: CostMatrix) {
  moveBlockCostMatrix = c;
}
export const blockCost = 255;
/**
 * if position is blocked
 */
export function blocked(
  pos: Pos,
  avoidFriendBlock: boolean = false,
  printPos: Pos | undefined = undefined
): boolean {
  if (isTerrainWall(pos)) {
    return true;
  } else {
    if (printPos) {
      SA(printPos, "A");
    }
    const posList = overallMap[pos.x][pos.y];
    if (printPos) {
      SA(printPos, "posList=" + posList.length);
    }
    for (let go of posList) {
      if (go instanceof Cre || go instanceof Stru) {
        if (printPos) {
          SA(printPos, "isBlockGO=" + go.master);
        }
        const bgortn = isBlockGO(go, avoidFriendBlock);
        if (bgortn) {
          return true;
        }
      }
    }
    return false;
  }
}
export function isBlockGO(go: BlockGO, avoidFriendBlock: boolean = false) {
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
  return GR(con, spawn) <= 7;
}
export function isOppoBaseContainer(con: Con) {
  return GR(con, enemySpawn) <= 7;
}
export function getSpawnAroundFreeContainers() {
  return containers.filter(i => GR(i, spawn) <= 1 && getFreeEnergy(i) > 0);
}
export function getSpawnAroundLiveContainers() {
  return containers.filter(i => GR(i, spawn) <= 1 && getEnergy(i) > 0);
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
export function aroundBlock(pos: Pos) {
  //if has no empty around
  return getRangePoss(pos, 1).find(i => !blocked(i)) === undefined;
}
