// import { rangeDecreaseBonus } from "../utils/bonus";
// import { ct, et, getCPUPercent, lowCPUMode, pt, ptSum } from "../utils/CPU";
// import { Attackable, blocked, calculateForce, Cre, cres, exist, getArmies, GO, isTerrainSwamp, isTerrainWall, my, myGO, oppo, Unit } from "../utils/Cre";
// import { S } from "../utils/export";
// import { inResourceArea, tick } from "../utils/game";
// import { isMyRampart, isMySpawn, isOppoRampart, isOppoSpawn, ramparts, spawns } from "../utils/gameObjectInitialize";
// import { displayPos, inRampart, spawnPos } from "../utils/HasHits";
// import { divide0, goInRange, randomBool, relu } from "../utils/JS";
// import { MyMap } from "../utils/MyMap";
// import { overallMap } from "../utils/overallMap";
// import { getGuessPlayer, Kerob } from "../utils/player";
// import { getRangePoss, GR, Pos, pos00 } from "../utils/pos";
// import { P, SA } from "../utils/visual";
// import { getSpawns } from "./spawn";

// import { RANGED_ATTACK } from "game/constants";
// import { CostMatrix } from "game/path-finder";
// import { Structure, StructureContainer, StructureExtension, StructureRampart, StructureRoad } from "game/prototypes";

// /** written for fun*/
// export let doorMap: MyMap<number>
// /** used to represent force of every tile ,positive is enmey ,negative is friend*/
// export let forceMap_fri: MyMap<number>;
// export let forceMap_ene: MyMap<number>;
// export let miniForceMap_fri: MyMap<number>;
// export let miniForceMap_ene: MyMap<number>;
// /** record the default move cost,if use module maps.ts,this value will be fresh at every tick*/
// export let moveMap: MyMap<number>;
// export let moveMapRefreshActiveMap: MyMap<number>;
// /** the default CostMatrix of every Cre.moveToJudge movement */
// export let moveMatrix: CostMatrix = new CostMatrix();
// export let moveMapSetRate: number = 2;
// export function setMoveMapSetRate(n: number): void {
// 	moveMapSetRate = n;
// }
// export function initDoorMap() {
// 	doorMap = new MyMap<number>(100, 100, 0, 0)
// 	// for
// }
// export function setDoorMap() {

// }
// export class Cre_maps {

// }
// //function
// export function firstInit_maps() {
// 	moveMap = new MyMap(100, 100, 0, 0);
// 	forceMap_fri = new MyMap(100, 100, 0, 0);
// 	forceMap_ene = new MyMap(100, 100, 0, 0);
// 	miniForceMap_fri = new MyMap(100, 100, 0, 0, pos00, 3);
// 	miniForceMap_ene = new MyMap(100, 100, 0, 0, pos00, 3);
// 	moveMapRefreshActiveMap = new MyMap(100, 100, 0, 0, pos00, 1);
// 	moveMatrix = new CostMatrix();
// }
// export let setMoveMapOn: boolean = true
// export function set_setMoveMapOn(b: boolean) {
// 	setMoveMapOn = b
// }
// /**for turtle */
// export let setMoveMapAvoidFarOn: boolean = false
// export function set_setMoveMapAvoidFarOn(b: boolean) {
// 	setMoveMapAvoidFarOn = b
// }
// export let setMiniForceMapOn: boolean = true
// export function set_setMiniForceMapOn(b: boolean) {
// 	setMiniForceMapOn = b
// }
// const mapCPULimit = 0.7
// export function loopStart_maps() {
// 	let st7 = ct();
// 	if (!lowCPUMode || lowCPUMode && randomBool(0.1)) {
// 		//This Method has bug
// 		// setForceMap();
// 	}
// 	pt("setForceMap", st7);
// 	if (getCPUPercent() > mapCPULimit) {
// 		P("CPU BREAK");
// 		return;
// 	}
// 	let st8 = ct();
// 	if (setMiniForceMapOn && (!lowCPUMode || lowCPUMode && randomBool(0.1))) {
// 		if(useForceMap){
// 			setMiniForceMap();
// 		}
// 	}
// 	pt("setMiniForceMap", st8);
// 	if (getCPUPercent() > mapCPULimit) {
// 		P("CPU BREAK");
// 		return;
// 	}
// 	let st9 = ct();
// 	if (setMoveMapOn && (!lowCPUMode || lowCPUMode && randomBool(0.1))) {
// 		setMoveMap();
// 	}
// 	pt("setMoveMap", st9);
// }
// export function getBlockRateAtPos(pos: Pos): number {
// 	const bss = <Attackable[]>overallMap.get(pos).filter(i =>
// 		(i instanceof Structure
// 			|| i instanceof Cre)
// 		&& isBlockGameObject(i))
// 	return bss.map(i => getBlockRate(i)).reduce((a, b) => a + b, 0)
// }
// /**
//  * GameObject that will block the tile
//  */
// export function isBlockGameObject(go: GO, containerBlock: boolean = false, my?: boolean) {
// 	if (my === undefined) {
// 		my = myGO(go)
// 	}
// 	return (
// 		exist(go) &&
// 		(go instanceof Structure || go instanceof Cre) &&
// 		!(
// 			(go instanceof StructureRampart && my)
// 			|| !containerBlock && go instanceof StructureContainer
// 			|| go instanceof StructureRoad
// 		)
// 	);
// }
// export function getBlockRate(att: Attackable): number {
// 	if (att instanceof Cre) {
// 		if (oppo(att)) {
// 			return 10 + 5 * moveMapSetRate * calculateForce(att)
// 		} else {
// 			return 255
// 		}
// 	} else if (att instanceof StructureRampart) {
// 		if (oppo(att)) {
// 			return 1 + 0.1 * att.hits
// 		} else {
// 			return 0
// 		}
// 	} if (att instanceof StructureExtension) {
// 		if (oppo(att)) {
// 			return 10
// 		} else {
// 			return 240
// 		}
// 	} else {
// 		return 240
// 	}
// }
// export let moveCostForceRate = 0.5
// export function set_moveCostForceRate(d: number) {
// 	moveCostForceRate = d
// }
// export let swampFirst: boolean = false
// export function set_swampFirst(b: boolean) {
// 	swampFirst = b
// }
// export let swampIgnore: boolean = false
// export function set_swampIgnore(b: boolean) {
// 	swampIgnore = b
// }
// export let useForceMap=false
// export function set_useForceMap(b:boolean){
// 	useForceMap=b
// }
// /**
//  * set the value of move map
//  */
// export function setMoveMap() {
// 	// moveMap.setByLambda(pos => 0)
// 	let sum_getForceMapValue = 0;
// 	let sum_finalSet = 0;
// 	let sum_mapsBlock_st = 0;
// 	let sum_getRefreshValue = 0;
// 	let sum_setTerrainWall = 0;
// 	//
// 	const st_moveMapRefreshActiveMap_setByLambda_realIndex = ct();
// 	if (setMoveMapAvoidFarOn) {
// 		SA(displayPos(), "setMoveMapAvoidFarOn=true")
// 		const range = 6
// 		moveMapRefreshActiveMap.setByLambda_area(pos => 0,
// 			{ x: spawnPos.x - range, y: spawnPos.y - range },
// 			{ x: spawnPos.x + range, y: spawnPos.y + range }
// 		)
// 	} else {
// 		SA(displayPos(), "setMoveMapAvoidFarOn=false")
// 		moveMapRefreshActiveMap.setByLambda_realIndex(pos => 0);
// 	}
// 	pt("	st_moveMapRefreshActiveMap_setByLambda_realIndex", st_moveMapRefreshActiveMap_setByLambda_realIndex)
// 	const st_moveMapRefreshActiveMap = ct();
// 	//
// 	const avoidFarRange = 3
// 	if(useForceMap){
// 		const units = (<Unit[]>cres).concat(spawns)
// 		for (let u of units) {
// 			if (setMoveMapAvoidFarOn) {
// 				if (GR(spawnPos, u) >= avoidFarRange) {
// 					continue;
// 				}
// 			}
// 			if (getCPUPercent() > mapCPULimit) {
// 				P("CPU BREAK " + S(u));
// 				return;
// 			}
// 			const range = 3;
// 			moveMapRefreshActiveMap.setByLambda_realIndex_area(
// 				u => 1,
// 				{ x: u.x - range, y: u.y - range },
// 				{ x: u.x + range + 1, y: u.y + range + 1 }
// 			);
// 		}
// 		pt("	moveMapRefreshActiveMap", st_moveMapRefreshActiveMap)
// 		// drawMyMap(miniActiveMap,pos00,poshh)

// 	}
// 	let setMoveMapMainFunc = ct();
// 	let calCount = 0;
// 	for (let i = 0; i < 100; i++) {
// 		// CPU break
// 		if (getCPUPercent() > mapCPULimit) {
// 			P("CPU BREAK " + i);
// 			return;
// 		}
// 		for (let j = 0; j < 100; j++) {
// 			let pos = { x: i, y: j };
// 			if (setMoveMapAvoidFarOn) {
// 				if (GR(spawnPos, pos) >= avoidFarRange) {
// 					continue;
// 				}
// 			}
// 			//if active===0 that this pos is not important
// 			let getRefreshValue = ct();
// 			const refreshValue = moveMapRefreshActiveMap.get(pos)
// 			const delay = refreshValue === 0 ? 15 : 1;
// 			if ((i + j + tick) % delay !== 0) {
// 				continue;
// 			}
// 			const ifIsTerrainWall = isTerrainWall(pos)
// 			sum_getRefreshValue += et(getRefreshValue);
// 			//is terrain wall
// 			if (ifIsTerrainWall) {
// 				const st_setTerrainWall = ct();
// 				moveMap.set(pos, 255);
// 				sum_setTerrainWall += et(st_setTerrainWall);
// 			} else {
// 				// if(i===0){
// 				// 	SA(pos,"!")
// 				// }
// 				calCount++;
// 				let mapsBlock_st = ct();
// 				//set block
// 				let isBlocked: boolean = blocked(pos, false);
// 				sum_mapsBlock_st += et(mapsBlock_st);
// 				//plus force matrix
// 				let st_getForceMapValue = ct();
// 				const forceMapExtraCost = -getForceMapValue(pos);
// 				sum_getForceMapValue += et(st_getForceMapValue);
// 				let st_finalSet = ct();
// 				//block rate
// 				let cost = 0;
// 				if (isBlocked) {
// 					let blockRate = getBlockRateAtPos(pos)
// 					// if(blockRate>0){
// 					SA(pos,"B="+blockRate)
// 					// }
// 					cost += blockRate;
// 					// SAN(pos, "blockRate", blockRate)
// 				}
// 				//swamp cost
// 				const swampRate = swampIgnore?1:(swampFirst ?
// 					(isTerrainSwamp(pos) ? 1 : 3)
// 					: (isTerrainSwamp(pos) ? 3 : 1));
// 				const forceRate = getGuessPlayer() === Kerob ?
// 					1 : (1 + relu(moveCostForceRate * (forceMapExtraCost + 1)));
// 				cost += moveMapSetRate * swampRate * forceRate;
// 				//set
// 				const realCost = Math.ceil(goInRange(cost, 0, 255))
// 				moveMap.set(pos, realCost);
// 				sum_finalSet += et(st_finalSet);
// 			}
// 			// }
// 		}
// 		// P("calCount=" + calCount);
// 	}
// 	P("	calCount=" + calCount)
// 	pt("	setMoveMapMainFunc", setMoveMapMainFunc);
// 	ptSum("		sum_getRefreshValue", sum_getRefreshValue);
// 	ptSum("		sum_setTerrainWall", sum_setTerrainWall);
// 	ptSum("		sum_mapsBlock_st", sum_mapsBlock_st);
// 	ptSum("		getForceMapValue", sum_getForceMapValue);
// 	ptSum("		sum_finalSet", sum_finalSet);
// }
// export function setMoveMatrix() {
// 	//set move matrix
// 	let st3 = ct();
// 	setMatrixByLambda(moveMatrix, (x, y) => Math.floor(moveMap[x][y]));
// 	pt("set move matrix", st3);
// 	let st4 = ct();
// 	//draw matrix
// 	pt("draw matrix", st4);
// }
// /**
//  * set a `CostMatrix` by lambda Function
//  */
// export function setMatrixByLambda(
// 	matrix: CostMatrix,
// 	l: (x: number, y: number) => number
// ) {
// 	for (let i = 0; i < 100; i++) {
// 		for (let j = 0; j < 100; j++) {
// 			let d = l(i, j);
// 			// if (d != 0) {
// 			//if 0 that dont set ,cause it's default value
// 			matrix.set(i, j, d);
// 			// }
// 		}
// 	}//艹，好了，没好
// }
// /**
//  * set force map
//  */
// export function setForceMap() {
// 	forceMap_fri.setByLambda(pos => 0);
// 	forceMap_ene.setByLambda(pos => 0);
// 	//scan enemies and friends and myRampart
// 	const scanUnits = (<Unit[]>getArmies())
// 		.concat(ramparts)
// 		.concat(getSpawns());
// 	for (let unit of scanUnits) {
// 		if (getCPUPercent() > mapCPULimit) {
// 			P("CPU BREAK setForceMap");
// 			break;
// 		}
// 		//get force of unit
// 		const forceInfluence = calculateForce(unit);
// 		//set scanSize
// 		let scanSize;
// 		if (unit instanceof StructureRampart) {
// 			scanSize = 0;
// 			SA(unit, "ram force cal");
// 		} else {
// 			scanSize = 2;
// 		}
// 		const RPs = getRangePoss(unit, scanSize);
// 		for (let pos of RPs) {
// 			//every range pos
// 			const range = GR(unit, pos);
// 			//delta force
// 			let df = 0;
// 			const finalRate = 0.25;
// 			//
// 			if (unit instanceof Cre) {
// 				if (my(unit)) {
// 					//friend
// 					df = -forceInfluence;
// 				} else if (oppo(unit)) {
// 					//enemy
// 					df = forceInfluence;
// 				}
// 			} else {
// 				const str: Structure = <Structure>unit
// 				if (isMyRampart(unit)) {
// 					//my rampart
// 					df = -3 * forceInfluence;
// 				} else if (isOppoRampart(unit)) {
// 					//oppo rampart
// 					df = 3 * forceInfluence;
// 				} else if (isMySpawn(unit)) {
// 					//my spawn
// 					df = -forceInfluence;
// 				} else if (isOppoSpawn(unit)) {
// 					//oppo spawn
// 					df = forceInfluence;
// 				}
// 			}
// 			if (df > 0) {
// 				forceMap_ene.set(pos, forceMap_ene.get(pos) + finalRate * df);
// 			} else {
// 				forceMap_fri.set(pos, forceMap_fri.get(pos) - finalRate * df);
// 			}
// 		}
// 	}
// }
// export function getForceMapValue(pos: Pos): number {
// 	const friForce = getFriendForceMapValue(pos)
// 	const enemyForce = getEnemyForceMapValue(pos)
// 	return friForce - enemyForce;
// }
// export function getForceMapValueRate(pos: Pos): number {
// 	const friForce = getFriendForceMapValue(pos)
// 	const enemyForce = getEnemyForceMapValue(pos)
// 	return divide0(friForce, enemyForce);
// }
// export function getFriendForceMapValue(pos: Pos): number {
// 	return forceMap_fri.get(pos) + miniForceMap_fri.get(pos);
// }
// export function getEnemyForceMapValue(pos: Pos): number {
// 	return forceMap_ene.get(pos) + miniForceMap_ene.get(pos);
// }
// function miniSetLambda(army: Cre, pos: Pos, scanSize: number, force: number, force_noRam: number): number {
// 	//get range from unit to range pos
// 	const range = GR(army, pos);
// 	//if is friend
// 	// const friendRate = my(army) ? -1 : 1;
// 	const finalRate = 0.2//0.75;
// 	//range bonus
// 	const rrb0 = range <= 0.6 * scanSize ? 1 : 0
// 	const rrb1 = rangeDecreaseBonus(range, 0.6 * scanSize)
// 	const rrb2 = rangeDecreaseBonus(range, scanSize)
// 	const rrb = 0.33 * rrb0 + 0.33 * rrb1 + 0.33 * rrb2
// 	//delta force
// 	let dfForce
// 	if (inRampart(army)) {
// 		dfForce = range <= miniForceMap_fri.scale ? force : force_noRam
// 	} else {
// 		dfForce = force;
// 	}
// 	const df = finalRate * rrb * dfForce
// 	return df
// }
// export function setMiniForceMap() {
// 	// miniForceMap=new MyMap(100,100,pos00,4);
// 	const st1 = ct();
// 	miniForceMap_fri.setByLambda_realIndex(pos => 0);
// 	miniForceMap_ene.setByLambda_realIndex(pos => 0);
// 	pt("init miniForceMap", st1);
// 	//set armies
// 	const scanArmies = getArmies();
// 	P("scanUnits.length=" + scanArmies.length);
// 	let sum1: number = 0;
// 	for (let army of scanArmies) {
// 		//every unit
// 		//get force of unit
// 		const force = calculateForce(army);
// 		const force_noRam = calculateForce(army, false);
// 		if (getCPUPercent() > mapCPULimit) {
// 			P("CPU BREAK setMiniForceMap");
// 			break;
// 		}
// 		//set scanSize
// 		const unitSpeed = army.getSpeed();
// 		const unitSpeed_general = army.getSpeed_general();
// 		const unitSpeed_miniForce = 0.6 * unitSpeed + 0.4 * unitSpeed_general;
// 		const influentRangePlus = 45 * unitSpeed_miniForce;
// 		const rangeScanExtra = army.getBodiesNum(RANGED_ATTACK) > 0 ? 3 : 0
// 		let scanSize = 8 + rangeScanExtra + Math.floor(influentRangePlus);
// 		// SAN(army, "scanSize", scanSize)
// 		if (!inResourceArea(army)) {
// 			SA(army, "not in resource area")
// 			scanSize = Math.min(scanSize, 12)
// 		}
// 		const st1 = ct();
// 		const recPos1 = { x: army.x - scanSize, y: army.y - scanSize };
// 		const recPos2 = { x: army.x + scanSize, y: army.y + scanSize };
// 		if (my(army)) {
// 			miniForceMap_fri.setByLambda_area(
// 				pos => {
// 					const df = miniSetLambda(army, pos, scanSize, force, force_noRam)
// 					return miniForceMap_fri.get(pos) + df;
// 				},
// 				recPos1,
// 				recPos2
// 			);
// 		} else {
// 			miniForceMap_ene.setByLambda_area(
// 				pos => {
// 					const df = miniSetLambda(army, pos, scanSize, force, force_noRam)
// 					return miniForceMap_ene.get(pos) + df;
// 				},
// 				recPos1,
// 				recPos2
// 			);
// 		}
// 		sum1 += et(st1);
// 	}
// 	ptSum("sum1", sum1);
// }

// /** when creep move ,the first position will be set block */
// export function setMoveMapAndMatrixBlock(pos: Pos): void {
// 	moveMatrix.set(pos.x, pos.y, 255);
// }
