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

import { PL } from "arena_spawn_and_swamp_cazomas/utils/print";
import { ATTACK, CARRY, HEAL, MOVE, RANGED_ATTACK, WORK } from "game/constants";
import { S } from "../utils/export";
import { creepBodyPartNum } from "../utils/game";
import { P } from "../utils/visual";
import { Cre, Task_Role } from "./Cre";
import { Cre_battle } from "./Cre_battle";
import { Cre_build } from "./Cre_build";
import { Cre_harvest } from "./Cre_harvest";
import { Cre_move } from "./Cre_move";
import { CS } from "./CS";
import { isMyGO, isOppoGO, neutral } from "./HasMy";
import {
  Con,
  Ext,
  OwnedStru,
  Ram,
  Res,
  Roa,
  Spa,
  Stru,
  Tow,
  Wal,
} from "./Stru";
//types
/**OwnedStructure occupied by official Class */
export type Type_OwnedStructure =
  | StructureSpawn
  | StructureExtension
  | StructureTower
  | StructureRampart;
export type Type_OwnedStru = Spa | Ext | Tow | Ram;
export type Harvable = Con | Res;
export type Producer = Con | Cre | Ext | Spa;
export type Unit = Cre | OwnedStru;
export type HasEnergy = Res | HasStore;
export type GO = Cre | Stru | CS | Res;
/** has store*/
export type HasStore = Cre | Spa | Con | Ext | Tow;
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
export let ress: Res[] = [];
export let strus: Stru[] = [];
export let ownedStrus: OwnedStru[] = [];
export let containers: Con[] = [];
export let extensions: Ext[] = [];
export let ramparts: Ram[] = [];
export let roads: Roa[] = [];
export let spawns: Spa[] = [];
export let walls: Wal[] = [];
export let towers: Tow[] = [];
//team
export let myOwnedStrus: OwnedStru[] = [];
export let oppoOwnedStrus: OwnedStru[] = [];
export let neutralStrus: Stru[] = [];
export let myRamparts: Ram[] = [];
export let oppoRamparts: Ram[] = [];
export let mySpawns: Spa[] = [];
export let oppoSpawns: Spa[] = [];
export let myExtensions: Ext[] = [];
export let oppoExtensions: Ext[] = [];
export let myCSs: CS[] = [];
export let oppoCSs: CS[] = [];
export function isGO(go: any): boolean {
  return (
    go instanceof Cre ||
    go instanceof Stru ||
    go instanceof Res ||
    go instanceof CS
  );
}
export function getPrototype(type: any) {
  const arr = getObjectsByPrototype(type);
  return [...new Set(arr)];
}
export function getGOs(): GO[] {
  return (<GO[]>cres).concat(strus, CSs, ress);
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
  } else if (structure instanceof StructureExtension) {
    stru = new Ext(structure);
  } else if (structure instanceof StructureTower) {
    stru = new Tow(structure);
  } else if (structure instanceof StructureRampart) {
    stru = new Ram(structure);
  } else if (structure instanceof StructureWall) {
    stru = new Wal(structure);
  } else if (structure instanceof StructureRoad) {
    stru = new Roa(structure);
  } else if (structure instanceof StructureContainer) {
    stru = new Con(structure);
  } else {
    P("ERR initStru");
    stru = new Stru(structure);
  }
  strus.push(stru);
  return stru;
}
export function initCS(constructionsite: ConstructionSite): CS {
  const cs: CS = new CS(constructionsite);
  CSs.push(cs);
  return cs;
}
export function initRes(resource: Resource): Res {
  const res: Res = new Res(resource);
  ress.push(res);
  return res;
}
export function initialCresAtLoopStart() {
  PL("initialCresAtLoopStart");
  //remove dead Cre
  cres = cres.filter(i => i.master.exists);
  //add new Cre
  for (let creep of creeps) {
    const condition1 = !creep.spawning;
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
export function initialressAtLoopStart() {
  PL("initialressAtLoopStart");
  //remove dead Stru
  ress = ress.filter(i => i.master.exists);
  //add new Stru
  for (let res of resources) {
    if (ress.find(i => i.master === res) === undefined) {
      P("initRes=" + S(res));
      initRes(res);
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
  containers = <Con[]>strus.filter(i => i.master instanceof StructureContainer);
  extensions = <Ext[]>strus.filter(i => i.master instanceof StructureExtension);
  ramparts = <Ram[]>strus.filter(i => i.master instanceof StructureRampart);
  roads = <Roa[]>strus.filter(i => i.master instanceof StructureRoad);
  spawns = <Spa[]>strus.filter(i => i.master instanceof StructureSpawn);
  walls = <Wal[]>strus.filter(i => i.master instanceof StructureWall);
  towers = <Tow[]>strus.filter(i => i.master instanceof StructureTower);
  //team
  myOwnedStrus = <OwnedStru[]>strus.filter(i => isMyGO(i.master));
  oppoOwnedStrus = <OwnedStru[]>strus.filter(i => isOppoGO(i.master));
  neutralStrus = <Stru[]>strus.filter(i => neutral(i.master));
  myRamparts = <Ram[]>ramparts.filter(i => isMyGO(i.master));
  oppoRamparts = <Ram[]>ramparts.filter(i => isOppoGO(i.master));
  mySpawns = <Spa[]>spawns.filter(i => isMyGO(i.master));
  oppoSpawns = <Spa[]>spawns.filter(i => isOppoGO(i.master));
  myExtensions = <Ext[]>extensions.filter(i => isMyGO(i.master));
  oppoExtensions = <Ext[]>extensions.filter(i => isOppoGO(i.master));
  myCSs = <CS[]>CSs.filter(i => isMyGO(i.master));
  oppoCSs = <CS[]>CSs.filter(i => isOppoGO(i.master));
  //team array
  friends = cres.filter(i => i.my);
  enemies = cres.filter(i => i.oppo);
  myUnits = (<Unit[]>friends).concat(myOwnedStrus);
  oppoUnits = (<Unit[]>enemies).concat(oppoOwnedStrus);
  units = myUnits.concat(oppoUnits);
}
