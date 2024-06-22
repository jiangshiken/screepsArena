/**
 Module: util_gameObjectInitialize
 Author: 820491047
 CreateDate:   2023.1.10
 UpDateDate:   2023.1.10
 version 0.0.0
*/
import { ConstructionSite, Creep, GameObject, Resource, Structure, StructureContainer, StructureExtension, StructureRampart, StructureRoad, StructureSpawn, StructureTower, StructureWall } from "game/prototypes";
import { getObjectsByPrototype } from "game/utils";

import { invalid, valid } from "./util_JS";

/** can be attack,has hits*/
export type Attackable_origin = Creep | Structure;
/** all creeps and Structure */
export type Unit_origin = Creep | OwnedStructure

export type OwnedStructure =
	StructureSpawn
	| StructureExtension
	| StructureTower
	| StructureRampart
/** has energy*/
/** can be harvest*/
export type Harvable = StructureContainer | Resource;
//basic
export let gameObjects: GameObject[] = []
export let creeps: Creep[] = []
export let structures: Structure[] = []
export let constructionSites: ConstructionSite[] = []
export let resources: Resource[] = []
//stuctures
export let containers: StructureContainer[] = []
export let extensions: StructureExtension[] = []
export let ramparts: StructureRampart[] = []
export let roads: StructureRoad[] = []
export let spawns: StructureSpawn[] = []
export let walls: StructureWall[] = []
export let towers: StructureTower[] = []
//team
export let myStructures: OwnedStructure[] = []
export let oppoStructures: OwnedStructure[] = []
export let neutralStructures: Structure[] = []
export let myRamparts: StructureRampart[] = []
export let oppoRamparts: StructureRampart[] = []
export let mySpawns: StructureSpawn[] = []
export let oppoSpawns: StructureSpawn[] = []
export let myExtensions: StructureExtension[] = []
export let oppoExtensions: StructureExtension[] = []
export let myConstructionSites: ConstructionSite[] = []
export let oppoConstructionSites: ConstructionSite[] = []
export function getPrototype(type: any) {
	const arr = getObjectsByPrototype(type)
	return [...new Set(arr)]
}
/**should be called at loop start , to initialize all gameobject and
 * store it into the array
*/
export function initialGameObjectsAtLoopStart() {
	//basic
	gameObjects = <GameObject[]>getPrototype(GameObject);
	creeps = <Creep[]>gameObjects.filter(i => i instanceof Creep)
	structures = <Structure[]>gameObjects.filter(i => i instanceof Structure)
	constructionSites = <ConstructionSite[]>getPrototype(ConstructionSite)
	resources = <Resource[]>getPrototype(Resource)
	//stuctures
	containers = <StructureContainer[]>structures.filter(i => i instanceof StructureContainer)
	extensions = <StructureExtension[]>structures.filter(i => i instanceof StructureExtension)
	ramparts = <StructureRampart[]>structures.filter(i => i instanceof StructureRampart)
	roads = <StructureRoad[]>structures.filter(i => i instanceof StructureRoad)
	spawns = <StructureSpawn[]>structures.filter(i => i instanceof StructureSpawn)
	walls = <StructureWall[]>structures.filter(i => i instanceof StructureWall)
	towers = <StructureTower[]>structures.filter(i => i instanceof StructureTower)
	//team
	myStructures = <OwnedStructure[]>structures.filter(i => isMyGO(i))
	oppoStructures = <OwnedStructure[]>structures.filter(i => isOppoGO(i))
	neutralStructures = <Structure[]>structures.filter(i => neutral(i))
	myRamparts = <StructureRampart[]>ramparts.filter(i => isMyGO(i))
	oppoRamparts = <StructureRampart[]>ramparts.filter(i => isOppoGO(i))
	mySpawns = <StructureSpawn[]>spawns.filter(i => isMyGO(i))
	oppoSpawns = <StructureSpawn[]>spawns.filter(i => isOppoGO(i))
	myExtensions = <StructureExtension[]>extensions.filter(i => isMyGO(i))
	oppoExtensions = <StructureExtension[]>extensions.filter(i => isOppoGO(i))
	myConstructionSites = <ConstructionSite[]>constructionSites.filter(i => isMyGO(i))
	oppoConstructionSites = <ConstructionSite[]>constructionSites.filter(i => isOppoGO(i))
}
export function neutral(g: GameObject): boolean {
	return invalid((<any>g).my)
}
export function isUnit(g: GameObject): boolean {
	return valid((<any>g).my)
}
export function isMyGO(g: GameObject): boolean {
	return valid((<any>g).my) && (<any>g).my;
}
export function isOppoGO(g: GameObject): boolean {
	return valid((<any>g).my) && !(<any>g).my;
}
export function isOppoSpawn(str: Structure) {
	return str instanceof StructureSpawn && isOppoGO(str);
}
export function isMySpawn(str: Structure) {
	return str instanceof StructureSpawn && isMyGO(str);
}
export function isOppoRampart(str: Structure) {
	return str instanceof StructureRampart && isOppoGO(str);
}
export function isMyRampart(str: Structure) {
	return str instanceof StructureRampart && isMyGO(str);
}
