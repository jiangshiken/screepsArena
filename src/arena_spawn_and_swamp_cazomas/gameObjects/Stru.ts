import { Structure } from "game/prototypes";
import { HasPos } from "../utils/Pos";
import { isMyGO } from "./GameObjectInitialize";
import { HasHits } from "./HasHits";
import { HasMy } from "./HasMy";

export class Stru implements HasPos {
  master: Structure;
  constructor(stru: Structure) {
    super();
    this.master = stru;
  }
  x: number;
  y: number;
}
export class OwnedStru extends Stru implements HasHits, HasMy {
  hitsMax(): number {
    return this.master.hitsMax;
  }
  hits(): number {
    return this.master.hits;
  }
  my() {
    return isMyGO(this.master);
  }
}
