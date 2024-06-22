/**
 Module: util_player
 Author: 820491047
 CreateDate:   2023.1.10
 UpDateDate:   2023.1.10
 version 0.0.0
*/
import { CARRY } from "game/constants";

import { enemySpawn } from "./spawn";
import { displayPos } from "./util_attackable";
import { TB } from "./util_autoBodys";
import { enemies, getBodyArrayOfCreep, getEnergy } from "./util_Cre";
import { tick } from "./util_game";
import { creeps, isOppoGO } from "./util_gameObjectInitialize";
import { arrayEquals } from "./util_JS";
import { MGR } from "./util_pos";
import { SA } from "./util_visual";

//class
export class Player {
	name: String;
	//   posibility: number = 0;
	supportList: {
		[key: string]: {
			worth: number;
		}
	}
	constructor(name: String) {
		this.name = name;
		this.supportList = {}
		playerList.push(this)
	}
	getWorth(): number {
		let rtn = 0
		for (let key in this.supportList) {
			let worth: number = this.supportList[key].worth
			rtn += worth
		}
		return rtn
	}
}
//players
export const playerList: Player[] = [];
export const Tigga: Player = new Player("Tigga");
export const Dooms: Player = new Player("Dooms");
export const MathI: Player = new Player("MathI");
export const Capta: Player = new Player("Capta");
export const Other: Player = new Player("Other");
export const startWaitTick = 44;
export let currentGuessPlayer = Other;
export function identifyOpponent() {
	//identify tigga
	if (tick === startWaitTick - 1) {
		const ens = enemies.filter(i => MGR(i, enemySpawn) <= 1 && i.getBodiesNum(CARRY) > 0 && getEnergy(i) > 0)
		if (ens.length >= 2) {
			SA(displayPos(), "tigga1 triggered")
			addSupport(Tigga, "1", 0.5)
		}
	}
	if (tick <= startWaitTick) {
		const scanEn0 = creeps.find(i => isOppoGO(i) && arrayEquals(getBodyArrayOfCreep(i), TB("3C2W5M")))
		if (scanEn0) {
			SA(displayPos(), "tigga0 triggered")
			addSupport(Tigga, "0", 0.5)
		}
	}
	//identify dooms
	if (tick <= startWaitTick) {
		const scanEn0 = creeps.find(i => isOppoGO(i) && arrayEquals(getBodyArrayOfCreep(i), TB("C")))
		if (scanEn0) {
			SA(displayPos(), "dooms triggered")
			addSupport(Dooms, "0", 0.5)
		}
	}
	//
	SA(displayPos(), "guessPlayer=" + getGuessPlayer().name)
}
function addSupport(player: Player, name: string, worth: number) {
	player.supportList[name] = { worth: worth }
}
export function getGuessPlayer(): Player {
	const defaultPlayer = Other
	const rtn = playerList.reduce((a, b) => a.getWorth() > b.getWorth() ? a : b, defaultPlayer)
	currentGuessPlayer = rtn
	return rtn
	//   let rtn: Player = Tigga;
	//   let maxP: number = -1;
	//   for (let p of playerList) {
	//     if (p.posibility > maxP) {
	//       maxP = p.posibility;
	//       rtn = p;
	//     }
	//   }
	//   return rtn;
}
