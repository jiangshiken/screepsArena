import {
  ATTACK,
  BODYPART_COST,
  BodyPartConstant,
  CARRY,
  HEAL,
  MOVE,
  RANGED_ATTACK,
  TOUGH,
  WORK,
} from "game/constants";

import { Creep } from "game/prototypes";
import { Event } from "../utils/Event";
import { arrayEqual } from "../utils/JS";
import {
  getRangePoss,
  GR,
  Pos,
  posPlusVec,
  Vec,
  X_axisDistance,
} from "../utils/Pos";
import { P, SA, SAN } from "../utils/visual";
import { Cre } from "./Cre";
import { Role } from "./CreTool";
import { S } from "./export";
import {
  containers,
  extensions,
  friends,
  gameObjects,
  myExtensions,
  mySpawns,
  oppoExtensions,
  structures,
} from "./GameObjectInitialize";
import { Spa } from "./Stru";
import { blocked, getEnergy } from "./UnitTool";

/** your first StructureSpawn*/
export let spawn: Spa;
export function setSpawn(s: Spa) {
  spawn = s;
}
export function spawnCleared(s: Spa) {
  return (
    spawnList.length === 0 &&
    s.spawningCreep === undefined &&
    !s.spawnEvent?.validEvent()
  );
}
/** the first StructureSpawn of your opponent*/
export let enemySpawn: Spa;
export function setEnemySpawn(s: Spa) {
  enemySpawn = s;
}

export function spawnListContain(body: BodyPartConstant[], role: Role) {
  for (let info of spawnList) {
    if (arrayEqual(info.bodies, body) && info.role === role) {
      return true;
    }
  }
  return false;
}

/**if the specific spawn have enougth energy to spawn
 * a specific body parts
 */
export function enoughEnergy(
  theSpawn: Spa,
  bodies: BodyPartConstant[]
): boolean {
  return spawnAndExtensionsEnergy(theSpawn) >= getBodiesCost(bodies);
}

/**
 * info of spawn
 */
export class SpawnInfo {
  bodies: BodyPartConstant[];
  role: Role;
  extraMessage: any = {};
  constructor(bodies: BodyPartConstant[], role: Role) {
    this.bodies = bodies;
    this.role = role;
  }
  toString(): string {
    return this.role.roleName + "(" + this.bodies.length + ")";
  }
}
/**check all spawns */
export function checkSpawns() {
  const spawns = mySpawns;
  for (let theSpawn of spawns) {
    checkSpawn(theSpawn);
  }
}
/** the work list of your Spawn,contains the creep your want to spawn */
export let spawnList: SpawnInfo[] = [];

/** same as {@link getSpawnCost}*/
export function getBodiesCost(bodies: BodyPartConstant[]): number {
  return getSpawnCost(bodies);
}
/** get cost of a bodies */
export function getSpawnCost(bodies: BodyPartConstant[]): number {
  let rtn = 0;
  for (let body of bodies) {
    if (body === TOUGH) rtn += BODYPART_COST.tough;
    else if (body === CARRY) rtn += BODYPART_COST.carry;
    else if (body === WORK) rtn += BODYPART_COST.work;
    else if (body === MOVE) rtn += BODYPART_COST.move;
    else if (body === ATTACK) rtn += BODYPART_COST.attack;
    else if (body === RANGED_ATTACK) rtn += BODYPART_COST.ranged_attack;
    else if (body === HEAL) rtn += BODYPART_COST.heal;
    else P("ERR getSpawnCost " + body);
  }
  return rtn;
}
export function fromSpawnPos(x: number, y: number) {
  return posPlusVec(spawn, new Vec(x, y));
}
export function getExistListAndSpawningFriendsNum(
  lamb: (i: Cre) => boolean,
  lambCreep: (i: Creep | undefined) => boolean,
  lambSpawnInfo: (i: SpawnInfo) => boolean
): number {
  const existFri = friends.filter(lamb).length;
  const isSpawningNum = lambCreep(spawn.spawningCreep) ? 1 : 0;
  const inListHarvesterNum = spawnList.filter(i => lambSpawnInfo(i)).length;
  return existFri + isSpawningNum + inListHarvesterNum;
}
/** try spawn a creep of the first of spawnList*/
export function spawnIt(theSpawn: Spa) {
  SA(theSpawn, "spawnIt");
  const spawnInfo = spawnList[0];
  const spawnBody: BodyPartConstant[] = spawnInfo.bodies;
  const spawnRole: Role = spawnInfo.role;
  const spawnEnergy: number = spawnAndExtensionsEnergy(theSpawn);
  const requiredEnergy: number = getSpawnCost(spawnBody);
  if (spawnEnergy >= requiredEnergy) {
    //if enough energy
    const spawnResult = theSpawn.master.spawnCreep(spawnBody);
    const spawnedCreep = spawnResult.object;
    if (spawnedCreep) {
      (<any>spawnedCreep).spawnInfo = spawnInfo;
      SA(theSpawn, "role =" + spawnRole.roleName);
      SA(theSpawn, "spawnInfo =" + S(spawnInfo));
      spawnList.shift();
      theSpawn.spawnEvent = new Event();
      SA(theSpawn, "spawnListLength=" + spawnList.length);
    }
  }
}
export function getSpawnAndBaseContainerEnergy(): number {
  const baseCon = containers.find(i => GR(i, spawn) <= 1);
  return getEnergy(spawn) + (baseCon ? getEnergy(baseCon) : 0);
}
function remainingTime(theSpawn: Spa) {
  return theSpawn.master.spawning?.remainingTime;
}
/** check if can spawn */
export function checkSpawn(theSpawn: Spa) {
  SA(spawn, "checkSpawn");
  try {
    if (remainingTime(theSpawn) === undefined) {
      if (spawnList.length > 0) {
        spawnIt(theSpawn);
      }
    }
  } catch (ex) {
    P(ex);
  }
}
/**
 * get spawn and extensions energy
 */
export function spawnAndExtensionsEnergy(
  theSpawn: Spa,
  myExt: boolean = true,
  console: boolean = false
) {
  const exs = myExt ? myExtensions : oppoExtensions;
  if (console) {
    SAN(theSpawn, "extLen", exs.length);
    SAN(theSpawn, "myExtensions", myExtensions.length);
    SAN(theSpawn, "extensions", extensions.length);
    SAN(theSpawn, "structures", structures.length);
    SAN(theSpawn, "gameObjects", gameObjects.length);
  }
  let sum = 0;
  for (let ex of exs) {
    const eng = getEnergy(ex);
    sum += eng;
    if (console) {
      SAN(ex, "eng", eng);
      SAN(ex, "sum", sum);
    }
  }
  const engSpawn = getEnergy(theSpawn);
  sum += engSpawn;
  if (console) {
    SAN(theSpawn, "engSpawn", engSpawn);
    SAN(theSpawn, "sum", sum);
  }
  return sum;
}
export function oppoSpawnAndExtensionsEnergy(theSpawn: Spa) {
  return spawnAndExtensionsEnergy(theSpawn, false);
}
/**
 * spawn a creep
 */
export function spawnCreep(
  bodies: BodyPartConstant[],
  role: Role,
  extraMessage?: any
) {
  const si = new SpawnInfo(bodies, role);
  si.extraMessage = extraMessage;
  spawnList.push(si);
}
/**
 * spawn a creep
 */
export function spawnCreep_ifHasEnergy(
  bodies: BodyPartConstant[],
  role: Role,
  extraMessage?: any
) {
  const hasEnergy = spawnAndExtensionsEnergy(spawn);
  if (hasEnergy >= getBodiesCost(bodies)) {
    spawnCreep(bodies, role, extraMessage);
  }
}
//energyEnoughBonus
export function EEB(amount: number, rate: number): number {
  return spawnAndExtensionsEnergy(spawn) >= amount ? rate : 1;
}
export function spawnAndSpawnListEmpty(theSpawn: Spa): boolean {
  return !theSpawn.spawningCreep && spawnList.length === 0;
}
/**
 * spawn is blocked by 8 block unit around
 * @param limit the allow empty pos num
 */
export function spawnNearBlockedAround(theSpawn: Spa, limit: number) {
  const spawnAroundPoss = getRangePoss(theSpawn, 1);
  const emptyPoss = spawnAroundPoss.filter(i => !blocked(i));
  if (emptyPoss.length <= limit) {
    return true;
  } else {
    return false;
  }
}
/**
 * spawn a creep ,and put it into the front of the {@link spawnList}
 */
export function spawnCreepInFront(bodies: BodyPartConstant[], role: Role) {
  const si = new SpawnInfo(bodies, role);
  spawnList.unshift(si);
}
/** you are at the enemy base side*/
export function inEnBaseRan(cre: Pos): boolean {
  return X_axisDistance(cre, enemySpawn) <= 7;
}
export function inMyBaseRan(cre: Pos): boolean {
  return X_axisDistance(cre, spawn) <= 7;
}
