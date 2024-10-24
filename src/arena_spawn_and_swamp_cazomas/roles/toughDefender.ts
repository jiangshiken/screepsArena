/**
 Module: toughDefender
 Author: 820491047
 CreateDate:   2023.1.10
 UpDateDate:   2023.1.10
 version 0.0.0
*/
import { CostMatrix } from "game/path-finder";
import { findClosestByRange } from "game/utils";

import { spawn } from "../units/spawn";
import { Cre, enemies, Role } from "../utils/util_Cre";
import { absRange, getRangePoss, GR } from "../utils/util_pos";

/**a defender with tough on the body part instead of building rampart around
 * the base
*/
export const toughDefender: Role = new Role("toughDefender", toughDefenderJob);
export function toughDefenderJob(cre: Cre) {
	cre.fight();
	let cm = new CostMatrix();
	let rps = getRangePoss(spawn, 2);
	for (let pos of rps) {
		if (absRange(pos, spawn) === 1) {
			cm.set(pos.x, pos.y, 1);
		} else if (GR(pos, spawn) === 1) {
			cm.set(pos.x, pos.y, 5);
		} else {
			cm.set(pos.x, pos.y, 255);
		}
	}
	let en = findClosestByRange(spawn, enemies);
	if (en) {
		//if not at spawn dont chase
		if (GR(en, cre) > 1 || GR(en, spawn) === 1) {
			cre.moveToNormal(en, { costMatrix: cm });
		}
	}
}
