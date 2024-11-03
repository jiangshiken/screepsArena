import { GameObject } from "game/prototypes";

export class GameObj {
  readonly master: GameObject;
  constructor(master: GameObject) {
    this.master = master;
  }
  get exists() {
    return this.master.exists;
  }
}
