import { TERRAIN_WALL } from "game/constants";
import { Creep, RoomPosition, StructureExtension, StructureRampart, StructureSpawn, StructureTower, StructureWall } from "game/prototypes";
import { getObjectsByPrototype, getTerrainAt } from "game/utils";

/**
 * auther: masterkeze
 * 判断tile是否可通过,可以忽略creep,区分了敌我rampart
 * @param  {RoomPosition} pos
 * @param  {boolean} my
 * @param  {boolean} ignoreCreeps
 * @returns boolean
 * zom:我这里有个叫blocked的可以直接取目标地点的单位判断是否是阻挡单位
 */
export function customBlocked(pos: RoomPosition, my: boolean, ignoreCreeps: boolean) {
	if (getTerrainAt(pos) === TERRAIN_WALL) return true;
	let tower = getObjectsByPrototype(StructureTower).find(e => e.getRangeTo(pos) == 0 && e.exists === true);
	let constructedWall = getObjectsByPrototype(StructureWall).find(e => e.getRangeTo(pos) == 0 && e.exists === true);
	let spawn = getObjectsByPrototype(StructureSpawn).find(e => e.getRangeTo(pos) == 0 && e.exists === true);
	let extension = getObjectsByPrototype(StructureExtension).find(e => e.getRangeTo(pos) == 0 && e.exists === true);
	let creep = ignoreCreeps ? undefined : getObjectsByPrototype(Creep).find(e => e.getRangeTo(pos) == 0 && e.exists === true);
	let rampart = getObjectsByPrototype(StructureRampart).find(e => e.getRangeTo(pos) == 0 && e.exists === true && e.my === !my);
	return !!(tower || constructedWall || spawn || extension || creep || rampart);
}
