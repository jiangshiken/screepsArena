import { CARRY, RESOURCE_ENERGY } from "game/constants";
import { CostMatrix } from "game/path-finder";
import { Resource } from "game/prototypes";
import { inResourceArea, isTerrainWall } from "../utils/game";
import { Adj, getRangePoss, GR, Pos } from "../utils/Pos";
import { Cre } from "./Cre";
import { GameObj } from "./GameObj";
import {
  BlockGO,
  containers,
  enemySpawn,
  HasStore,
  mySpawn,
  walls,
} from "./GameObjectInitialize";
import { findGO, hasGO, overallMap } from "./overallMap";
import { Con, Ext, Ram, Res, Roa, Spa, Stru, Tow } from "./Stru";

export type CanBeAttacked = Stru | Cre;
export function getEnergy(a: GameObj): number {
  if (!a.exists) {
    return 0;
  } else if (a instanceof Res) {
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
export let friendBlockCostMatrix: CostMatrix = new CostMatrix();
export function set_friendBlockCostMatrix(c: CostMatrix) {
  friendBlockCostMatrix = c;
}
export let enRamBlockCostMatrix: CostMatrix = new CostMatrix();
export function set_enRamBlockCostMatrix(c: CostMatrix) {
  enRamBlockCostMatrix = c;
}
export let moveBlockCostMatrix: CostMatrix = new CostMatrix();
export function set_moveBlockCostMatrix(c: CostMatrix) {
  moveBlockCostMatrix = c;
}
export const blockCost = 255;
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
        const bgo_rtn = isBlockGO(go, avoidFriendBlock);
        if (bgo_rtn) {
          return true;
        }
      }
    }
    return false;
  }
}
export function isBlockGO(
  go: BlockGO,
  avoidFriendBlock: boolean = false,
  avoidEnemyBlock: boolean = false
) {
  if (go instanceof Cre) {
    if (avoidFriendBlock && go.my) {
      return false;
    } else if (avoidEnemyBlock && go.oppo) {
      return false;
    } else {
      return true;
    }
  } else if (go instanceof Ram && go.my) {
    return false;
  } else if (go instanceof Con || go instanceof Roa) {
    return false;
  } else if (go instanceof Ext) {
    if (avoidEnemyBlock && go.oppo) {
      return false;
    } else {
      return true;
    }
  } else {
    return true;
  }
}
export function energylive(go: GameObj) {
  return getEnergy(go) > 0;
}
export function getEmptyCapacity(cre: HasStore): number {
  return getFreeEnergy(cre);
}
export function getCapacity(cre: HasStore): number {
  const rtn = cre.master.store.getCapacity(RESOURCE_ENERGY);
  return rtn ? rtn : 0;
}
export function energyFull(cre: HasStore): boolean {
  return getFreeEnergy(cre) === 0;
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
  return GR(con, mySpawn) <= 7 && !isBlockedContainer(con);
}
export function isBlockedContainer(con: Con) {
  return GR(con, mySpawn) <= 7 && walls.filter(i => Adj(i, con)).length === 5;
}
export function isOppoBaseContainer(con: Con) {
  return GR(con, enemySpawn) <= 7;
}
export function getSpawnAroundFreeContainers() {
  return containers.filter(i => GR(i, mySpawn) <= 1 && getFreeEnergy(i) > 0);
}
export function getSpawnAroundLiveContainers() {
  return containers.filter(i => GR(i, mySpawn) <= 1 && getEnergy(i) > 0);
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
  return getRangePoss(pos, 1).find(i => !blocked(i)) === undefined;
}
export function isTerrainRoad(pos: Pos): boolean {
  return hasGO(pos, Roa);
}
export let isTurtleContainer: boolean = false;
export function setIsTurtleContainer(b: boolean) {
  isTurtleContainer = b;
}
