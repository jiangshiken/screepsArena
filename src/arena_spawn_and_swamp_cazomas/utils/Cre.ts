
import { ATTACK, BodyPartConstant, CARRY, CreepActionReturnCode, ERR_NOT_IN_RANGE, HEAL, MOVE, OK, RANGED_ATTACK, RESOURCE_ENERGY, TERRAIN_SWAMP, TERRAIN_WALL, TOUGH, WORK } from "game/constants";
import { FindPathOpts, FindPathResult, searchPath } from "game/path-finder";
import { ConstructionSite, Creep, GameObject, Resource, Structure, StructureContainer, StructureExtension, StructureRampart, StructureRoad, StructureSpawn, StructureTower } from "game/prototypes";
import { findClosestByPath, findClosestByRange, findPath, getDirection, getRange, getTerrainAt, getTicks } from "game/utils";

// import { CS, getMaxWorthCSS, getMyCSs, progress } from "../utils_pincer";
import { sasVariables } from "../SASVariables";
import { CS, getMaxWorthCSS, getMyCSs, progress } from "../units/constructionSite";
import { getForceMapValue, isBlockGameObject, moveMatrix, setMoveMapAndMatrixBlock } from "../units/maps";
import { BodyCre } from "./bodyParts";
import { ct, et, ptSum } from "./CPU";
import { Event, Event_C, Event_Number, Event_Pos, validEvent } from "./event";
import { S, SOA } from "./export";
import { tick } from "./game";
import { Harvable, OwnedStructure, constructionSites, containers, creeps, isMyGO, isMyRampart, isMySpawn, isOppoRampart, isOppoSpawn, myStructures, oppoStructures, resources, spawns, structures, walls } from "./gameObjectInitialize";
import { Res, displayPos, getMyContainers, getRess, inRampart, isOppoContainer, spawnPos, validRes } from "./HasHits";
import { divide0, divideReduce, invalid, last, pow2, ranGet, remove, removeIf, valid } from "./JS";
import { findGO, hasGO, overallMap } from "./overallMap";
import { Kerob, getGuessPlayer } from "./player";
import { Adj, COO, GR, Pos, Pos_C, X_axisDistance, atPos, getRangePoss, midPoint, minusVector, multiplyVector, plusVector, pos00 } from "./pos";
import { HasTasks, MultiTask, Task, Task_C, findTask, findTaskByFilter, useTasks } from "./task";
import { P, SA, drawLineComplex, drawLineLight, drawPoly, drawPolyLight } from "./visual";

export const defFindPathResult: FindPathResult = {
	path: [], ops: 0, cost: 0, incomplete: true
}
export class ExtraTauntEvent extends Event_Number {
	name: string
	from: Unit | undefined
	constructor(num: number, name: string = "noname", from?: Unit) {
		super(num)
		this.name = name
		this.from = from
	}
}
//types
/** can be attack,has hits*/
export type Attackable = Cre | Structure;
/** all creeps and Structure */
export type Unit = Cre | OwnedStructure
export type Producer = Cre | StructureExtension | StructureSpawn
export type HasEnergy = Resource | HasStore;
/** has store*/
export type HasStore =
	| Cre
	| StructureSpawn
	| StructureContainer
	| StructureExtension
	| StructureTower;
/**game object */
export type GO = Attackable | Resource | ConstructionSite
export function isGO(go: any): boolean {
	return go instanceof Cre
		|| go instanceof Structure
		|| go instanceof Resource
		|| go instanceof ConstructionSite
}
export class Creep_advance extends Creep {
	advance: Cre | undefined
}
export let cres: Cre[] = []
//
export let friends: Cre[] = []
export let enemies: Cre[] = []
export let myUnits: Unit[] = []
export let oppoUnits: Unit[] = []
export function getGameObjects(): GO[] {
	return (<GO[]>cres).concat(structures, constructionSites, resources)
}
export function isSpawning(cre: Creep_advance): boolean {
	// return cre.spawning && !atSpawnPos(cre)
	let rtn1 = atSpawnPos(cre)
	let rtn2 = cre.spawning
	// drawText({ x: cre.x, y: cre.y },"pos=" + COO(cre) + " rtn1=" + rtn1+" cre.spawning=" + rtn2)
	return rtn1 || rtn2
}
export function atSpawnPos(pos: Pos): boolean {
	let rtn: boolean = spawns.find(i => atPos(i, pos)) !== undefined
	return rtn
}
export function initCre(ca: Creep_advance, role?: Role, spawnInfo?: SpawnInfo, whenSpawnStart: boolean = false): Cre {
	if (!ca.advance) {
		ca.advance = new Cre(ca)
	}
	let newCre = ca.advance
	SA(displayPos(), "initCre");
	if (whenSpawnStart) {
		if (role) {
			// SA(displayPos(), "new TaskRole");
			newCre.role = role
			new Task_Role(newCre, role);
		}
		if (spawnInfo) {
			newCre.spawnInfo = spawnInfo
		}
	} else {
		// SA(ca, "         isSpawning(ca)=" + isSpawning(ca))
		cres.push(ca.advance)
	}
	return newCre
}
export function initialCresAtLoopStart() {
	P("initialCresAtLoopStart")
	SA(midPoint, "initialCresAtLoopStart")
	//remove dead Cre
	cres = cres.filter(i => exist(i.master))
	//add new Cre
	for (let creep of creeps) {
		const ca: Creep_advance = <Creep_advance>creep
		// SA(creep, "creep.spawning=" + creep.spawning)
		const exp0 = !isSpawning(ca)
		// const exp1 = !ca.advance
		const exp2 = !cres.find(i => i.master === creep)
		// SA(ca, " exp0=" + exp0 + " exp2=" + exp2)
		// SA(ca, " exp0=" + exp0 + " exp1=" + exp1 + " exp2=" + exp2)
		if (exp0 &&
			(exp2
			)
		) {
			P("ca=" + S(ca))
			initCre(ca)
		}
	}
	//team array
	friends = cres.filter(i => my(i))
	enemies = cres.filter(i => oppo(i))
	myUnits = (<Unit[]>friends).concat(myStructures)
	oppoUnits = (<Unit[]>enemies).concat(oppoStructures)

}
export function getAllUnits(): Unit[] {
	return myUnits.concat(oppoUnits)
}
/** the Task of Creep*/
export class Task_Cre extends Task_C {
	master: Cre;
	constructor(master: Cre) {
		super(master);
		this.master = master;
	}
}
/** a Task of the Role Function of Creep */
export class Task_Role extends Task_Cre {
	role: Role;
	constructor(master: Cre, role: Role) {
		super(master);
		this.role = role;
		//cancel old task
		const pt = this.master.tasks.find(
			task => task instanceof Task_Role && task != this
		);
		if (pt) pt.end();
	}
	loop_task(): void {
		// SA(this.master,"Task_Role_loop")
		if (this.role.roleFunc) {
			// SA(this.master,"Task_Role_loop roleFunc")
			this.role.roleFunc(this.master);
		}
	}
}
/** represent a event of pull function */
export class PullEvent extends Event_C {
	/** one who pulled other creep */
	pullOne: Cre;
	/** one who be pulled */
	bePulledOne: Cre;
	constructor(pullOne: Cre, bePulledOne: Cre) {
		super();
		this.pullOne = pullOne;
		this.bePulledOne = bePulledOne;
	}
}

/** extend of `Creep` */
export class Cre implements HasTasks {
	master: Creep
	/** the role */
	role: Role | undefined;
	spawnInfo: SpawnInfo | undefined;
	moveTarget: Event_Pos | undefined;
	moveTargetNextPos: Event_Pos | undefined;
	/** if it want move ,it related to if other Creep will pull it */
	wantMove: Event | undefined;
	/** tasks list */
	tasks: Task[] = [];
	//modules
	battle: Battle
	macro: Macro
	crePathFinder: Cre_pathFinder
	/** contains friends that is going to help pull this creep,already pulling one is not calculated in this list*/
	tryPullFatigueFriend: Cre[] = [];
	/** the closest Event that the creep is pulling other*/
	pullTarget: PullEvent | undefined = undefined;
	/** the closest Event that the creep is being pulled*/
	bePulledTarget: PullEvent | undefined = undefined;
	/** the `Attackable` that the creep is targeting */
	targetAttackable: Attackable | undefined = undefined;
	/** used to predict the movement of the creep ,can only predict a little distance */
	deltaPredictPos: Pos;
	moveSelecter: Selecter<Pos>;
	/**extra infomation*/
	upgrade: any = {};
	taskPriority: number = 10
	pureMeleeMode: boolean = false
	appointmentMovement: Event_Pos | undefined
	/**calculation*/
	cal_taunt_fight: Event_Number | undefined
	cal_taunt_value: Event_Number | undefined
	cal_force_includeRam: Event_Number | undefined
	cal_force_not_includeRam: Event_Number | undefined
	constructor(creep: Creep) {
		// P("constructor creep=" + creep)
		this.master = creep
		// P("this.master=" + this.master)
		this.tasks = [];
		this.tryPullFatigueFriend = [];
		this.deltaPredictPos = pos00;
		this.moveSelecter = this.getInitMoveSelector();
		this.upgrade = {};
		this.battle = new Battle(this)
		this.macro = new Macro(this)
		this.crePathFinder = new Cre_pathFinder(this)
		//TODO add member attribute
	}
	extraMessage():any{
		return this.spawnInfo?.extraMessage
	}
	appointMovementIsActived(): boolean {
		return validEvent(this.appointmentMovement, 0)
	}
	useAppointMovement(validTick: number = 0): boolean {
		const app = this.appointmentMovement
		if (app && validEvent(app, validTick)) {
			this.MTJ_follow(app.pos)
			return true
		} else {
			return false
		}
	}
	flee(range: number = 4, FleeRange: number = 7): boolean {
		return this.battle ? this.battle.flee(range, FleeRange) : false
	}
	getDecideSearchRtnByCre(tar: Pos): FindPathResult {
		return this.crePathFinder ? this.crePathFinder.getDecideSearchRtnByCre(tar) : defFindPathResult
	}
	get x() {
		// const a = this
		// P(a)
		// const b = this.master
		// P(b)
		// const c = this.master.x
		// P(c)
		return this.master.x
	}
	get y() {
		return this.master.y
	}
	get store() {
		return this.master.store
	}
	get hits() {
		return this.master.hits
	}
	get hitsMax() {
		return this.master.hitsMax
	}
	get exists() {
		return this.master.exists
	}
	get id() {
		return this.master.id
	}
	searchTars(tars: Pos[]): FindPathResult {
		return this.crePathFinder ? this.crePathFinder.searchTars(tars) : defFindPathResult
	}
	dropEnergy(): void {
		this.macro?.dropEnergy()
	}
	body(): BodyCre[] {
		return this.master.body
	}
	//TODO add member attribute
	findClosestByRange<T extends Pos>(poss: T[]): T | undefined {
		return findClosestByRange(this, poss)
	}
	shotTarget(tar: Attackable): void {
		if (this.battle)
			this.battle.shotTarget(tar)
	}
	fight(): boolean {
		return this.battle ? this.battle.fight() : false
	}
	isEnemyArmy(): boolean {
		return this.battle ? this.battle.isEnemyArmy() : false
	}
	isArmy(): boolean {
		return this.battle ? this.battle.isArmy() : false
	}
	getTauntBonus(): Event_Number[] {
		return <Event_Number[]>this.battle?.tauntBonus
	}
	addTauntBonus(taunt: number, name: string = "no name", from?: Unit): void {
		this.battle?.tauntBonus.push(new ExtraTauntEvent(taunt, name, from));
	}
	getInitMoveSelector(): Selecter<Pos> {
		return new Selecter<Pos>(new Pos_C(this), wc(1));
	}
	//member function
	canMove(): boolean {
		return this.master.fatigue === 0;
	}
	/** pause the current `MoveTask`*/
	movePause() {
		this.crePathFinder?.movePause()
	}
	/** continue the current `MoveTask`*/
	moveContinue() {
		this.crePathFinder?.moveContinue()
	}
	/** cancel the current `MoveTask`*/
	stop() {
		this.crePathFinder?.stop()
	}
	/** if the target of current `MoveTask` is `tar` ,cancel it*/
	stopByTar(tar: Pos) {
		this.crePathFinder?.stopByTar(tar);
	}
	/** go to a target Creep ,and const it pull this */
	directBePulled(tar: Cre): boolean {
		SA(tar, "directBePulled");
		const tl = tar.getPullingTargetList();
		SA(tar, "getIsPullingTargetList=" + SOA(tl));
		let lastOne = last(tl);
		if (lastOne === undefined || invalidPos(lastOne)) {
			return false;
		}
		if (lastOne === this) {
			//do not need?
			SA(tar, "lastOne==this");
			lastOne = tl[tl.length - 2];
		}
		const pte = this.bePulledTarget;
		if (pte != undefined && validEvent(pte, 1) && pte.pullOne === lastOne) {
			//if is being pulled
			const OneWhoPullCre = pte.pullOne;
			OneWhoPullCre.normalPull(this);
			return true;
		} else {
			// if not being pulled
			if (invalid(lastOne)) {
				return false;
			} else if (myGetRange(this, lastOne) > 1) {
				// SA(this,"MTJ="+COO(lastOne));
				this.MTJ(lastOne);
				return false;
			} else {
				if (lastOne.normalPull(this))
					//lastOne.pullingTarget.target=cre
					return true;
				else return false;
			}
		}
	}
	hasMoveBodyPart() {
		return this.getBodies(MOVE).length > 0;
	}
	moveTo_follow(tar: Pos) {
		SA(this.master, "moveTo_follow" + COO(tar))
		if (GR(tar, this) <= 1) {
			this.stop();
			this.crePathFinder?.moveTo_Basic(tar);
		} else {
			this.MTJ(tar);
		}
	}
	moveToNormal_setAppointment(tar: Pos, op: FindPathOpts | null = null) {
		this.appointmentMovement = new Event_Pos(tar)
		this.moveToNormal(tar, op)
	}
	exchangePos_setAppointment(tar: Cre) {
		SA(this, "exchangePos_setAppointment " + COO(tar));
		this.moveToNormal_setAppointment(tar)
		tar.moveToNormal_setAppointment(this)
	}
	/** find path and move */
	moveToNormal(tar: Pos, op: FindPathOpts | null = null) {
		// SA(this.master, "moveToNormal" + COO(tar))
		this.wantMove = new Event_C();
		let mop;
		if (op === null) {
			mop = undefined;
		} else {
			mop = op;
		}
		this.stop();
		var tarPath = findPath(this, tar, mop);
		if (tarPath.length > 0) {
			const tar0 = tarPath[0];
			this.crePathFinder?.moveTo_Basic(tar0);
		}
	}
	/** pull  */
	normalPull(tar: Cre, direct: boolean = false): boolean {
		if (myGetRange(this, tar) <= 1) {
			//draw green line
			drawLineComplex(this, tar, 0.5, "#00ff00");
			//pull
			this.master.pull(tar.master);
			//set Event
			const pe = new PullEvent(this, tar);
			this.pullTarget = pe;
			tar.bePulledTarget = pe;
			//tar move this
			if (direct) {
				// tar.moveToDirect(this);
				tar.crePathFinder?.moveTo_Basic_Direct(this);
			} else {
				tar.moveToNormal(this);
			}
			return true;
		} else return false;
	}
	/** move and pull */
	pullTar(tar: Cre): boolean {
		const range = getRange(this, tar);
		if (range > 1) {
			//go to tar
			this.MTJ(tar);
			// sayAppend(this," move to tar ");
			return false;
		} else {
			// pull it
			// MTJ(tar,this);
			this.normalPull(tar);
			this.stopByTar(tar); //TODO
			// sayAppend(this," pulling tar");
			return true;
		}
	}
	/** move and pull */
	moveAndBePulled(tar: Cre): boolean {
		const range = getRange(this, tar);
		if (range > 1) {
			//go to tar
			this.MTJ(tar);
			// sayAppend(this," move to tar ");
			return false;
		} else {
			// pull it
			// MTJ(tar,this);
			tar.normalPull(this);
			this.stopByTar(tar); //TODO
			// sayAppend(this," pulling tar");
			return true;
		}
	}
	randomMove() {
		const pos: Pos | undefined = getRoundEmptyPos(this);
		if (pos) {
			this.MTJ(pos);
		}
	}
	onlyHasMoveAndCarry() {
		const mNum = this.getBodies(MOVE).length;
		const cNum = this.getBodies(CARRY).length;
		const rtn = mNum + cNum === this.body().length;
		return rtn;
	}
	MTJ_stop(
		tar: Pos,
		op?: FindPathOpts,
		step: number = getMoveStepDef(this)
	): void {
		if (GR(this, tar) <= 1) {
			this.stop();
		} else {
			this.MTJ(tar, op, step);
		}
	}
	MTJ_follow(
		tar: Pos,
		op?: FindPathOpts,
		step: number = getMoveStepDef(this)
	): void {
		if (GR(this, tar) <= 1) {
			this.moveTo_follow(tar)
		} else {
			this.MTJ(tar, op, step);
		}
	}
	MTJ_stopAtPos(
		tar: Pos,
		op?: FindPathOpts,
		step: number = getMoveStepDef(this)
	): void {
		if (atPos(this, tar)) {
			this.stop()
		} else if (GR(this, tar) <= 1) {
			this.moveTo_follow(tar)
		} else {
			this.MTJ(tar, op, step);
		}
	}
	MTJ(tar: Pos, op?: FindPathOpts, step: number = getMoveStepDef(this)): void {
		this.crePathFinder?.moveToJudge(tar, op, step);
	}
	getBodies(type: BodyPartConstant): BodyCre[] {
		if (this.body()) {
			return this.body().filter(i => i.type === type);
		} else {
			return [];
		}
	}
	getBodyArray(): BodyPartConstant[] {
		let rtn: BodyPartConstant[] = []
		for (let b of this.master.body) {
			rtn.push(b.type)
		}
		return rtn
	}
	getHealthyBodies(type: BodyPartConstant): BodyCre[] {
		return this.getBodies(type).filter(i => i.hits > 0);
	}
	getBodiesNum(type: BodyPartConstant): number {
		return this.getBodies(type).length;
	}
	getHealthyBodiesNum(type: BodyPartConstant): number {
		return this.getHealthyBodies(type).length;
	}
	/** the Cre[] of this creep is pulling ,include self */
	getPullingTargetList(): Cre[] {
		let pt = this.pullTarget;
		const rtn: Cre[] = [];
		rtn.push(this);
		let w = 20;
		while (pt && validEvent(pt, 1)) {
			w -= 1;
			if (w <= 0) {
				break;
			}
			rtn.push(pt.bePulledOne);
			pt = pt.bePulledOne.pullTarget;
		}
		return rtn;
	}
	/** the Cre[] that is pulling this creep ,include self */
	getBePullingTargetList(): Cre[] {
		let pt = this.bePulledTarget;
		const rtn: Cre[] = [];
		rtn.push(this);
		let w = 10;
		while (pt && validEvent(pt, 1)) {
			w -= 1;
			if (w <= 0) {
				break;
			}
			rtn.push(pt.pullOne);
			pt = pt.pullOne.bePulledTarget;
		}
		return rtn;
	}
	/** all Cre[] pulled this or ,is being pulled by this*/
	getAllPullTargetList(): Cre[] {
		var pt1 = this.getPullingTargetList();
		var pt2 = this.getBePullingTargetList();
		var rtn = pt1.concat(pt2);
		rtn.shift();
		return rtn;
	}
	/** get move and fatigue number of a creep ,all pulling and bePulled will
	 *  be calculate too
	 */
	getMoveAndFatigueNum(extraEnergy: number = 0): {
		moveNum: number;
		bodyNum: number;
		fatigueNum: number;
	} {
		try {
			const pl = this.getAllPullTargetList();
			let moveNum = 0;
			let fatigueNum = 0;
			let bodyNum = 0;
			for (let tar of pl) {
				const tarBody = tar.master.body;
				if (tarBody) {
					const tarMoveNum = tar.getHealthyBodies(MOVE).length;
					const tarBodyNum = tarBody.filter(
						i => i.type !== MOVE && i.type !== CARRY
					).length;
					const tarEnergy = Math.min(
						getEnergy(tar) + extraEnergy,
						getCapacity(tar)
					);
					const notEmptyCarryNum = Math.ceil(tarEnergy / 50);
					moveNum += tarMoveNum;
					const heavyBodyNum = tarBodyNum + notEmptyCarryNum;
					bodyNum += heavyBodyNum;
					if (isTerrainSwamp(tar)) {
						fatigueNum += 10 * heavyBodyNum;
					} else if (isTerrainRoad(tar)) {
						fatigueNum += 1 * heavyBodyNum;
					} else {
						fatigueNum += 2 * heavyBodyNum;
					}
				}
			}
			const rtn = { moveNum: moveNum, bodyNum: bodyNum, fatigueNum: fatigueNum };
			return rtn;
		} catch (ex) {
			P(ex);
			throw new ReferenceError();
		}
	}
	getMoveTimeByTerrain(
		isSwamp: boolean,
		isRoad: boolean = false,
		extraEnergy: number = 0
	): number {
		const mb = this.getMoveAndFatigueNum(extraEnergy);
		const moveNum = mb.moveNum;
		const bodyNum = mb.bodyNum;
		let fatigueMax: number;
		if (isRoad) fatigueMax = bodyNum;
		else if (isSwamp) fatigueMax = bodyNum * 10;
		else fatigueMax = bodyNum * 2;
		const time = Math.max(1, Math.ceil(divide_ab0(fatigueMax, 2 * moveNum, Infinity)));
		return time;
	}
	getMoveTime(extraEnergy: number = 0): number {
		return this.getMoveTimeByTerrain(
			isTerrainSwamp(this),
			isTerrainRoad(this),
			extraEnergy
		);
	}
	getMoveTime_general(): number {
		const timeOnTerrain = this.getMoveTimeByTerrain(false);
		const timeOnSawmp = this.getMoveTimeByTerrain(true);
		return 0.5 * timeOnTerrain + 0.5 * timeOnSawmp;
	}
	getSpeed(): number {
		return 1 / this.getMoveTime();
	}
	getSpeed_general(): number {
		return 1 / this.getMoveTime_general();
	}
	isFullSpeed(): boolean {
		return this.getMoveTime() === 1;
	}
}
/**
 * info of spawn
 */
export class SpawnInfo {
	bodies: BodyPartConstant[];
	role: Role;
	extraMessage: any;
	constructor(bodies: BodyPartConstant[], role: Role) {
		this.bodies = bodies;
		this.role = role;
	}
	toString(): string {
		return this.role.roleName + "(" + this.bodies.length + ")";
	}
}
//Role
export let roleList: Role[] = [];
/**
 * a Role which is decide what a Creep do at every tick
 */
export class Role {
	roleName: string;
	/**the Function that will be called every tick
	 */
	roleFunc: Function | undefined;
	/**
	 * used to calculate CPU cost
	 */
	cpuTime: Event_Number = new Event_Number(0);
	/**
	 * used to calculate CPU cost of move action
	 */
	findPathAndMoveTaskCpuTime: Event_Number = new Event_Number(0);
	constructor(roleName: string, roleFunc: Function) {
		this.roleName = roleName;
		this.roleFunc = roleFunc;
		roleList.push(this);
	}
}
//functions
export function moveToRandomEmptyAround(cre: Cre): void {
	SA(cre, "moveToRandomEmptyAround")
	const poss = getRangePoss(cre, 1);
	const empPoss = poss.filter(i => !blocked(i));
	const pos = ranGet(empPoss);
	if (pos) {
		cre.moveToNormal(pos);
	}
}
/**
 * if a friend stand on the position ,move it to random around
 */
export function moveBlockedCreep(pos: Pos): void {
	const creBlock = findFriendAtPos(pos);
	if (creBlock) {
		//move block creep
		moveToRandomEmptyAround(creBlock);
	}
}
/**
 * get the number of harvestable around
 */
export function getHarvestableAroundNum(pos: Pos): number {
	const hvs = getHarvables()
	const hvas = hvs.filter(i => getRange(pos, i) <= 1);
	return hvas.length;
}
/**
 * get the number of harvestable around
 */
export function hasMovePart(cre: Cre): boolean {
	return cre.getBodies(MOVE).length > 0;
}
/** find friend at the position */
export function findFriendAtPos(pos: Pos): Cre | undefined {
	const fRtn = findGO(pos, Cre)
	if (fRtn && my(<Cre>fRtn))
		return <Cre>fRtn
	else
		return undefined
}
export function findEnemyAtPos(pos: Pos): Cre | undefined {
	const fRtn = findGO(pos, Cre)
	if (fRtn && oppo(<Cre>fRtn))
		return <Cre>fRtn
	else
		return undefined
}
/**
 * has full producer around,that means we can not put energy into it anymore
 */
export function hasFullProducerAround(pos: Pos) {
	const rangePoss = getRangePoss(pos, 1);
	for (let pos of rangePoss) {
		const goList = overallMap.get(pos);
		for (let go of goList) {
			if (isFullProducer(<Unit>go)) {
				return true;
			}
		}
	}
	return false;
}
export function getClosestEnemy(pos: Pos): Cre | undefined {
	return findClosestByRange(pos, enemies);
}
export function moveBlockFriend(pos: Pos): void {
	const creBlock = findFriendAtPos(pos);
	if (creBlock) {
		moveToRandomEmptyAround(creBlock);
	}
}
export function isTerrainRoad(pos: Pos): boolean {
	return hasGO(pos, StructureRoad);
}
export function getStandardOps() {
	return { maxOps: 1000, heuristicWeight: 1.2 };
}
export function getMoveStepDef(cre: Cre): number {
	return 10 * cre.getMoveTime();
}
export function defendInArea(cre: Cre, pos: Pos, range: number): boolean {
	const enInArea = enemies.filter((i) => GR(pos, i) <= range);
	if (enInArea.length > 0) {
		const en = <Cre>cre.findClosestByRange(enInArea);
		cre.MTJ(en);
		return true;
	} else {
		cre.MTJ(pos);
		return false
	}
}
export function isFullProducer(go: Unit) {
	return isProducer(go) && getFreeEnergy(<HasStore>go) === 0;
}
export function getRangePosArr(
	poss: Pos[],
	range: number
): { pos: Pos; range: number }[] {
	return poss.map(i => ({ pos: i, range }));
}
export function protectSelfExtraTaunt(cre: Cre, rate: number = 0.1) {
	const closestEnemyArmy = findClosestByRange(cre, getEnemyThreats());
	closestEnemyArmy.addTauntBonus(rate, "protectSelf", cre);
}
export function hasEnemyArmyAtPos(pos: Pos) {
	if (validPos(pos)) {
		const fRtn = findGO(pos, Cre)
		return fRtn && (<Cre>fRtn).isEnemyArmy()
	} else {
		return false;
	}
}
export function hasCreepAtPos(pos: Pos) {
	if (validPos(pos)) {
		const list = overallMap.get(pos);
		const cc = list.find(i => i instanceof Cre);
		return valid(cc);
	} else {
		return false;
	}
}
export function getEnemyArmies(): Cre[] {
	return enemies.filter(i => i.isEnemyArmy());
}
export function getEnemyThreats(): Cre[] {
	return enemies.filter(i => isEnemyThreat(i));
}
export function hasEnemyAround(pos: Pos, n: number) {
	const enA = enemies.find(i => myGetRange(pos, i) <= n);
	return valid(enA);
}
export function hasEnemyAround_lamb(lamb: (cre: Cre) => boolean, pos: Pos, n: number) {
	const enA = enemies.find(i => myGetRange(pos, i) <= n && lamb(i));
	return valid(enA);
}
export function hasFriendAround(pos: Pos, n: number) {
	const enA = friends.find(i => myGetRange(pos, i) <= n);
	return valid(enA);
}
export function hasOtherFriendAround(cre: Cre, pos: Pos, n: number) {
	const enA = getOtherFriends(cre).find(i => myGetRange(pos, i) <= n);
	return valid(enA);
}
export function hasOppoUnitAround(pos: Pos, n: number) {
	const enA = oppoUnits.find(i => myGetRange(pos, i) <= n);
	return valid(enA);
}
export function isEnemyThreat(cre: Cre) {
	return hasThreat(cre) && oppo(cre);
}
export function hasEnemyThreatAround(pos: Pos, n: number) {
	const enA = enemies.find(i => isEnemyThreat(i) && myGetRange(pos, i) <= n);
	return valid(enA);
}
export function hasEnemyArmyAround(pos: Pos, n: number) {
	const enA = enemies.find(i => i.isEnemyArmy() && myGetRange(pos, i) <= n);
	return valid(enA);
}
export function hasEnemyHealerAround(pos: Pos, n: number) {
	const enA = enemies.find(i => isHealer(i) && myGetRange(pos, i) <= n);
	return valid(enA);
}
export function getRoundEmptyPosLeave1Empty(cre: Pos, containerBlock: boolean = false): Pos | undefined {
	const roundPoss = getRangePoss(cre, 1);
	const emptyRoundPoss = roundPoss.filter(i => !blocked(i, true, false, false, containerBlock));
	if (emptyRoundPoss.length == 1) {
		//leave 1 empty avoid block Creep in 8 blocker
		return undefined
	} else if (emptyRoundPoss.length >= 2) {
		return emptyRoundPoss[0];
	} else
		return undefined
}
export function getRoundEmptyPos(cre: Pos): Pos | undefined {
	const roundPoss = getRangePoss(cre, 1);
	return roundPoss.find(i => !blocked(i));
}
/**
 * move by vector
 */
export function moveByVector(cre: Cre, vec: Pos) {
	const tarPos = plusVector(cre, vec);
	cre.MTJ(tarPos);
}
export function getFriendArmies() {
	return friends.filter(i => i.isArmy());
}
export function getFriendsThreated() {
	return friends.filter(i => hasThreat(i));
}
export function hasThreat(cre: Cre): boolean {
	return cre.getBodies(ATTACK).length + cre.getBodies(RANGED_ATTACK).length > 0;
}
export function getEmptyPosInRange(pos: Pos, range: number) {
	const poss = getRangePoss(pos, range);
	const possEmpty = poss.filter(i => !blocked(i));
	return ranGet(possEmpty);
}
export function isWorker(cre: Cre): boolean {
	return cre.getBodiesNum(CARRY) + cre.getBodiesNum(WORK) > 0
}
export function isHealer(cre: Cre): boolean {
	return cre.getBodiesNum(HEAL) > 0
}
export function isHealer_restrict(cre: Cre): boolean {
	return cre.getBodiesNum(HEAL) > 0 && cre.getBodiesNum(ATTACK) === 0 && cre.getBodiesNum(RANGED_ATTACK) === 0
}
export function isSlowShoter(cre: Cre): boolean {
	let rtn = cre.getBodiesNum(RANGED_ATTACK) > 0 && cre.getBodiesNum(ATTACK) === 0
		&& cre.getSpeed_general() < 1
	SA(cre, "i'm slowShoter")
	return rtn
}
export function is5MA(cre: Cre) {
	return cre.body().length === 6
		&& cre.getBodiesNum(ATTACK) === 1
		&& cre.getBodiesNum(MOVE) === 5
}
/**
 * find the max taunt of Units
 * @param ifHeal if is healer want to find a damaged friend , set this true
 * @param ori the pos of the healer
 */
export function findMaxTaunt<T extends Unit>(
	units: T[],
	ifHeal: boolean = false,
	ori?: Cre | undefined
): { unit: T | undefined; taunt: number } {
	let maxTaunt: number = 0;
	let rtn: T | undefined;
	for (let u of units) {
		let ut = getTaunt(u).value;
		if (ifHeal) {
			if (ori) {
				if (myGetRange(u, ori) <= 1) {
					ut *= getDamagedRate(u);
				} else {
					ut *= 0.33 * getDamagedRate(u);
				}
			} else {
				ut *= getDamagedRate(u);
			}
		}
		if (ut > maxTaunt) {
			maxTaunt = ut;
			rtn = u;
		}
	}
	return { unit: rtn, taunt: maxTaunt };
}
export function sumForceByArr(arr: Unit[], includeRam: boolean = true): StNumber {
	let sum = 0;
	for (let cre of arr) {
		sum += calculateForce(cre, includeRam).value;
	}
	return nst(sum);
}
export function isUnit(a: Attackable): boolean {
	return a instanceof Cre
		|| a instanceof StructureSpawn
		|| a instanceof StructureExtension
		|| a instanceof StructureTower
		|| a instanceof StructureRampart
}
export function getTauntShot(cre: Cre, tar: Attackable): StNumber {
	const RANum = cre.getHealthyBodies(RANGED_ATTACK).length;
	const taunt = isUnit(tar) ? getTaunt(<Unit>tar).value : 0
	const oppoTaunt =
		(tar instanceof Cre ||
			tar instanceof Structure)
			? taunt : 0.2;
	const dmg = 10 * RANum;
	return nst(0.1 * dmg * oppoTaunt);
}
export function getTauntMass(cre: Cre): StNumber {
	const RANum = cre.getHealthyBodies(RANGED_ATTACK).length;
	const oppos = oppoUnits.filter(i => GR(i, cre) <= 3);
	let rtn: number = 0;
	for (let oppo of oppos) {
		const range = GR(oppo, cre);
		let dmg: number;
		if (range === 1) {
			dmg = 10;
		} else if (range === 2) {
			dmg = 4;
		} else {
			dmg = 1;
		}
		const oppoTaunt = getTaunt(oppo).value;
		rtn += 0.1 * RANum * dmg * oppoTaunt;
	}
	return nst(rtn);
}

export function getForce_tradition(cre: Cre) {
	let sum = 0;
	for (let body of cre.body()) {
		const bodyType = body.type;
		const bodyHits = body.hits;
		if (bodyHits > 0) {
			if (bodyType === ATTACK) sum += 3;
			else if (bodyType === RANGED_ATTACK) sum += 2;
			//1*2(Range)
			else if (bodyType === HEAL) sum += 2.6;
			//(1.2+0.4*2(Range))*1.3(outFight)
			else if (bodyType === MOVE) sum += 0.25;
			//health and move
			else if (bodyType === WORK) sum += 0.3;
			//work
			else sum += 0.1; //health
		}
	}
	return sum;
}
export function getHP(cre: Unit, includeRam: boolean = true): StNumber {
	let HP = hits(cre);
	//if in rampart plus rampart HP
	if (inRampart(cre) && includeRam) {
		const ram = <StructureRampart>findGO(cre, StructureRampart)
		if (ram) {
			const ramHP = hits(ram);
			HP += ramHP;
		}
	}
	return nst(0.001 * HP);
}
/**
 * calculate force of a cre,the higher hp and dps the cre has
 * the higher force it will be
 */
export function calculateForce(cre: Unit, includeRam: boolean = true): StNumber {
	let rtn: number
	if (cre instanceof Cre) {
		const tarCal = includeRam ? cre.cal_force_includeRam : cre.cal_force_not_includeRam
		if (tarCal && tarCal.validEvent()) {
			return nst(tarCal.num)
		}
		//
		const forceTradition = 0.1 * getForce_tradition(<Cre>cre);
		const HP: number = getHP(cre, includeRam).value
		const dps = getDps(cre, false, true).value;
		//if is 10M6A HP=1600 dps=180
		//tradition=2.5+18=20.5
		//new=0.05*sqrt(1600*180)=0.05*40*13.5=0.05*540=27
		const force_new = Math.sqrt(dps * HP)
		rtn = 0.8 * force_new + 0.2 * forceTradition;
		if (includeRam)
			cre.cal_force_includeRam = new Event_Number(rtn)
		else
			cre.cal_force_not_includeRam = new Event_Number(rtn)
	} else {
		const str: Structure = <Structure>cre
		if (isMyRampart(str)) {
			rtn = 2 * getHPRate(str);
		} else if (isOppoRampart(str)) {
			rtn = 2 * getHPRate(str);
		} else if (isMySpawn(str)) {
			rtn = 1 * getHPRate(str);
		} else if (isOppoSpawn(str)) {
			rtn = 1 * getHPRate(str);
		} else
			rtn = 0;
	}
	return nst(rtn)
}
export function hasOppoUnitsAround(pos: Pos, range: number = 1) {
	const en = oppoUnits.find(i => myGetRange(i, pos) <= range);
	if (en) {
		return true;
	} else {
		return false;
	}
}
export function exchangePos(cre0: Cre, cre1: Cre) {
	SA(cre0, "exchangePos" + COO(cre0) + " " + COO(cre1))
	SA(cre1, "exchangePos" + COO(cre0) + " " + COO(cre1))
	if (GR(cre0, cre1) <= 1) {
		cre0.moveToNormal(cre1);
		cre1.moveToNormal(cre0);
	}
}
export let enRamAroundCost: number = 30;
export function setEnRamAroundCost(n: number) {
	enRamAroundCost = n;
}

/**
 * any thing use energy will be regard as a producer
 * such as builder
 */
export function isProducer(unit: Unit): boolean {
	return my(unit) &&
		(unit instanceof StructureSpawn ||
			unit instanceof StructureExtension ||
			(unit instanceof Cre &&
				isWorkingBuilder(<Cre>unit)
			)
		)
}
export function isEnemyProducer(unit: Unit): boolean {
	return oppo(unit) &&
		(unit instanceof StructureSpawn ||
			unit instanceof StructureExtension ||
			(unit instanceof Cre &&
				unit.getBodiesNum(WORK) > 0
			)
		)
}
export function isWorkingBuilder(cre: Cre): boolean {
	return cre.getHealthyBodiesNum(CARRY) >= 1
		&& cre.getHealthyBodiesNum(WORK) >= 1
		&& (cre.macro ? cre.macro.getIsWorking() : false)
		&& (cre.macro ? cre.macro.getIsBuilding() : false)
}
export function getMyProducers(): Producer[] {
	return <Producer[]>myUnits.filter(i => isProducer(i));
}
export function getEnemyProducers(): Producer[] {
	return <Producer[]>oppoUnits.filter(i => isEnemyProducer(i));
}
export let spawnExtraTaunt: number = 4
export function set_spawnExtraTaunt(se: number) {
	spawnExtraTaunt = se
}
/**
 * the higher dps and lower hp will increase the taunt of the Creep
 */
export function getTaunt(cre: Unit, valueMode: boolean = false): StNumber {
	if (cre instanceof Cre) {
		const tarCal = valueMode ? cre.cal_taunt_value : cre.cal_taunt_fight
		if (tarCal && tarCal.validEvent()) {
			return nst(calExtraTaunt(cre, tarCal.num))
		}
	}
	let HP = getHP(cre).value;
	//
	const dps = getDps(cre, valueMode).value;
	// SA(cre, "dps=" + dps);
	// SA(cre, "HP=" + HP);
	let rtn = 0;
	if (HP > 0) {
		let bias = 0.1 * calculateForce(cre).value;
		if (valueMode && cre instanceof Cre) {
			HP *= 1 + cre.getSpeed_general()
		}
		rtn = 0.1 * dps / (HP + bias);
	} else {
		rtn = 0;
		return nst(rtn);
	}
	//calculate the enemy approach my Spawn
	if (oppo(cre)) {
		const r = GR(cre, spawnPos);
		const vr = X_axisDistance(cre, spawnPos)
		const spawnScanRange = 7
		const spawnVertiScanRange = 10
		if (r <= 1) {
			rtn *= 5 * spawnExtraTaunt;
		} else if (r <= spawnScanRange) {
			// SA(cre,"increased taunt");
			rtn *= spawnExtraTaunt;
		} else if (X_axisDistance(cre, spawnPos) <= spawnVertiScanRange) {
			rtn *= 0.5 * spawnExtraTaunt
		}
	}
	//surfaceTaunt
	if (cre instanceof Cre && !inRampart(cre)) {
		const creCre = <Cre>cre;
		const sb = getSurfaceBody(creCre);
		const rate1 = 0.9;
		const rate2 = 0.3;
		if (sb.type === ATTACK) {
			rtn = rate1 * rtn + rate2 * 1;
		} else if (sb.type === RANGED_ATTACK) {
			rtn = rate1 * rtn + rate2 * 0.5;
		} else if (sb.type === HEAL) {
			rtn = rate1 * rtn + rate2 * 0.5;
		} else {
			rtn = rate1 * rtn;
		}
	}
	//extra taunt
	rtn = calExtraTaunt(cre, rtn)
	if (cre instanceof Cre) {
		if (valueMode)
			cre.cal_taunt_value = new Event_Number(rtn)
		else
			cre.cal_taunt_fight = new Event_Number(rtn)
	}
	return nst(rtn);
}
function calExtraTaunt(cre: Unit, taunt: number): number {
	if (cre instanceof Cre) {
		const creCre = <Cre>cre;
		const et = creCre.getTauntBonus();
		const eLimit0 = 0;
		const eLimit5 = 5;
		let etSum = 0
		for (let ne of et) {
			if (validEvent(ne, eLimit0)) {
				etSum += ne.num;
			} else if (validEvent(ne, eLimit5)) {
				etSum += 0.1 * ne.num;
			}
			// SAN(cre,"exT",ne.num)
			// SAN(cre,"tick",ne.tick)
		}
		// SAN(cre, "etSum", etSum)
		taunt *= 1 + etSum
		removeIf(et, ne => !validEvent(ne, eLimit5));
	}
	return taunt
}
export function getSpawnAroundFreeContainers() {
	return containers.filter(i =>
		GR(i, spawnPos) <= 1
		&& getFreeEnergy(i) > 0
	)
}
export function getSpawnAroundLiveContainers() {
	return containers.filter(i =>
		GR(i, spawnPos) <= 1
		&& getEnergy(i) > 0
	)
}
export function getHealthyBodies_total(cre: Cre) {
	return cre.body().filter(i => i.hits > 0);
}
export function getSurfaceBody(cre: Cre) {
	const hbs = getHealthyBodies_total(cre);
	return hbs[0];
}
export function getOtherFriends(cre: Cre): Cre[] {
	return friends.filter(i => i !== cre);
}
/** called every tick to control all friend Creeps */
export function controlCreeps() {
	P("control creeps start")
	const listNeedUseTask = [...friends]
	listNeedUseTask.sort((a, b) => b.taskPriority - a.taskPriority)
	for (let cre of listNeedUseTask) {
		if (cre.master.spawning) {
			continue;
		}
		const st = ct();
		try {
			useTasks(cre)
		} catch (ex) {
			P(ex);
		}
		const dt = et(st);
		if (cre.role)
			calEventNumberCPUTime(cre.role, dt);
	}
	//
	for (let r of roleList) {
		//creep
		if (r.cpuTime && r.cpuTime.invokeTick === getTicks() && r.cpuTime.num > 1000) {
			ptSum(r.roleName, r.cpuTime.num);
		}
	}
	P("control creeps end")
}

/**
 *  used to sum the cpuTime in one tick
 */
export function calEventNumberCPUTime(role: Role, num: number, isCPUTime: boolean = true): void {
	const ev = isCPUTime ? role.cpuTime : role.findPathAndMoveTaskCpuTime
	if (ev.invokeTick === getTicks()) {
		ev.num += num;
	} else {
		if (isCPUTime) {
			role.cpuTime = new Event_Number(num);
		} else {
			role.findPathAndMoveTaskCpuTime = new Event_Number(num);
		}
	}
}
export let spawnDps = 300
export function set_spawnDps(sd: number) {
	spawnDps = sd
}
export function getWinOneRemain(a: number, b: number): number {
	const winSignal = Math.sign(a - b)
	return Math.sqrt(winSignal * (
		pow2(a) - pow2(b)
	))
}
export function getEarning(myForce: number, enemyForce: number): StNumber {
	const winOneRemain = getWinOneRemain(myForce, enemyForce)
	const loseOneExtra = myForce > enemyForce ? enemyForce : -myForce
	const winOneExtra = myForce > enemyForce ?
		-(myForce - winOneRemain) :
		(enemyForce - winOneRemain)
	return nst(0.5 * (loseOneExtra + winOneExtra))
}
export function getEarning_value(myForce: number, myValue: number, enemyForce: number, enemyValue: number): StNumber {
	const winOneForce = myForce > enemyForce ? myForce : enemyForce
	const winOneRemain = getWinOneRemain(myForce, enemyForce)
	const winOneRemainRate = divide0(winOneRemain, winOneForce)
	const loseOneExtra = myForce > enemyForce ? enemyValue : -myValue
	const winOneExtra = myForce > enemyForce ?
		-myValue * (1 - winOneRemainRate) :
		enemyValue * (1 - winOneRemainRate)
	return nst(0.5 * (loseOneExtra + winOneExtra))
}
/**
 * get DPS of a Creep ,DPS of Structure represent the threat of it
 */
export function getDps(cre: Unit, valueMode: boolean = false, byCalculateForce: boolean = false): StNumber {
	let rtn: number
	if (exist(cre)) {
		if (cre instanceof Cre) {
			const cr: Cre = <Cre>cre;
			let rateT
			let rateH
			if (byCalculateForce) {
				rateT = 0.1
				rateH = 0.9
			} else {
				rateT = 0.5
				rateH = 0.5
			}
			const attackNum =
				rateT * cr.getBodies(ATTACK).length +
				rateH * cr.getHealthyBodies(ATTACK).length;
			const rangedAttackNum =
				rateT * cr.getBodies(RANGED_ATTACK).length +
				rateH * cr.getHealthyBodies(RANGED_ATTACK).length;
			const healNum =
				rateT * cr.getBodies(HEAL).length +
				rateH * cr.getHealthyBodies(HEAL).length;
			const buildNum =
				rateT * cr.getBodies(WORK).length +
				rateH * cr.getHealthyBodies(WORK).length;
			const moveNum =
				rateT * cr.getBodies(MOVE).length +
				rateH * cr.getHealthyBodies(MOVE).length;
			const carryNum =
				rateT * cr.getBodies(CARRY).length +
				rateH * cr.getHealthyBodies(CARRY).length;
			const toughNum =
				rateT * cr.getBodies(TOUGH).length +
				rateH * cr.getHealthyBodies(TOUGH).length;
			if (valueMode) {//value mode
				rtn = 8 * attackNum +
					15 * rangedAttackNum +
					25 * healNum +
					10 * buildNum +
					5 * moveNum +
					5 * carryNum +
					1 * toughNum;
			} else {//battle mode
				rtn = 30 * attackNum +
					12 * rangedAttackNum +
					15 * healNum +
					3 * buildNum +
					1 * moveNum +
					4 * carryNum +
					0.1 * toughNum;
			}
		} else if (cre instanceof StructureRampart) {
			rtn = 0.5;
		} else if (cre instanceof StructureSpawn) {
			let totalForce;
			if (my(cre)) {
				totalForce = sumForceByArr(getFriendArmies()).value;
			} else {
				totalForce = sumForceByArr(getEnemyArmies()).value;
			}
			rtn = spawnDps * (1 + 0.5 * totalForce)
		} else if (cre instanceof StructureExtension) {
			const enBonus = 1 + 2 * getEnergy(cre) / 100;
			rtn = 13 * enBonus;
		} else {
			rtn = 1;
		}
	} else
		rtn = 0;
	return nst(0.03 * rtn)
}
export function getArmies() {
	return cres.filter(i => i.isArmy());
}
export function myGO(go: GO) {
	if (go instanceof Cre) {
		return my(go)
	} else {
		return isMyGO(go)
	}
}
export function my(u: Unit): boolean {
	if (u instanceof Cre) {
		return u.master.my
	} else {
		return u.my;
	}
}
export function oppo(u: Unit): boolean {
	return !my(u)
}
//Attackables
export function getDamagedRate(a: Attackable): number {
	if (valid(a) && hitsMax(a) != 0) return (hitsMax(a) - hits(a)) / hitsMax(a);
	else return 0;
}
export function getHPRate(a: Attackable): number {
	if (valid(a) && hitsMax(a) != 0) return hits(a) / hitsMax(a);
	else return 0;
}
export function getEnergy(a: HasEnergy): number {
	if (exist(a)) {
		if (a instanceof Resource) {
			return a.amount;
		} else {
			return a.store[RESOURCE_ENERGY];
		}
	} else
		return 0;
}
export function live(go: HasEnergy) {
	return getEnergy(go) > 0;
}
export function getEmptyCapacity(cre: HasStore): number {
	return getFreeEnergy(cre);
}
export function getCapacity(cre: HasStore): number {
	let rtn = cre.store.getCapacity(RESOURCE_ENERGY);
	return rtn ? rtn : 0;
}
export function getFreeEnergy(cre: HasStore): number {
	const rtn = cre.store.getFreeCapacity(RESOURCE_ENERGY);
	return rtn ? rtn : 0;
}
export function hitsMax(unit: Attackable): number {
	if (unit.hitsMax)
		return unit.hitsMax;
	else
		return 0;
}
export function hits(unit: Attackable): number {
	if (unit.hits) {
		return unit.hits;
	} else {
		return 0;
	}
}
export function getExist<E extends Cre | GameObject | null | undefined>(cre: E): E | undefined {
	return exist(cre) ? cre : undefined
}
export function exist(cre: Cre | GameObject | null | undefined): boolean {
	if (cre)
		return cre.exists;
	else
		return false;
}
export function damaged(cre: Attackable) {
	if (cre) return hits(cre) < hitsMax(cre);
	else return false;
}

/**
 *  resouce and outside not empty containers and not containers at enemy base
 *  include be droped on the ground in one tick
 */
export function getHarvablesIncludeDrop(): Harvable[] {
	//resouce and outside/my not empty containers
	return (<Harvable[]>resources).concat(
		containers.filter(
			i => i.exists && getEnergy(i) > 0 && !isOppoContainer(i)
		)
	);
}
export let isTurtleContainer: boolean = false
export function setIsTurtleContainer(b: boolean) {
	isTurtleContainer = b
}
/**
 *  resouce and outside not empty containers and not containers at enemy base
 */
export function getHarvables(): Harvable[] {
	return (<Harvable[]>getRess().filter(i => validRes(i))).concat(
		containers.filter(i =>
			exist(i)
			&& getEnergy(i) > 0
			&& !isOppoContainer(i)
			&& !(
				GR(i, spawnPos) <= 1
				&& (
					getFreeEnergy(spawnPos) === 0
					|| isTurtleContainer
				)
			)
		)
	);
}
/**
 * calculate energy around
 */
export function calAroundEnergy(pos: Pos) {
	let sources = getHarvables().filter(i => myGetRange(pos, i) <= 1);
	let sum: number = 0;
	for (let sou of sources) {
		sum += getEnergy(sou);
	}
	return sum;
}
export function myContainersEnergy() {
	let myContainers = getMyContainers();
	let sum = 0;
	for (let con of myContainers) {
		sum += getEnergy(con);
	}
	return sum;
}
//@Game

export function id(o: GO): number {
	if (o) return parseInt(o.id);
	return -1;
}

export function isMyTick(cre: GO, n: number) {
	return getTicks() % n === id(cre) % n;
}

export function isTerrainWall(pos: Pos) {
	return getTerrainAt(pos) === TERRAIN_WALL;
}
export function isTerrainSwamp(pos: Pos) {
	return getTerrainAt(pos) === TERRAIN_SWAMP;
}

/**
 * the weight of enemy `ATTACK` and `RANGED_ATTACK` num
 * 0 is no `ATTACK`,1 is all `ATTACK`
 */
export function enemyAWeight(): number {
	let a = enemyAttackNum();
	let ra = enemyRangedAttackNum();
	if (a + ra === 0) {
		return 1;
	} else return a / (a + ra);
}
export function enemyRangedAttackNum(): number {
	let sum = 0;
	for (let en of enemies) {
		let enemyAttackNum = en.getBodies(RANGED_ATTACK).length;
		sum += enemyAttackNum;
	}
	return sum;
}
export function enemyAttackNum(): number {
	let sum = 0;
	for (let en of enemies) {
		let enemyAttackNum = en.getBodies(ATTACK).length;
		sum += enemyAttackNum;
	}
	return sum;
}
export function getBodyArrayOfCreep(creep: Creep): BodyPartConstant[] {
	let rtn: BodyPartConstant[] = []
	for (let b of creep.body) {
		rtn.push(b.type)
	}
	return rtn
}
export class Battle {
	master: Cre
	/** the position of this creep last tick*/
	hisPos: Event_Pos
	/** the current velocity of the creep */
	velocity: Event_Pos = new Event_Pos(pos00);
	// isFighting:boolean=false
	tauntBonus: ExtraTauntEvent[] = [];

	constructor(cre: Cre) {
		this.master = cre
		this.hisPos = new Event_Pos({ x: this.master.x, y: this.master.y });
		this.velocity = new Event_Pos(pos00)
		this.tauntBonus = [];
	}
	/**predict the position of this Cre*/
	predictOppo() {
		const nowPos = this.master;
		const hisPos: Pos = this.hisPos.pos;
		const deltaPos = minusVector(nowPos, hisPos);
		const step = 3;
		this.increaseVelocity(deltaPos, 1 - 1 / step);
	}
	/** try shot or rangedHeal */
	shotAndRestore(): boolean {
		// SA(this.master, "shotAndRestore");
		let tars = oppoUnits.filter(i => myGetRange(this.master, i) <= 3);
		let tarFriends = friends.filter(i => myGetRange(this.master, i) <= 3);
		let UTShot = findMaxTaunt(tars);
		let UTHeal = findMaxTaunt(tarFriends, true, this.master);
		let RANum = this.master.getHealthyBodies(RANGED_ATTACK).length;
		let HNum = this.master.getHealthyBodies(HEAL).length;
		let tarShot = UTShot.unit;
		let tarHeal = UTHeal.unit;
		if (tarHeal && tarShot && myGetRange(this.master, tarHeal) >= 2) {
			//will conflict
			let useShot: boolean =
				10 * RANum * UTShot.taunt > 12 * HNum * UTHeal.taunt;
			if (useShot) {
				//use shot
				// SA(this,"use shot")
				if (tarShot != undefined && exist(tarShot)) {
					this.shotTargetJudgeIfMass(tarShot);
					return true;
				}
			} else {
				//use heal
				// SA(this,"use heal")
				if (tarHeal != undefined && exist(tarHeal)) {
					this.healTar(tarHeal);
					return true;
				}
			}
		} else {
			//use both
			// SA(this,"use both")
			if (HNum > 0 && tarHeal != undefined && exist(tarHeal)) {
				this.healTar(tarHeal);
				return true;
			}
			if (RANum > 0 && tarShot != undefined && exist(tarShot)) {
				this.shotTargetJudgeIfMass(tarShot);
				return true;
			}
		}
		return false;
	}
	/** ranged attack static, will find fit enemy  */
	shot(): boolean {
		if (this.master.getBodies(RANGED_ATTACK).length > 0) {
			let tars = oppoUnits.filter(i => myGetRange(this.master, i) <= 3);
			let tar = findMaxTaunt(tars).unit;
			if (tar != undefined && exist(tar)) {
				this.shotTargetJudgeIfMass(tar);
				return true;
			}
		}
		return false;
	}
	/**flee from all enemy threated*/
	flee_weak(range: number = 5, FleeRange: number = 13): boolean {
		const cre = this.master
		SA(cre, "try flee_weak")
		const meleeScanRange = range
		const shotScanRange = range + 2
		const roundEnemyAttackers = enemies.filter(i => GR(i, cre) <= meleeScanRange
			&& i.getBodiesNum(ATTACK) > 0)
		const roundEnemyShoters = enemies.filter(i => GR(i, cre) <= shotScanRange
			&& i.getBodiesNum(RANGED_ATTACK) > 0)
		if (roundEnemyAttackers.length + roundEnemyShoters.length > 0) {
			const scanTars = roundEnemyAttackers.concat(roundEnemyShoters)
			const fleeRangeAfterCal = roundEnemyShoters.length > 0 ? FleeRange + 2 : FleeRange
			const tarOOA = getRangePosArr(scanTars, FleeRange);
			const sRtn = getDecideSearchRtnNoArea(this.master, tarOOA, {
				flee: true,
				plainCost: this.master.getMoveTimeByTerrain(false),
				swampCost: this.master.getMoveTimeByTerrain(true),
			});
			const sp = sRtn.path;
			drawPolyLight(sp);
			if (sp.length > 0) {
				this.master.moveToNormal(sp[0]);
				return true;
			}
		}
		return false
	}
	/**flee from enemy that stronger than this*/
	flee(range: number = 4, FleeRange: number = 7): boolean {
		SA(this.master, "try flee")
		const cre = this.master
		let ensArmyAround = getEnemyArmies().filter(i => GR(i, this.master) <= range);
		let ensThreatAround = getEnemyThreats().filter(i => GR(i, this.master) <= range);
		let ensAround;
		if (ensThreatAround.length === 0) {
			ensAround = ensThreatAround
		} else {
			ensAround = ensArmyAround
		}
		if (ensAround.length > 0) {
			const mapForce = getForceMapValue(cre)
			const mapForceExtra = - mapForce
			const enFSum = sumForceByArr(ensAround).value;
			const myForce = calculateForce(this.master).value
			const oldExtra = enFSum - myForce
			const fleeRate = oldExtra + mapForceExtra
			const ifSelfNotThreated = !hasThreat(cre)
			if (ifSelfNotThreated || fleeRate > 0) {
				SA(cre, "fleeing")
				let tarOOA = getRangePosArr(ensAround, FleeRange);
				let sRtn = getDecideSearchRtnNoArea(this.master, tarOOA, {
					flee: true,
					plainCost: this.master.getMoveTimeByTerrain(false),
					swampCost: this.master.getMoveTimeByTerrain(true),
				});
				let sp = sRtn.path;
				drawPolyLight(sp);
				if (sp.length > 0) {
					this.master.moveToNormal(sp[0]);
					return true;
				} else {
					SA(cre, "no path")
				}
			} else {
				SA(cre, "no need")
			}
		} else {
			SA(cre, "no en")
		}
		return false;
	}
	/**is enemy creep that has melee or ranged or heal*/
	isEnemyArmy(): boolean {
		return this.isArmy() && oppo(this.master);
	}
	/** heal static */
	restore() {
		if (this.master.getBodies(HEAL).length > 0) {
			let tars = friends.filter(i => myGetRange(this.master, i) <= 3);
			let tar = findMaxTaunt(tars, true, this.master).unit;
			if (tar != undefined && exist(tar)) {
				this.healTar(tar);
			}
		}
	}
	/**  heal target static*/
	healTar(tar: Cre): boolean {
		SA(this.master, "healTar");
		if (exist(tar)) {
			let range = myGetRange(this.master, tar);
			if (range > 1 && range <= 3) {
				//if range 2 or 3,
				this.master.master.rangedHeal(tar.master);
				return true;
			} else {
				//if range==1 heal it
				this.master.master.heal(tar.master);
				return true;
			}
		}
		return false;
	}
	/** find the predict pos of the specific rate*/
	findPredictPos(rate: number, maxRange: number = 3): Pos {
		const deltaPredictPos = this.master.deltaPredictPos;
		// if (deltaPredictPos) {
		const ratedDeltaPredictPos = multiplyVector(deltaPredictPos, rate);
		const roundedRatedDeltaPredictPos = roundVector(ratedDeltaPredictPos)
		const inRangedPredictPos = inRangeVector(roundedRatedDeltaPredictPos, maxRange)
		return plusVector(this.master, inRangedPredictPos);
		// } else {
		// 	return this.master;
		// }
	}
	inRangeVector(vec: Pos, maxRange: number): Pos {
		const x = vec.x;
		const y = vec.y;
		const ax = Math.abs(x)
		const ay = Math.abs(y)
		if (ax <= maxRange && ay <= maxRange) {
			return { x: x, y: y }
		} else if (ax > ay) {
			const rate = divide0(maxRange, ax)
			return multiplyVector(vec, rate)
		} else {
			const rate = divide0(maxRange, ay)
			return multiplyVector(vec, rate)
		}
	}
	// /** find the predict position of `tar` */
	// findPredictPosByCre(tar: Cre): Pos {
	// 	let r = exist(tar) ? myGetRange(this.master, tar) : 1;
	// 	let rate = sigmoidUWH(r, 18, 20); //rate=0-10,r=0-9
	// 	SA(tar, "predict Rate=" + DND2(rate));
	// 	return tar.battle ? tar.battle.findPredictPos(rate) : tar;
	// }
	/** calculate velocity */
	increaseVelocity(deltaPos: Pos, decayRate: number) {
		const veloAfterPlus = plusVector(this.velocity.pos, deltaPos);
		this.velocity = new Event_Pos(multiplyVector(veloAfterPlus, decayRate));
	}
	/** get the predict pos */
	getPrePosInRange1() {
		const hisPos = this.hisPos.pos;
		const nowPos = this.master;
		const nmh = minusVector(nowPos, hisPos);
		const rtn = plusVector(nowPos, nmh);
		drawLineComplex(this.master, rtn, 0.25, "#00ff66");
		return rtn;
	}
	/** set the `hisPos` of the creep */
	setHisPos() {
		this.hisPos = new Event_Pos({ x: this.master.x, y: this.master.y });
	}
	/**
	 * creep that has {@link ATTACK} or {@link RANGED_ATTACK} or {@link HEAL}
	 */
	isArmy(): boolean {
		let bodies: BodyCre[] = this.master.body();
		if (bodies) {
			for (let body of bodies) {
				if (
					body.type === ATTACK ||
					body.type === RANGED_ATTACK ||
					body.type === HEAL
				) {
					return true;
				}
			}
			return false;
		} else return false;
	}
	/**melee attack if enemies in ranged 1*/
	melee(): boolean {
		// SA(this,"melee 1")
		if (this.master.getBodies(ATTACK).length > 0) {
			// SA(this,"melee 2")
			let tars = oppoUnits.filter(i => myGetRange(this.master, i) <= 1);

			let tar = findMaxTaunt(tars).unit;
			if (tar != undefined && exist(tar)) {
				// SA(this,"melee 3")
				this.attackNormal(tar);
				return true;
			} else if (getGuessPlayer() === Kerob) {
				const wallTar = walls.find(i => Adj(i, this.master))
				if (wallTar) {
					SA(this.master, "AW")
					this.attackNormal(wallTar);
				}
			}
		}
		return false;
	}
	/**do attack ,ranged ,heal at the same tick,will judge which to use
	 * when conflict
	*/
	fight(): boolean {
		SA(this.master, "fight")
		if (hasOppoUnitAround(this.master, 1)
			|| getGuessPlayer() === Kerob && walls.find(i => Adj(i, this.master)) !== undefined) {
			//if can attack
			if (this.master.getHealthyBodies(ATTACK).length > 0) {
				let tars1 = oppoUnits.filter(i => GR(this.master, i) <= 1);
				let ANum = this.master.getHealthyBodies(ATTACK).length;
				//find max taunt
				let tauntA = 30 * ANum * findMaxTaunt(tars1).taunt;
				//targets in range 3
				// let tars3 = oppoUnits.filter(i => myGetRange(this.master, i) <= 3);
				// let RANum = this.master.getHealthyBodies(RANGED_ATTACK).length;
				// //taunt of rangedAttack
				// let tauntR = 10 * RANum * findMaxTaunt(tars3).taunt;
				//
				let tarFriends = friends.filter(i => myGetRange(this.master, i) <= 3);
				let HNum = this.master.getHealthyBodies(HEAL).length;
				//taunt of heal
				let tauntH = 12 * HNum * findMaxTaunt(tarFriends, true, this.master).taunt;
				if (tauntA >= tauntH || this.master.pureMeleeMode) {
					// if (tauntA + tauntR >= tauntR + tauntH) {
					// SA(this.master, "melee and shot");
					let successMelee = this.melee();
					let successShot = this.shot();
					return successMelee || successShot;
				} else {
					// SA(this.master, "sr1");
					return this.shotAndRestore();
				}
			} else {
				// SA(this.master, "sr2");
				return this.shotAndRestore();
			}
		} else {
			// SA(this.master, "sr3");
			return this.shotAndRestore();
		}
	}
	/**attack wall*/
	attackWall() {
		if (this.master.getHealthyBodies(ATTACK).length > 0) {
			const w = walls.find(i => GR(i, this.master) <= 1);
			if (w)
				this.attackNormal(w);
		}
		if (this.master.getHealthyBodies(RANGED_ATTACK).length > 0) {
			const w = walls.find(i => GR(i, this.master) <= 3);
			if (w)
				this.shotTarget(w);
		}
	}
	/**attack normal*/
	attackNormal(tar: Attackable): boolean {
		if (myGetRange(this.master, tar) <= 1) {
			this.master.master.attack(tar instanceof Cre ? tar.master : tar);
			return true
		} else
			return false
	}
	/**ranged attack normal*/
	shotTarget(tar: Attackable): void {
		SA(this.master, "shotTarget " + COO(tar));
		if (myGetRange(this.master, tar) <= 3) {
			this.master.master.rangedAttack(tar instanceof Cre ? tar.master : tar);
		}
	}
	/** shot round ,if range is 1 , mass attack */
	shotTargetJudgeIfMass(tar: Attackable) {
		SA(this.master, "shotTargetJudgeIfMass");
		let tauntMass: number = getTauntMass(this.master).value;
		let tauntShot: number = getTauntShot(this.master, tar).value;
		if (myGetRange(this.master, tar) <= 1 || tauntMass > tauntShot) {
			this.master.master.rangedMassAttack();
		} else {
			this.shotTarget(tar);
		}
	}
}
const notDropLimitTick = 420
export class Macro {
	master: Cre
	/** if is producer */
	isProducer: boolean = false;
	constructor(cre: Cre) {
		this.master = cre
	}
	setIsWorking(b: boolean): void {
		this.findBuildingTask().isWorking = b
	}
	getIsWorking(): boolean {
		return this.findBuildingTask().isWorking
	}
	/** find BuildingTask*/
	findBuildingTask(): BuildingTask {
		const cre = this.master
		const bt = <BuildingTask | undefined>findTask(cre, BuildingTask);
		if (bt === undefined) {
			return new BuildingTask(cre);
		} else {
			return bt
		}
	}
	/** fill extension static*/
	fillExtension(): boolean {
		const ext = <StructureExtension | undefined>(
			myStructures.find(
				i =>
					i instanceof StructureExtension &&
					myGetRange(i, this.master) <= 1 &&
					getFreeEnergy(i) > 0
			)
		);
		if (ext) {
			this.transferNormal(ext);
			return true;
		}
		return false;
	}
	/**build standard*/
	build_std() {
		const css = getMyCSs().filter(i => canBeBuildByCre(i, this.master));
		const cs = getMaxWorthCSS(css);
		this.buildStatic();
		if (cs && GR(cs, this.master) > 3) {
			this.master.MTJ(cs);
		} else {
			this.master.stop();
		}
	}
	/** build static*/
	buildStatic(): CS | undefined {
		const css = getMyCSs().filter(
			i => GR(i, this.master) <= 3 && canBeBuildByCre(i, this.master)
		);
		const cs = getMaxWorthCSS(css);
		if (cs)
			SA(cs, "buildStatic cs here")
		else
			SA(this.master, "no cs")
		if (cs) {
			if (getIsBuilding(this.master)) {
				SA(this.master, "normalBuild")
				this.normalBuild(cs);
			} else {
				SA(this.master, "withDrawStatic")
				if (!this.withDrawStatic()) {
					setIsBuilding(this.master, true)
				}
			}
		}
		return cs;
	}
	/** normal transfer  */
	transferNormal(tar: HasStore): boolean {
		SA(this.master, "transferNormal " + S(tar))
		return this.master.master.transfer(
			tar instanceof Cre ?
				tar.master
				: tar
			, RESOURCE_ENERGY) === OK;
	}
	/**transfer energy to target*/
	transferTarget(tar: HasStore): boolean {
		SA(this.master, "transferTarget " + S(tar))
		if (GR(this.master, tar) <= 1) {
			return this.transferNormal(tar)
		} else {
			return false;
		}
	}
	/**move and pick up resource*/
	directPickUp(resource: Resource) {
		this.master.master.pickup(resource);
		this.master.MTJ(resource);
	}
	/**find a fit producer*/
	findFitProducer(): Producer | undefined {
		// calculate worth of free producer
		const myProducers: Producer[] = getMyProducers()
		let maxWorth: number = -Infinity
		let maxWorthTarget: Producer | undefined
		for (let producer of myProducers) {
			const sRtnFree = this.master.getDecideSearchRtnByCre(producer)
			const costFree = sRtnFree.cost;
			let typeRate: number
			if (producer instanceof Cre) {
				typeRate = 0.12
			} else if (producer instanceof StructureSpawn) {
				typeRate = 1
			} else if (producer instanceof StructureExtension) {
				if (GR(producer, spawnPos) <= 7) {
					typeRate = 0.75
				} else {
					typeRate = 0.5
				}
			} else {
				typeRate = 0
			}
			const fullRate: number = getFreeEnergy(producer) > 0 ? 8 : 1
			const worth = typeRate * fullRate / (1 + costFree);
			if (worth > maxWorth) {
				maxWorth = worth
				maxWorthTarget = producer
			}
		}
		return maxWorthTarget
	}
	/** transport to producer ,free producer will be transfered prior */
	transToProducers(): boolean {
		SA(this.master, "transToProducers");
		const tar = this.findFitProducer()
		if (tar) {
			drawLineLight(this.master, tar);
			if (getFreeEnergy(tar) === 0) {
				//if producer is full
				this.directDrop(tar); //drop at producer
			} else {
				//if not full,transfer to it
				return this.directTransfer(tar);
			}
		}
		return false;
	}
	/**transport to target producer*/
	transToTargetProducer(tar: Producer): boolean {
		SA(this.master, "transToTargetProducer " + S(tar))
		drawLineComplex(this.master, tar, 0.25, "#22ee22");
		if (GR(this.master, tar) <= 1) {
			//if producer is full,drop at producer
			if (getFreeEnergy(tar) === 0) {
				if (tick <= notDropLimitTick) {
					SA(this.master, "stop" + S(tar))
					this.master.stop()
				} else {
					SA(this.master, "dropEnergy" + S(tar))
					this.dropEnergy();
				}
				return true;
				//if not full,transfer to it
			} else {
				return this.transferTarget(tar); //
			}
		} else
			return false;
	}
	/**move and harvest target*/
	directHarve(har: Harvable | null) {
		//TODO back to base
		if (har === null) return null;
		if (getFreeEnergy(this.master) === 0) {
			return this.transToProducers();
		} else {
			return this.directWithdraw(har);
		}
	}
	/** find harvestable and harve */
	harve(ifOutSide: boolean = false) {
		let harvestables = getHarvables();
		let liveHarvable = harvestables.filter(i => getEnergy(i) > 0);
		let harvestable = findClosestByRange(this.master, liveHarvable);
		return this.directHarve(harvestable);
	}
	/**
	 * refresh the decayEvent of {@link CS} ,
	 * the {@link CS} that long time not be build
	 * will have a low worth
	 */
	normalBuild(cs: ConstructionSite): CreepActionReturnCode | -6 {
		let theCreep = this.master.master
		SA(theCreep, "normalBuild")
		SA(theCreep, "theCreep=" + S(theCreep))
		SA(theCreep, "cs=" + S(cs))
		let rtn = theCreep.build(cs);
		SA(theCreep, "rtn=" + rtn)
		if (rtn === OK) {
			(<CS>cs).decayEvent = new Event_C();
		}
		return rtn;
	}
	/** move and withdraw then drop */
	directWithdrawAndDrop(con: HasStore): void {
		if (getEnergy(this.master) === 0) {
			this.directWithdraw(con);
		} else {
			this.dropEnergy();
		}
	}
	/** move and transfer*/
	directTransfer(tar: HasStore): boolean {
		SA(this.master, "directTransfer" + COO(tar));
		if (myGetRange(this.master, tar) <= 1) {
			return this.transferNormal(tar);
		} else {
			this.master.MTJ(tar);
			return false;
		}
	}
	/**if a harvable will not disappear before you reach it*/
	reachableHarvable(harvable: Harvable): boolean {
		let td
		if (harvable instanceof StructureContainer) {
			td = harvable.ticksToDecay == undefined ? Infinity : harvable.ticksToDecay;
		} else {//is Resource
			td = getEnergy(harvable)
		}
		return td > GR(this.master, harvable)
	}
	/**find a fit harvable*/
	findFitHarvable(): Harvable | undefined {
		let needTransHarvable: Harvable[] = getHarvables().filter(
			i => !(i instanceof Resource && hasFullProducerAround(i)) && this.reachableHarvable(i)
				&& !(i instanceof Resource && !validRes(<Res>i))
		);
		let harvableWorths: {
			harvable: Harvable | undefined;
			worth: number;
		}[] = needTransHarvable.map(harvable => {
			let range = GR(this.master, harvable)
			let baseRangeBonus = 1 + 3 * divideReduce(X_axisDistance(harvable, spawnPos), 10)
			let volumn = getCapacity(this.master)
			let energy = Math.min(getEnergy(harvable), volumn)
			let worth = baseRangeBonus * energy / (range + 4)
			drawLineComplex(this.master, harvable, getOpacity(0.1 * worth), "#22bb22")
			return { harvable: harvable, worth: worth }
		})
		let rtn: Harvable | undefined = harvableWorths.reduce((a, b) => a.worth > b.worth ? a : b, { harvable: undefined, worth: 0 }).harvable;
		return rtn;
	}
	/** find harvestable and withdraw */
	findHarvestableAndWithdraw() {
		let harvestables = getHarvables();
		let cs = this.master.findClosestByRange(harvestables);
		if (cs) {
			this.directWithdraw(cs);
		}
	}
	/**move and drop energy*/
	directDrop(tar: Pos): boolean {
		if (myGetRange(this.master, tar) <= 1) {
			SA(this.master, "dropEnergy");
			this.dropEnergy();
			return true;
		} else {
			SA(this.master, "MTJ");
			this.master.MTJ(tar);
			return false;
		}
	}
	/**drop energy by amount.It will drop all if not enough*/
	dropEnergyByAmount(amount: number) {
		if (getEnergy(this.master) < amount) {
			amount = getEnergy(this.master);
		}
		this.master.master.drop(RESOURCE_ENERGY, amount);
	}
	/**drop all energy*/
	dropEnergy(): void {
		this.master.master.drop(RESOURCE_ENERGY);
	}
	/**pick up resources*/
	pickUpResources() {
		const target = findClosestByRange(this.master, resources);
		if (target) {
			this.directPickUp(target);
			return true;
		}
		return false;
	}
	/** withdraw static*/
	withDrawStatic(): boolean {
		let har = getHarvables().find(i => GR(i, this.master) <= 1);
		if (har) {
			return this.withdrawNormal(har);
		} else
			return false
	}
	/**move and withdraw target*/
	directWithdraw(con: HasEnergy): boolean {
		//TODO back to base
		drawLineLight(this.master, con);
		if (GR(con, this.master) > 1) {
			this.master.MTJ(con);
		} else {
			this.master.stop();
		}
		return this.withdrawNormal(con);
	}
	/**withdraw normal*/
	withdrawNormal(con: HasEnergy): boolean {
		if (con instanceof Resource) {
			return this.master.master.pickup(con) === OK;
		} else if (con instanceof Structure)
			return this.master.master.withdraw(con, RESOURCE_ENERGY) === OK;
		else if (con instanceof Cre)
			return con.master.transfer(this.master.master, RESOURCE_ENERGY) === OK;
		else return false;
	}
	/**withdraw target*/
	withDrawTarget(tar: HasEnergy): boolean {
		if (GR(this.master, tar) <= 1) {
			return this.withdrawNormal(tar);
		} else
			return false;
	}
	/** move and build target */
	directBuild(tar: CS): boolean {
		SA(this.master, "directBuild=" + S(tar));
		drawLineLight(this.master, tar);
		if (atPos(this.master, tar)) {
			this.master.randomMove();
		}
		if (hasEnemyAround(tar, 0)) {
			return false;
		}
		const buildRtn = this.normalBuild(tar);
		if (buildRtn === ERR_NOT_IN_RANGE) {
			this.master.MTJ_follow(tar);
			return true;
		} else if (buildRtn === OK) {
			this.master.stop();
			return true;
		} else return false;
	}
	/** withdraw by amount */
	withdrawRealAmount(tar: HasStore, amount: number) {
		if (getEnergy(tar) < amount) {
			amount = getEnergy(tar);
		}
		return this.master.master.withdraw(<any>tar, RESOURCE_ENERGY, amount);
	}
	/** transfer by amount */
	transferAmount(tar: HasStore, amount: number) {
		if (valid(this.master) && valid(tar)) {
			if (getEnergy(this.master) < amount) {
				amount = getEnergy(this.master);
			}
			return this.master.master.transfer(tar instanceof Cre ? tar.master : tar, RESOURCE_ENERGY, amount);
		} else return null;
	}
	/**if is building*/
	getIsBuilding(): boolean {
		return getIsBuilding(this.master)
	}
}
/** used to judge if is in build state*/
export class BuildingTask extends Task_Cre {
	isBuilding: boolean = false;
	isWorking: boolean = false
	constructor(master: Cre) {
		super(master);
	}
	loop_task() {
		let cc = this.master;
		if (this.isBuilding && getEnergy(cc) === 0) {
			this.isBuilding = false;
		}
		if (!this.isBuilding && getFreeEnergy(cc) === 0) {
			this.isBuilding = true;
		}
	}
}
/**if can be build by Cre which has no enemy or friend at pos
 *  and no block object at pos
 * and can be build when its multi-rampart*/
export function canBeBuildByCre(cs: CS, cre: Cre): boolean {
	// SA(cre, "cs.structure=" + S(cs.structure))
	// SA(cre, "INS=" + cs.structure instanceof StructureRampart)
	// SA(cre, "isBlockGameObject(cs.structure)=" + isBlockGameObject(cs.structure))
	if (hasEnemyAround(cs, 0)
		|| hasFriendAround(cs, 0)
		&& isBlockGameObject(cs.structure, false, myGO(cs))) {
		return false;
	}
	let workNum = cre.getBodies(WORK).length;
	let limitProgress: number = 200 - workNum * 5;
	return canBeBuild(cs, limitProgress);
}

/**
 * if has other CS Rampart <limit && this.progress>=limit
 * that cannot be build
 * @param cs must be rampart
 * @param limitProgress the limitProgress often is 200-workNum*5
 */
export function canBeBuild(cs: CS, limitProgress: number): boolean {
	if (cs.structure instanceof StructureRampart) {
		if (inRampart(cs)) {
			return false;
		} else {
			if (progress(cs) < limitProgress) {
				return true;
			} else {
				let findRtn = overallMap
					.get(cs)
					.find(
						i =>
							i instanceof ConstructionSite &&
							i !== cs &&
							i.structure instanceof StructureRampart &&
							progress(i) < limitProgress
					);
				return !findRtn;
			}
		}
	} else {
		return true;
	}
}

/**
 * return a state if cre is Building
 */
export function getIsBuilding(cre: Cre): boolean {
	const bt = <BuildingTask | undefined>findTask(cre, BuildingTask);
	if (!bt) {
		new BuildingTask(cre);
		return false;
	} else {
		bt.loop_task();
		return bt.isBuilding;
	}
}
/**set the isBuilding porperty*/
export function setIsBuilding(cre: Cre, b: boolean): boolean {
	const bt = <BuildingTask | undefined>findTask(cre, BuildingTask);
	if (bt) {
		bt.isBuilding = b
		return true
	}
	return false
}
//PATH FINDER
/** searchPath target*/
export type searchPathTarOOA<T extends Pos> =
	| T
	| { pos: T; range: number }
	| (T | { pos: T; range: number })[];

export function isBlockGameObjectAvoidFriend(go: GO, containerBlock: boolean = false) {
	return (
		(go instanceof Structure
			|| (go instanceof Cre && oppo(go))) &&
		!(
			(go instanceof StructureRampart && go.my)
			|| !containerBlock && go instanceof StructureContainer
			|| go instanceof StructureRoad
		)
	);
}
export function aroundBlock(pos: Pos) {
	//if has no empty around
	return getRangePoss(pos, 1).find(i => !blocked(i)) === undefined
}
/**
 * if position is blocked
 */
export function blocked(
	pos: Pos,
	useMoveMatrix: boolean = true,
	avoidFriendBlock: boolean = false,
	avoidEnemyBlock: boolean = false,
	containerBlock: boolean = false
): boolean {
	if (isTerrainWall(pos)) {
		// SA(pos,"block isTerrainWall");
		return true;
	} else if (validPos(pos)) {
		let posList = overallMap[pos.x][pos.y];
		if (avoidFriendBlock) {
			useMoveMatrix = false;
		}
		for (let go of posList) {
			if (avoidFriendBlock) {
				if (isGO(go) && isBlockGameObjectAvoidFriend(<GO>go, containerBlock)) {
					// SA(pos,"block isBlockGameObject");
					return true;
				}
			} else if (avoidEnemyBlock) {
				if (isGO(go) && isBlockGameObjectAvoidEnemy(<GO>go, containerBlock)) {
					// SA(pos,"block isBlockGameObject");
					return true;
				}
			} else {
				if (isGO(go) && isBlockGameObject(<GO>go, containerBlock)) {
					// SA(pos,"block isBlockGameObject");
					return true;
				}
			}
		}
		if (useMoveMatrix) {
			if (moveMatrix.get(pos.x, pos.y) === 255) {
				// SA(pos,"block moveMatrix");
				return true;
			}
		}
		return false;
	} else {
		return true;
	}
}
/**
 * a task used to move
 */
export class MoveTask extends Task_Cre {
	/** target position */
	tar: Pos;
	/** memoryed path*/
	path: Pos[];
	constructor(master: Cre, tar: Pos, path: Pos[] = []) {
		super(master);
		this.tar = tar;
		this.path = path;
		//cancel old task
		let pt = this.master.tasks.find(
			task => task instanceof MoveTask && task != this
		);
		if (pt) pt.end();
	}
	loop_task(): void {
		// SA(this.master, "MoveTask")
		drawLineLight(this.master, this.tar);
		if (this.pause)
			return;
		if (this.path.length > 0) {
			let tempTar: Pos = this.path[0];
			drawLineComplex(this.master, tempTar, 0.75, "#777777");
			// SA(tempTar,"moveTo tempTar="+COO(tempTar))
			this.master.crePathFinder?.moveTo_Basic(tempTar);
			this.master.wantMove = new Event_C();
			//
			if (myGetRange(this.master, tempTar) <= 1) {
				this.path.shift();
			}
		} else {
			this.end();
		}
	}
	end(): void {
		super.end();
	}
}
export class Cre_pathFinder {
	master: Cre
	constructor(cre: Cre) {
		this.master = cre
	}
	/** if the target of current `MoveTask` is `tar` ,cancel it*/
	stopByTar(tar: Pos) {
		const t = findTaskByFilter(
			this.master,
			i => i instanceof MoveTask && (<MoveTask>i).tar === tar
		);
		if (t) t.end();
	}
	hasMoveTask(): boolean {
		let moveTask = this.master.tasks.find(i => i instanceof MoveTask);
		return valid(moveTask);
	}
	/** cancel the current `MoveTask`*/
	stop() {
		const t = findTask(this.master, MoveTask);
		if (t) t.end();
	}
	/** pause the current `MoveTask`*/
	movePause(): void {
		const t = <MoveTask>findTask(this.master, MoveTask);
		if (t) t.pause = true;
	}
	/** continue the current `MoveTask`*/
	moveContinue(): void {
		const t = <MoveTask>findTask(this.master, MoveTask);
		if (t) t.pause = false;
	}

	/** normal moveTo,but will block to the tile it want to move next tick */
	moveTo_Basic(tar: Pos): void {
		setMoveMapAndMatrixBlock(tar);
		this.master.moveTargetNextPos = new Event_Pos(tar)
		// SA(this.master, "moveTo_Basic=" + COO(tar))
		this.master.master.moveTo(tar);
	}
	//move to ,use move() that use direction,not find path
	moveTo_Basic_Direct(tar: Pos): void {
		setMoveMapAndMatrixBlock(tar);
		this.master.moveTargetNextPos = new Event_Pos(tar)
		const dx = tar.x - this.master.x;
		const dy = tar.y - this.master.y;
		const direc = getDirection(dx, dy);
		SA(this.master,"moveTo_Basic_Direct="+direc+"tar="+tar)
		SA(this.master,"dx="+dx+"dy="+dy)
		this.master.master.move(direc);
	}

	/** search the closest path of multiple targets ,like findPath but will
	 * calculate terrain cost by this creep
	 */
	searchTars(tars: Pos[]): FindPathResult {
		const ifWorker = this.master.onlyHasMoveAndCarry(); //if worker set 1 and 2
		let plainCost, swampCost;
		if (ifWorker) {
			plainCost = 1;
			swampCost = 2;
		} else {
			plainCost = this.master.getMoveTimeByTerrain(false);
			swampCost = this.master.getMoveTimeByTerrain(true);
		}
		return getDecideSearchRtnNoArea(this.master, tars, {
			maxOps: 2500,
			plainCost: plainCost,
			swampCost: swampCost,
		});
	}
	/**move to judge most general move action */
	moveToJudge(
		tar: Pos,
		op?: FindPathOpts,
		step: number = getMoveStepDef(this.master)
	): void {
		// SA(this,"moveTo1="+coordinate(tar));
		drawLineLight(this.master, tar);
		let theSame: boolean = true;
		const currentMoveTask: MoveTask | undefined = findTask(this.master, MoveTask);
		// SA(this,"currentMoveTask="+S(currentMoveTask));
		if (currentMoveTask) {
			if (currentMoveTask instanceof FindPathAndMoveTask) {
				// SA(this,"currentMoveTask.tar="+COO(currentMoveTask.tar));
				// SA(this,"tar="+COO(tar));
				const cop = currentMoveTask.op
				//if is not the same pos
				if (!atPos(currentMoveTask.tar, tar)) {
					theSame = false;
				} else if (cop && !op) {
					theSame = false
				} else if (!cop && op) {
					theSame = false
				} else if (cop && op) {
					if (cop.plainCost !== op.plainCost) {
						theSame = false
					} else if (cop.swampCost !== op.swampCost) {
						theSame = false
					}
				}
			} else {
				theSame = false
			}
		} else
			theSame = false;
		// SA(this,"theSame="+theSame)
		if (!theSame) {
			//add new move task
			// SA(this,"FindPathAndMoveTask");
			new FindPathAndMoveTask(this.master, tar, step, op);
		} else if (currentMoveTask) {
			currentMoveTask.pause = false;
		}
	}
	/** search the path to the target.
	 * calculate terrain cost by this creep
	 */
	getDecideSearchRtnByCre(tar: Pos, op?: FindPathOpts | undefined): FindPathResult {
		const ifWorker = this.master.onlyHasMoveAndCarry(); //if worker set 1 and 2
		let plainCost, swampCost;
		if (ifWorker) {
			plainCost = 1;
			swampCost = 2;
		} else {
			plainCost = this.master.getMoveTimeByTerrain(false);
			swampCost = this.master.getMoveTimeByTerrain(true);
		}
		let ops: FindPathOpts
		if (op !== undefined) {
			ops = op
			if (ops.plainCost === undefined)
				ops.plainCost = plainCost
			if (ops.swampCost === undefined)
				ops.swampCost = swampCost
		} else {
			ops = {
				plainCost: plainCost,
				swampCost: swampCost,
			}
		}
		const rtn: FindPathResult = getDecideSearchRtn(this.master, tar, ops);
		if (isWorker(this.master)) {
			drawPoly(rtn.path, 0.75, "#aa22bb");
		}
		return rtn
	}
}
export function isBlockGameObjectAvoidEnemy(go: GO, containerBlock: boolean = false) {
	return (
		(go instanceof Structure || (go instanceof Cre && my(go))) &&
		!(
			(go instanceof StructureRampart && go.my)
			|| !containerBlock && go instanceof StructureContainer
			|| go instanceof StructureRoad
		)
	);
}

/**
 * path len from `ori` to `tar`
 */
export function pathLen(ori: Pos, tar: Pos) {
	let p = getDecideSearchRtn(ori, tar);
	if (p) {
		return p.path.length;
	} else return Infinity;
}
/** move multi times */
export class MultiFindPathAndMoveTask extends MultiTask<FindPathAndMoveTask> { }
/** move to a position ,will findPath every `findPathStep` ticks*/
export class FindPathAndMoveTask extends MoveTask {
	findPathStep: number;
	op: FindPathOpts | undefined
	/** the temparary target ,it will reFindPath if close to it*/
	tempTar: Pos;
	/** default `findPathStep` */
	constructor(master: Cre, tar: Pos, step: number = getMoveStepDef(master), op?: FindPathOpts | undefined) {
		super(master, tar);
		this.op = op
		this.path = this.findPath_task(master, tar);
		//for initialize
		if (this.path.length > 0) {
			let lp = last(this.path);
			if (lp) {
				this.tempTar = lp;
			} else {
				this.tempTar = tar;
			}
		} else this.tempTar = tar;
		//
		this.findPathStep = step;
	}
	loop_task(): void {
		let st = ct();
		// SA(this.master, "findPath loop")
		if (invalidPos(this.tar)) {
			this.end();
		}
		if (
			isMyTick(this.master, this.findPathStep) ||
			invalidPos(this.tempTar) ||
			myGetRange(this.tempTar, this.master) <= 1 ||
			myGetRange(this.tar, this.master) <= 1 ||
			(this.path.length > 0 && blocked(this.path[0]))
		) {
			this.path = this.findPath_task(this.master, this.tar);
		}
		super.loop_task();
		let t = et(st);
		if (this.master.role)
			calEventNumberCPUTime(this.master.role, t, false);
	}
	findPath_task(master: Cre, tar: Pos): Pos[] {
		// SA(this.master, "findPath_task")
		let sRtn: FindPathResult = master.crePathFinder ? master.crePathFinder.getDecideSearchRtnByCre(this.tar, this.op) :
			defFindPathResult
		let path: Pos[] = sRtn.path;
		if (path.length > 0) {
			let lp = last(path);
			if (lp) {
				this.tempTar = lp;
			} else {
				this.tempTar = tar;
			}
		} else this.tempTar = tar;
		return path;
	}
}

/**
 * get the target by {@link FindPathResult},it will return the closest target of the last position of the path
 */
export function getTargetBySRtn<T extends Pos>(
	ori: Pos,
	sRtn: FindPathResult,
	tars: searchPathTarOOA<T>
): T | undefined {
	//ERR
	// SA(cre,"sRtn="+S(sRtn))
	if (valid(sRtn)) {
		// SA(cre,"sRtn.path="+S(sRtn.path))
		if (sRtn.path) {
			// SA(cre,"sRtn.path.length="+S(sRtn.path.length))
			let newOri: Pos | undefined = ori;
			if (sRtn.path.length > 0) {
				newOri = last(sRtn.path);
			}
			if (newOri) {
				let target: T;
				if (Array.isArray(tars)) {
					const tars2 = <(T | { pos: T; range: number })[]>tars
					target = findClosestByRange(ori, <T[]>tars2)
				} else
					target = <T>tars;
				return target;
			}
		}
	}
	return;
}

export function getDecideSearchRtn(
	ori: Pos,
	tar: Pos,
	op?: FindPathOpts | undefined
): FindPathResult {
	let newTar: Pos;
	newTar = sasVariables.getNewTarByArea(ori, tar);
	let SR1 = getDecideSearchRtnNoArea(ori, newTar, op);
	let SR2: FindPathResult | undefined;
	let SR3: FindPathResult | undefined;
	if (!atPos(newTar, tar)) {
		let newTar2 = sasVariables.getNewTarByArea(newTar, tar);
		SR2 = getDecideSearchRtnNoArea(newTar, newTar2, op);
		if (!atPos(newTar2, tar)) {
			SR3 = getDecideSearchRtnNoArea(newTar2, tar, op);
		}
	}
	let newPath: Pos[] = SR1.path;
	let newOps: number = SR1.ops;
	let newCost: number = SR1.cost;
	let newIncomplete: boolean = SR1.incomplete;
	if (SR2) {
		SR2.path.shift(); //remove first ele
		newPath = newPath.concat(SR2.path);
		newOps += SR2.ops;
		newCost += SR2.cost;
		newIncomplete = newIncomplete && SR2.incomplete;
	}
	if (SR3) {
		SR3.path.shift(); //remove first ele
		newPath = newPath.concat(SR3.path);
		newOps += SR3.ops;
		newCost += SR3.cost;
		newIncomplete = newIncomplete && SR3.incomplete;
	}
	let rtn = {
		path: newPath,
		ops: newOps,
		cost: newCost,
		incomplete: newIncomplete,
	};
	return rtn;
}

/**
 * search the path do not use area will use the default search options by
 * {@link getStandardOps} and `CostMatrix` of {@link moveMatrix}
 */
export function getDecideSearchRtnNoArea<T extends Pos>(
	ori: Pos,
	tarOOA: searchPathTarOOA<T>,
	op?: FindPathOpts | undefined
): FindPathResult {
	let errReturn: FindPathResult = {
		path: [],
		cost: Infinity,
		ops: 0,
		incomplete: true,
	};
	if (Array.isArray(tarOOA)) {
		for (let t of tarOOA) {
			if ("range" in t) {
				if (invalidPos(t.pos)) {
					return errReturn;
				}
			} else if (invalidPos(t)) {
				return errReturn;
			}
		}
	} else if (valid(tarOOA) && "range" in tarOOA) {
		if (invalidPos(tarOOA.pos)) {
			return errReturn;
		}
	} else if (invalidPos(<Pos>tarOOA)) {
		return errReturn;
	}
	let newOp: FindPathOpts | undefined;
	if (op) newOp = op;
	else newOp = {};
	let defCostMatrix = moveMatrix;
	//
	let so = getStandardOps();
	if (!newOp.costMatrix) newOp.costMatrix = defCostMatrix;
	if (!newOp.maxOps) newOp.maxOps = so.maxOps;
	if (!newOp.heuristicWeight) newOp.heuristicWeight = so.heuristicWeight;
	if (!newOp.flee) newOp.flee = false;
	let rtn = searchPath(ori, tarOOA, newOp);
	// SA(ori,"getDecideSearch")
	// if(
	drawPolyLight(rtn.path);
	return rtn;
}

/**
 * find a group of target that is closest
 */
export function findClosestsByPath(cre: Cre, tars: Pos[], n: number): Pos[] {
	let nowTar = tars.slice();
	let rtn: Pos[] = [];
	for (let i = 0; i < n; i++) {
		let select: Pos | null = findClosestByPath(cre, nowTar);
		if (select) {
			rtn.push(select);
			remove(nowTar, select);
		} else {
			break;
		}
	}
	return rtn;
}
/**
 * get all units that can block a tile
 */
export function getBlockUnits(): Unit[] {
	let rtn = getAllUnits().filter(
		i =>
			!(
				(i instanceof StructureRampart && i.my) ||
				i instanceof StructureContainer
			)
	);
	return rtn;
}
