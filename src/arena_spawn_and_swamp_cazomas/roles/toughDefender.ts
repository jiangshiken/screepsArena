
import { CostMatrix } from "game/path-finder";
import { findClosestByRange } from "game/utils";

import { spawn } from "../units/spawn";
import { Cre, enemies, friends, Role } from "../utils/Cre";
import { leftVector } from "../utils/game";
import { getGuessPlayer, Tigga } from "../utils/player";
import { absRange, getRangePoss, GR, multiplyVector, plusVector, Vec } from "../utils/pos";
import { SA } from "../utils/visual";

/**a defender with tough on the body part instead of building rampart around
 * the base
*/
export const toughDefender: Role = new Role("toughDefender", toughDefenderJob);
export function toughDefenderJob(cre: Cre) {
	cre.fight();
	const cm = new CostMatrix();
	if(getGuessPlayer()===Tigga){
		if(cre.upgrade.index===undefined){
			cre.upgrade.index=friends.filter(i=>i.role===toughDefender).length
		}
		SA(cre,cre.upgrade.index)
		const leftVec=leftVector()
		const ind=cre.upgrade.index
		const upVec=new Vec(0,1)
		if(ind===1){
			cre.MTJ_stop(plusVector(plusVector(spawn,leftVec),upVec))
		}else if(ind===2){
			cre.MTJ_stop(plusVector(plusVector(spawn,multiplyVector(leftVec,2)),upVec))
		}else if(ind===3){
			cre.MTJ_stop(plusVector(spawn,leftVec))
		}else if(ind===4){
			cre.MTJ_stop(plusVector(spawn,multiplyVector(leftVec,2)))
		}
	}else{
		const rps = getRangePoss(spawn, 2);
		for (let pos of rps) {
			if (absRange(pos, spawn) === 1) {
				cm.set(pos.x, pos.y, 1);
			} else if (GR(pos, spawn) === 1) {
				cm.set(pos.x, pos.y, 5);
			} else {
				cm.set(pos.x, pos.y, 255);
			}
		}
		const en = findClosestByRange(spawn, enemies);
		if (en) {
			//if not at spawn dont chase
			if (GR(en, cre) > 1 || GR(en, spawn) === 1) {
				cre.moveToNormal(en, { costMatrix: cm });
			}
		}
	}
}
