/**
 Module: pullTasks
 Author: 820491047
 CreateDate:   2022.5.26
 UpDateDate:   2023.1.10
 version 0.0.0
*/

import { Cre, exist, FindPathAndMoveTask, moveToRandomEmptyAround, Task_Cre } from "./util_Cre";
import { equal1, remove, valid } from "./util_JS";
import { atPos, COO, myGetRange, Pos } from "./util_pos";
import { findTask } from "./util_task";
import { SA } from "./util_visual";

//functions
/**
 * new a {@link PullTarsTask}, will cancel if already have same task
 */
export function newPullTarsTask(
	master: Cre,
	tarCres: Cre[],
	tarPos: Pos,
	nextStep?: Pos
) {
	let oldT = <PullTarsTask>findTask(master, PullTarsTask);
	let newTask: boolean;
	if (valid(oldT)) {
		if (equal1(oldT.tarCres, tarCres) && oldT.tarPos == tarPos) {
			SA(master, "samePullTask");
			newTask = false;
		} else {
			newTask = true;
		}
	} else {
		newTask = true;
	}
	if (newTask) {
		new PullTarsTask(master, tarCres, tarPos, nextStep);
	}
}
/**
 * new a {@link PullTask}, will cancel if already have same task
 */
export function newPullTask(
	master: Cre,
	tarCre: Cre,
	tarPos: Pos,
	nextStep?: Pos
) {
	let oldT = <PullTask>findTask(master, PullTask);
	let newTask: boolean;
	if (valid(oldT)) {
		if (oldT.tarCre == tarCre && oldT.tarPos == tarPos) {
			SA(master, "samePullTask");
			newTask = false;
		} else {
			oldT.end();
			newTask = true;
		}
	} else {
		newTask = true;
	}
	if (newTask) {
		new PullTask(master, tarCre, tarPos, nextStep);
	}
}
export let pullGoSawmp: Boolean = false
export function setPullGoSwamp(b: Boolean) {
	pullGoSawmp = b
}
/**
 * Task of pull ,the creep will pull a creep to a position
 * @param nextStep the pos creep will go next ,
 *  if is undefined the creep will move random at last position of path
 */
export class PullTask extends Task_Cre {
	tarCre: Cre;
	tarPos: Pos;
	nextStep: Pos | undefined;
	moveTask1: FindPathAndMoveTask | undefined = undefined;
	moveTask2: FindPathAndMoveTask | undefined = undefined;
	constructor(master: Cre, tarCre: Cre, tarPos: Pos, nextStep?: Pos) {
		super(master);
		this.tarCre = tarCre;
		this.tarPos = tarPos;
		this.nextStep = nextStep;
		//cancel old task
		var ot = this.master.tasks.find(
			task => task instanceof PullTask && task != this
		);
		if (ot) {
			ot.end();
			return this;
		}
		//
		this.moveTask1 = new FindPathAndMoveTask(this.master, this.tarCre);
	}
	getMaster(): Cre {
		return <Cre>this.master;
	}
	loop_task(): void {
		// SA(this.master, "do PullTask");
		if (
			(this.moveTask1 && this.moveTask1.complete) ||
			myGetRange(this.master, this.tarCre) <= 1
		) {
			// SA(this.master, "this.moveTask1.complete");
			let ptRtn = this.master.normalPull(this.tarCre);
			if (ptRtn) {
				//if is pulling
				// SA(this.master, "is pulling");
				if (!this.moveTask2) {
					if (pullGoSawmp === true) {
						this.moveTask2 = new FindPathAndMoveTask(this.master, this.tarPos, 5, {
							plainCost: 5, swampCost: 0.1
						});
					} else {
						this.moveTask2 = new FindPathAndMoveTask(this.master, this.tarPos);
					}
				} else if (this.moveTask2.complete) {
					//master at pos
					// SA(this.master, "this.moveTask2.complete end");
					if (this.nextStep) this.master.moveToNormal(this.nextStep);
					else moveToRandomEmptyAround(this.master);
					this.end();
				} else if (atPos(this.tarCre, this.tarPos)) {
					//tar at pos
					// SA(this.master, "pull task end");
					this.end();
				} else {
					//wait moveTask2 complete
				}
			} else {
				// P("not pulled end");
				this.end();
			}
		} else {
			//do mis 1, move to tarCre
			// SA(this.master, "this.tarCre=" + COO(this.tarCre));
		}
	}
}
/**
 * pull a group of creep to a position
 * @param nextStep the pos creep will go next ,
 *  if is undefined the creep will move random at last position of path
 */
export class PullTarsTask extends Task_Cre {
	tarCres: Cre[];
	tarPos: Pos;
	nextStep: Pos | undefined;
	useLeaderPull: boolean;
	constructor(
		master: Cre,
		tarCres: Cre[],
		tarPos: Pos,
		nextStep?: Pos,
		useLeaderPull: boolean = true
	) {
		super(master);
		SA(master, "new PullTarsTask");
		this.tarCres = tarCres;
		this.tarPos = tarPos;
		this.nextStep = nextStep;
		this.useLeaderPull = useLeaderPull;
		//cancel old task
		var ot = this.master.tasks.find(
			task => task instanceof PullTarsTask && task != this
		);
		if (ot) {
			ot.end();
			return this;
		}
	}
	end(): void {
		super.end()
		this.master.tasks.find(i => i instanceof PullTask)?.end()
		// for (let tar of this.tarCres) {
		// 	tar.tasks.find(i => i instanceof PullTask)?.end()
		// }
	}
	loop_task(): void {
		// if have pull task
		SA(this.master, "PullTarsTask loop_task");
		let tarCres = this.tarCres;
		let allPulling = true; //if all being pulled
		//remove unexist tar
		for (let tar of tarCres) {
			if (!exist(tar)) {
				remove(tarCres, tar);
			}
		}
		//let tar be linked
		let creIdle = true;
		for (let i = 0; i < tarCres.length - 1; i++) {
			let tar = tarCres[i];
			let tarNext = tarCres[i + 1];
			//
			// SA(this.master, "try pull tar");
			// let pulling=tar.pullTar(tarNext);
			let pulling = tarNext.moveAndBePulled(tar);
			if (!pulling) {
				allPulling = false;
				let tarSpeed = tarNext.getSpeed();
				// let tarSpeed=tar.getSpeed()
				// if(creIdle || tarSpeed<1||!tarNext.hasMoveBodyPart()){
				if (
					this.useLeaderPull &&
					creIdle &&
					(tarSpeed < 1 || !tar.hasMoveBodyPart())
				) {
					//go pull this tar
					SA(this.master, "newPullTask");
					SA(this.master, "tar=" + COO(tar));
					SA(this.master, "tarNext=" + COO(tarNext));
					newPullTask(this.master, tarNext, tar);
					// newPullTask(this.master,tar,tarNext)
					creIdle = false;
				}
			}
		}
		if (allPulling) {
			//if all pulled
			SA(this.master, "allPulling");
			SA(this.master, "tarCres[0]=" + COO(tarCres[0]));
			SA(this.master, "this.tarPos=" + COO(this.tarPos));
			SA(this.master, "this.nextStep=" + COO(this.nextStep));
			newPullTask(this.master, tarCres[0], this.tarPos, this.nextStep);
		} else if (creIdle) {
			//this is idle,approach first
			this.master.MTJ(tarCres[0]);
		} else {
		}
	}
}
