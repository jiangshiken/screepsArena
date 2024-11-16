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
import { Event_ori } from "../utils/Event";
import { divide0 } from "../utils/JS";
import { HasPos } from "../utils/Pos";
import { P } from "../utils/visual";
import { Cre } from "./Cre";
import { S } from "./export";
import { GameObj } from "./GameObj";
import { HasMy, isMyGO, isOppoGO, neutral } from "./HasMy";
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
export type BlockGO = Cre | Stru;
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
export function set_cres(c: Cre[]) {
  cres = c;
}
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
// export let CSs: CS[] = []
/** extend of ConstructionSite */

export class CS extends GameObj implements HasPos, HasMy {
  readonly master: ConstructionSite;
  decayEvent: Event_ori | undefined;
  useDecay: boolean = false;
  worth: number = 0;
  constructor(cons: ConstructionSite) {
    super(cons);
    this.master = cons;
    this.useDecay = (<any>cons).useDecay;
    this.worth = (<any>cons).worth;
  }
  get my() {
    return isMyGO(this.master);
  }
  get oppo() {
    return isOppoGO(this.master);
  }
  get x(): number {
    return this.master.x;
  }
  get y(): number {
    return this.master.y;
  }
  /**the progress of a construction site*/
  get progress(): number {
    if (this.master.progress) {
      return this.master.progress;
    } else {
      return 0;
    }
  }
  /**the progress total of a construction site*/
  get progressTotal(): number {
    if (this.master.progressTotal) {
      return this.master.progressTotal;
    } else {
      return 0;
    }
  }
  /**
   * get the progress rate of a `ConstructionSite`
   */
  get progressRate(): number {
    return divide0(this.progress, this.progressTotal);
  }
}
/** your first StructureSpawn*/

export let spawn: Spa;
export function setSpawn(s: Spa) {
  spawn = s;
} /** the first StructureSpawn of your opponent*/
export let enemySpawn: Spa;
export function setEnemySpawn(s: Spa) {
  enemySpawn = s;
}
