import { BodyPartConstant, TERRAIN_SWAMP, TERRAIN_WALL } from "game/constants";
import { Creep } from "game/prototypes";
import { getTerrainAt } from "game/utils";
import { inRange_int } from "./JS";
import { Pos, Vec } from "./Pos";
import { PL } from "./print";
export type StNumber = number;
/** you are at the left or the right of the game map*/
export let spawn_left: boolean;
export function set_spawn_left(b: boolean) {
  spawn_left = b;
}
export const Y_topGate: number = 10;
export const Y_bottomGate: number = 89;
export const border_L1 = 13;
export const border_R1 = 85;
export const border_L2 = 14;
export const border_R2 = 86;
export const border_mid = 50;
export function leftRate(): number {
  return spawn_left ? -1 : 1;
}
export function leftVector(): Vec {
  if (spawn_left) {
    return new Vec(-1, 0);
  } else {
    return new Vec(1, 0);
  }
}
export function isTerrainWall(pos: Pos) {
  return getTerrainAt(pos) === TERRAIN_WALL;
}
export function isTerrainSwamp(pos: Pos) {
  return getTerrainAt(pos) === TERRAIN_SWAMP;
}
export function creepBodyPartNum(creep: Creep, type: BodyPartConstant): number {
  return creep.body.filter(i => i.type === type).length;
}
/** you are at the area that will gene container*/
export function inResourceArea(pos: Pos): boolean {
  return inRange_int(pos.x, 13, 87) && inRange_int(pos.y, 2, 98);
}
/** is outside */
export function isOutside(o: Pos): boolean {
  return o.x >= 15 && o.x <= 85;
}
export const area_left = "area_left";
export const area_right = "area_right";
export const area_top = "area_top";
export const area_bottom = "area_bottom";
export type Area = "area_left" | "area_right" | "area_top" | "area_bottom";
/** get the area by pos and other parameter*/
export function getArea(
  pos: Pos,
  leftBorder: number,
  rightBorder: number,
  midBorder: number
): Area {
  if (pos.x <= leftBorder) return area_left;
  else if (pos.x >= rightBorder) return area_right;
  else if (pos.y < midBorder) return area_top;
  else return area_bottom;
}

/**tick inside strategy to make sure every strategy worked even if time out */
export let strategyTick: number = 0;
export function setStrategyTick(n: number): void {
  strategyTick = n;
}
export function addStrategyTick(): number {
  PL("strategyTick=" + strategyTick);
  setStrategyTick(strategyTick + 1);
  return strategyTick;
}
/** the tick,the same as getTicks()*/
export let tick: number;
export function setTick(t: number) {
  tick = t;
}
