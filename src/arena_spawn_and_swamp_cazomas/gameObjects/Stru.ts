import { Creep, Structure, StructureSpawn } from "game/prototypes";
import { HasPos } from "../utils/Pos";
import { isMyGO, isOppoGO, TypeOwnedStructure } from "./GameObjectInitialize";
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
  master: TypeOwnedStructure;
  constructor(master: TypeOwnedStructure) {
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
