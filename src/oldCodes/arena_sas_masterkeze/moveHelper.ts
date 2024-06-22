import { TERRAIN_SWAMP, TERRAIN_WALL } from "game/constants";
import { CostMatrix, MoveToOpts } from "game/path-finder";
import { Creep, RoomPosition } from "game/prototypes";
import { findPath, getTerrainAt } from "game/utils";
import { CreepHelper } from "./creepHelper";
import { DataHelper } from "./dataHelper";
import { SimpleCache } from "./simpleCahce";

interface Registry {
  creeps: Creep[];
  creepByPos: { [x_y: string]: Creep };
  posByCreep: { [creepid: string]: RoomPosition };
}

interface MyMoveToOpts extends MoveToOpts {
  // 是否最终版本，如果是的话，直接使用传入的movetoopts执行，忽略其他自定义参数
  isFinal?: boolean;
  // 规避多少数值及以上的伤害,空时规避所有伤害
  damageThreshold?: number | undefined;
}

interface MoveIntent {
  creep: Creep;
  target: RoomPosition;
  opts?: MyMoveToOpts;
}

/**
 * CostMatrix 相关管理，
 * 移动相关
 */
export const MoveHelper = {
  getShadowTerrainCostMatrix(shadowSize = 2, plainCost = 1, swampCost = 5): CostMatrix {
    if (shadowSize == 1) return this.getTerrainCostMatrix(plainCost, swampCost);
    const key = `cost:${plainCost}-${swampCost}-${shadowSize}`;
    const value = SimpleCache.Get(key);
    if (value) return (value as CostMatrix).clone();
    const costMatrix = new CostMatrix();
    for (let x = 0; x < DataHelper.mapSize; x++) {
      for (let y = 0; y < DataHelper.mapSize; y++) {
        const terrain = getTerrainAt({ x, y });
        let cost = 0;
        switch (terrain) {
          case TERRAIN_WALL:
            cost = 255;
            break;
          case TERRAIN_SWAMP:
            cost = swampCost;
            break;
          default:
            cost = plainCost;
            break;
        }
        for (let dx = 0; dx < shadowSize; dx++) {
          for (let dy = 0; dy < shadowSize; dy++) {
            let shadowx = x - dx;
            let shadowy = y - dy;
            if (shadowx >= 0 && shadowy >= 0) {
              const old = costMatrix.get(shadowx, shadowy);
              costMatrix.set(shadowx, shadowy, Math.max(cost, old));
            }
          }
        }
      }
    }
    SimpleCache.Set(key, costMatrix, DataHelper.maxTick);
    return costMatrix.clone();
  },
  getTerrainCostMatrix(plainCost = 1, swampCost = 5): CostMatrix {
    const key = `cost:${plainCost}-${swampCost}`;
    const value = SimpleCache.Get(key);
    if (value) return (value as CostMatrix).clone();
    const costMatrix = new CostMatrix();
    for (let x = 0; x < DataHelper.mapSize; x++) {
      for (let y = 0; y < DataHelper.mapSize; y++) {
        const terrain = getTerrainAt({ x, y });
        switch (terrain) {
          case TERRAIN_WALL:
            costMatrix.set(x, y, 255);
            break;
          case TERRAIN_SWAMP:
            costMatrix.set(x, y, swampCost);
            break;
          default:
            costMatrix.set(x, y, plainCost);
            break;
        }
      }
    }
    SimpleCache.Set(key, costMatrix, DataHelper.maxTick);
    return costMatrix.clone();
  },
  refreshRegistry() {
    const key = `refreshRegistry`;
    const value = SimpleCache.Get(key);
    if (value) return;
    const registry = this.registry;
    const creepsToRemove = registry.creeps.filter((c) => !CreepHelper.exists(c));
    for (const creep of creepsToRemove) {
      this.unregister(creep);
    }
    SimpleCache.Set(key, true, 0);
  },
  unregister(creep: Creep) {
    const registry = this.registry;
    const pos = registry.posByCreep[creep.id];
    if (pos) {
      const x_y = this.posToString(pos);
      if (registry.creepByPos[x_y] && registry.creepByPos[x_y].id === creep.id) {
        delete registry.creepByPos[x_y];
      }
      delete registry.posByCreep[creep.id];
    }
    registry.creeps = registry.creeps.filter((c) => c.id !== creep.id);
  },
  register(creep: Creep, pos: RoomPosition) {
    this.refreshRegistry();
    const registry = this.registry;
    this.unregister(creep);
    const x_y = this.posToString(pos);
    if (!registry.creepByPos[x_y] || registry.creepByPos[x_y].id === creep.id) {
      registry.creepByPos[x_y] = creep;
      registry.posByCreep[creep.id] = pos;
      return true;
    }
    return false;
  },
  getPosByCreep(creep: Creep): RoomPosition | undefined {
    return this.registry.posByCreep[creep.id];
  },
  getCreepByRoomPosition(pos: RoomPosition): Creep | undefined {
    const x_y = this.posToString(pos);
    return this.registry.creepByPos[x_y];
  },
  move(creep: Creep, target: RoomPosition, opts?: MyMoveToOpts) {
    if (CreepHelper.exists(creep)) {
      this.moveIntents.push({
        creep,
        target,
        opts,
      });
    }
  },
  posToString(pos: RoomPosition) {
    return `${pos.x}_${pos.y}`;
  },
  moveTogether() {
    // 处理已经确定的Intent
    let finalIntents: MoveIntent[] = [];
    let moveableIntents: MoveIntent[] = [];
    let pullIntents: MoveIntent[] = [];
    let movedCreeps: Set<string> = new Set<string>();
    let lockedPositions: Set<string> = new Set<string>();
    for (const intent of this.moveIntents) {
      if (intent.opts && intent.opts.isFinal) {
        finalIntents.push(intent);
      } else if (intent.creep!.fatigue === 0) {
        moveableIntents.push(intent);
      } else {
        pullIntents.push(intent);
      }
    }

    for (const intent of finalIntents) {
      const path = findPath(intent.creep, intent.target, intent.opts);
      if (path.length > 0) {
        intent.creep.moveTo(path[0]);
        movedCreeps.add(intent.creep.id);
        lockedPositions.add(this.posToString(path[0]));
      }
    }
    // 处理其他默认intent
  },
  get moveIntents() {
    const key = `moveIntents`;
    const value = SimpleCache.Get(key);
    if (value) return value as MoveIntent[];
    const intents: MoveIntent[] = [];
    SimpleCache.Set(key, intents, 0);
    return intents;
  },
  get registeredPositions() {
    this.refreshRegistry();
    return Object.values(this.registry.posByCreep);
  },
  get registry() {
    const key = `positionRegistry`;
    const value = SimpleCache.Get(key);
    if (value) return value as Registry;
    const registry: Registry = {
      creeps: [],
      creepByPos: {},
      posByCreep: {},
    };
    SimpleCache.Set(key, registry, DataHelper.maxTick);
    return registry;
  },
};

(global as any).MoveHelper = MoveHelper;
