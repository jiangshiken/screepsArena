import {
  Event,
  Event_Number,
  Event_Pos,
  filterEventList,
  validEvent,
} from "../utils/Event";
import { inResourceArea, leftRate, tick } from "../utils/game";
import { containers, isOppoGO, resources } from "../utils/gameObjectInitialize";
import { valid } from "../utils/JS";
import { findGO, overallMap } from "../utils/overallMap";
import { atPos, GR, Pos } from "../utils/Pos";

import {
  GameObject,
  Resource,
  StructureContainer,
  StructureRampart,
  StructureSpawn,
} from "game/prototypes";
import { getObjectsByPrototype, getRange } from "game/utils";
import { SA } from "../utils/visual";

interface HasHits {
  hits(): number;
  maxHits(): number;
}
export function getConts(): Cont[] {
  return <Cont[]>containers;
}
export function getWildConts(): Cont[] {
  return getConts().filter(i => inResourceArea(i));
}
export class Cont extends StructureContainer {
  worth: number | undefined;
  inited: Event | undefined;
}
export function getContWorth(cont: Cont): number {
  return cont.worth === undefined ? 0 : cont.worth;
}
export class ResourceDropEvent extends Event_Pos {
  constructor(pos: Pos) {
    super(pos);
  }
}
/**
 * be droped in 1 tick is not a valid Resource,
 * cause it may be pick and drop transported by the harvester
 */
export function validRes(res: Res) {
  let dropEvents = filterEventList(
    tick - 1,
    tick + 1,
    i => i instanceof ResourceDropEvent && atPos(i, res)
  );
  return dropEvents.length === 0;
}

export function inRampart(pos: Pos): boolean {
  const br = overallMap.get(pos).find(i => i instanceof StructureRampart);
  return valid(br);
}
export function inOppoRampart(pos: Pos): boolean {
  const br = overallMap
    .get(pos)
    .find(i => i instanceof StructureRampart && isOppoGO(i));
  return valid(br);
}
export let spawnPos: StructureSpawn = getObjectsByPrototype(StructureSpawn)[0];
export function setSpawnPos(sp: StructureSpawn) {
  spawnPos = sp;
}
// export let displayPos: Pos = pos00
let displayAccumulate: Event_Number = new Event_Number(0);
export function displayPos(): Pos {
  if (!validEvent(displayAccumulate, 0)) {
    displayAccumulate = new Event_Number(0);
  }
  displayAccumulate.increase(1);
  const acc = displayAccumulate.num;
  const xBias = Math.floor((spawnPos.x - leftRate() * 12) / 5) * 5;
  const yBias = spawnPos.y;
  return { x: xBias + (acc % 5), y: yBias + Math.floor(acc / 5) };
}
export let enemySpawnPos: StructureSpawn =
  getObjectsByPrototype(StructureSpawn)[0];
export function setEnemySpawnPos(sp: StructureSpawn) {
  enemySpawnPos = sp;
}
export function getMyContainers() {
  return containers.filter(i => isMyContainer(i));
}
/** extend of Resource*/
export class Res extends Resource {
  // dropedEvent: Event | undefined;
}
export function getRess(): Res[] {
  return <Res[]>resources;
}
/**
 * set the Resource at the pos being droped
 */
export function setResourceDrop(pos: Pos) {
  SA(pos, "setResourceDrop");
  let eve = new ResourceDropEvent(pos);
  // let res = getObjectsByPrototype(Resource).find(i => atPos(i, pos))
  // if (res) {
  //     (<Res>res).dropedEvent = new Event_C();
  //     SA(pos, "find")
  // } else {
  //     SA(pos, "not find")
  // }
}
export function getOutsideContainers() {
  return containers.filter(i => isOutsideContainer(i));
}
export function isOutsideContainer(con: GameObject) {
  return getRange(con, spawnPos) > 7 && getRange(con, enemySpawnPos) > 7;
}
export function isMyContainer(con: GameObject) {
  return con instanceof StructureContainer && GR(con, spawnPos) <= 7;
}
export function isOppoContainer(con: GameObject) {
  return con instanceof StructureContainer && GR(con, enemySpawnPos) <= 7;
}
export function getTowerDamage(range: number) {
  if (range <= 5) {
    return 150;
  } else if (range >= 20) {
    return 35;
  } else {
    return ((35 - 150) / (20 - 5)) * (range - 5) + 150;
  }
}
export function getTowerHealAmount(range: number) {
  if (range <= 5) {
    return 100;
  } else if (range >= 20) {
    return 25;
  } else {
    return ((25 - 100) / (20 - 5)) * (range - 5) + 100;
  }
}
export function hasResourceOnGround(pos: Pos, amount: number) {
  const res = <Resource | undefined>findGO(pos, Resource);
  return res && res.amount >= amount;
}
