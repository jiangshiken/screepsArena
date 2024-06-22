/**
 Module: predictSys
 Author: 820491047
 CreateDate:   2023.1.10
 UpDateDate:   2023.1.10
 version 0.0.0
*/
import { ATTACK, MOVE } from "game/constants";
import { StructureSpawn } from "game/prototypes";
import { findPath } from "game/utils";

import { displayPos } from "./util_attackable";
import { Attackable, Cre, enemies, friends, getAllUnits, GO } from "./util_Cre";
import { Event } from "./util_event";
import { tick } from "./util_game";
import { atPos, getRangePoss, Pos } from "./util_pos";
import { HasTasks, Task, Task_C } from "./util_task";
import { SA } from "./util_visual";
import { wc, WT, WT_C } from "./util_WT";

//predict tasks and types
export type Rtn_predict<E> = {
	bestAction: E;
	worth: number;
};
export class PredictTaskSys implements HasTasks {
	tasks: Task[] = [];
}
export let predictTasks: PredictTaskSys = new PredictTaskSys()
//predict tick list
export const predictTickList: {
	[key: number]:PredictNode[]
}={}
export function add_predictTickList(tick:number,value:PredictNode) {
	let pn:PredictNode[]=predictTickList[tick]
	if(pn===undefined){
		predictTickList[tick]=[]
		pn=predictTickList[tick]
	}
	pn.push(value)
}
//case
export class Case{
	actions:PredictNode[]=[]
}
//entry function
/** short distance fight predict*/
export let SDFPList:Cre[]=[]
/** the predict version of short distance fight*/
export function SDFP_control(){
	SA(displayPos(), "SDFP_control");
	// cre.fight();
	// //short distance fight mode
	// const scanSize = 3
	// const poss: Pos[] = getRangePoss(cre, scanSize);
	// let maxWorth: number = -Infinity;
	// let maxWorthPos: Pos = poss[0];
	// for (let pos of poss) {
	// 	//calculate worth of pos
	// 	if (!blocked(pos, true, false, true)) {
	// 		const cost = MGR(pos, cre);
	// 		const enemyAround = getEnemyArmies().filter((i) => MGR(i, pos) <= 1);
	// 		const enemyAround2 = getEnemyArmies().filter((i) => MGR(i, pos) <= 2);
	// 		const firendAround = friends.filter((i) =>
	// 			MGR(i, pos) <= 1
	// 			|| (
	// 				MGR(i, pos) <= 2
	// 				&& i.moveTarget
	// 				&& validEvent(i.moveTarget, 0)
	// 				&& MGR(i.moveTarget.pos, i) <= 1
	// 			)
	// 		);
	// 		const defendSpawnExtra = MGR(spawn, pos) <= 1 ? 1 : 0
	// 		const invadeSpawnExtra = MGR(enemySpawn, pos) <= 1 ? 2 : 0
	// 		const hasMyHealthyEmptyRam = inMyHealthyRampart(pos) && !blocked(pos)
	// 		const ramDamageDecrease = hasMyHealthyEmptyRam ? 0.01 : 1
	// 		const otherFriendAround = firendAround.filter(i => i !== cre)
	// 		const enemyMaxTaunt: number = maxWorth_lamb(enemyAround, e => getTaunt(e).value).worth
	// 		// const enemyMaxTaunt: number = enemyAround.length >= 1 ? getTaunt(enemyAround.reduce((a, b) => (getTaunt(a) > getTaunt(b) ? a : b))).value : 0;
	// 		const friendMaxTaunt_healer: number = otherFriendAround.map(i =>
	// 			(0.1 + getDamagedRate(i)) * getTaunt(i).value).reduce((a, b) => a > b ? a : b, 0)
	// 		const enemyDpsTotal: number = enemyAround2.length >= 1 ?
	// 			sum(enemyAround, i => 0.8 * getDps(i).value)
	// 			+ sum(enemyAround2, i => 0.2 * getDps(i).value)
	// 			: 0;
	// 		const thisTaunt = getTaunt(cre).value;
	// 		const myDps: number = getDps(cre).value;
	// 		let invade: number
	// 		if (isHealer) {
	// 			invade = 0.25 * friendMaxTaunt_healer * myDps;
	// 		} else {
	// 			invade = enemyMaxTaunt * myDps;
	// 		}
	// 		const friendAroundLen = firendAround.length;
	// 		const enemyAroundLen = enemyAround.length;
	// 		const shareBonus = 1 / (1 + friendAroundLen);
	// 		const damage: number = thisTaunt * enemyDpsTotal * shareBonus * ramDamageDecrease
	// 		//calculate friend/enemy dps/taunt
	// 		//TODO
	// 		const worth = (invade - damage + defendSpawnExtra + invadeSpawnExtra) * divideReduce(cost, 2)
	// 		if (worth > maxWorth) {
	// 			SAN(pos, "friendAroundLen", friendAroundLen);
	// 			SAN(pos, "enemyDpsTotal", enemyDpsTotal);
	// 			SAN(pos, "enemyMaxTaunt", enemyMaxTaunt);
	// 			SAN(pos, "myDps", myDps);
	// 			SAN(pos, "invade", invade);
	// 			SAN(pos, "damage", damage);
	// 			SAN(pos, "worth", worth);
	// 			maxWorth = worth;
	// 			maxWorthPos = pos;
	// 		}
	// 	}
	// }
	// SA(cre, "maxWorthPos=" + COO(maxWorthPos));
	// SA(maxWorthPos, "maxWorthPos here");
	// drawLineComplex(cre, maxWorthPos, 0.6, "#dd33dd");
	// cre.moveTarget = new Event_Pos(maxWorthPos);
	// cre.moveTo_follow(maxWorthPos);
	//TODO
	SDFPList=[]
}
export function SDFP_useAction(cre:Cre){
	SDFPList.push(cre)
}
/** finally move it */
export function moveByMoveSelector(cre: Cre) {
	if (cre.canMove()) {
		const maxComb = cre.moveSelecter.select_max();
		const pos: Pos = maxComb.data;
		if (!atPos(cre, pos)) {
			cre.crePathFinder?.moveTo_Basic_Direct(pos);
		}
	}
}
/**decide a moveAciton of a Cre,the entry function of the predict
 * system,usually called every tick*/
export function decideMoveAction(wt: WT, cre: Cre) {
	if (cre.canMove()) {
		//calculate moveAction in range 1
		const possibleMoveTarget = getRangePoss(cre, 1);
		for (let pos of possibleMoveTarget) {
			const MAP = new MoveActionPred(wc(10), tick, cre, pos);
			const predictRtn: Rtn_predict<Pos> = MAP.predict(wc(100));
			cre.moveSelecter.add({ data: predictRtn.bestAction, wt: wc(predictRtn.worth) });
		}
		//calculate long range movePath
		//TODO
		const predictTars = getAllUnits()
		for (let predictTar of predictTars) {
			const MTP = new MoveTargetPred(wc(100), tick, cre, predictTar)
			const predictRtn: Rtn_predict<Pos[]> = MTP.predict(wc(100))
			const path: Pos[] = predictRtn.bestAction
			if (path.length > 0) {
				cre.moveSelecter.add({
					data: path[0],
					wt: wc(predictRtn.worth)
				});
			}
		}
	}
}
/**predict event ,will trig other predict event ,and
 * return the deltaW,that show if it will be good or bad if this
 * event happen.return it to the parent function and let them
 * make the dicision
 */
export class PredictNode extends WT_C implements PredictNode_I, Event {
	invokeTick: number
	basedNode: PredictNode | undefined
	/**represent will happen or represent will not happen*/
	isPositive: boolean;
	constructor(wt: WT, invokeTick: number, isPositive: boolean = true) {
		super(wt.w, wt);
		this.isPositive = isPositive;
		predictTickList[tick].push(this);
		this.invokeTick = invokeTick
	}
}
export interface PredictNode_I {

}
//PredictNodes
export class CrePred extends PredictNode {
	master: Cre;
	constructor(wt: WT, invokeTick: number, master: Cre) {
		super(wt, invokeTick);
		this.master = master;
	}
}
export class MoveTargetTask extends Task_C {
}
export class MoveTargetPred extends CrePred {
	targetPos: Pos;
	path_pred: MovePathPred
	constructor(wt: WT, invokeTick: number, master: Cre, targetPos: Pos) {
		super(wt, invokeTick, master);
		this.targetPos = targetPos;
		this.path_pred = findPath_pred(wt, master, master, targetPos)
	}
	predict(wt: WT): Rtn_predict<Pos[]> {
		const nextMoveTickNum = getTickNumUntilNextMove(this.master)
		new PosPred(wt, this.invokeTick + nextMoveTickNum
			, this.master, this.path_pred.path[0])
		refreshTimePass(wt, nextMoveTickNum)

		//trig Fatigue Cal
		//trig posChange
		return {//TODO
			bestAction: this.path_pred.path,
			worth: 1
		}
	}
}
function getTickNumUntilNextMove(cre: Cre): number {
	return 1 + getTickNumUntilMovable(cre)
}
function getTickNumUntilMovable(cre: Cre): number {
	const fatigue = cre.master.fatigue
	const moveNum = cre.getHealthyBodiesNum(MOVE)
	return Math.ceil(fatigue / (moveNum * 2))
}
function getAttackDps(cre: Cre): number {
	return cre.getHealthyBodiesNum(ATTACK) * 30
}
function predictEnemyAttack(wt: WT, cre: Cre) {
	const posPredInRange1: undefined = undefined
	const target: Cre = cre
	new DamagePred(wt, 9999, cre, target, getAttackDps(cre))
}
function predictEnemyMove(wt: WT, cre: Cre) {
}
function predictEnemies(wt: WT) {
	for (let enemy of enemies) {
		//predict enemy movement
		predictEnemyMove(wt, enemy)
		//predict enemy attacking
		predictEnemyAttack(wt, enemy)
	}
}
function predictFriends(wt: WT) {
	for (let friend of friends) {
		//predict friend movement
		decideMoveAction(wt, friend)
		//predict friend attacking
		const attackTarget = friend.fight()
	}
}
function refreshTimePass(wt: WT, passedTick: number) {
	const currentTick = tick
	const endTick = currentTick + passedTick
	predictFriends(wt)
	//cal enemyOperation
	predictEnemies(wt)
}
export function findPath_pred(wt: WT, master: Cre, ori: Pos, tar: Pos): MovePathPred {
	return new MovePathPred(wt, tick, master, findPath(ori, tar))
}
export class MovePathPred extends CrePred {
	path: Pos[];
	constructor(wt: WT, invokeTick: number, master: Cre, path: Pos[]) {
		super(wt, invokeTick, master);
		this.path = path;
	}
}
export class MoveActionPred extends CrePred {
	targetPos: Pos;
	constructor(wt: WT, invokeTick: number, master: Cre, targetPos: Pos) {
		super(wt, invokeTick, master);
		this.targetPos = targetPos;
	}
	predict(wt: WT): Rtn_predict<Pos> {
		//TODO
		//calculate block
		//calculate position change
		// new PosPred(wt,)
		//calculate fatigue add
		return {
			bestAction: this.targetPos,
			worth: 1,//TODO
		};
	}
}
/** predict a Cre will be at a Pos*/
export class PosPred extends CrePred {
	targetPos: Pos
	constructor(wt: WT, invokeTick: number, cre: Cre, targetPos: Pos) {
		super(wt, invokeTick, cre);
		this.targetPos = targetPos
		this.predict(wt)
	}
	predict(wt: WT) {
		refreshTimePass(wt, 1)
		refreshTimePass(wt, 4)
		refreshTimePass(wt, 16)
		refreshTimePass(wt, 64)
	}
}
/** predict a GO's HP*/
export class HPPred extends PredictNode {
	master: GO
	value: number
	constructor(wt: WT, invokeTick: number, master: GO, value: number) {
		super(wt, invokeTick);
		this.master = master
		this.value = value
		this.predict(wt)
	}
	predict(wt: WT) {
		if (this.value <= 0) {
			new DeadPred(wt, this.invokeTick, this.master)
		}
	}
}
/** predict a Cre's Fatigue*/
export class FatiguePred extends CrePred {
	value: number
	constructor(wt: WT, invokeTick: number, master: Cre, value: number) {
		super(wt, invokeTick, master);
		this.value = value
	}
}
/**predict a damage event*/
export class MeleePred extends CrePred {
	target: Attackable;
	constructor(wt: WT, invokeTick: number, master: Cre, target: Attackable) {
		super(wt, invokeTick, master);
		this.target = target;
		this.predict(wt);
	}
	predict(wt: WT) {
		// new DamagePred(wt, this.invokeTick, this.damageTar, 9999)
	}
}
/**predict a damage event*/
export class DamagePred extends CrePred {
	damageTar: GO;
	damageNum: number;
	constructor(wt: WT, invokeTick: number, master: Cre, damageTar: GO, damageNum: number) {
		super(wt, invokeTick, master);
		this.damageTar = damageTar;
		this.damageNum = damageNum;
		this.predict(wt);
	}
	predict(wt: WT) {
		new HPPred(wt, this.invokeTick, this.damageTar, 9999)
	}
}
/**predict a dead event*/
export class DeadPred extends PredictNode {
	master: GO
	constructor(wt: WT, invokeTick: number, master: GO) {
		super(wt, invokeTick)
		this.master = master
		if (this.master instanceof StructureSpawn) {
			// checkIfAllSpawnDestroyed
			new WinPred(wt, invokeTick, true)
		}
	}
	getKilledWorth() { }
}
/**predict a win event*/
export class WinPred extends PredictNode {
	isMyWin: boolean;
	constructor(wt: WT, invokeTick: number, isMyWin: boolean) {
		super(wt, invokeTick)
		this.isMyWin = isMyWin
	}
}
