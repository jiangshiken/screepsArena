import {
  ATTACK,
  BodyPartConstant,
  CARRY,
  HEAL,
  MOVE,
  RANGED_ATTACK,
  WORK,
} from "game/constants";
import { Creep, Resource } from "game/prototypes";
import { getTicks } from "game/utils";
import { ct, et, ptSum } from "../utils/CPU";
import { Event_Number } from "../utils/Event";
import { StNumber, closest } from "../utils/game";
import { divide0, pow2, ranGet } from "../utils/JS";
import { GR, Pos, getRangePoss } from "../utils/Pos";
import { HasTasks, Task, cancelOldTask, useTasks } from "../utils/Task";
import { P, SA } from "../utils/visual";
import {
  GO,
  cres,
  enemies,
  friends,
  isMyGO,
  isOppoGO,
} from "./GameObjectInitialize";
import { HasHits } from "./HasHits";
import { HasMy } from "./HasMy";
import { findGO } from "./overallMap";
import { SpawnInfo } from "./spawn";
import { blocked } from "./UnitTool";

/** the Task of Creep*/
export class Task_Cre extends Task {
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
    cancelOldTask(this, Task_Role);
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
  readonly master: Creep;
  spawnInfo: SpawnInfo | undefined;
  /** tasks list */
  readonly tasks: Task[] = [];
  /**task execute order */
  readonly taskPriority: number = 10;
  /**extra infomation*/
  readonly upgrade: any = {};
  constructor(creep: Creep) {
    this.master = creep;
    this.tasks = [];
    this.upgrade = {};
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
  get extraMessage(): any {
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
  hasMoveBodyPart(): boolean {
    return this.getBodyPartsNum(MOVE) > 0;
  }
  onlyHasMoveAndCarry() {
    const mNum = this.getBodyPartsNum(MOVE);
    const cNum = this.getBodyPartsNum(CARRY);
    return mNum + cNum === this.body.length;
  }
  getBody(type: BodyPartConstant): BodyCre[] {
    return this.body.filter(i => i.type === type);
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
  getBodyPartsNum(type: BodyPartConstant): number {
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
export function getRoundEmptyPos(cre: Pos): Pos | undefined {
  const roundPoss = getRangePoss(cre, 1);
  return roundPoss.find(i => !blocked(i));
}
export function getFriendArmies() {
  return friends.filter(i => isArmy(i));
}
export function getFriendsThreated() {
  return friends.filter(i => hasThreat(i));
}
export function hasThreat(cre: Cre): boolean {
  return cre.getBody(ATTACK).length + cre.getBody(RANGED_ATTACK).length > 0;
}
export function isArmy(cre: Cre): boolean {
  return (
    cre.getBody(ATTACK).length +
      cre.getBody(RANGED_ATTACK).length +
      cre.getBody(HEAL).length >
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
export function getArmies() {
  return cres.filter(i => isArmy(i));
}
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
