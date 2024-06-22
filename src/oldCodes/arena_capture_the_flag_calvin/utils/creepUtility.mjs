import { constants } from 'game';
import { Creep } from 'game/prototypes';

/**
 * 计算并返回构成Creep的部件的总成本
 * @param {number[]} bodyParts
 * @returns
 */
export function calculateCost(bodyParts) {
	var sum = 0;
	for (var parts of bodyParts) {
		sum += constants.BODYPART_COST[parts];
	}
	return sum;
}

/**
 * 判断Creep是否已死亡
 * @param {Creep} creep
 * @returns {boolean}
 */
export function isAlive(creep) {
	return creep.exists && (creep.hits > 0)
}

/**
 * 指定Creep部件
 * @param {Creep} creep
 * @param {number} bodyParts
 * @returns {boolean}
 */
export function hasBodyParts(creep, bodyParts) {
	return creep.body.indexOf(bodyParts) >= 0;
}
