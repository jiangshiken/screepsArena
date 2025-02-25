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

import { Cre, Task_Role } from "arena_spawn_and_swamp_cazomas/gameObjects/Cre";
import {
  enemySpawn,
  mySpawn,
} from "arena_spawn_and_swamp_cazomas/gameObjects/GameObjectInitialize";
import { Cre_findPath } from "../gameObjects/Cre_findPath";
import { Cre_move } from "../gameObjects/Cre_move";
import { Cre_pull } from "../gameObjects/Cre_pull";
import { Role } from "../gameObjects/CreTool";
import { createCS } from "../gameObjects/CS";
import { S } from "../gameObjects/export";
import { friends } from "../gameObjects/GameObjectInitialize";
import { spawnCreep } from "../gameObjects/spawn";
import { builderTurtle } from "../roles/builder";
import { harvester } from "../roles/harvester";
import { TB } from "../utils/autoBodys";
import { ct, pt } from "../utils/CPU";
import { tick } from "../utils/game";
import { divideReduce } from "../utils/JS";
import { MyMap } from "../utils/MyMap";
import { atPos, GR, midPoint, Pos_C, posPlusVec } from "../utils/Pos";
import {
  drawPolyLight,
  drawRangeComplex,
  fillCircle,
  P,
  SA,
} from "../utils/visual";

//这个是测试脚本集合，将所有的测试保留在这里，以便版本变更时确认是否还有以下的特性
//Role
export const tester_MSS: Role = new Role(
  "tester_MSS",
  cre => new tester_MSS_Job(<Cre_pull>cre)
);
export const tester_DCB: Role = new Role(
  "tester_DCB",
  cre => new tester_DCB_Job(<Cre_pull>cre)
);
export const tester_MCB: Role = new Role(
  "tester_MCB",
  cre => new tester_MCB_Job(<Cre_pull>cre)
);
export const tester_PFC: Role = new Role(
  "tester_PFC",
  cre => new tester_PFC_Job(<Cre_pull>cre)
);
export const tester_PFC2: Role = new Role(
  "tester_PFC2",
  cre => new tester_PFC2_Job(<Cre_pull>cre)
);

function findOtherTester(cre: Cre, role: Role) {
  return friends.find(i => i !== cre && i.role === role);
}
//## TEST and LOOP
export class tester_PFC2_Job extends Task_Role {
  master: Cre_pull;
  constructor(master: Cre_pull) {
    super(master);
    this.master = master;
    this.cancelOldTask(tester_PFC2_Job);
  }
  loop_task(): void {
    const cre = this.master;
    SA(cre, "i'm tester_PFC2");
    if (cre.getBodyPartsNum(TOUGH) > 0) {
      SA(cre, "i'm tougher");
      if (!cre.bePulledEvent?.validEvent()) {
        cre.moveTo_basic(enemySpawn);
      }
    } else {
      const tougher = <Cre_move>friends.find(i => i.getBodyPartsNum(TOUGH) > 0);
      const target = tougher;
      // const target = friends.find(i => !i.canMove())
      // if(cre.canMove()){
      if (target && cre.master.fatigue === 0) {
        const nextTar = target.moveEvent?.nextStep;
        if (nextTar) {
          if (!atPos(cre, nextTar)) {
            cre.master.moveTo(nextTar);
          } else if (cre.normalPull(target)) {
            cre.master.moveTo(enemySpawn);
          }
        }
      }
      // }
    }
  }
}
export class tester_PFC_Job extends Task_Role {
  master: Cre_pull;
  constructor(master: Cre_pull) {
    super(master);
    this.master = master;
    this.cancelOldTask(tester_PFC_Job);
  }
  loop_task(): void {
    const cre = this.master;
    SA(cre, "i'm tester_PFC");
    const pos1 = posPlusVec(mySpawn, { vec_x: 1, vec_y: -1 });
    const pos2 = posPlusVec(mySpawn, { vec_x: 1, vec_y: 0 });
    const pos3 = posPlusVec(mySpawn, { vec_x: 2, vec_y: 0 });
    const pos4 = posPlusVec(mySpawn, { vec_x: 1, vec_y: 1 });
    const testTick = 50;
    if (tick <= testTick) {
      if (cre.getBodyPartsNum(TOUGH) > 0) {
        cre.master.moveTo(pos1);
      } else {
        cre.master.moveTo(pos2);
      }
    }
    if (tick === testTick + 1) {
      if (cre.getBodyPartsNum(TOUGH) > 0) {
        cre.master.moveTo(pos3);
      }
    }
    if (tick === testTick + 2) {
      if (cre.getBodyPartsNum(TOUGH) === 0) {
        const otherFri = <Cre_findPath>findOtherTester(cre, tester_PFC);
        if (otherFri) {
          cre.normalPull(otherFri);
          cre.master.moveTo(pos4);
        }
      }
    }
  }
}
export class tester_MSS_Job extends Task_Role {
  master: Cre_pull;
  constructor(master: Cre_pull) {
    super(master);
    this.master = master;
    this.cancelOldTask(tester_MSS_Job);
  }
  loop_task(): void {
    const cre = this.master;
    SA(cre, "i'm tester_MSS");
    const pos1 = posPlusVec(mySpawn, { vec_x: 1, vec_y: -1 });
    const pos2 = posPlusVec(mySpawn, { vec_x: 1, vec_y: 1 });
    const pos3 = posPlusVec(mySpawn, { vec_x: 2, vec_y: 0 });
    if (tick <= 20) {
      if (cre.id % 2 === 0) {
        cre.master.moveTo(pos1);
      } else {
        cre.master.moveTo(pos2);
      }
    }
    if (tick === 21) {
      cre.master.moveTo(pos3);
    }
  }
}
export class tester_MCB_Job extends Task_Role {
  master: Cre_pull;
  constructor(master: Cre_pull) {
    super(master);
    this.master = master;
    this.cancelOldTask(tester_MCB_Job);
  }
  loop_task(): void {
    const cre = this.master;
    SA(cre, "i'm tester_MCB");
    if (tick >= 34) {
      const csPos = posPlusVec(mySpawn, { vec_x: 2, vec_y: -1 });
      cre.master.moveTo(csPos);
    }
  }
}
export class tester_DCB_Job extends Task_Role {
  master: Cre_pull;
  constructor(master: Cre_pull) {
    super(master);
    this.master = master;
    this.cancelOldTask(tester_DCB_Job);
  }
  loop_task(): void {
    const cre = this.master;
    SA(cre, "i'm tester_DCB");
    const pos1 = posPlusVec(mySpawn, { vec_x: 1, vec_y: -1 });
    const pos2 = posPlusVec(mySpawn, { vec_x: 1, vec_y: 0 });
    if (cre.id % 2 === 0) {
      if (tick <= 20) {
        cre.master.moveTo(pos1);
      } else {
        cre.master.moveTo(pos2);
        const otherTester = findOtherTester(cre, tester_DCB);
        if (otherTester) cre.master.attack(otherTester.master);
      }
    } else {
      if (tick <= 20) {
        cre.master.moveTo(pos2);
      } else {
      }
    }
  }
}
/**test move to same pos in same tick
 * testResult:the id-low creep go first???no, guess use iterate until no block
 */
const MSS: string = "MSS";
/**test if dead creep block
 * testResult:the creep died at the tick will still block other creep
 */
const DCB: string = "DCB";
/**test if creep move to cs block the build of this tick
 *testResult:the cs will be built at the tick other creep move on it
 */
const MCB: string = "MCB";
/**test search path of flee of specific cost matrix
 */
const SPF: string = "SPF";
/**test if can pull a fatigue creep
 * testResult:the fatigue creep can move ,but the fatigue that ready has will not change or transfer.
 * the creep that has fatigue cannot move by itself,so M body could only used as a one-time mover
 */
const PFC: string = "PFC";
/**test if can pull a fatigue creep
 */
const PFC2: string = "PFC2";
//other test result ,move action will cover front move action at same tick on same creep
/** speed of new an object */
const NOS: string = "NOS";
export function useTest() {
  //change mode here
  const mode = PFC2;
  //
  if (mode === "MSS") {
    if (tick === 1) {
      spawnCreep(TB("M"), tester_MSS);
      spawnCreep(TB("M"), tester_MSS);
    }
  } else if (mode === "DCB") {
    if (tick === 1) {
      spawnCreep(TB("CM"), harvester);
      spawnCreep(TB("AM"), tester_DCB);
      spawnCreep(TB("AM"), tester_DCB);
    }
  } else if (mode === "MCB") {
    if (tick === 1) {
      spawnCreep(TB("CM"), harvester);
      const csPos = posPlusVec(mySpawn, { vec_x: 2, vec_y: -1 });
      createCS(csPos, StructureExtension);
      spawnCreep(TB("WCM"), builderTurtle);
      spawnCreep(TB("M"), tester_MCB);
    }
  } else if (mode === "PFC") {
    if (tick === 1) {
      spawnCreep(TB("CM"), harvester);
      spawnCreep(TB("MTTT"), tester_PFC);
      spawnCreep(TB("M"), tester_PFC);
    }
  } else if (mode === "PFC2") {
    if (tick === 1) {
      spawnCreep(TB("CM"), harvester);
      spawnCreep(TB("M"), tester_PFC2);
      spawnCreep(TB("M"), tester_PFC2);
      spawnCreep(TB("10TMA"), tester_PFC2);
    }
  } else if (mode === "SPF") {
    if (tick === 1) {
      let testPoint = midPoint;
      // for (let i = 0; i < 10; i++) {
      // 	if (blocked(testPoint)) {
      // 		testPoint = { x: 20 + ran(60), y: 20 + ran(60) }
      // 	} else {
      // 		break;
      // 	}
      // }
      const fleeRange = 10;
      const cm = new CostMatrix();
      for (let x = 0; x < 100; x++) {
        for (let y = 0; y < 100; y++) {
          const enPoint = { x: 40, y: 50 };
          const point = { x: x, y: y };
          const range = GR(point, enPoint);
          const value = 100 * divideReduce(range, 10);
          if (GR(point, midPoint) <= 10) {
            fillCircle(point, "#123123", value / 100, value / 100);
          }
          cm.set(x, y, value);
        }
      }
      const sRtn = searchPath(
        testPoint,
        // const sRtn = searchPath(new Pos_C(testPoint),
        { pos: testPoint, range: fleeRange },
        {
          costMatrix: cm,
          flee: true,
        }
      );
      P("sRtn.cost" + sRtn.cost);
      P("sRtn.path" + S(sRtn.path));
      P("sRtn.incomplete" + sRtn.incomplete);
      P("sRtn.ops" + sRtn.ops);
      drawPolyLight(sRtn.path);
      drawRangeComplex(testPoint, fleeRange, 0.8, "#3333aa");
    }
  } else if (mode == NOS) {
    const st = ct();
    const stepX = 300;
    const stepY = 300;
    const step = stepX * stepY;
    let sum = 0;
    for (let i = 0; i < step; i++) {}
    pt("empty", st);
    const st2 = ct();
    for (let i = 0; i < step; i++) {
      const cc = { x: i };
      sum += cc.x;
    }
    pt("new{}", st2);
    const st3 = ct();
    const lamb: (i: number) => number = i => 0;
    for (let i = 0; i < step; i++) {
      const cc = lamb(i);
      sum += cc;
    }
    pt("lamb", st3);
    const arr2D = new MyMap<number>(100, 100, () => 0, 0);
    const st4 = ct();
    for (let i = 0; i < stepX; i++) {
      for (let j = 0; j < stepY; j++) {
        arr2D.set(new Pos_C(i, j), 0);
      }
    }
    pt("[][]", st4);
    P("sum=" + sum);
  }
  //TEST CODE
}
