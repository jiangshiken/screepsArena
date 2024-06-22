import { TERRAIN_PLAIN, TERRAIN_SWAMP, TERRAIN_WALL } from "game/constants";
import { CostMatrix } from "game/path-finder";
import { Creep, OwnedStructure, RoomPosition, Structure, StructureExtension, StructureRampart } from "game/prototypes";
import { getTerrainAt, getTicks } from "game/utils";

import { creeps, extensions, myRamparts, oppoRamparts, spawns, structures, towers, walls } from "../util_gameObjectInitialize";

/**
 Module: kezeStardardData
 Author: masterkeze
 CreateDate:   2023.1.18
 UpdateDate:   2023.1.20
 version 0.0.0
 description:keze标准战术数据源
*/

interface SimpleCache<T> {
	expireAt: number;
	data: T
}

interface CreepSnapshot {
	// 快照时间
	tick: number;
	creeps: {
		id: string;
		x: number;
		y: number;
		hits: number;
		fatigue: number;
		energy: number;
	}[]
}

interface StructureSnapshot {
	// 快照时间
	tick: number;
	structures: {
		id: string;
		hits: number;
		energy?: number;
		ticksToDecay?: number;
	}[]
}
interface MoveMapContent {
	// 该位置作为右下角的 len x len 区域内没有墙
	len: number;
	// 该位置作为右下角的2X2区域内的swamp数量
	quadSwampCount: number;
	// 各方向上的连续的可通过地形统计
	topTerrains: TERRAIN_SWAMP | TERRAIN_PLAIN[]
	topRightTerrains: TERRAIN_SWAMP | TERRAIN_PLAIN[]
	rightTerrains: TERRAIN_SWAMP | TERRAIN_PLAIN[]
	bottomRightTerrains: TERRAIN_SWAMP | TERRAIN_PLAIN[]
	bottomTerrains: TERRAIN_SWAMP | TERRAIN_PLAIN[]
	bottomLeftTerrains: TERRAIN_SWAMP | TERRAIN_PLAIN[]
	leftTerrains: TERRAIN_SWAMP | TERRAIN_PLAIN[]
	topLeftTerrains: TERRAIN_SWAMP | TERRAIN_PLAIN[]
}
type MoveMap = Record<number, Record<number, MoveMapContent>>

export class KezeStandardData {
	moveMap: MoveMap
	// 速度区间 [0,1],(1,2)
	quadMoveCostMatrix: {
		ticksToPassSwamp: number;
		matrix: CostMatrix;
	}[]
	creepSnapshot: CreepSnapshot
	structureSnapshot: StructureSnapshot
	movedEnemyCreepsCache: SimpleCache<Creep[]>
	newEnemyCreepsCache: SimpleCache<Creep[]>
	beingAttackedStructuresCache: SimpleCache<Structure[]>
	beingAttackedMyRampartCache: SimpleCache<StructureRampart[]>
	newStructuresCache: SimpleCache<Structure[]>
	newEnemyStructuresCache: SimpleCache<Structure[]>
	newEnemyRampartsCache: SimpleCache<StructureRampart[]>
	newEnemyExtensionsCache: SimpleCache<StructureExtension[]>
	myObstacleStructurePositionsCache: SimpleCache<RoomPosition[]>
	enemyObstacleStructurePositionsCache: SimpleCache<RoomPosition[]>
	constructor() {
		this.creepSnapshot = {
			tick: 0,
			creeps: []
		};
		this.structureSnapshot = {
			tick: 0,
			structures: []
		}
		this.movedEnemyCreepsCache = this.initCache();
		this.newEnemyCreepsCache = this.initCache();
		this.beingAttackedStructuresCache = this.initCache();
		this.newStructuresCache = this.initCache();
		this.beingAttackedMyRampartCache = this.initCache();
		this.newEnemyStructuresCache = this.initCache();
		this.newEnemyRampartsCache = this.initCache();
		this.newEnemyExtensionsCache = this.initCache();
		this.myObstacleStructurePositionsCache = this.initCache();
		this.enemyObstacleStructurePositionsCache = this.initCache();
		this.moveMap = {};
		this.quadMoveCostMatrix = [
			{ ticksToPassSwamp: 1, matrix: new CostMatrix },
			{ ticksToPassSwamp: 2, matrix: new CostMatrix },
			{ ticksToPassSwamp: 3, matrix: new CostMatrix },
			{ ticksToPassSwamp: 4, matrix: new CostMatrix },
			{ ticksToPassSwamp: 5, matrix: new CostMatrix },
		];
		for (let i = 0; i < 100; i++) {
			this.moveMap[i] = {};
			for (let j = 0; j < 100; j++) {
				const { topLeft, top, left } = this.getOtherAreaLen(this.moveMap, i, j, 1);
				this.moveMap[i][j] = {
					len: 0,
					quadSwampCount: 0,
					topTerrains: [],
					topRightTerrains: [],
					rightTerrains: [],
					bottomRightTerrains: [],
					bottomTerrains: [],
					bottomLeftTerrains: [],
					leftTerrains: [],
					topLeftTerrains: []
				}
				this.moveMap[i][j].len = getTerrainAt({ x: i, y: j }) === TERRAIN_WALL ? 0 : (Math.min(topLeft, top, left) + 1);
				let length = this.moveMap[i][j].len;
				if (length >= 2) {
					let swampCount = this.getQuadSwampCount(i, j);
					this.moveMap[i][j].quadSwampCount = swampCount;
					// 满速优先走沼泽
					this.quadMoveCostMatrix[0].matrix.set(i, j, swampCount > 0 ? 1 : 2);
					// 其他按实际情况
					this.quadMoveCostMatrix[1].matrix.set(i, j, swampCount > 0 ? 2 : 1);
					this.quadMoveCostMatrix[2].matrix.set(i, j, swampCount > 0 ? 3 : 1);
					this.quadMoveCostMatrix[3].matrix.set(i, j, swampCount > 0 ? 4 : 1);
					this.quadMoveCostMatrix[4].matrix.set(i, j, swampCount > 0 ? 5 : 1);
				}
			}
		}
	}
	private getCenterByBottomRight(i: number, j: number, len: number): RoomPosition {
		return {
			x: i - (len / 2) + 0.5,
			y: j - (len / 2) + 0.5
		}
	}
	private getOtherAreaLen(dp: Record<number, Record<number, MoveMapContent>>, i: number, j: number, len: number) {
		// 检查索引是否小于零，小于零就返回默认值
		return {
			topLeft: (i - len > -1 && j - len > -1) ? dp[i - len][j - len].len : 0,
			top: (i - len > -1) ? dp[i - len][j].len : 0,
			left: (j - len > -1) ? dp[i][j - len].len : 0,
		}
	}
	private getOtherArea(dp: Record<number, Record<number, MoveMapContent>>, i: number, j: number) {
		return {
			leftTerrains: (j - 1 > -1) ? dp[i][j - 1].leftTerrains : [],
			topLeftTerrains: (i - 1 > -1 && j - 1 > -1) ? dp[i - 1][j - 1].topLeftTerrains : [],
			topTerrains: (i - 1 > -1) ? dp[i - 1][j].topTerrains : [],
			topRightTerrains: (i - 1 > -1 && j + 1 < 100) ? dp[i - 1][j + 1].topRightTerrains : []
		}
	}

	// 左上，上，左，以及输入位置的swamp数总和
	private getQuadSwampCount(i: number, j: number) {
		let counts = [{ x: i - 1, y: j - 1 }, { x: i - 1, y: j }, { x: i, y: j - 1 }, { x: i, y: j }]
			.map(p => p.x > -1 && p.y > -1 && getTerrainAt(p) === TERRAIN_SWAMP ? 1 : 0 as number);
		return counts.reduce((n1, n2) => n1 + n2, 0);
	}

	private initCache() {
		return {
			expireAt: 1,
			data: []
		}
	}
	// 缓存过期时调用getData设置缓存，返回缓存结果
	private readAndSetCacheIfExpired<T>(cache: SimpleCache<T>, keep: number, getData: () => T) {
		if (cache.expireAt >= getTicks()) {
			let data = getData();
			cache = {
				expireAt: getTicks() + keep,
				data
			}
		}
		return cache.data as Readonly<T>;
	}
	// 获取quad的地形matrix(未计算建筑、爬)
	public getQuadMoveCostMatrix(ticksToPassSwamp: number) {
		let found = this.quadMoveCostMatrix.find((x => x.ticksToPassSwamp === ticksToPassSwamp));
		if (found) return found.matrix.clone();
		// 返回最慢的cost
		return this.quadMoveCostMatrix[4].matrix.clone();
	}
	// 对我来说是障碍物的建筑，不包括我方的ram
	public get myObstacleStructurePositions() {
		return this.readAndSetCacheIfExpired(this.myObstacleStructurePositionsCache, 1, () => {
			return [...towers, ...walls, ...spawns, ...extensions, ...oppoRamparts];
		});
	}
	// 对敌方来说是障碍物的建筑，不包括敌方的ram
	public get enemyObstacleStructurePositions() {
		return this.readAndSetCacheIfExpired(this.enemyObstacleStructurePositionsCache, 1, () => {
			return [...towers, ...walls, ...spawns, ...extensions, ...myRamparts];
		});
	}
	// 获取本tick移动了的敌方creep
	public get movedEnemyCreeps() {
		return this.readAndSetCacheIfExpired(this.movedEnemyCreepsCache, 1, () => {
			return creeps.filter(c => {
				if (!(c.exists === true && c.my === false)) return false;
				let foundHistory = this.creepSnapshot.creeps.find(x => x.id === c.id);
				return (foundHistory && c.getRangeTo({ x: foundHistory.x, y: foundHistory.y }) > 0);
			});
		});
	}
	// 获取本tick新出生的敌方creep
	public get newEnemyCreeps() {
		return this.readAndSetCacheIfExpired(this.newEnemyCreepsCache, 1, () => {
			return creeps.filter(c => {
				if (!(c.exists === true && c.my === false)) return false;
				let foundHistory = this.creepSnapshot.creeps.find(x => x.id === c.id);
				return (!foundHistory);
			});
		});
	}
	// 获取本tick被攻击的structure
	public get beingAttackedStructures() {
		return this.readAndSetCacheIfExpired(this.beingAttackedStructuresCache, 1, () => {
			return structures.filter(s => {
				if (!(s.exists === true)) return false;
				let foundHistory = this.structureSnapshot.structures.find(x => x.id === s.id);
				return (foundHistory && s.hits < foundHistory.hits);
			});
		});
	}
	// 获取本tick被攻击的己方ram
	public get beingAttackedMyRampart() {
		return this.readAndSetCacheIfExpired(this.beingAttackedMyRampartCache, 1, () => {
			return this.beingAttackedStructures.filter(s => s instanceof StructureRampart && s.my) as StructureRampart[];
		})
	}
	// 获取本tick新建的structure
	public get newStructures() {
		return this.readAndSetCacheIfExpired(this.newStructuresCache, 1, () => {
			return structures.filter(s => {
				if (!(s.exists === true)) return false;
				let foundHistory = this.structureSnapshot.structures.find(x => x.id === s.id);
				return (!foundHistory);
			});
		});
	}
	// 获取本tick新建的敌方Structure
	public get newEnemyStructures() {
		return this.readAndSetCacheIfExpired(this.newEnemyStructuresCache, 1, () => {
			return this.newStructures.filter(s => s instanceof OwnedStructure && s.my === false) as Structure[];
		});
	}
	// 获取本tick新建的敌方ram
	public get newEnemyRamparts() {
		return this.readAndSetCacheIfExpired(this.newEnemyRampartsCache, 1, () => {
			return this.newEnemyStructures.filter(s => s instanceof StructureRampart) as StructureRampart[];
		})
	}
	// 获取本tick新建的敌方ext
	public get newEnemyExtensions() {
		return this.readAndSetCacheIfExpired(this.newEnemyExtensionsCache, 1, () => {
			return this.newEnemyStructures.filter(s => s instanceof StructureExtension) as StructureExtension[];
		})
	}
	/**
	 * 刷新快照
	 */
	public refreshSnapshot() {
		// todo：CPU不足时 控制刷新频率
		this.refreshCreepSnapshot();
		this.refreshStructureSnapshot();
	}
	// 刷新structure的快照
	private refreshStructureSnapshot() {
		this.structureSnapshot = {
			tick: getTicks(),
			structures: structures.filter(s => s.exists === true).map(s => {
				return {
					id: s.id,
					hits: s.hits,
					energy: (s as any).store !== undefined ? (s as any).store.energy ?? 0 : 0
				}
			})
		}
	}
	// 刷新creep的快照
	private refreshCreepSnapshot() {
		this.creepSnapshot = {
			tick: getTicks(),
			creeps: creeps.filter(c => c.exists === true).map(c => {
				return {
					id: c.id,
					x: c.x,
					y: c.y,
					hits: c.hits,
					fatigue: c.fatigue,
					energy: c.store.energy ?? 0
				};
			})
		}
	}
}
