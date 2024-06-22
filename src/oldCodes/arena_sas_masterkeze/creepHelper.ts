import { ATTACK, BodyPartConstant, CARRY, HEAL, MOVE, RANGED_ATTACK, TERRAIN_SWAMP } from "game/constants";
import { Creep, GameObject, RoomPosition } from "game/prototypes";
import { getTerrainAt } from "game/utils";
import { DataHelper } from "./dataHelper";
import { MyVisual } from "./myVisual";
import { SimpleCache } from "./simpleCahce";

/**
 * 可抵达区域的出参
 */
interface RoomPositionTick extends RoomPosition {
  /**
   * 在该位置时的疲劳值
   */
  fatigue: number;
  /**
   * 多久之后可以抵达该位置
   */
  tick: number;
  /**
   * 是否处于可抵达区域的外沿（该tick首次抵达的位置）
   */
  out: boolean;
}

/**
 * 获取creep相关的一些参数
 */
export const CreepHelper = {
  isSpawning(creep: Creep) {
    if (!this.exists(creep)) return false;
    return !!DataHelper.spawns.find(s => s.x === creep.x && s.y === creep.y);
  },
  exists(obj: GameObject | undefined) {
    return obj && obj.exists === true;
  },
  hasActivePart(creep: Creep, type: BodyPartConstant) {
    return (
      this.exists(creep) && creep.body.some(b => b.type === type && b.hits > 0)
    );
  },
  hasPart(creep: Creep, type: BodyPartConstant) {
    return this.exists(creep) && creep.body.some(b => b.type === type);
  },
  getPartCount(creep: Creep, type: BodyPartConstant) {
    if (!this.exists(creep)) return 0;
    return creep.body.filter(b => b.type === type).length;
  },
  getActivePartCount(creep: Creep, type: BodyPartConstant) {
    if (!this.exists(creep)) return 0;
    return creep.body.filter(b => b.type === type && b.hits > 0).length;
  },
  /**
   * 速度估算 [0,5]
   * 在沼泽上满速时为5
   * 平地上满速为1
   * @param creep
   * @returns
   */
  getSpeed(creep: Creep) {
    let movePartCount = this.getActivePartCount(creep, MOVE);
    if (movePartCount === 0) return 0;
    let heavyPartCount = this.getHeavyPartCount(creep);
    if (heavyPartCount === 0) return 5;
    return Math.min(5, movePartCount / heavyPartCount);
  },
  getDpsAt(creep: Creep, pos: RoomPosition) {
    if (!this.exists(creep)) return 0;
    const range = creep.getRangeTo(pos);
    const attackCount = this.getActivePartCount(creep, ATTACK);
    const raCount = this.getActivePartCount(creep, RANGED_ATTACK);
    if (range <= 1) {
      return Math.max(attackCount * 30, raCount * 10);
    } else if (range <= 3) {
      return raCount * 10;
    } else {
      return 0;
    }
  },
  getHpsAt(creep: Creep, pos: RoomPosition) {
    if (!this.exists(creep)) return 0;
    const range = creep.getRangeTo(pos);
    const healCount = this.getActivePartCount(creep, HEAL);
    if (range <= 1) {
      return healCount * 12;
    } else if (range <= 3) {
      return healCount * 4;
    } else {
      return 0;
    }
  },
  /**
   * 集火优先级
   * 主要思路：正相关因素：dps hps，负相关要素：hits
   * 1. 残血红球 > 满血红球，残血篮球 > 满血红球 能造成减员总是没毛病
   * 2. 相同血量的红球 > 蓝球
   * case: 配置位置不同
   * ammmmmmmmmma 先打第一个a 30/100 最后打剩下这段 30/1100
   * mmmmmmmmmmaa 然后打这个 30/1100 60/1200
   * @param creep
   * @returns
   */
  getScore(creep: Creep) {
    if (!this.exists(creep)) return 0;
    const key = `score_${creep.id}`;
    const value = SimpleCache.Get(key);
    if (value !== undefined) return value as number;
    let raScore = 10;
    if (this.hasActivePart(creep, RANGED_ATTACK)) {
      // rma 和 ra 伤害取最大值
      const affactedCreeps = DataHelper.creeps.filter(
        c => c.my !== creep.my && c.getRangeTo(creep) <= 3
      );
      const range1 = affactedCreeps.filter(
        c => c.getRangeTo(creep) === 1
      ).length;
      const range2 = affactedCreeps.filter(
        c => c.getRangeTo(creep) === 2
      ).length;
      const range3 = affactedCreeps.filter(
        c => c.getRangeTo(creep) === 3
      ).length;
      raScore = Math.max(raScore, range1 * 10 + range2 * 4 + range3 * 1);
    }
    let score = 0;

    let ram = DataHelper.getRampartAt(creep);
    // 血量考虑ram
    let cumulativeHits = ram !== undefined ? ram!.hits! : 0;
    let cumulativeStore = 0;
    let freeSpace = creep.store.getFreeCapacity("energy")!;
    const scoreDict: Record<BodyPartConstant, number> = {
      attack: 30,
      ranged_attack: raScore,
      tough: 1,
      carry: 1, // 装东西的时候多1
      work: 2,
      move: 1,
      heal: 12,
    };
    let priority = 0;
    for (const bodyPart of creep.body) {
      if (!bodyPart.hits) continue;
      cumulativeHits += bodyPart.hits;
      if (bodyPart.type == CARRY) {
        cumulativeStore += 50;
        if (cumulativeStore > freeSpace) {
          score += scoreDict[bodyPart.type] + 1;
        } else {
          score += scoreDict[bodyPart.type];
        }
      } else {
        score += scoreDict[bodyPart.type];
      }
      priority = Math.max(priority, score / cumulativeHits);
    }
    SimpleCache.Set(key, priority, 0);
    MyVisual.text(creep, `${priority}`, 4);
    return priority;
  },
  getTicksOnPlain(creep: Creep) {
    let movePartCount = this.getActivePartCount(creep, MOVE);
    if (movePartCount == 0) return 0;
    let heavyPartCount = this.getHeavyPartCount(creep);
    return Math.max(1, Math.ceil(heavyPartCount / movePartCount));
  },
  getTicksOnSwamp(creep: Creep) {
    let movePartCount = this.getActivePartCount(creep, MOVE);
    if (movePartCount == 0) return 0;
    let heavyPartCount = this.getHeavyPartCount(creep);
    return Math.max(1, Math.ceil((heavyPartCount * 5) / movePartCount));
  },
  getTicksToMove(creep: Creep) {
    if (this.getActivePartCount(creep, MOVE) === 0) return DataHelper.maxTick;
    return Math.ceil(creep.fatigue / this.getFatigueDecrease(creep));
  },
  getFatigueDecrease(creep: Creep) {
    return this.getActivePartCount(creep, MOVE) * 2;
  },
  getFatigueOnPlain(creep: Creep) {
    let heavyPartCount = this.getHeavyPartCount(creep);
    return Math.max(0, heavyPartCount * 2);
  },
  getFatigueOnSwamp(creep: Creep) {
    let heavyPartCount = this.getHeavyPartCount(creep);
    return Math.max(0, heavyPartCount * 10);
  },
  /**
   * 获取负重的部件数，不载物的carry不负重
   * @param creep
   * @returns
   */
  getHeavyPartCount(creep: Creep) {
    if (!DataHelper.exists(creep)) return 0;
    let carryCount = creep.store.energy
      ? Math.ceil(creep.store.energy) / 50
      : 0;
    return (
      creep.body.filter(
        bodypart => bodypart.type != MOVE && bodypart.type != CARRY
      ).length + carryCount
    );
  },
  /**
   * 获得某个creep n tick 内可以抵达的区域
   * @param creep
   * @param tick
   */
  getReachablePositions(creep: Creep, n: number): Readonly<RoomPositionTick[]> {
    if (!DataHelper.exists(creep) || n < 0) return [];
    if (n === 0)
      return [
        { x: creep.x, y: creep.y, fatigue: creep.fatigue, out: true, tick: 0 },
      ];
    const key = `reachablePositions:${creep.id}-${n}`;
    const value = SimpleCache.Get(key);
    if (value) return value as RoomPositionTick[];
    // 刷新fatigure
    const lastTickPositions = this.getReachablePositions(creep, n - 1).map(
      p => {
        return {
          x: p.x,
          y: p.y,
          fatigue: Math.max(0, p.fatigue - this.getFatigueDecrease(creep)),
          out: p.out,
          tick: p.tick,
        };
      }
    );
    const positions: RoomPositionTick[] = [
      // 以前inner+这次fatigue归零的
      ...lastTickPositions
        .filter(p => p.fatigue === 0)
        .map(p => {
          return {
            x: p.x,
            y: p.y,
            fatigue: p.fatigue,
            tick: p.tick,
            out: false,
          };
        }),
      // fatigue 大于0的还要继续检查
      ...lastTickPositions
        .filter(p => p.fatigue > 0)
        .map(p => {
          return {
            x: p.x,
            y: p.y,
            fatigue: p.fatigue,
            tick: p.tick,
            out: true,
          };
        }),
    ];
    const outPositions = lastTickPositions.filter(
      p => p.out && p.fatigue === 0
    );
    for (const outPosition of outPositions) {
      const nearByPositions = this.getNearByPositions(outPosition);
      // console.log("nearByPositions:");
      // console.log(nearByPositions);
      nearByPositions.map(np => {
        const reached = positions.find(dp => dp.x === np.x && dp.y === np.y);
        if (!reached) {
          const terrain = getTerrainAt(np);
          switch (terrain) {
            case TERRAIN_SWAMP:
              positions.push({
                x: np.x,
                y: np.y,
                fatigue: this.getFatigueOnSwamp(creep),
                out: true,
                tick: n,
              });
              break;
            case 0:
              positions.push({
                x: np.x,
                y: np.y,
                fatigue: this.getFatigueOnPlain(creep),
                out: true,
                tick: n,
              });
              break;
            default:
              break;
          }
        }
      });
    }
    // console.log(`${n}:`);
    // console.log(positions);
    SimpleCache.Set(key, positions, 0);
    return positions;
  },
  /**
   * 获得某位置及其周围距离为range及以内的所有位置
   * @param pos
   * @param range
   * @returns
   */
  getNearByPositions(pos: RoomPosition, range = 1): RoomPosition[] {
    let positions: RoomPosition[] = [];
    for (let i = -range; i <= range; i++) {
      for (let j = -range; j <= range; j++) {
        let x = pos.x + i;
        let y = pos.y + j;
        if (
          x >= 0 &&
          x < DataHelper.mapSize &&
          y >= 0 &&
          y < DataHelper.mapSize
        ) {
          positions.push({ x, y });
        }
      }
    }
    return positions;
  },
};

(global as any).CreepHelper = CreepHelper;
