/**
 Module: builder
 Author: 820491047
 CreateDate:   2023.1.10
 UpDateDate:   2023.1.10
 version 0.0.0
*/
import { ATTACK, WORK } from "game/constants";
import { ConstructionSite, StructureExtension, StructureRampart } from "game/prototypes";
import { findClosestByRange } from "game/utils";

import { cpuBreakJudge } from "../army";
import { createCS, CS, getMaxWorthCSS, getMyCSs, getProgressRate, hasConstructionSite } from "../constructionSite";
import { defendTheRampart, getMyHealthyRamparts, gotoTargetRampart, inMyHealthyRampart, inMyRampart, myRampartAt } from "../ramparts";
import { enemySpawn, getSpawnAndBaseContainerEnergy, inMyBaseRan, resetStartGateAvoidFromEnemies, spawn } from "../spawn";
import { getOutsideContainers } from "../util_attackable";
import { blocked, calAroundEnergy, canBeBuildByCre, Cre, friends, getCapacity, getEnemyThreats, getEnergy, getFreeEnergy, getHarvables, getIsBuilding, getRoundEmptyPosLeave1Empty, getSpawnAroundFreeContainers, getSpawnAroundLiveContainers, hasEnemyArmyAround, hasEnemyThreatAround, HasStore, live, protectSelfExtraTaunt, Role, setIsBuilding, Task_Cre } from "../util_Cre";
import { S } from "../util_export";
import { tick } from "../util_game";
import { myConstructionSites, myRamparts } from "../util_gameObjectInitialize";
import { d2, getClassName, invalid } from "../util_JS";
import { overallMap } from "../util_overallMap";
import { atPos, COO, getRangePoss, GR, midPoint, myGetRange, Pos } from "../util_pos";
import { findTask } from "../util_task";
import { SA, SAN } from "../util_visual";
import { wc } from "../util_WT";

/**Builder that used in trutling,will not go to wild resource.
 * Only stay at ramparts.
*/
export const builderTurtle: Role = new Role("builderTurtle", builderTurtleControl);
/**Builder that will only harvest wild resources,if you give it an ATTACK part
 * it will rush enemySpawn when game near end
*/
export const builderStandard: Role = new Role("builderStandard", builderStandardControl)
/**this type of builder will harvest outside after base building tasks finished*/
export const builder4Ram: Role = new Role("builder4Ram", builder4RamJob);
export function isBuilderOutSide(role: Role | undefined): boolean {
	return role === builderStandard || role === builder4Ram
}
/**job of builder4Ram*/
export function builder4RamJob(cre: Cre) {
	SA(cre, "builder4RamJob")
	const scanCSRange = 8;
	if (getMyCSs().find(i => GR(spawn, i) <= scanCSRange)) {
		let css = <CS[]>(
			getMyCSs().filter(
				i => GR(i, spawn) <= scanCSRange
					&& canBeBuildByCre(i, cre)
			)
		);
		let cs = getMaxWorthCSS(css);
		if (cs) {
			SA(cre, "builderNormalControl")
			builderNormalControl(cre, cs);
		} else {
			SA(cre, "job has no cs")
			if (myConstructionSites.find(i => atPos(i, cre))) {
				SA(cre, "random move")
				cre.randomMove()
			}
		}
		// builderControl(cre);
	} else {
		SA(cre, "builderStandardControl")
		builderStandardControl(cre);
	}
}
/**get the energy of spawn and builderTurtles*/
export function spawnAndBuilderEnergy() {
	const builders = friends.filter(i => i.role === builderTurtle);
	let rtn = 0;
	for (let builder of builders) {
		rtn += getEnergy(builder);
	}
	rtn += getEnergy(spawn);
	return rtn;
}
/**builder that build base structures and assign base containers.
 * Can be used as defender
*/
export function builderTurtleControl(cre: Cre) {
	SA(cre, "builderTurtleControl")
	cre.fight();
	cre.taskPriority = 9
	//
	cre.useAppointMovement()
	//
	const scanCSRange = 4;
	const css = getMyCSs().filter(
		i => canBeBuildByCre(i, cre)
			&& GR(i, spawn) <= scanCSRange
	)
	const canUseEnergy = getEnergy(cre) + getSpawnAndBaseContainerEnergy()
	SAN(cre, "canUseEnergy", canUseEnergy);
	const cs = getMaxWorthCSS(css);
	const emptyRamparts = myRamparts.filter(i => !blocked(i));
	const hasEmptyRampart: boolean = emptyRamparts.length > 0;
	const spawnHasRam = myRampartAt(spawn) !== undefined
	SA(cre, "spawnHasRam=" + spawnHasRam);
	cre.macro.setIsWorking(false)
	if (!inMyRampart(cre) && hasEmptyRampart) {
		//if not in ram,move to ram
		SA(cre, "not in ram");
		if (cre.appointMovementIsActived()) {
			SA(cre, "appointMovementIsActived");
			return;
		}
		defendTheRampart(cre);
	} else if (hasEnemyArmyAround(cre, 1)
		&& spawnHasRam
		&& !(tick >= 1900 && cs && canUseEnergy >= 200)
	) {
		SA(cre, "enemyAround");
		if (cre.appointMovementIsActived()) {
			SA(cre, "appointMovementIsActived");
			return;
		}
		defendTheRampart(cre);
	} else if (cs) {
		cre.macro.setIsWorking(true)
		SA(cre, "build");
		if (cre.appointMovementIsActived()) {
			SA(cre, "appointMovementIsActived");
		} else {
			defendTheRampart(cre);
		}
		if ((tick > 600
			&& !spawnHasRam
			&& getEnergy(cre) >= 5 * cre.getBodiesNum(WORK)
		)
			|| getIsBuilding(cre)) {
			SA(cre, "normalBuild");
			cre.macro.normalBuild(cs);
		} else if (tick <= 300) {//time for build ramparts
			SA(cre, "collectResource");
			let harvables = getHarvables()
				.filter(i => GR(i, spawn) <= 3)
				.concat(spawn);
			let harvable = cre.findClosestByRange(harvables);
			if (harvable) {
				cre.macro.directWithdraw(harvable);
			}
		} else {//time after tick 300
			SA(cre, "withdrawNormal");
			builderTurtleWithdrawNormal(cre)
		}
	} else {
		cre.macro.setIsWorking(false)
		//assign spawn energy to container
		if (getFreeEnergy(spawn) === 0) {
			SA(cre, "withdraw spawn to container")
			if (getEnergy(cre) > 0) {
				SA(cre, "has en");
				const cons = getSpawnAroundFreeContainers()
				const con = findClosestByRange(cre, cons)
				if (con) {
					SA(cre, "has container")
					if (GR(con, cre) <= 1) {
						cre.macro.transferNormal(con)
					} else {
						gotoTargetRampart(cre, con)
					}
				}
			} else {
				SA(cre, "no en");
				if (GR(cre, spawn) <= 1) {
					cre.macro.withdrawNormal(spawn);
				} else {
					gotoTargetRampart(cre, spawn)
				}
			}
		} else if (getFreeEnergy(cre) !== 0 && canUseEnergy >= getCapacity(cre)) {
			SA(cre, "withdraw backup energy");
			builderTurtleWithdrawNormal(cre)
		} else {
			SA(cre, "normal defend");
			if (cre.appointMovementIsActived()) {
				SA(cre, "appointMovementIsActived");
				return;
			}
			defendTheRampart(cre);
		}
	}
}
export function builderTurtleWithdrawNormal(cre: Cre) {
	let target: HasStore
	const cons = getSpawnAroundLiveContainers()
	const con = findClosestByRange(cre, cons)
	if (con && live(con)) {
		SA(cre, "withdraw con");
		target = con
	} else {
		SA(cre, "withdraw spawn");
		target = spawn
	}
	// if (getEnergy(spawn) > 50 || !con) {
	// 	SA(cre, "withdraw spawn");
	// 	target = spawn
	// } else {
	// 	SA(cre, "withdraw con");
	// 	target = con
	// }
	if (GR(cre, target) <= 1) {
		SA(cre, "withdraw it");
		cre.macro.withdrawNormal(target);
	} else {
		SA(cre, "go it");
		gotoTargetRampart(cre, target)
	}
}
/**
 * will search the 3*3 area to find an empty place to create the {@link CS}
 */
export function buildStructureByWorth(
	pos: Pos,
	type: any,
	worth: number = 1
): Pos | undefined {
	SA(pos, "buildStructure here type=" + getClassName(type));
	let poss = getRangePoss(pos, 1);
	let mc = getMyCSs();
	let validPos = poss.find(i => !hasConstructionSite(i) && !blocked(i));
	if (validPos) {
		let rtn = createCS(validPos, type, worth, true);
		return validPos;
	} else return undefined;
}
/**has builderStandard around the pos*/
export function hasBuilderStandardAround(pos: Pos) {
	const bss = friends.filter((i) => isBuilderOutSide(i.role) && myGetRange(i, pos) <= 1);
	return bss.length > 0;
}
/**the job of builderNormal*/
export function builderNormalControl(cre: Cre, tar: CS): boolean {
	if (getIsBuilding(cre)) {
		SA(cre, "directBuild");
		return cre.macro.directBuild(tar);
	} else {
		SA(cre, "harvesterControl");
		if (getEnergy(cre) > 0) {
			setIsBuilding(cre, true)
		} else {
			const target = findClosestByRange(cre, getHarvables())
			cre.macro.directWithdraw(target)
		}
		return true;
	}
}
/**the job of builderStandard*/
export function builderStandardControl(cre: Cre) {
	SA(cre, "melee");
	cre.fight()
	//
	const task = findTask(cre, BuilderStandardTask);
	if (!task) {
		if (cre.getBodiesNum(ATTACK) > 0) {
			SA(cre, "new ArmedBuilderTask(cre)");
			new ArmedBuilderTask(cre);
		} else {
			SA(cre, "new BuilderStandardTask(cre)");
			new BuilderStandardTask(cre);
		}
	}
}
// /**the*/
// export function getBuildWorthAndTarget(cre: Cre): { worth: number, target: CS } {
// 	let myCSs = getMyCSs()
// 	let sRtnCS = getDecideSearchRtnNoArea(cre, myCSs);
// 	let costCS = sRtnCS.cost;
// 	let target = <CS>getTargetBySRtn(cre, sRtnCS, myCSs);
// 	let CSWorth = 1 / costCS;
// 	return { worth: CSWorth, target: target };
// }
/**steps*/
const goto_outside_resource: string = "goto outside resource"
const drop_on_the_ground = "drop on the ground"
const build_rampart = "build rampart";
const build_extensions = "build extensions";
export class BuilderStandardTask extends Task_Cre {
	step: string = goto_outside_resource;
	fleeRange: number
	isWorking: boolean = true
	fleeBias: number
	constructor(master: Cre) {
		super(master);
		resetStartGateAvoidFromEnemies()
		if (master.getBodiesNum(ATTACK) > 0) {
			this.fleeRange = 12
			this.fleeBias = 7
		} else {
			this.fleeRange = 8
			this.fleeBias = 3
		}
	}
	/**control steps and run away from danger*/
	loop_task(): void {
		const cre = this.master
		if (cpuBreakJudge(cre)) {
			cre.macro.buildStatic()
			return;
		}
		SA(cre, "step=" + this.step);
		const closestEnemy = findClosestByRange(cre, getEnemyThreats())
		const cs = <ConstructionSite | undefined>overallMap.get(cre).find(i => i instanceof ConstructionSite && i.structure instanceof StructureRampart)
		SA(cre, "cs=" + S(cs))
		//try flee
		const workingExtra = this.isWorking ? -this.fleeBias : 0
		const hasEnemyAround = hasEnemyThreatAround(cre, 4)
		SA(cre, "hasEnemyAround=" + hasEnemyAround)
		if (hasEnemyAround) {
			protectSelfExtraTaunt(cre, 0.5);
		}
		let doStep: boolean = true
		if (!inMyHealthyRampart(cre) && hasEnemyAround) {
			SA(cre, "builder flee")
			protectSelfExtraTaunt(cre, 0.8);
			cre.dropEnergy();
			const ram = getMyHealthyRamparts().find(i => GR(i, cre) <= 10 && !blocked(i))
			const realFleeRange = this.fleeRange + workingExtra
			if (ram) {
				cre.MTJ_follow(ram)
				doStep = false
			} else if (cre.battle.flee(realFleeRange, realFleeRange * 2)) {
				SA(cre, "flee");
				doStep = false
			} else {
				doStep = true
			}
			//go to outside resource
		}
		if (doStep) {
			//move to safe gate
			if (inMyBaseRan(cre) && getEnemyThreats().find(i => inMyBaseRan(cre)) !== undefined) {
				SA(cre, "move to safe gate")
				cre.MTJ(enemySpawn)
				doStep = false
			} else {
				doStep = true
			}
		}
		if (doStep) {
			if (this.step === goto_outside_resource && !hasEnemyAround) {
				SA(cre, "goto_outside_resource")
				this.gotoOutSideResource()
			} else if (this.step === drop_on_the_ground) {
				SA(cre, "drop_on_the_ground")
				this.dropOntheGround()
			} else if (this.step === build_rampart) {
				SA(cre, "build_rampart")
				this.buildRampart(cs, closestEnemy, this.fleeRange + 2)
			} else if (this.step === build_extensions) {
				SA(cre, "build_extensions")
				this.buildExtensions(cs, closestEnemy, this.fleeRange + 2)
			} else {
				SA(cre, "no work")
			}
		} else {
			SA(cre, "don't do step")
		}
	}
	/**the step of go to outside resource.It will avoid the harvable
	 * that already has a builderStandard there
	*/
	gotoOutSideResource() {
		const cre = this.master
		if (inMyHealthyRampart(cre) && hasEnemyThreatAround(cre, 3)) {
			SA(cre, "i'm scared");
		} else {
			let harvestables = getHarvables().filter(i => {
				let j0 = getEnergy(i) > 500;
				let j1 = myGetRange(i, spawn) >= 5;
				let j2 = !(hasBuilderStandardAround(i) && !(myGetRange(cre, i) <= 1));
				let j3 = cre.macro.reachableHarvable(i)
				return j0 && j1 && j2 && j3;
			});
			let har = cre.findClosestByRange(harvestables);
			if (har) {
				cre.MTJ(har);
				cre.dropEnergy();
				if (myGetRange(cre, har) <= 1) {
					cre.stop();
					this.step = drop_on_the_ground
				}
			} else {
				cre.MTJ(midPoint);
			}
		}
	}
	/**drop the energy of container onto the ground*/
	dropOntheGround() {
		//drop con
		const cre = this.master
		let ccs = getOutsideContainers().filter((i) => getEnergy(i) > 0 && myGetRange(i, cre) <= 1);
		let cc = cre.findClosestByRange(ccs);
		if (cc) {
			cre.macro.directWithdrawAndDrop(cc);
		} else {
			this.step = build_rampart;
		}
	}
	/**build the rampart for itself.It will not build it finished if not dangerous*/
	buildRampart(cs: ConstructionSite | undefined, closestEnemy: Cre, fleeRange: number) {
		const cre = this.master
		//if rampart is far from finished and enemy is still far away from here,
		//give up the building and directly build extensions
		if (cs &&
			GR(cre, closestEnemy) - fleeRange > (cs.progressTotal - cs.progress) / 5
			&& getProgressRate(cs) < 0.8) {
			this.step = build_extensions;
			(<CS>cs).wt = wc(5)
		}
		//build ram
		let sumEn = calAroundEnergy(cre);
		sumEn += getEnergy(cre);
		if (sumEn >= 200) {
			if (inMyRampart(cre)) {
				this.step = build_extensions;
			} else {
				createCS(cre, StructureRampart, 5, true);
				if (hasEnemyArmyAround(cre, 1) && cre.getBodies(ATTACK).length > 0) {
					cre.fight()
				} else {
					cre.macro.buildStatic();
				}
			}
		} else {
			this.step = goto_outside_resource;
		}
	}
	/**build extensions and fill it until all energy exhaust*/
	buildExtensions(cs: ConstructionSite | undefined, closestEnemy: Cre, fleeRange: number) {
		const cre = this.master
		if (!inMyRampart(cre) && cs && GR(cre, closestEnemy) - fleeRange <= (cs.progressTotal - cs.progress) / 5) {
			this.step = build_rampart;
			(<CS>cs).wt = wc(12)
		}
		let sumEn: number = calAroundEnergy(cre);
		sumEn += getEnergy(cre);
		SA(cre, "sumEn=" + d2(sumEn));
		if (sumEn > 0) {
			if (getEnergy(cre) > 0) {
				let fb = cre.macro.fillExtension();
				if (!fb) {
					SA(cre, "fillExtension=" + fb);
					if (sumEn > 0) {
						let css = getMyCSs().find((i) => {
							let j0 = myGetRange(i, cre) <= 3;
							let j1 = i.structure instanceof StructureExtension;
							let j2 = !blocked(i);
							// SA(i,"j0="+j0)
							// SA(i,"j1="+j1)
							// SA(i,"j2="+j2)
							return j0 && j1 && j2;
						});
						SA(cre, "css=" + COO(css));
						if (invalid(css)) {
							SA(cre, "create CS");
							let exPos: Pos | undefined = getRoundEmptyPosLeave1Empty(cre, true);
							if (exPos) {
								SA(exPos, "exPos here")
								if (sumEn >= 200) {
									if (hasEnemyArmyAround(cre, 4)) {
										createCS(exPos, StructureRampart, 9, true);
									}
									SA(exPos, "createCS")
									createCS(exPos, StructureExtension, 8, true);
								} else {
									this.step = goto_outside_resource;
								}
							} else {
								this.step = goto_outside_resource;
							}
						}
						if (hasEnemyArmyAround(cre, 1) && cre.getBodies(ATTACK).length > 0) {
							cre.fight()
						} else {
							cre.macro.buildStatic();
						}
					} else {
						this.step = goto_outside_resource;
					}
				}
			} else {
				cre.macro.withDrawStatic();
			}
		} else {
			this.step = goto_outside_resource;
		}
	}

}
/**the builderStandardTask when there is ATTACK part on the builder*/
export class ArmedBuilderTask extends BuilderStandardTask {
	rush: boolean
	constructor(master: Cre) {
		super(master);
		this.rush = false
	}
	loop_task() {
		const cre = this.master
		if (friends.length > 45) {
			cre.upgrade.rush = true;
		}
		if (tick >= 1700 || cre.upgrade.rush) {
			//rush enemySpawn
			cre.dropEnergy();
			cre.MTJ_follow(enemySpawn);
		} else {
			super.loop_task()
		}
	}
}

