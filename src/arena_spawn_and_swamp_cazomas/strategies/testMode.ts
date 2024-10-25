/**
 Module: util_testMode
 Author: 820491047
 CreateDate:   2023.1.10
 UpDateDate:   2023.1.10
 version 0.0.0
*/
import { TOUGH } from "game/constants";
import { CostMatrix, searchPath } from "game/path-finder";
import { StructureExtension } from "game/prototypes";

import { builder4Ram } from "../roles/builder";
import { harvester } from "../roles/harvester";
import { createCS } from "../units/constructionSite";
import { enemySpawn, spawn, spawnCreep } from "../units/spawn";
import { TB } from "../utils/autoBodys";
import { ct, pt } from "../utils/CPU";
import { Cre, friends, id, Role } from "../utils/Cre";
import { validEvent } from "../utils/event";
import { S } from "../utils/export";
import { P, tick } from "../utils/game";
import { divideReduce } from "../utils/JS";
import { MyMap } from "../utils/MyMap";
import { atPos, GR, midPoint, plusVector } from "../utils/pos";
import { drawPolyLight, drawRangeComplex, fillCircle, SA } from "../utils/visual";

//这个是测试脚本集合，将所有的测试保留在这里，以便版本变更时确认是否还有以下的特性
//Role
export const tester_MSS: Role = new Role("tester_MSS", tester_MSS_Job);
export const tester_DCB: Role = new Role("tester_DCB", tester_DCB_Job);
export const tester_MCB: Role = new Role("tester_MCB", tester_MCB_Job);
export const tester_PFC: Role = new Role("tester_PFC", tester_PFC_Job);
export const tester_PFC2: Role = new Role("tester_PFC2", tester_PFC2_Job);
function findOtherTester(cre: Cre, role: Role) {
	return friends.find(i => i !== cre && i.role === role);
}
//## TEST and LOOP
export function tester_PFC2_Job(cre: Cre) {
	SA(cre, "i'm tester_PFC2")
	if (cre.getBodiesNum(TOUGH) > 0) {
		SA(cre, "i'm tougher")
		if (!validEvent(cre.bePulledTarget, 0)) {
			cre.moveToNormal(enemySpawn)
		}
	} else {
		const tougher = friends.find(i => i.getBodiesNum(TOUGH) > 0)
		const target = tougher
		// const target = friends.find(i => !i.canMove())
		// if(cre.canMove()){
		if (target && cre.canMove()) {
			const nextTar = target.moveTargetNextPos?.pos
			if (nextTar) {
				if (!atPos(cre, nextTar)) {
					cre.master.moveTo(nextTar)
				} else if (cre.pullTar(target)) {
					cre.master.moveTo(enemySpawn)
				}
			}
		}
		// }
	}
}
export function tester_PFC_Job(cre: Cre) {
	SA(cre, "i'm tester_PFC")
	const pos1 = plusVector(spawn, { x: 1, y: -1 })
	const pos2 = plusVector(spawn, { x: 1, y: 0 })
	const pos3 = plusVector(spawn, { x: 2, y: 0 })
	const pos4 = plusVector(spawn, { x: 1, y: 1 })
	const testTick = 50
	if (tick <= testTick) {
		if (cre.getBodiesNum(TOUGH) > 0) {
			cre.master.moveTo(pos1)
		} else {
			cre.master.moveTo(pos2)
		}
	}
	if (tick === testTick + 1) {
		if (cre.getBodiesNum(TOUGH) > 0) {
			cre.master.moveTo(pos3)
		}
	}
	if (tick === testTick + 2) {
		if (cre.getBodiesNum(TOUGH) === 0) {
			const otherFri = findOtherTester(cre, tester_PFC)
			if (otherFri) {
				cre.pullTar(otherFri)
				cre.master.moveTo(pos4)
			}
		}
	}
}
export function tester_MSS_Job(cre: Cre) {
	SA(cre, "i'm tester_MSS")
	const pos1 = plusVector(spawn, { x: 1, y: -1 })
	const pos2 = plusVector(spawn, { x: 1, y: 1 })
	const pos3 = plusVector(spawn, { x: 2, y: 0 })
	if (tick <= 20) {
		if (id(cre) % 2 === 0) {
			cre.master.moveTo(pos1)
		} else {
			cre.master.moveTo(pos2)
		}
	}
	if (tick === 21) {
		cre.master.moveTo(pos3)
	}
}
export function tester_MCB_Job(cre: Cre) {
	SA(cre, "i'm tester_MCB")
	if (tick >= 34) {
		const csPos = plusVector(spawn, { x: 2, y: -1 })
		cre.master.moveTo(csPos)
	}
}
export function tester_DCB_Job(cre: Cre) {
	SA(cre, "i'm tester_DCB")
	const pos1 = plusVector(spawn, { x: 1, y: -1 })
	const pos2 = plusVector(spawn, { x: 1, y: 0 })
	if (id(cre) % 2 === 0) {
		if (tick <= 20) {
			cre.master.moveTo(pos1)
		} else {
			cre.master.moveTo(pos2)
			const otherTester = findOtherTester(cre, tester_DCB)
			if (otherTester)
				cre.master.attack(otherTester.master)
		}
	} else {
		if (tick <= 20) {
			cre.master.moveTo(pos2)
		} else {
		}
	}
}
/**test move to same pos in same tick
 * testResult:the id-low creep go first???no, guess use iterate until no block
*/
const MSS: string = "MSS"
/**test if dead creep block
 * testResult:the creep died at the tick will still block other creep
*/
const DCB: string = "DCB"
/**test if creep move to cs block the build of this tick
 *testResult:the cs will be built at the tick other creep move on it
*/
const MCB: string = "MCB"
/**test search path of flee of specific cost matrix
*/
const SPF: string = "SPF"
/**test if can pull a fatigue creep
 * testResult:the fatigue creep can move ,but the fatigue that ready has will not change or transfer.
 * the creep that has fatigue cannot move,so M body could only used as a one-time mover
*/
const PFC: string = "PFC"
/**test if can pull a fatigue creep
*/
const PFC2: string = "PFC2"
/** other test result ,move action will cover front move action at same tick on same creep*/
/** speed of new an object */
const NOS: string = "NOS"
export function useTest() {
	//change mode here
	const mode = PFC2
	//
	if (mode === "MSS") {
		if (tick === 1) {
			spawnCreep(TB("M"), tester_MSS)
			spawnCreep(TB("M"), tester_MSS)
		}
	} else if (mode === "DCB") {
		if (tick === 1) {
			spawnCreep(TB("CM"), harvester)
			spawnCreep(TB("AM"), tester_DCB)
			spawnCreep(TB("AM"), tester_DCB)
		}
	} else if (mode === "MCB") {
		if (tick === 1) {
			spawnCreep(TB("CM"), harvester)
			const csPos = plusVector(spawn, { x: 2, y: -1 })
			createCS(csPos, StructureExtension)
			spawnCreep(TB("WCM"), builder4Ram)
			spawnCreep(TB("M"), tester_MCB)
		}
	} else if (mode === "PFC") {
		if (tick === 1) {
			spawnCreep(TB("CM"), harvester)
			spawnCreep(TB("MTTT"), tester_PFC)
			spawnCreep(TB("M"), tester_PFC)
		}
	} else if (mode === "PFC2") {
		if (tick === 1) {
			spawnCreep(TB("CM"), harvester)
			spawnCreep(TB("M"), tester_PFC2)
			spawnCreep(TB("M"), tester_PFC2)
			spawnCreep(TB("10TMA"), tester_PFC2)
		}
	} else if (mode === "SPF") {
		if (tick === 1) {
			let testPoint = midPoint
			// for (let i = 0; i < 10; i++) {
			// 	if (blocked(testPoint)) {
			// 		testPoint = { x: 20 + ran(60), y: 20 + ran(60) }
			// 	} else {
			// 		break;
			// 	}
			// }
			const fleeRange = 10
			const cm = new CostMatrix()
			for (let x = 0; x < 100; x++) {
				for (let y = 0; y < 100; y++) {
					const enPoint = { x: 40, y: 50 }
					const point = { x: x, y: y }
					const range = GR(point, enPoint)
					const value = 100 * divideReduce(range, 10)
					if (GR(point, midPoint) <= 10) {
						fillCircle(point, "#123123", value / 100, value / 100)
					}
					cm.set(x, y, value)
				}
			}
			const sRtn = searchPath(testPoint,
				// const sRtn = searchPath(new Pos_C(testPoint),
				{ pos: testPoint, range: fleeRange },
				{
					costMatrix: cm,
					flee: true
				})
			P("sRtn.cost" + sRtn.cost)
			P("sRtn.path" + S(sRtn.path))
			P("sRtn.incomplete" + sRtn.incomplete)
			P("sRtn.ops" + sRtn.ops)
			drawPolyLight(sRtn.path)
			drawRangeComplex(testPoint, fleeRange, 0.8, "#3333aa")
		}
	} else if (mode == NOS) {
		const st = ct()
		const stepX = 300
		const stepY = 300
		const step = stepX * stepY
		let sum = 0
		for (let i = 0; i < step; i++) {

		}
		pt("empty", st)
		const st2 = ct()
		for (let i = 0; i < step; i++) {
			const cc = { x: i }
			sum += cc.x
		}
		pt("new{}", st2)
		const st3 = ct()
		const lamb: (i: number) => number = i => 0
		for (let i = 0; i < step; i++) {
			const cc = lamb(i)
			sum += cc
		}
		pt("lamb", st3)
		const arr2D = new MyMap<number>(100, 100, 0, 0)
		const st4 = ct()
		for (let i = 0; i < stepX; i++) {
			for (let j = 0; j < stepY; j++) {
				arr2D.set_realIndex(i, j, 0)
			}
		}
		pt("[][]", st4)
		P("sum=" + sum)
	}
	//TEST CODE
}
