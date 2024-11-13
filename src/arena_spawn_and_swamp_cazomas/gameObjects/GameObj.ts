import { GameObject } from "game/prototypes";
import { HasPos } from "../utils/Pos";
import { ERR_rtn } from "../utils/print";

export class GameObj implements HasPos {
  readonly master: GameObject;
  constructor(master: GameObject) {
    this.master = master;
  }
  get x(): number {
    return this.master.exists ? this.master.x : ERR_rtn(0, "not exist x");
  }
  get y(): number {
    return this.master.exists ? this.master.y : ERR_rtn(0, "not exist y");
  }
  get exists() {
    return this.master.exists;
  }
}
