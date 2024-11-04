import { arenaInfo } from "game";
import { CostMatrix, searchPath } from "game/path-finder";
import {
  findClosestByRange,
  getCpuTime,
  getHeapStatistics,
  getTicks,
} from "game/utils";

import {
  sum_stdAttacker0,
  sum_stdAttacker1,
  sum_stdHealer0,
} from "./roles/fighters_std";

import { controlCreeps, isMyTick } from "./gameObjects/Cre";
import { getEnemyProducers, getMyProducers } from "./gameObjects/Cre_harvest";
import { searchPath_area } from "./gameObjects/findPath";
import {
  containers,
  getGOs,
  initialCresAtLoopStart,
  initialCSsAtLoopStart,
  initialGameObjectsAtLoopStart_advance,
  initialGameObjectsAtLoopStart_basic,
  initialressAtLoopStart,
  initialStrusAtLoopStart,
  mySpawns,
  oppoSpawns,
} from "./gameObjects/GameObjectInitialize";
import {} from "./gameObjects/HasHits";
import {
  overallMapInit,
  setGameObjectsThisTick,
  setOverallMap,
} from "./gameObjects/overallMap";
import {
  checkSpawns,
  enemySpawn,
  setEnemySpawn,
  setSpawn,
  spawn,
} from "./gameObjects/spawn";
import { Con } from "./gameObjects/Stru";
import { getEnergy } from "./gameObjects/UnitTool";
import { showEnemies, showHits } from "./gameObjects/visual_Cre";
import { sum_snakePart0 } from "./strategies/snakeRush";
import { ct, getCPUPercent, pt, ptSum } from "./utils/CPU";
import {
  inResourceArea,
  PL,
  set_left,
  set_startGateUp,
  setTick,
} from "./utils/game";
import { divideReduce } from "./utils/JS";
import { GR, Pos, Pos_C } from "./utils/Pos";
import {
  append_largeSizeText,
  displayPos,
  drawText,
  firstInit_visual,
  loopEnd_visual,
  loopStart_visual,
  P,
  SA,
  SAN,
} from "./utils/visual";

export function loopEnd() {
  const st0 = ct();
  drawText(new Pos_C(50, 56), "F");
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
  pt("loopStart_visual", st1);
  const st2 = ct();
  initialGameObjectsAtLoopStart_basic();
  pt("initialGameObjects", st2);
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
  setOverallMap();
  //
  append_largeSizeText("Status:");

  const st_predictOppos = ct();

  pt("predictOppos and setRamMoveMapValue", st_predictOppos);
  const st_checkSpawns = ct();
  checkSpawns();
  pt("checkSpawns", st_checkSpawns);
  const st5 = ct();
  setWorthForContainers();
  pt("setWorthForContainers", st5);
  P("loopStart end");
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
/**
 * should be called at first tick
 */
export function firstInit() {
  if (getTicks() === 1) {
    PL("startGame");
    firstInit_visual();
    set_left(spawn.x < 50);
    setStartGate();
  }
}
// function setTopAndBottomY(): void {
function getCostMatrixHalf(up: boolean): CostMatrix {
  let rtn = new CostMatrix();
  const wallY = up ? 70 : 30;
  for (let i = 0; i < 100; i++) {
    rtn.set(i, wallY, 255);
  }
  return rtn;
}
// }
/** set startGate by cost of the path*/
function setStartGate(): void {
  let sRtnUp = searchPath(spawn, enemySpawn, {
    costMatrix: getCostMatrixHalf(true),
  });
  let costUp = sRtnUp.cost;
  let sRtnBo = searchPath(spawn, enemySpawn, {
    costMatrix: getCostMatrixHalf(false),
  });
  let costBo = sRtnBo.cost;
  set_startGateUp(costUp < costBo);
  // set top and bottom Y
  // let top
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
function displayRoleCPU() {
  ptSum("sum_snakePart0", sum_snakePart0);
  ptSum("sum_stdAttacker0", sum_stdAttacker0.num);
  ptSum("sum_stdHealer0", sum_stdHealer0.num);
  ptSum("sum_stdAttacker1", sum_stdAttacker1.num);
}
