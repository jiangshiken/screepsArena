/**
 Module: armedPorter
 Author: masterkeze
 CreateDate:   2023.1.10
 UpDateDate:   2023.1.10
 version 0.0.0
 discription:武装搬运工
*/
import { ATTACK, BOTTOM, DirectionConstant, LEFT, MOVE, RIGHT, TOP } from "game/constants";
import { CostMatrix } from "game/path-finder";
import { Creep, RoomPosition, Structure, StructureConstant } from "game/prototypes";
import { getRange } from "game/utils";

import { Cre, Role } from "../util_Cre";
import { AddDirection, allDirections, getReverseDirection, inBorder, setMatrixByLambda, validPos } from "../util_pos";
import { SA } from "../util_visual";

export const attackPorter: Role = new Role("attackPorter", attackPorterJob);
export const raPorter: Role = new Role("raPorter", raPorterJob);
export const healPorter: Role = new Role("healPorter", healPorterJob);
export function attackPorterJob(cre: Cre) {
	SA(cre, "I'm attackPorter");
}
export function raPorterJob(cre: Cre) {
	SA(cre, "I'm raPorter");
}
export function healPorterJob(cre: Cre) {
	SA(cre, "I'm healPorter");
}

/**
 * 找寻可能的切入角度
 * @param center 目标位置
 * @param range 切入距离
 * @param flee 逃逸方向，true-朝外，false-朝目标
 * @param isBlocked 是否被阻挡 地形已经考虑
 * @returns
 * # # # # ↙
 * # # # ↙
 * # # c ← ←
 * # # # ↖
 * # # # # ↖
 * 返回[BOTTOM_LEFT, LEFT, TOP_LEFT]
 * 追溯的时候从center出发，碰到障碍则排除这个方向，返回时反向就是可能的切入角度
 */
function getAvailableAngles(center: RoomPosition, range: number, flee: boolean, isBlocked: (x: number, y: number) => Boolean): DirectionConstant[] {
	return allDirections.filter((dir) => {
		let lastPos = center;
		for (let i = 1; i <= range; i++) {
			let nextPos = AddDirection(lastPos, dir);
			if (inBorder(nextPos) && validPos(nextPos) && !isBlocked(nextPos.x, nextPos.y)) {
				lastPos = nextPos;
				continue;
			}
			return false;
		}
		return true;
	}).map(dir => flee ? dir : getReverseDirection(dir))
}

/**
 * 为特定切入角度设置cost
 * @param matrix costmatrix-障碍物提前设置好255
 * @param center 目标位置
 * @param range 切入距离
 * @param dir 切入角度
 * @param entryCost 切入的cost
 * @param otherCost 其他位置的cost
 * @returns
 * 举例：希望从TOP_LEFT切入
 * # # # # #
 * # # # # #
 * # # c # #
 * # # # ↖ #
 * # # # # ↖
 * 参数为 (matrix, center, range=2, dir=TOP_LEFT, entryCost=1, otherCost=255)
 * 设置后的cost为：
 * 255 255 255 255 255
 * 255 255 255 255 255
 * 255 255 255 255 255
 * 255 255 255 1 255
 * 255 255 255 255 1
 */
function setMatrixByEntryAngle(matrix: CostMatrix, center: RoomPosition, range: number, dir: DirectionConstant, entryCost: number, otherCost = 255) {
	// 先把区域都设置成255
	setMatrixByLambda(matrix, (x, y) => {
		if (getRange(center, { x, y }) <= range) return otherCost;
		return 0;
	});
	// 从center方向看是反方向
	let reverseDir = getReverseDirection(dir);
	// 特定方向设置切入cost
	let lastPos = center;
	for (let i = 1; i <= range; i++) {
		let nextPos = AddDirection(lastPos, reverseDir);
		if (inBorder(nextPos) && validPos(nextPos)) {
			matrix.set(nextPos.x, nextPos.y, entryCost);
			lastPos = nextPos;
			break;
		}
	}
}

/**
 * 判断所有的方向都在夹角内
 * @param  {DirectionConstant[]} dirs
 * @param  {45|90|135|180|225|270} angle
 * @returns boolean
 */
function directionsInAngle(dirs: DirectionConstant[], angle: 45 | 90 | 135 | 180 | 225 | 270): boolean {
	if (!dirs.length) return true;
	if (dirs.length == 1) return true;
	let maxCountinuousDirCount = 7 - angle / 45;
	let start = dirs[0];
	let countinuouseDirCount = 0;
	for (let i = 1; i < 8; i++) {
		let check = (start + i) % 8;
		if (dirs.find(x => x === check)) {
			countinuouseDirCount = 0;
		} else {
			countinuouseDirCount += 1;
			if (countinuouseDirCount > maxCountinuousDirCount) {
				return false;
			}
		}
	}
	return true;
}

/**
 * 找到多个方向中的中间方向
 * @param dirs
 * @returns DirectionConstant | undefined
 */
function getMediumDirection(dirs: DirectionConstant[]): DirectionConstant | undefined {
	if (dirs.length == 0) return undefined;
	return Math.round(dirs.reduce((p, c) => p + c, 0) / dirs.length) as DirectionConstant;
}

/**
 * 单抓判断-只用一个爬抓落单地方单位
 * 地方单位在特定位置时，只需要一个爬就能逼入死角
 * 这种判断是一种概率的判断，不保证能抓死，但是值得尝试
 * 1. 靠近地图四边的位置，往地图边缘追击
 * 2. 可逃逸方向少，从一个方向追击就能逼入死角
 * todo：对方逃逸方向上或附近有对方的ram
 * @param  {Creep} target
 * @returns DirectionConstant
 */
function getCatchDirection(target: Creep): DirectionConstant | undefined {
	let fleeDirs = getAvailableAngles(target, 5, false, (x, y) => customBlocked({ x, y }, false, true));
	let entryDirs = getAvailableAngles(target, 5, false, (x, y) => customBlocked({ x, y }, true, true));
	// 覆盖不到逃逸方向，直接放弃单抓，这种情况一般是ram
	if (entryDirs.length == 0 || fleeDirs.find(dir => !entryDirs.includes(dir))) {
		return undefined;
	}
	/**
	 * 只有三个方向可以跑，口袋地形
	 * # # # # ↗
	 * #     ↗
	 * #   c → →
	 * #     ↘
	 * # # # # ↘
	 */
	if (directionsInAngle(fleeDirs, 90)) {
		return getMediumDirection(fleeDirs);
	}
	// 地图边缘
	if (target.x <= 12) return LEFT;
	if (target.x >= 87) return RIGHT;
	if (target.y <= 10) return TOP;
	if (target.y >= 89) return BOTTOM;
	/**
	 * 一般贴墙情况
	 * # # ↑   ↗
	 * #   ↑ ↗
	 * #   c → →
	 * #   ↓ ↘
	 * # # ↓   ↘
	 */
	if (directionsInAngle(fleeDirs, 180)) {
		return getMediumDirection(fleeDirs);
	}
	return undefined;
}

/**
 * 包夹动作
 * @param getTarget
 * @returns
 */
function getPincerAction(getTarget: () => Creep | Structure<StructureConstant> | undefined): Action {
	return {
		getTarget,
		intents: [MOVE, ATTACK],
		handleTarget(creep, target) {
			let enemy = target as Creep;
			if (creep.getRangeTo(target) == 1) {
				creep.attack(enemy);
				if (!enemy.fatigue) {
					creep.moveTo(enemy);
				}
			} else {

			}
		},
	}
}
