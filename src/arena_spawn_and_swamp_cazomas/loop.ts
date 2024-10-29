import { arenaInfo } from "game";
import { CostMatrix, searchPath } from "game/path-finder";
import { StructureSpawn } from "game/prototypes";
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

import {
  firstInit_maps,
  loopStart_maps,
  setMoveMatrix,
} from "./deprecated/maps";
import { sum_snakePart0 } from "./strategies/snakeRush";
import { CS, initCS } from "./units/constructionSite";
import {
  controlCreeps,
  cres,
  friends,
  getAllUnits,
  getDecideSearchRtn,
  getEnemyProducers,
  getEnergy,
  getGameObjects,
  getMyProducers,
  initialCresAtLoopStart,
} from "./units/Cre";
import {
  constructionSites,
  containers,
  getPrototype,
  initialGameObjectsAtLoopStart,
  spawns,
} from "./units/gameObjectInitialize";
import {
  Cont,
  displayPos,
  enemySpawnPos,
  setEnemySpawnPos,
  setSpawnPos,
  spawnPos,
} from "./units/HasHits";
import {
  firstInit_overallMap,
  overallMapInit,
  setGameObjectsThisTick,
  setOverallMap,
} from "./units/overallMap";
import { setRamMoveMapValue } from "./units/ramparts";
import {
  checkSpawns,
  enemySpawn,
  initSpa,
  setEnemySpawn,
  setSpawn,
  Spa,
  spawn,
} from "./units/spawn";
import { showEnemies, showHits } from "./units/visual_Cre";
import { getSuperior, getSuperiorRate } from "./utils/bonus";
import {
  ct,
  getCPUPercent,
  lowCPUMode,
  pt,
  ptSum,
  setLowCPUMode,
  switchCPUModeOn,
} from "./utils/CPU";
import { Event_C, validEvent } from "./utils/Event";
import {
  inResourceArea,
  PL,
  set_left,
  set_startGateUp,
  setTick,
  tick,
} from "./utils/game";
import { divideReduce } from "./utils/JS";
import { GR, Pos_C } from "./utils/Pos";
import {
  append_largeSizeText,
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
  if (getCPUPercent() > 0.8 && switchCPUModeOn) {
    setLowCPUMode(true);
  }
  drawText(new Pos_C(50, 57), "G");
  const st1 = ct();
  if (!lowCPUMode) {
    setHisPoss(); //history pos
    showHits();
    showEnemies();
  }
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
// function predictOppos() {
// 	for (let en of enemies) {
// 		en.battle.predictOppo()
// 	}
// }
/**
 * set all the hisPos of Creeps
 */
function setHisPoss() {
  for (let cre of cres) {
    cre.battle?.setHisPos();
  }
}
function initialAdvancedTypesAtLoopStart() {
  //other advanced type
  for (let constr of constructionSites) {
    const cs = <CS>constr;
    initCS(cs);
  }
  for (let spaw of spawns) {
    const spa = <Spa>spaw;
    initSpa(spa);
  }
}
function switchLowCPUMode() {
  if (lowCPUMode) {
    append_largeSizeText("🕐");
  }
  if (switchCPUModeOn) {
    const sr = getSuperiorRate();
    const superiorExtra = getSuperior() > 30 && sr > 3 ? 2 : 0;
    const tickExtra = tick > 800 ? 1 : 0;
    const friendExtra = 0.1 * friends.length;
    const unitExtra = 0.03 * getAllUnits().length;
    const switchExtra = superiorExtra + tickExtra + friendExtra + unitExtra;
    if (switchExtra > 5) {
      setLowCPUMode(true);
    } else {
      setLowCPUMode(false);
    }
    SAN(displayPos(), "getSuperiorRate", sr);
    SA(displayPos(), "lowCPUMode=" + lowCPUMode);
    SAN(displayPos(), "switchExtra", switchExtra);
    //
    P("getSuperiorRate=" + sr);
    P("lowCPUMode=" + lowCPUMode);
    P("switchExtra=" + switchExtra);
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
  initialGameObjectsAtLoopStart();
  pt("initialGameObjects", st2);
  const st3 = ct();
  initialCresAtLoopStart();
  initialAdvancedTypesAtLoopStart();
  // initialCreepModules()
  pt("init cres and other", st3);
  //set overall map
  const st4 = ct();
  setGameObjectsThisTick(getGameObjects());
  setOverallMap();
  //
  append_largeSizeText("Status:");
  switchLowCPUMode();
  pt("area0", st4);
  // if (!lowCPUMode) {
  loopStart_maps();
  if (useAvoidEnRam) {
    setRamMoveMapValue();
  }
  setMoveMatrix();
  // } else {
  // 	loopStart_maps();
  // 	if (randomBool(0.1)) {
  // 		setMoveMatrix();
  // 	}
  // }
  const st_predictOppos = ct();
  // useTasks(predictTasks);
  // if (!lowCPUMode)
  // 	predictOppos()
  pt("predictOppos and setRamMoveMapValue", st_predictOppos);
  const st_checkSpawns = ct();
  checkSpawns();
  // P("setWorthForContainersb start");
  pt("checkSpawns", st_checkSpawns);
  const st5 = ct();
  setWorthForContainers();
  pt("setWorthForContainers", st5);
  // P("setWorthForContainersb end");
  P("loopStart end");
}
export function setWorthForContainers() {
  const conts: Cont[] = <Cont[]>containers.filter(i => inResourceArea(i));
  P("setWorthForContainers:" + conts.length);
  for (let cont of conts) {
    setWorthForContainer(cont);
  }
}
export function setWorthForContainer(cont: Cont): void {
  //
  if (cont.inited === undefined || !validEvent(cont.inited, 25)) {
    cont.inited = new Event_C();
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
    const mySpCost = getDecideSearchRtn(cont, spawnPos).cost;
    const enSpCost = getDecideSearchRtn(cont, enemySpawnPos).cost;
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
    firstInit_overallMap();
    firstInit_visual();
    setSpawn(
      <Spa>(<StructureSpawn[]>getPrototype(StructureSpawn)).find(i => i.my)
    );
    setEnemySpawn(
      <Spa>(<StructureSpawn[]>getPrototype(StructureSpawn)).find(i => !i.my)
    );
    setSpawnPos(spawn);
    setEnemySpawnPos(enemySpawn);
    set_left(spawn.x < 50);
    setStartGate();
    firstInit_maps();
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
