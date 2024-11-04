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
import { Event_Number } from "../utils/Event";
import { HasPos } from "../utils/Pos";
import { ExtraTauntEvent } from "./battle";
import { GameObj } from "./GameObj";
import { Type_OwnedStructure } from "./GameObjectInitialize";
import { HasBattleStats } from "./HasBattleStats";
import { HasHits } from "./HasHits";
import { HasMy, isMyGO, isOppoGO } from "./HasMy";

export class Stru extends GameObj implements HasPos {
  readonly master: Structure;
  constructor(stru: Structure) {
    super(stru);
    this.master = stru;
  }
  get x(): number {
    return this.master.x;
  }
  get y(): number {
    return this.master.y;
  }
}
export class OwnedStru extends Stru implements HasHits, HasMy, HasBattleStats {
  master: Type_OwnedStructure;
  constructor(master: Type_OwnedStructure) {
    super(master);
    this.master = master;
  }
  taunt: Event_Number | undefined;
  force: Event_Number | undefined;
  extraTauntList: ExtraTauntEvent[] = [];
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
  worth: number = 0;
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
export class Res extends GameObj implements HasPos {
  master: Resource;
  constructor(master: Resource) {
    super(master);
    this.master = master;
  }
  get x(): number {
    return this.master.x;
  }
  get y(): number {
    return this.master.y;
  }
}
