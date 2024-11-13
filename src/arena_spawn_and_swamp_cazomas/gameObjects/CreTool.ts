import { closest } from "arena_spawn_and_swamp_cazomas/utils/Pos";
import {
  ATTACK,
  BodyPartConstant,
  CARRY,
  HEAL,
  MOVE,
  RANGED_ATTACK,
  WORK,
} from "game/constants";
import { Creep } from "game/prototypes";
import { getTicks } from "game/utils";
import { ct, et, ptSum } from "../utils/CPU";
import { Event, Event_Number } from "../utils/Event";
import { StNumber } from "../utils/game";
import { divide0, pow2, ranGet, sum } from "../utils/JS";
import { GR, Pos, getRangePoss } from "../utils/Pos";
import { useTasks } from "../utils/Task";
import { P, SA } from "../utils/visual";
import { Cre } from "./Cre";
import { GameObj } from "./GameObj";
import { cres, enemies, friends } from "./GameObjectInitialize";
import { findGO } from "./overallMap";
import { blocked } from "./UnitTool";

/** represent a event of pull function */
export class PullEvent extends Event {
  readonly pullOne: Cre;
  readonly bePulledOne: Cre;
  constructor(pullOne: Cre, bePulledOne: Cre) {
    super();
    this.pullOne = pullOne;
    this.bePulledOne = bePulledOne;
  }
}
//Role
export let roleList: Role[] = [];
/**
 * a Role which is decide what a Creep do at every tick
 */
export class Role {
  readonly roleName: string;
  /**the Function that will be called every tick
   */
  readonly roleFunc: Function | undefined;
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
/** find friend at the position */
export function findFriendAtPos(pos: Pos): Cre | undefined {
  const fRtn = <Cre | undefined>findGO(pos, Cre);
  if (fRtn && fRtn.my) return fRtn;
  else return undefined;
}
export function findEnemyAtPos(pos: Pos): Cre | undefined {
  const fRtn = <Cre | undefined>findGO(pos, Cre);
  if (fRtn && fRtn.oppo) return fRtn;
  else return undefined;
}

export function getClosestEnemy(pos: Pos): Cre | undefined {
  return <Cre | undefined>closest(pos, enemies);
}
export function findCreAtPos(pos: Pos): Cre | undefined {
  const fRtn = <Cre | undefined>findGO(pos, Cre);
  if (fRtn) return fRtn;
  else return undefined;
}
export function getEnemyArmies(): Cre[] {
  return enemies.filter(i => isArmy(i));
}
export function getEnemyThreats(): Cre[] {
  return enemies.filter(i => hasThreat(i));
}
export function isEnemyThreat(cre: Cre) {
  return hasThreat(cre) && cre.oppo;
}
export function hasEnemyThreatAround(pos: Pos, range: number): boolean {
  return enemies.find(i => hasThreat(i) && GR(pos, i) <= range) !== undefined;
}
export function hasEnemyArmyAround(pos: Pos, range: number): boolean {
  return enemies.find(i => isArmy(i) && GR(pos, i) <= range) !== undefined;
}
export function hasEnemyAround(pos: Pos, range: number): boolean {
  return enemies.find(i => GR(pos, i) <= range) !== undefined;
}
export function getRoundEmptyPos(cre: Pos): Pos | undefined {
  const roundPoss = getRangePoss(cre);
  return roundPoss.find(i => !blocked(i));
}
export function getFriendArmies() {
  return friends.filter(i => isArmy(i));
}
export function getFriendsThreated() {
  return friends.filter(i => hasThreat(i));
}
export function hasThreat(cre: Cre): boolean {
  return (
    cre.getBodyParts(ATTACK).length + cre.getBodyParts(RANGED_ATTACK).length > 0
  );
}
export function isArmy(cre: Cre): boolean {
  return (
    cre.getBodyParts(ATTACK).length +
      cre.getBodyParts(RANGED_ATTACK).length +
      cre.getBodyParts(HEAL).length >
    0
  );
}
export function getEmptyPosInRange(pos: Pos, range: number) {
  const poss = getRangePoss(pos, range);
  const possEmpty = poss.filter(i => !blocked(i));
  return ranGet(possEmpty);
}
export function isWorker(cre: Cre): boolean {
  return cre.getBodyPartsNum(CARRY) + cre.getBodyPartsNum(WORK) > 0;
}
export function isHealer(cre: Cre): boolean {
  return cre.getBodyPartsNum(HEAL) > 0;
}
export function isHealer_restrict(cre: Cre): boolean {
  return (
    cre.getBodyPartsNum(HEAL) > 0 &&
    cre.getBodyPartsNum(ATTACK) === 0 &&
    cre.getBodyPartsNum(RANGED_ATTACK) === 0
  );
}
export function isSlowShoter(cre: Cre): boolean {
  let rtn =
    cre.getBodyPartsNum(RANGED_ATTACK) > 0 &&
    cre.getBodyPartsNum(ATTACK) === 0 &&
    cre.getBodyPartsNum(MOVE) / cre.getBodyPartsNum(RANGED_ATTACK) < 5;
  SA(cre, "i'm slowShoter");
  return rtn;
}
export function is5MA(cre: Cre) {
  return (
    cre.body.length === 6 &&
    cre.getBodyPartsNum(ATTACK) === 1 &&
    cre.getBodyPartsNum(MOVE) === 5
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
export function getHealthyBodies_total(cre: Cre) {
  return cre.body.filter(i => i.hits > 0);
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
export function getArmies() {
  return cres.filter(i => isArmy(i));
}
export function isMyTick(cre: GameObj, n: number) {
  return getTicks() % n === cre.id % n;
}

/**
 * the weight of enemy `ATTACK` and `RANGED_ATTACK` num
 * 0 is no `ATTACK`,1 is all `ATTACK`
 */
export function enemyAWeight(): number {
  const a = enemyAttackNum();
  const ra = enemyRangedAttackNum();
  return divide0(a, a + ra, 1);
}
export function enemyRangedAttackNum(): number {
  return sum(enemies, en => en.getBodyPartsNum(RANGED_ATTACK));
}
export function enemyAttackNum(): number {
  return sum(enemies, en => en.getBodyPartsNum(ATTACK));
}
export function getBodyArrayOfCreep(creep: Creep): BodyPartConstant[] {
  let rtn: BodyPartConstant[] = [];
  for (let b of creep.body) {
    rtn.push(b.type);
  }
  return rtn;
}
