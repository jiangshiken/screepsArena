import { GameObject } from "game/prototypes";
import { HasPos } from "../utils/Pos";

export class GameObj implements HasPos {
  readonly master: GameObject;
  constructor(master: GameObject) {
    this.master = master;
  }
  get x(): number {
    return this.master.x;
  }
  get y(): number {
    return this.master.y;
  }
  get exists() {
    return this.master.exists;
  }
}
