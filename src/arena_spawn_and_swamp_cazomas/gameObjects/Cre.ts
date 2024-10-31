import {
  ATTACK,
  BodyPartConstant,
  CARRY,
  HEAL,
  MOVE,
  RANGED_ATTACK,
  RESOURCE_ENERGY,
  TOUGH,
  WORK,
} from "game/constants";
import {
  Creep,
  GameObject,
  Resource,
  StructureContainer,
  StructureExtension,
  StructureRampart,
  StructureSpawn,
  StructureTower,
} from "game/prototypes";
import { findClosestByRange, getTicks } from "game/utils";

// import { CS, getMaxWorthCSS, getMyCSs, progress } from "../utils_pincer";

import { ct, et, ptSum } from "../utils/CPU";
import { Event, Event_Number, Event_Pos } from "../utils/Event";
import { StNumber } from "../utils/game";
import { divide0, pow2, ranGet, valid } from "../utils/JS";
import { GR, Pos, getRangePoss, pos00 } from "../utils/Pos";
import { HasTasks, Task, Task_C, useTasks } from "../utils/Task";
import { P, SA } from "../utils/visual";
import {
  GO,
  HasEnergy,
  HasStore,
  Unit,
  containers,
  cres,
  enemies,
  friends,
  isMyGO,
  isOppoGO,
  oppoUnits,
} from "./GameObjectInitialize";
import { HasHits, spawnPos } from "./HasHits";
import { HasMy } from "./HasMy";
import { findGO, overallMap } from "./overallMap";

export function isSpawning(cre: Creep): boolean {
  return cre.spawning; //atSpawnPos(cre) || ;
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
export type BodyCre = {
  type: BodyPartConstant;
  hits: number;
};
/** extend of `Creep` */
export class Cre implements HasTasks, HasMy, HasHits {
  master: Creep;
  spawnInfo: SpawnInfo | undefined;
  moveTarget: Event_Pos | undefined;
  moveTargetNextPos: Event_Pos | undefined;
  /** if it want move ,it related to if other Creep will pull it */
  wantMove: Event | undefined;
  /** tasks list */
  tasks: Task[] = [];
  //modules

  /** the `Attackable` that the creep is targeting */
  target: HasHits | undefined = undefined;
  /** used to predict the movement of the creep ,can only predict a little distance */
  deltaPredictPos: Pos;
  // moveSelecter: Selecter<Pos>;
  /**extra infomation*/
  upgrade: any = {};
  taskPriority: number = 10;
  pureMeleeMode: boolean = false;
  appointmentMovement: Event_Pos | undefined;
  /**calculation*/
  cal_taunt_fight: Event_Number | undefined;
  cal_taunt_value: Event_Number | undefined;
  cal_force_includeRam: Event_Number | undefined;
  cal_force_not_includeRam: Event_Number | undefined;
  constructor(creep: Creep) {
    // P("constructor creep=" + creep)
    this.master = creep;
    // P("this.master=" + this.master)
    this.tasks = [];
    this.deltaPredictPos = pos00;
    // this.moveSelecter = this.getInitMoveSelector();
    this.upgrade = {};

    //TODO add member attribute
  }
  get role(): Role | undefined {
    return this.spawnInfo?.role;
  }
  get my() {
    return isMyGO(this.master);
  }
  get oppo() {
    return isOppoGO(this.master);
  }
  extraMessage(): any {
    return this.spawnInfo?.extraMessage;
  }

  get x() {
    return this.master.x;
  }
  get y() {
    return this.master.y;
  }
  get store() {
    return this.master.store;
  }
  get hits() {
    return this.master.hits;
  }
  get hitsMax() {
    return this.master.hitsMax;
  }
  get exists() {
    return this.master.exists;
  }
  get id() {
    return this.master.id;
  }
  get body(): BodyCre[] {
    return this.master.body;
  }

  hasMoveBodyPart() {
    return this.getBody(MOVE).length > 0;
  }

  onlyHasMoveAndCarry() {
    const mNum = this.getBody(MOVE).length;
    const cNum = this.getBody(CARRY).length;
    const rtn = mNum + cNum === this.body().length;
    return rtn;
  }
  getBody(type: BodyPartConstant): BodyCre[] {
    return this.body().filter(i => i.type === type);
  }
  getBodyArray(): BodyPartConstant[] {
    let rtn: BodyPartConstant[] = [];
    for (let b of this.master.body) {
      rtn.push(b.type);
    }
    return rtn;
  }
  getHealthyBodyParts(type: BodyPartConstant): BodyCre[] {
    return this.getBody(type).filter(i => i.hits > 0);
  }
  getBodypartsNum(type: BodyPartConstant): number {
    return this.getBody(type).length;
  }
  getHealthyBodyPartsNum(type: BodyPartConstant): number {
    return this.getHealthyBodyParts(type).length;
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
/**
 * get the number of harvestable around
 */
export function hasMovePart(cre: Cre): boolean {
  return cre.getBody(MOVE).length > 0;
}
/** find friend at the position */
export function findFriendAtPos(pos: Pos): Cre | undefined {
  const fRtn = findGO(pos, Cre);
  if (fRtn && my(<Cre>fRtn)) return <Cre>fRtn;
  else return undefined;
}
export function findEnemyAtPos(pos: Pos): Cre | undefined {
  const fRtn = findGO(pos, Cre);
  if (fRtn && oppo(<Cre>fRtn)) return <Cre>fRtn;
  else return undefined;
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

export function hasEnemyArmyAtPos(pos: Pos) {
  const fRtn = findGO(pos, Cre);
  return fRtn && (<Cre>fRtn).isEnemyArmy();
}
export function hasCreepAtPos(pos: Pos) {
  const list = overallMap.get(pos);
  const cc = list.find(i => i instanceof Cre);
  return valid(cc);
}
export function getEnemyArmies(): Cre[] {
  return enemies.filter(i => i.isEnemyArmy());
}
export function getEnemyThreats(): Cre[] {
  return enemies.filter(i => isEnemyThreat(i));
}
export function hasEnemyAround(pos: Pos, n: number) {
  const enA = enemies.find(i => GR(pos, i) <= n);
  return valid(enA);
}
export function hasEnemyAround_lamb(
  lamb: (cre: Cre) => boolean,
  pos: Pos,
  n: number
) {
  const enA = enemies.find(i => GR(pos, i) <= n && lamb(i));
  return valid(enA);
}
export function hasFriendAround(pos: Pos, n: number) {
  const enA = friends.find(i => GR(pos, i) <= n);
  return valid(enA);
}
export function hasOtherFriendAround(cre: Cre, pos: Pos, n: number) {
  const enA = getOtherFriends(cre).find(i => GR(pos, i) <= n);
  return valid(enA);
}
export function hasOppoUnitAround(pos: Pos, n: number) {
  const enA = oppoUnits.find(i => GR(pos, i) <= n);
  return valid(enA);
}
export function isEnemyThreat(cre: Cre) {
  return hasThreat(cre) && oppo(cre);
}
export function hasEnemyThreatAround(pos: Pos, n: number) {
  const enA = enemies.find(i => isEnemyThreat(i) && GR(pos, i) <= n);
  return valid(enA);
}
export function hasEnemyArmyAround(pos: Pos, n: number) {
  const enA = enemies.find(i => i.isEnemyArmy() && GR(pos, i) <= n);
  return valid(enA);
}
export function hasEnemyHealerAround(pos: Pos, n: number) {
  const enA = enemies.find(i => isHealer(i) && GR(pos, i) <= n);
  return valid(enA);
}
export function getRoundEmptyPosLeave1Empty(
  cre: Pos,
  containerBlock: boolean = false
): Pos | undefined {
  const roundPoss = getRangePoss(cre, 1);
  const emptyRoundPoss = roundPoss.filter(
    i => !blocked(i, true, false, false, containerBlock)
  );
  if (emptyRoundPoss.length == 1) {
    //leave 1 empty avoid block Creep in 8 blocker
    return undefined;
  } else if (emptyRoundPoss.length >= 2) {
    return emptyRoundPoss[0];
  } else return undefined;
}
export function getRoundEmptyPos(cre: Pos): Pos | undefined {
  const roundPoss = getRangePoss(cre, 1);
  return roundPoss.find(i => !blocked(i));
}
export function getFriendArmies() {
  return friends.filter(i => i.isArmy());
}
export function getFriendsThreated() {
  return friends.filter(i => hasThreat(i));
}
export function hasThreat(cre: Cre): boolean {
  return cre.getBody(ATTACK).length + cre.getBody(RANGED_ATTACK).length > 0;
}
export function getEmptyPosInRange(pos: Pos, range: number) {
  const poss = getRangePoss(pos, range);
  const possEmpty = poss.filter(i => !blocked(i));
  return ranGet(possEmpty);
}
export function isWorker(cre: Cre): boolean {
  return cre.getBodypartsNum(CARRY) + cre.getBodypartsNum(WORK) > 0;
}
export function isHealer(cre: Cre): boolean {
  return cre.getBodypartsNum(HEAL) > 0;
}
export function isHealer_restrict(cre: Cre): boolean {
  return (
    cre.getBodypartsNum(HEAL) > 0 &&
    cre.getBodypartsNum(ATTACK) === 0 &&
    cre.getBodypartsNum(RANGED_ATTACK) === 0
  );
}
export function isSlowShoter(cre: Cre): boolean {
  let rtn =
    cre.getBodypartsNum(RANGED_ATTACK) > 0 &&
    cre.getBodypartsNum(ATTACK) === 0 &&
    cre.getSpeed_general() < 1;
  SA(cre, "i'm slowShoter");
  return rtn;
}
export function is5MA(cre: Cre) {
  return (
    cre.body().length === 6 &&
    cre.getBodypartsNum(ATTACK) === 1 &&
    cre.getBodypartsNum(MOVE) === 5
  );
}
export let enRamAroundCost: number = 30;
export function setEnRamAroundCost(n: number) {
  enRamAroundCost = n;
}

export let spawnExtraTaunt: number = 4;
export function set_spawnExtraTaunt(se: number) {
  spawnExtraTaunt = se;
}
export function getSpawnAroundFreeContainers() {
  return containers.filter(i => GR(i, spawnPos) <= 1 && getFreeEnergy(i) > 0);
}
export function getSpawnAroundLiveContainers() {
  return containers.filter(i => GR(i, spawnPos) <= 1 && getEnergy(i) > 0);
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
  P("control creeps start");
  const listNeedUseTask = [...friends];
  listNeedUseTask.sort((a, b) => b.taskPriority - a.taskPriority);
  for (let cre of listNeedUseTask) {
    if (cre.master.spawning) {
      continue;
    }
    const st = ct();
    try {
      useTasks(cre);
    } catch (ex) {
      P(ex);
    }
    const dt = et(st);
    if (cre.role) calEventNumberCPUTime(cre.role, dt);
  }
  //
  for (let r of roleList) {
    //creep
    if (
      r.cpuTime &&
      r.cpuTime.invokeTick === getTicks() &&
      r.cpuTime.num > 1000
    ) {
      ptSum(r.roleName, r.cpuTime.num);
    }
  }
  P("control creeps end");
}

/**
 *  used to sum the cpuTime in one tick
 */
export function calEventNumberCPUTime(
  role: Role,
  num: number,
  isCPUTime: boolean = true
): void {
  const ev = isCPUTime ? role.cpuTime : role.findPathAndMoveTaskCpuTime;
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
export let spawnDps = 300;
export function set_spawnDps(sd: number) {
  spawnDps = sd;
}
export function getWinOneRemain(a: number, b: number): number {
  const winSignal = Math.sign(a - b);
  return Math.sqrt(winSignal * (pow2(a) - pow2(b)));
}
export function getEarning(myForce: number, enemyForce: number): StNumber {
  const winOneRemain = getWinOneRemain(myForce, enemyForce);
  const loseOneExtra = myForce > enemyForce ? enemyForce : -myForce;
  const winOneExtra =
    myForce > enemyForce
      ? -(myForce - winOneRemain)
      : enemyForce - winOneRemain;
  return 0.5 * (loseOneExtra + winOneExtra);
}
export function getEarning_value(
  myForce: number,
  myValue: number,
  enemyForce: number,
  enemyValue: number
): StNumber {
  const winOneForce = myForce > enemyForce ? myForce : enemyForce;
  const winOneRemain = getWinOneRemain(myForce, enemyForce);
  const winOneRemainRate = divide0(winOneRemain, winOneForce);
  const loseOneExtra = myForce > enemyForce ? enemyValue : -myValue;
  const winOneExtra =
    myForce > enemyForce
      ? -myValue * (1 - winOneRemainRate)
      : enemyValue * (1 - winOneRemainRate);
  return 0.5 * (loseOneExtra + winOneExtra);
}
/**
 * get DPS of a Creep ,DPS of Structure represent the threat of it
 */
export function getDps(
  cre: Unit,
  valueMode: boolean = false,
  byCalculateForce: boolean = false
): StNumber {
  let rtn: number;
  if (exist(cre)) {
    if (cre instanceof Cre) {
      const cr: Cre = <Cre>cre;
      let rateT;
      let rateH;
      if (byCalculateForce) {
        rateT = 0.1;
        rateH = 0.9;
      } else {
        rateT = 0.5;
        rateH = 0.5;
      }
      const attackNum =
        rateT * cr.getBody(ATTACK).length +
        rateH * cr.getHealthyBodyParts(ATTACK).length;
      const rangedAttackNum =
        rateT * cr.getBody(RANGED_ATTACK).length +
        rateH * cr.getHealthyBodyParts(RANGED_ATTACK).length;
      const healNum =
        rateT * cr.getBody(HEAL).length +
        rateH * cr.getHealthyBodyParts(HEAL).length;
      const buildNum =
        rateT * cr.getBody(WORK).length +
        rateH * cr.getHealthyBodyParts(WORK).length;
      const moveNum =
        rateT * cr.getBody(MOVE).length +
        rateH * cr.getHealthyBodyParts(MOVE).length;
      const carryNum =
        rateT * cr.getBody(CARRY).length +
        rateH * cr.getHealthyBodyParts(CARRY).length;
      const toughNum =
        rateT * cr.getBody(TOUGH).length +
        rateH * cr.getHealthyBodyParts(TOUGH).length;
      if (valueMode) {
        //value mode
        rtn =
          8 * attackNum +
          15 * rangedAttackNum +
          25 * healNum +
          10 * buildNum +
          5 * moveNum +
          5 * carryNum +
          1 * toughNum;
      } else {
        //battle mode
        rtn =
          30 * attackNum +
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
        totalForce = sumForceByArr(getFriendArmies());
      } else {
        totalForce = sumForceByArr(getEnemyArmies());
      }
      rtn = spawnDps * (1 + 0.5 * totalForce);
    } else if (cre instanceof StructureExtension) {
      const enBonus = 1 + (2 * getEnergy(cre)) / 100;
      rtn = 13 * enBonus;
    } else {
      rtn = 1;
    }
  } else rtn = 0;
  return 0.03 * rtn;
}
export function getArmies() {
  return cres.filter(i => i.isArmy());
}
export function myGO(go: GO) {
  if (go instanceof Cre) {
    return my(go);
  } else {
    return isMyGO(go);
  }
}

export function oppo(u: Unit): boolean {
  return !my(u);
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
export function getEnergy(a: GO): number {
  if (a instanceof Resource) {
    return a.amount;
  } else if (a instanceof Cre && a.getBodypartsNum(CARRY) > 0) {
    return a.master.store[RESOURCE_ENERGY];
  } else if (
    a.master instanceof StructureSpawn ||
    a.master instanceof StructureContainer ||
    a.master instanceof StructureExtension ||
    a.master instanceof StructureTower
  ) {
    return a.master.store[RESOURCE_ENERGY];
  } else {
    return 0;
  }
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
  if (unit.hitsMax) return unit.hitsMax;
  else return 0;
}
export function hits(unit: Attackable): number {
  if (unit.hits) {
    return unit.hits;
  } else {
    return 0;
  }
}
export function getExist<E extends Cre | GameObject | null | undefined>(
  cre: E
): E | undefined {
  return exist(cre) ? cre : undefined;
}

/**
 * calculate energy around
 */
export function calAroundEnergy(pos: Pos) {
  let sources = getHarvables().filter(i => GR(pos, i) <= 1);
  let sum: number = 0;
  for (let sou of sources) {
    sum += getEnergy(sou);
  }
  return sum;
}

//@Game

export function id(o: GO): number {
  if (o) {
    if (o instanceof Resource) {
      return parseInt(o.id);
    } else {
      return parseInt(o.master.id);
    }
  } else {
    return -1;
  }
}

export function isMyTick(cre: GO, n: number) {
  return getTicks() % n === id(cre) % n;
}

/**
 * the weight of enemy `ATTACK` and `RANGED_ATTACK` num
 * 0 is no `ATTACK`,1 is all `ATTACK`
 */
export function enemyAWeight(): number {
  let a = enemyAttackNum();
  let ra = enemyRangedAttackNum();
  return divide0(a, a + ra, 1);
}
export function enemyRangedAttackNum(): number {
  let sum = 0;
  for (let en of enemies) {
    let enemyAttackNum = en.getBody(RANGED_ATTACK).length;
    sum += enemyAttackNum;
  }
  return sum;
}
export function enemyAttackNum(): number {
  let sum = 0;
  for (let en of enemies) {
    let enemyAttackNum = en.getBody(ATTACK).length;
    sum += enemyAttackNum;
  }
  return sum;
}
export function getBodyArrayOfCreep(creep: Creep): BodyPartConstant[] {
  let rtn: BodyPartConstant[] = [];
  for (let b of creep.body) {
    rtn.push(b.type);
  }
  return rtn;
}
