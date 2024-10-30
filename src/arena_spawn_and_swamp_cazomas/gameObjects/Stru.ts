import { Structure } from "game/prototypes";
import { HasPos } from "../utils/Pos";
import { isMyGO, isOppoGO } from "./GameObjectInitialize";
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
