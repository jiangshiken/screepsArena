
import { BodyPartConstant } from "game/constants";

import { S } from "../utils/export";
import { d2, repeat } from "../utils/JS";
import { P, SA } from "../utils/visual";
import { Cre, friends, Role } from "./Cre";
import { enoughEnergy, spawn, spawnAndSpawnListEmpty, spawnCreep } from "./spawn";

export function spawnBySpawnTypeList(spl: SpawnType[]) {
	let maxNeedRate = 0;
	let maxNeedSpawnType: SpawnType | undefined;
	for (let s of spl) {
		//every spawnType
		if (s.onlyEnoughEnergy) {
			//if it is 'only enough energy'
			// P("check only Enough Energy")
			if (!enoughEnergy(spawn, s.body)) {
				// P("pass")
				//if not enough ,pass
				continue;
			}
		}
		//getCreeps_includeSpawning
		const currentNum: number = s.filterObj(friends)
		const needRate = s.need / (currentNum + 0.5);
		//
		const s1 = "needRate of " + s.role.roleName + "(" + s.body.length + ")=";
		const repeatNum = Math.min(Math.ceil(needRate * 3), 100);
		const tableNum = 5 - Math.floor((s1.length + 1) / 8);
		//print the need
		P(s1 + repeat("\t", tableNum) + d2(needRate) + "\t " + repeat("#", repeatNum));
		//
		if (needRate > maxNeedRate) {
			maxNeedRate = needRate;
			maxNeedSpawnType = s;
		}
	}
	//spawn maxNeedSpawnType
	if (spawnAndSpawnListEmpty() && maxNeedSpawnType && enoughEnergy(spawn, maxNeedSpawnType.body)) {
		SA(spawn, "decide spawn " + S(maxNeedSpawnType));
		spawnCreep(maxNeedSpawnType.body, maxNeedSpawnType.role);
	} else {
		// SA(spawn, "currentList" + S(spawnList));
		// SAN(spawn, "spawnList.length", spawnList.length);
	}
}
/**
 *  a spawn type that represent a kind of requirement,that means need a specific type
 *  of creep at the case of this tick.it will sum the total creep that match the
 * {@link SpawnType.filterObj} when it less than the {@link SpawnType.need} value
 *  it may be spawn by another method
 */
export class SpawnType {
	role: Role;
	/** represent how much you need this type of creep */
	need: number;
	/** the body of the creep that will be spawn*/
	body: BodyPartConstant[];
	/** used to calculate the number of creeps of this type on the map in this tick*/
	filterObj: (c: Cre[]) => number;
	/** if this is true ,it will only valid when your spawn has the energy to born this body*/
	onlyEnoughEnergy: boolean;
	constructor(
		role: Role,
		need: number,
		body: BodyPartConstant[],
		filterObj: (c: Cre[]) => number,
		onlyEnoughEnergy: boolean = false
	) {
		this.role = role;
		this.need = need;
		this.body = body;
		this.onlyEnoughEnergy = onlyEnoughEnergy;
		this.filterObj = filterObj;
	}
}
