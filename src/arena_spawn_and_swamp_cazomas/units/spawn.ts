
import { ATTACK, BODYPART_COST, BodyPartConstant, CARRY, HEAL, MOVE, RANGED_ATTACK, TOUGH, WORK } from "game/constants";
import { StructureSpawn } from "game/prototypes";

import { sasVariables } from "../SASVariables";
import { blocked, Cre, Creep_advance, enemies, friends, getEnergy, hasThreat, initCre, Role, SpawnInfo } from "../utils/Cre";
import { S } from "../utils/export";
import { containers, extensions, gameObjects, myExtensions, mySpawns, oppoExtensions, spawns, structures } from "../utils/gameObjectInitialize";
import { arrayEqual } from "../utils/JS";
import { getRangePoss, GR, plusVector, Pos, X_axisDistance } from "../utils/pos";
import { P, SA, SAN } from "../utils/visual";

/** your first StructureSpawn*/
export let spawn: Spa;
export function spawnCleared(s: Spa) {
	return spawnList.length === 0 && s.isSpawning === undefined
}
export function setSpawn(s: Spa) {
	spawn = s
}
/** the first StructureSpawn of your opponent*/
export let enemySpawn: Spa;
export function setEnemySpawn(s: Spa) {
	enemySpawn = s
}

export function spawnListContain(body: BodyPartConstant[], role: Role) {
	for (let info of spawnList) {
		if (arrayEqual(info.bodies, body) && info.role === role) {
			return true;
		}
	}
	return false;
}

/**if the specific spawn have enougth energy to spawn
 * a specific body parts
 */
export function enoughEnergy(theSpawn: Spa, bodies: BodyPartConstant[]): boolean {
	return spawnAndExtensionsEnergy(theSpawn) >= getBodiesCost(bodies);
}

/**check all spawns */
export function checkSpawns() {
	const spawns = getMySpawns();
	for (let theSpawn of spawns) {
		checkSpawn(theSpawn);
	}
}
/** the work list of your Spawn,contains the creep your want to spawn */
export let spawnList: SpawnInfo[] = [];

/** same as {@link getSpawnCost}*/
export function getBodiesCost(bodies: BodyPartConstant[]): number {
	return getSpawnCost(bodies);
}
/** get cost of a bodies */
export function getSpawnCost(bodies: BodyPartConstant[]): number {
	let rtn = 0;
	for (let body of bodies) {
		if (body === TOUGH) rtn += BODYPART_COST.tough;
		else if (body === CARRY) rtn += BODYPART_COST.carry;
		else if (body === WORK) rtn += BODYPART_COST.work;
		else if (body === MOVE) rtn += BODYPART_COST.move;
		else if (body === ATTACK) rtn += BODYPART_COST.attack;
		else if (body === RANGED_ATTACK) rtn += BODYPART_COST.ranged_attack;
		else if (body === HEAL) rtn += BODYPART_COST.heal;
		else P("ERR getSpawnCost " + body);
	}
	return rtn;
}
export function fromSpawnPos(x: number, y: number) {
	return plusVector(spawn, { x: x, y: y })
}
/** extend of Spawn */
export class Spa extends StructureSpawn {
	/** is init */
	inited: boolean | undefined
	/** the time count down of spawning creep */
	timeLimit: number | undefined
	isSpawning: Cre | undefined
}
export function initSpa(spa: Spa) {
	if (!spa.inited) {
		spa.timeLimit = 0
		spa.inited = true
	}
}
export function getExistListAndSpawningFriendsNum(lamb: (i: Cre) => boolean
	, lambSpawnInfo: (i: SpawnInfo) => boolean): number {
	let existFri = friends.filter(lamb).length;
	P("existFri=" + existFri)
	let isSpawningNum = spawn.isSpawning ? (lamb(spawn.isSpawning) ? 1 : 0) : 0
	P("isSpawningNum=" + isSpawningNum)
	let inListHarvesterNum = spawnList.filter(i => lambSpawnInfo(i)).length;
	P("inListHarvesterNum=" + inListHarvesterNum)
	return existFri + isSpawningNum + inListHarvesterNum
}
/** try spawn a creep of the first of spawnList*/
export function spawnIt(theSpawn: Spa) {
	SA(theSpawn, "spawnIt")
	const spawnInfo = spawnList[0];
	const spawnBody: BodyPartConstant[] = spawnInfo.bodies;
	const spawnRole: Role = spawnInfo.role;
	const spawnEnergy: number = spawnAndExtensionsEnergy(theSpawn);
	const requiredEnergy: number = getSpawnCost(spawnBody);
	if (spawnEnergy >= requiredEnergy) {
		//if enough energy
		const sobj = theSpawn.spawnCreep(spawnBody);
		if (sobj.object) {
			SA(theSpawn, "my?=" + sobj.object.my)
			//spawn success
			theSpawn.timeLimit = spawnBody.length * 3;
			// SA(theSpawn,"theSpawn.timeLimit2 ="+theSpawn.timeLimit)

			theSpawn.isSpawning = initCre(
				<Creep_advance>sobj.object,
				spawnRole, spawnInfo, true);
			SA(theSpawn, "theSpawn.isSpawning.role =" + S(spawnRole))
			SA(theSpawn, "theSpawn.isSpawning.spawnInfo =" + S(spawnInfo))
			spawnList.shift();
			SA(theSpawn, "spawnListLength=" + spawnList.length);
		}
	}
}
export function getSpawnAndBaseContainerEnergy(): number {
	const baseCon = containers.find(i => GR(i, spawn) <= 1)
	return getEnergy(spawn) + (baseCon ? getEnergy(baseCon) : 0)
}
/** check if can spawn */
export function checkSpawn(theSpawn: Spa) {
	SA(spawn, "checkSpawn")
	try {

		if (theSpawn.timeLimit !== undefined) {
			theSpawn.timeLimit--;
			if (theSpawn.timeLimit > 0) {
				SA(theSpawn, "theSpawn.timeLimit=" + S(theSpawn.timeLimit));
			} else {
				SA(theSpawn, "isSpawning=" + S(theSpawn.isSpawning))
				//clean the isSpawning of the past spawn creep
				if (theSpawn.isSpawning) {
					//when time tick over the creep.isBirth=true
					theSpawn.isSpawning = undefined;
				}
				if (spawnList.length > 0) {
					spawnIt(theSpawn);
				}
			}
		}
	} catch (ex) {
		P(ex);
	}
}
/**
 * get spawn and extensions energy
 */
export function spawnAndExtensionsEnergy(theSpawn: Spa, myExt: boolean = true, console: boolean = false) {
	const exs = myExt ? myExtensions : oppoExtensions
	if (console) {
		SAN(theSpawn, "extLen", exs.length)
		SAN(theSpawn, "myExtensions", myExtensions.length)
		SAN(theSpawn, "extensions", extensions.length)
		SAN(theSpawn, "structures", structures.length)
		SAN(theSpawn, "gameObjects", gameObjects.length)
	}
	let sum = 0;
	for (let ex of exs) {
		let eng = getEnergy(ex);
		sum += eng
		if (console) {
			SAN(ex, "eng", eng)
			SAN(ex, "sum", sum)
		}
	}
	let engSpawn = getEnergy(theSpawn);
	sum += engSpawn
	if (console) {
		SAN(theSpawn, "engSpawn", engSpawn)
		SAN(theSpawn, "sum", sum)
	}
	return sum;
}
export function oppoSpawnAndExtensionsEnergy(theSpawn: Spa) {
	return spawnAndExtensionsEnergy(theSpawn, false)
}
/**
 * spawn a creep
 */
export function spawnCreep(
	bodies: BodyPartConstant[],
	role: Role,
	extraMessage?: any
) {
	const si = new SpawnInfo(bodies, role);
	si.extraMessage = extraMessage;
	spawnList.push(si);
}
/**
 * spawn a creep
 */
export function spawnCreep_ifHasEnergy(
	bodies: BodyPartConstant[],
	role: Role,
	extraMessage?: any
) {
	const hasEnergy = spawnAndExtensionsEnergy(spawn)
	if (hasEnergy >= getBodiesCost(bodies)) {
		spawnCreep(bodies, role, extraMessage)
	}
}
//energyEnoughBonus
export function EEB(amount: number, rate: number): number {
	return spawnAndExtensionsEnergy(spawn) >= amount ? rate : 1;
}
export function spawnAndSpawnListEmpty(): boolean {
	return !spawn.isSpawning && spawnList.length === 0;
}
/**
 * spawn is blocked by 8 block unit around
 * @param limit the allow empty pos num
 */
export function spawnNearBlockedAround(theSpawn: Spa, limit: number) {
	let spawnAroundPoss = getRangePoss(theSpawn, 1);
	let emptyPoss = spawnAroundPoss.filter(i => !blocked(i));
	if (emptyPoss.length <= limit) {
		return true;
	} else {
		return false;
	}
}
/**
 * spawn a creep ,and put it into the front of the {@link spawnList}
 */
export function spawnCreepInFront(bodies: BodyPartConstant[], role: Role) {
	let si = new SpawnInfo(bodies, role);
	spawnList.unshift(si);
}
export function getMySpawns(): Spa[] {
	return mySpawns.map(i => <Spa>i)
}
export function getSpawns(): Spa[] {
	return spawns.map(i => <Spa>i)
}

//@SASVariables

/** you are at the enemy base side*/

export function inEnBaseRan(cre: Pos): boolean {
	return X_axisDistance(cre, enemySpawn) <= 7;
}
export function inMyBaseRan(cre: Pos): boolean {
	return X_axisDistance(cre, spawn) <= 7;
}
/** set startGate by enemy num*/

export function resetStartGateAvoidFromEnemies(avoid: boolean = true): void {
	const spawnY = spawn.y;
	const upEnemies = enemies.filter(i => i.y < spawnY && hasThreat(i));
	const downEnemies = enemies.filter(i => i.y > spawnY && hasThreat(i));
	const upNum = upEnemies.length;
	const downNum = downEnemies.length;
	sasVariables.startGateUp = avoid ? upNum < downNum : upNum > downNum;
	P("startGateUp=" + sasVariables.startGateUp);
}
