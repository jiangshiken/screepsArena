import {
  ConstructionSite,
  Creep,
  GameObject,
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
import { Cre, isSpawning, Task_Role } from "./Cre";
import { Cre_battle } from "./Cre_battle";
import { Cre_build } from "./Cre_build";
import { Cre_harvest } from "./Cre_harvest";
import { Cre_move } from "./Cre_move";
import { CS } from "./CS";
import { OwnedStru, Spa, Stru } from "./Stru";
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
export type GO = Cre | Stru | CS | Resource;
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
export let units: Unit[] = [];
//stuctures
export let CSs: CS[] = [];
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
export let myOwnedStrus: OwnedStru[] = [];
export let oppoOwnedStrus: OwnedStru[] = [];
export let neutralStrus: Stru[] = [];
export let myRamparts: OwnedStru[] = [];
export let oppoRamparts: OwnedStru[] = [];
export let mySpawns: Spa[] = [];
export let oppoSpawns: Spa[] = [];
export let myExtensions: OwnedStru[] = [];
export let oppoExtensions: OwnedStru[] = [];
export let myCSs: CS[] = [];
export let oppoCSs: CS[] = [];
export function getPrototype(type: any) {
  const arr = getObjectsByPrototype(type);
  return [...new Set(arr)];
}
export function getGOs(): GO[] {
  return (<GO[]>cres).concat(strus, CSs, resources);
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
  const si = (<any>creep).spawnInfo;
  if (si) {
    cre.spawnInfo = si;
    new Task_Role(cre, si.role);
  }
  cres.push(cre);
  return cre;
}
export function initStru(structure: Structure): Stru {
  let stru: Stru;
  if (structure instanceof StructureSpawn) {
    stru = new Spa(structure);
  } else if (
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
export function initCS(cons: ConstructionSite): CS {
  let cs: CS = new CS(cons);
  CSs.push(cs);
  return cs;
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
export function initialCSsAtLoopStart() {
  PL("initialCSsAtLoopStart");
  //remove dead Stru
  CSs = CSs.filter(i => i.master.exists);
  //add new Stru
  for (let cons of constructionSites) {
    if (CSs.find(i => i.master === cons) === undefined) {
      P("initCS=" + S(cons));
      initCS(cons);
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
  containers = <Stru[]>(
    strus.filter(i => i.master instanceof StructureContainer)
  );
  extensions = <OwnedStru[]>(
    strus.filter(i => i.master instanceof StructureExtension)
  );
  ramparts = <OwnedStru[]>(
    strus.filter(i => i.master instanceof StructureRampart)
  );
  roads = <Stru[]>strus.filter(i => i.master instanceof StructureRoad);
  spawns = <OwnedStru[]>strus.filter(i => i.master instanceof StructureSpawn);
  walls = <Stru[]>strus.filter(i => i.master instanceof StructureWall);
  towers = <OwnedStru[]>strus.filter(i => i.master instanceof StructureTower);
  //team
  myOwnedStrus = <OwnedStru[]>strus.filter(i => isMyGO(i.master));
  oppoOwnedStrus = <OwnedStru[]>strus.filter(i => isOppoGO(i.master));
  neutralStrus = <Stru[]>strus.filter(i => neutral(i.master));
  myRamparts = <OwnedStru[]>ramparts.filter(i => isMyGO(i.master));
  oppoRamparts = <OwnedStru[]>ramparts.filter(i => isOppoGO(i.master));
  mySpawns = <Spa[]>spawns.filter(i => isMyGO(i.master));
  oppoSpawns = <Spa[]>spawns.filter(i => isOppoGO(i.master));
  myExtensions = <OwnedStru[]>extensions.filter(i => isMyGO(i.master));
  oppoExtensions = <OwnedStru[]>extensions.filter(i => isOppoGO(i.master));
  myCSs = <CS[]>CSs.filter(i => isMyGO(i.master));
  oppoCSs = <CS[]>CSs.filter(i => isOppoGO(i.master));
  //team array
  friends = cres.filter(i => i.my);
  enemies = cres.filter(i => i.oppo);
  myUnits = (<Unit[]>friends).concat(myOwnedStrus);
  oppoUnits = (<Unit[]>enemies).concat(oppoOwnedStrus);
  units = myUnits.concat(oppoUnits);
}

export function neutral(g: GameObject): boolean {
  return invalid((<any>g).my);
}
export function isMyGO(g: GameObject): boolean {
  return valid((<any>g).my) && (<any>g).my;
}
export function isOppoGO(g: GameObject): boolean {
  return valid((<any>g).my) && !(<any>g).my;
}
