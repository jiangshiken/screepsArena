import { arenaInfo } from "game";
import { CostMatrix } from "game/path-finder";
import {
  findClosestByRange,
  getCpuTime,
  getHeapStatistics,
  getTicks,
} from "game/utils";

import { ATTACK, CARRY, HEAL, MOVE, RANGED_ATTACK, WORK } from "game/constants";
import { Creep } from "game/prototypes";
import { Cre } from "./gameObjects/Cre";
import { Cre_battle } from "./gameObjects/Cre_battle";
import { Cre_build } from "./gameObjects/Cre_build";
import {
  Cre_findPath,
  initGateCost,
  searchPath_area,
} from "./gameObjects/Cre_findPath";
import {
  Cre_harvest,
  getEnemyProducers,
  getMyProducers,
} from "./gameObjects/Cre_harvest";
import {
  enRamBlockCostMatrix_setBlock,
  friendBlockCostMatrix_setBlock,
  moveBlockCostMatrix_setBlock,
} from "./gameObjects/Cre_move";
import { Cre_pull } from "./gameObjects/Cre_pull";
import { controlCreeps, isMelee, isMyTick } from "./gameObjects/CreTool";
import { S } from "./gameObjects/export";
import {
  BlockGO,
  containers,
  creeps,
  cres,
  enemySpawn,
  getGOs,
  initialCSsAtLoopStart,
  initialGameObjectsAtLoopStart_advance,
  initialGameObjectsAtLoopStart_basic,
  initialressAtLoopStart,
  initialStrusAtLoopStart,
  mySpawns,
  oppoRamparts,
  oppoSpawns,
  set_cres,
  setEnemySpawn,
  setSpawn,
  spawn,
  strus,
} from "./gameObjects/GameObjectInitialize";
import {} from "./gameObjects/HasHits";
import {
  findGO_lambda,
  overallMapInit,
  setGameObjectsThisTick,
  setOverallMap,
} from "./gameObjects/overallMap";
import { checkSpawns, SpawnInfo, spawnList } from "./gameObjects/spawn";
import { Con } from "./gameObjects/Stru";
import {
  blockCost,
  getEnergy,
  isBlockGO,
  set_enRamBlockCostMatrix,
  set_friendBlockCostMatrix,
  set_moveBlockCostMatrix,
} from "./gameObjects/UnitTool";
import {
  showEnemies,
  showHealthBars,
  showHits,
} from "./gameObjects/visual_Cre";
import { ct, getCPUPercent, pt, ptL } from "./utils/CPU";
import {
  creepBodyPartNum,
  inResourceArea,
  set_spawn_left,
  setTick,
} from "./utils/game";
import { divideReduce } from "./utils/JS";
import { getRangePoss, GR, Pos, Pos_C } from "./utils/Pos";
import { PL } from "./utils/print";
import {
  append_largeSizeText,
  displayPos,
  drawText,
  // firstInit_visual,
  loopEnd_visual,
  loopStart_visual,
  P,
  SA,
  SAN,
} from "./utils/visual";

export function loopEnd() {
  const st0 = ct();
  drawText(new Pos_C(50, 56), "F");
  SA(displayPos(), "spawnList.length=" + spawnList.length);
  controlCreeps();
  displayRoleCPU();
  pt("controlCreeps", st0);
  drawText(new Pos_C(50, 57), "G");
  const st1 = ct();
  showHits();
  showEnemies();
  doLongProgress();
  drawText(new Pos_C(50, 58), "H");
  printCPU();
  append_largeSizeText("LEN");
  loopEnd_visual();
  drawText(new Pos_C(50, 59), "I");
  pt("loop end other", st1);
}
let initSpawnDistanceProgress = 0;
function doLongProgress() {
  P("do long progress");
  P("initSpawnDistanceProgress " + initSpawnDistanceProgress);
  //init spawn distance map and enemySpawn distance map
  for (let i = initSpawnDistanceProgress; i < 10000; i++) {
    //do things
    initSpawnDistanceProgress = i + 1;
    if (getCPUPercent() > 0.9) {
      break;
    }
  }
}
export let useAvoidEnRam = false;
export function set_useAvoidEnRam(b: boolean) {
  useAvoidEnRam = b;
}
export function loopStart() {
  PL("loopStart start");
  setTick(getTicks());
  overallMapInit();
  const st1 = ct();
  loopStart_visual();
  ptL("loopStart_visual", st1);
  const st2 = ct();
  initialGameObjectsAtLoopStart_basic();
  ptL("initialGameObjects", st2);
  const st3 = ct();
  initialCresAtLoopStart();
  initialStrusAtLoopStart();
  initialCSsAtLoopStart();
  initialressAtLoopStart();
  const st3p5 = ct();
  initialGameObjectsAtLoopStart_advance();

  pt("initialGameObjects", st3p5);
  pt("init cres and other", st3);
  //set overall map
  const st4 = ct();
  setGameObjectsThisTick(<Pos[]>getGOs());
  setSpawn(mySpawns[0]);
  setEnemySpawn(oppoSpawns[0]);
  if (getTicks() === 1) {
    set_spawn_left(spawn.x < 50);
    initGateCost();
  }
  setOverallMap();
  //
  append_largeSizeText("Status:");

  const st_predictOppos = ct();
  setBlockCostMatrix();
  setFriendBlockCostMatrix();
  pt("predictOppos and setRamMoveMapValue", st_predictOppos);
  const st_checkSpawns = ct();
  checkSpawns();
  pt("checkSpawns", st_checkSpawns);
  const st5 = ct();
  setWorthForContainers();
  showHealthBars();
  pt("setWorthForContainers", st5);
  P("loopStart end");
}
export function setFriendBlockCostMatrix() {
  set_friendBlockCostMatrix(new CostMatrix());
  const blockGOs = (<BlockGO[]>cres).concat(strus);
  blockGOs.forEach(i => {
    if (isBlockGO(i, false, true)) {
      friendBlockCostMatrix_setBlock(i);
    }
  });
}
export function setEnRamBlockCostMatrix() {
  set_enRamBlockCostMatrix(new CostMatrix());
  const enRams = oppoRamparts.filter(
    i =>
      findGO_lambda(i, en => en instanceof Cre && en.oppo && isMelee(en)) !==
      undefined
  );
  enRams.forEach(i => {
    const rangePoss = getRangePoss(i);
    for (let rp of rangePoss) {
      enRamBlockCostMatrix_setBlock(rp);
      drawText(rp, "B");
    }
  });
}
export function setBlockCostMatrix() {
  set_moveBlockCostMatrix(new CostMatrix());
  const blockGOs = (<BlockGO[]>cres).concat(strus);
  blockGOs.forEach(i => {
    if (isBlockGO(i)) {
      moveBlockCostMatrix_setBlock(i);
    }
  });
}
export function setWorthForContainers() {
  const conts: Con[] = <Con[]>containers.filter(i => inResourceArea(i));
  P("setWorthForContainers:" + conts.length);
  for (let cont of conts) {
    setWorthForContainer(cont);
  }
}
export function setWorthForContainer(cont: Con): void {
  //
  if (isMyTick(cont, 25)) {
    const myProducers = getMyProducers();
    const myProducer = findClosestByRange(cont, myProducers);
    const myProducerCost = myProducer ? GR(myProducer, cont) : 100;
    // const myProducerCost = myProducer ? searchPath(cont, myProducer).cost : 500
    // const myDisProducerExtra = divideReduce(myProducerCost, 50)
    const myDisProducerExtra = divideReduce(myProducerCost, 10);
    //
    const enemyProducers = getEnemyProducers();
    const enemyProducer = findClosestByRange(cont, enemyProducers);
    const enemyProducerCost = enemyProducer ? GR(enemyProducer, cont) : 100;
    const enemyDisProducerExtra = -divideReduce(enemyProducerCost, 10);
    //
    const mySpCost = searchPath_area(cont, spawn).cost;
    const enSpCost = searchPath_area(cont, enemySpawn).cost;
    // const mySpCost = searchPath(cont, spawnPos).cost
    // const enSpCost = searchPath(cont, enemySpawnPos).cost
    const spExtra = -0.001 * mySpCost + 0.001 * enSpCost;
    const energyExtra = (0.5 * (getEnergy(cont) + 250)) / (2000 + 250);
    //
    SAN(cont, "myDisProducerExtra", myDisProducerExtra);
    SAN(cont, "enemyDisProducerExtra", enemyDisProducerExtra);
    SAN(cont, "spExtra", spExtra);
    SAN(cont, "energyExtra", energyExtra);
    const worth =
      myDisProducerExtra + enemyDisProducerExtra + spExtra + energyExtra;
    SAN(cont, "worth", worth);
    cont.worth = worth;
  }
}
// /**
//  * should be called at first tick
//  */
// export function firstInit() {

// }
// function setTopAndBottomY(): void {
function getCostMatrixHalf(up: boolean): CostMatrix {
  let rtn = new CostMatrix();
  const wallY = up ? 70 : 30;
  for (let i = 0; i < 100; i++) {
    rtn.set(i, wallY, blockCost);
  }
  return rtn;
}

/**
 * print CPU and Heap
 */
export function printCPU() {
  const heap = getHeapStatistics();
  const heapK = Math.floor(heap.total_heap_size / 1000);
  const maxHeapK = Math.floor(heap.heap_size_limit / 1000);
  P(`HeapUsed\t ${heapK} K\t/ ${maxHeapK}K`);
  SA(displayPos(), `HeapUsed\t ${heapK} K\t/ ${maxHeapK}K`);
  // P(`Used ${heap.total_heap_size} / ${heap.heap_size_limit}`);
  const cpu = getCpuTime();
  const maxCpu = arenaInfo.cpuTimeLimit;
  const cpuK = Math.floor(cpu / 1000);
  const maxCpuK = Math.floor(maxCpu / 1000);
  P("cpu=\t" + cpuK + "K\t/ " + maxCpuK + "K");
  SA(displayPos(), "cpu=\t" + cpuK + "K\t/ " + maxCpuK + "K");
}
function displayRoleCPU() {}
export function initCre(creep: Creep): Cre {
  let cre: Cre;
  if (creepBodyPartNum(creep, WORK) > 0) {
    cre = new Cre_build(creep);
  } else if (
    creepBodyPartNum(creep, ATTACK) > 0 ||
    creepBodyPartNum(creep, RANGED_ATTACK) > 0 ||
    creepBodyPartNum(creep, HEAL) > 0
  ) {
    cre = new Cre_battle(creep);
  } else if (creepBodyPartNum(creep, CARRY) > 0) {
    cre = new Cre_harvest(creep);
  } else if (creepBodyPartNum(creep, MOVE) > 0) {
    cre = new Cre_pull(creep);
  } else {
    cre = new Cre_findPath(creep);
  }
  const si = <SpawnInfo | undefined>(<any>creep).spawnInfo;
  if (si) {
    cre.spawnInfo = si;
    const task_role_class = si.role.roleTask;
    task_role_class(cre);
  }
  cres.push(cre);
  return cre;
}
export function initialCresAtLoopStart() {
  PL("initialCresAtLoopStart");
  //remove dead Cre
  set_cres(cres.filter(i => i.master.exists));
  //add new Cre
  for (let creep of creeps) {
    const condition1 = !creep.spawning;
    const condition2 = cres.find(i => i.master === creep) === undefined;
    if (condition1 && condition2) {
      PL("initCre=" + S(creep));
      initCre(creep);
    }
  }
}
