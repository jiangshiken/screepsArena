import {
  Creep,
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
import { HasPos } from "../utils/Pos";
import { isMyGO, isOppoGO, Type_OwnedStructure } from "./GameObjectInitialize";
import { HasHits } from "./HasHits";
import { HasMy } from "./HasMy";

export class Stru implements HasPos {
  readonly master: Structure;
  constructor(stru: Structure) {
    this.master = stru;
  }
  get x(): number {
    return this.master.x;
  }
  get y(): number {
    return this.master.y;
  }
}
export class OwnedStru extends Stru implements HasHits, HasMy {
  master: Type_OwnedStructure;
  constructor(master: Type_OwnedStructure) {
    super(master);
    this.master = master;
  }
  get hitsMax(): number {
    return this.master.hitsMax;
  }
  get hits(): number {
    return this.master.hits;
  }
  get my() {
    return isMyGO(this.master);
  }
  get oppo() {
    return isOppoGO(this.master);
  }
}
export class Spa extends OwnedStru {
  master: StructureSpawn;
  constructor(master: StructureSpawn) {
    super(master);
    this.master = master;
  }
  get spawningCreep(): Creep {
    return this.master.spawning.creep;
  }
}
export class Ext extends OwnedStru {
  master: StructureExtension;
  constructor(master: StructureExtension) {
    super(master);
    this.master = master;
  }
}
export class Tow extends OwnedStru {
  master: StructureTower;
  constructor(master: StructureTower) {
    super(master);
    this.master = master;
  }
}
export class Ram extends OwnedStru {
  master: StructureRampart;
  constructor(master: StructureRampart) {
    super(master);
    this.master = master;
  }
}
export class Wal extends Stru {
  master: StructureWall;
  constructor(master: StructureWall) {
    super(master);
    this.master = master;
  }
}
export class Con extends Stru {
  master: StructureContainer;
  worth: number | undefined;
  constructor(master: StructureContainer) {
    super(master);
    this.master = master;
  }
}
export class Roa extends Stru {
  master: StructureRoad;
  constructor(master: StructureRoad) {
    super(master);
    this.master = master;
  }
}
export class Res implements HasPos {
  master: Resource;
  constructor(master: Resource) {
    this.master = master;
  }
  get x(): number {
    return this.master.x;
  }
  get y(): number {
    return this.master.y;
  }
}
