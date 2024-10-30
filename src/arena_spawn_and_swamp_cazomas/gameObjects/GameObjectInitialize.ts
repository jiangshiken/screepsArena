import {
  ConstructionSite,
  Creep,
  GameObject,
  OwnedStructure,
  Resource,
  Structure,
  StructureContainer,
  StructureExtension,
  StructureRampart,
  StructureRoad,
  StructureSpawn,
  StructureTower,
  StructureWall,
} from "game/prototypes";
import { getObjectsByPrototype } from "game/utils";

import { ATTACK, CARRY, HEAL, MOVE, RANGED_ATTACK, WORK } from "game/constants";
import { S } from "../utils/export";
import { creepBodyPartNum, PL } from "../utils/game";
import { invalid, valid } from "../utils/JS";
import { P } from "../utils/visual";
import { Cre, isSpawning, oppo } from "./Cre";
import { Cre_battle } from "./Cre_battle";
import { Cre_build } from "./Cre_build";
import { Cre_harvest } from "./Cre_harvest";
import { Cre_move } from "./Cre_move";
import { CS } from "./CS";
import { OwnedStru, Stru } from "./Stru";
//types
/**OwnedStructure occupied by official Class */
export type TypeOwnedStructure =
  | StructureSpawn
  | StructureExtension
  | StructureTower
  | StructureRampart;
export type Harvable = StructureContainer | Resource;
export type Producer = Creep | StructureExtension | StructureSpawn;
export type Unit = Cre | OwnedStru;
export type HasEnergy = Resource | HasStore;
/** has store*/
export type HasStore =
  | Creep
  | StructureSpawn
  | StructureContainer
  | StructureExtension
  | StructureTower;
//basic
export let gameObjects: GameObject[] = [];
export let creeps: Creep[] = [];
export let structures: Structure[] = [];
export let constructionSites: ConstructionSite[] = [];
export let resources: Resource[] = [];
//Cre
export let cres: Cre[] = [];
export let friends: Cre[] = [];
export let enemies: Cre[] = [];
export let myUnits: Unit[] = [];
export let oppoUnits: Unit[] = [];
//stuctures
export let strus: Stru[] = [];
export let ownedStrus: OwnedStru[] = [];
export let containers: Stru[] = [];
export let extensions: OwnedStru[] = [];
export let ramparts: OwnedStru[] = [];
export let roads: Stru[] = [];
export let spawns: OwnedStru[] = [];
export let walls: Stru[] = [];
export let towers: OwnedStru[] = [];
//team
export let myStructures: OwnedStru[] = [];
export let oppoStructures: OwnedStru[] = [];
export let neutralStructures: Stru[] = [];
export let myRamparts: OwnedStru[] = [];
export let oppoRamparts: OwnedStru[] = [];
export let mySpawns: OwnedStru[] = [];
export let oppoSpawns: OwnedStru[] = [];
export let myExtensions: OwnedStru[] = [];
export let oppoExtensions: OwnedStru[] = [];
export let myConstructionSites: CS[] = [];
export let oppoConstructionSites: CS[] = [];
export function getPrototype(type: any) {
  const arr = getObjectsByPrototype(type);
  return [...new Set(arr)];
}
export function initCre(creep: Creep): Cre {
  let cre: Cre;
  if (creepBodyPartNum(creep, WORK) > 0) {
    cre = new Cre_build(creep);
  } else if (
    creepBodyPartNum(creep, ATTACK) > 0 ||
    creepBodyPartNum(creep, RANGED_ATTACK) > 0 ||
    creepBodyPartNum(creep, HEAL) > 0
  ) {
    cre = new Cre_battle(creep);
  } else if (creepBodyPartNum(creep, CARRY) > 0) {
    cre = new Cre_harvest(creep);
  } else if (creepBodyPartNum(creep, MOVE) > 0) {
    cre = new Cre_move(creep);
  } else {
    cre = new Cre(creep);
  }
  cres.push(cre);
  return cre;
}
export function initStru(structure: Structure): Stru {
  let stru: Stru;
  if (
    structure instanceof StructureSpawn ||
    structure instanceof StructureExtension ||
    structure instanceof StructureTower ||
    structure instanceof StructureRampart
  ) {
    stru = new OwnedStru(structure);
  } else {
    stru = new Stru(structure);
  }
  strus.push(stru);
  return stru;
}
export function initialCresAtLoopStart() {
  PL("initialCresAtLoopStart");
  //remove dead Cre
  cres = cres.filter(i => i.master.exists);
  //add new Cre
  for (let creep of creeps) {
    const condition1 = !isSpawning(creep);
    const condition2 = cres.find(i => i.master === creep) === undefined;
    if (condition1 && condition2) {
      P("initCre=" + S(creep));
      initCre(creep);
    }
  }
}
export function initialStrusAtLoopStart() {
  PL("initialStrusAtLoopStart");
  //remove dead Stru
  strus = strus.filter(i => i.master.exists);
  //add new Stru
  for (let structure of structures) {
    if (strus.find(i => i.master === structure) === undefined) {
      P("initStru=" + S(structure));
      initStru(structure);
    }
  }
}
/**should be called at loop start , to initialize all gameobject and
 * store it into the array
 */
export function initialGameObjectsAtLoopStart_basic() {
  //basic
  gameObjects = <GameObject[]>getPrototype(GameObject);
  creeps = <Creep[]>gameObjects.filter(i => i instanceof Creep);
  structures = <Structure[]>gameObjects.filter(i => i instanceof Structure);
  constructionSites = <ConstructionSite[]>getPrototype(ConstructionSite);
  resources = <Resource[]>getPrototype(Resource);
}
export function initialGameObjectsAtLoopStart_advance() {
  //stuctures
  containers = <StructureContainer[]>(
    structures.filter(i => i instanceof StructureContainer)
  );
  extensions = <StructureExtension[]>(
    structures.filter(i => i instanceof StructureExtension)
  );
  ramparts = <StructureRampart[]>(
    structures.filter(i => i instanceof StructureRampart)
  );
  roads = <StructureRoad[]>structures.filter(i => i instanceof StructureRoad);
  spawns = <StructureSpawn[]>(
    structures.filter(i => i instanceof StructureSpawn)
  );
  walls = <StructureWall[]>structures.filter(i => i instanceof StructureWall);
  towers = <StructureTower[]>(
    structures.filter(i => i instanceof StructureTower)
  );
  //team
  myStructures = <OwnedStructure[]>structures.filter(i => isMyGO(i));
  oppoStructures = <OwnedStructure[]>structures.filter(i => isOppoGO(i));
  neutralStructures = <Structure[]>structures.filter(i => neutral(i));
  myRamparts = <StructureRampart[]>ramparts.filter(i => isMyGO(i));
  oppoRamparts = <StructureRampart[]>ramparts.filter(i => isOppoGO(i));
  mySpawns = <StructureSpawn[]>spawns.filter(i => isMyGO(i));
  oppoSpawns = <StructureSpawn[]>spawns.filter(i => isOppoGO(i));
  myExtensions = <StructureExtension[]>extensions.filter(i => isMyGO(i));
  oppoExtensions = <StructureExtension[]>extensions.filter(i => isOppoGO(i));
  myConstructionSites = <ConstructionSite[]>(
    constructionSites.filter(i => isMyGO(i))
  );
  oppoConstructionSites = <ConstructionSite[]>(
    constructionSites.filter(i => isOppoGO(i))
  );
  //team array
  friends = cres.filter(i => my(i));
  enemies = cres.filter(i => oppo(i));
  myUnits = (<Unit[]>friends).concat(myStructures);
  oppoUnits = (<Unit[]>enemies).concat(oppoStructures);
}

export function neutral(g: GameObject): boolean {
  return invalid((<any>g).my);
}
export function isUnit(g: GameObject): boolean {
  return valid((<any>g).my);
}
export function isMyGO(g: GameObject): boolean {
  return valid((<any>g).my) && (<any>g).my;
}
export function isOppoGO(g: GameObject): boolean {
  return valid((<any>g).my) && !(<any>g).my;
}
